const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const packager = require('electron-packager');

const packageJson = require(path.join(__dirname, '..', 'package.json'));
const version = packageJson.version;
const productName = packageJson.build.productName || packageJson.name;
const distDir = path.join(__dirname, '..', 'dist');
// Use timestamped directory to avoid lock issues
const timestamp = Date.now();
const tempPackageDir = path.join(distDir, `HOSTY-temp-${timestamp}`);
let winUnpackedDir = path.join(distDir, 'win-unpacked');

async function main() {
  console.log('Building application...');
  try {
    execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }

  console.log('\nCreating fresh package with electron-packager...');

  // Use a temporary directory to avoid locking issues
  // Remove old temp package directory if it exists
  try {
    if (fs.existsSync(tempPackageDir)) {
      console.log('Removing old temp package directory...');
      fs.rmSync(tempPackageDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.warn('Could not remove old temp directory:', error.message);
  }

  // Verify main entry point exists
  const mainEntryPath = path.join(__dirname, '..', packageJson.main);
  if (!fs.existsSync(mainEntryPath)) {
    console.error(`Error: Main entry point not found: ${mainEntryPath}`);
    console.error('Please ensure the build completed successfully.');
    process.exit(1);
  }

  // package.json already has main: "dist/main/main/main.js" which is correct for packaging

  // Check if icon.ico exists and is valid
  const iconPath = path.join(__dirname, '..', 'assets', 'icon.ico');
  let iconOption = null;
  if (fs.existsSync(iconPath)) {
    // Check file size - valid ICO files are usually at least a few KB
    const iconStats = fs.statSync(iconPath);
    if (iconStats.size > 0) {
      iconOption = iconPath;
    } else {
      console.warn('Warning: icon.ico exists but is empty. Packaging without icon.');
    }
  } else {
    console.warn('Warning: icon.ico not found. Packaging without icon.');
  }

  // First, verify all build artifacts are present
  console.log('Verifying build artifacts...');
  const requiredFiles = [
    path.join(__dirname, '..', 'dist', 'main', 'main', 'main.js'),
    path.join(__dirname, '..', 'dist', 'renderer', 'bundle.js'),
    path.join(__dirname, '..', 'dist', 'renderer', 'assets', 'icon.png'),
    path.join(__dirname, '..', 'dist', 'assets', 'icon.png')
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`Error: Required build artifact missing: ${file}`);
      console.error('Please ensure the build completed successfully.');
      process.exit(1);
    }
  }
  console.log('✓ All build artifacts verified');

  // Use electron-builder with --dir flag and custom output directory to avoid locks
  // This creates a fresh package with all latest changes
  console.log('Using electron-builder to create package...');
  console.log('Note: Using temporary output directory to avoid file lock issues.');

  try {
    // Set environment to skip code signing and use temp directory
    const env = { ...process.env };
    env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
    env.SKIP_NOTARIZATION = 'true';
    
    // Modify package.json build config temporarily to use temp output
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const originalPackageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    const modifiedPackageJson = JSON.parse(originalPackageJsonContent);
    const originalOutDir = modifiedPackageJson.build?.directories?.output;
    
    // Set custom output directory
    if (!modifiedPackageJson.build.directories) {
      modifiedPackageJson.build.directories = {};
    }
    modifiedPackageJson.build.directories.output = path.join(distDir, 'temp-build');
    fs.writeFileSync(packageJsonPath, JSON.stringify(modifiedPackageJson, null, 2));
    
    let buildSuccess = false;
    try {
      execSync('cross-env CSC_IDENTITY_AUTO_DISCOVERY=false electron-builder --dir', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        env: env
      });
      buildSuccess = true;
    } catch (buildError) {
      // Check if package was created despite the error (icon warnings are non-fatal)
      const checkDir = path.join(distDir, 'temp-build', 'win-unpacked');
      if (fs.existsSync(checkDir) && fs.existsSync(path.join(checkDir, 'HOSTY.exe'))) {
        console.log('Package created despite icon warning - continuing...');
        buildSuccess = true;
      } else {
        throw buildError;
      }
    } finally {
      // Restore original package.json
      fs.writeFileSync(packageJsonPath, originalPackageJsonContent);
    }
    
    // electron-builder creates win-unpacked in the output directory
    // Check both possible locations
    const buildOutputDir = path.join(distDir, 'temp-build', 'win-unpacked');
    const altBuildDir = path.join(distDir, 'temp-build', `${productName}-win32-x64`);
    const actualBuildDir = fs.existsSync(buildOutputDir) ? buildOutputDir : 
                           (fs.existsSync(altBuildDir) ? altBuildDir :
                           (fs.existsSync(winUnpackedDir) ? winUnpackedDir : null));
    
    if (buildSuccess && actualBuildDir && fs.existsSync(actualBuildDir)) {
      // Move to final location
      try {
        if (fs.existsSync(winUnpackedDir)) {
          // Try to remove old one, but don't fail if locked
          try {
            fs.rmSync(winUnpackedDir, { recursive: true, force: true });
          } catch (err) {
            console.warn('Could not remove old win-unpacked, using temp directory');
            winUnpackedDir = tempPackageDir;
          }
        }
        
        if (actualBuildDir !== winUnpackedDir) {
          // Copy to final location
          const { execSync: cpExecSync } = require('child_process');
          cpExecSync(`xcopy /E /I /Y "${actualBuildDir}" "${winUnpackedDir}"`, { shell: true });
          console.log('✓ Package created successfully with electron-builder');
        } else {
          console.log('✓ Package created successfully with electron-builder');
        }
        
        await processPackage();
      } catch (moveError) {
        console.warn('Could not move to final location, using temp:', moveError.message);
        winUnpackedDir = actualBuildDir;
        await processPackage();
      }
    } else {
      throw new Error('Package directory not created');
    }
  } catch (error) {
    console.error('Packaging with electron-builder failed:', error.message);
    console.log('Falling back to electron-packager...');
    
    // Fallback to electron-packager with a workaround
    // Create a symlink or copy main.js to root temporarily for validation
    const tempMainPath = path.join(__dirname, '..', 'main.js');
    const realMainPath = path.join(__dirname, '..', packageJson.main);
    
    try {
      // Copy main.js to root for electron-packager validation
      fs.copyFileSync(realMainPath, tempMainPath);
      
      // Temporarily modify package.json to point to root main.js
      const packageJsonPath = path.join(__dirname, '..', 'package.json');
      const originalPackageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
      const modifiedPackageJson = JSON.parse(originalPackageJsonContent);
      const originalMain = modifiedPackageJson.main;
      modifiedPackageJson.main = 'main.js';
      fs.writeFileSync(packageJsonPath, JSON.stringify(modifiedPackageJson, null, 2));
      
      const packagerOptions = {
        dir: path.join(__dirname, '..'),
        out: distDir,
        platform: 'win32',
        arch: 'x64',
        overwrite: true,
        asar: true,
        name: productName,
        appVersion: version,
        ignore: [
          /^\/src/,
          /^\/tsconfig.*\.json/,
          /^\/webpack\.config\.js/,
          /^\/\.vscode/,
          /^\/scripts\/(?!create-zip)/,
          /^\/README\.md/,
          /^\/SETUP\.md/,
          /^\/\.gitignore/,
          /^\/\.git/,
          /^\/dist\/packages/,
          /^\/dist\/win-unpacked/,
          /^\/dist\/HOSTY-.*\.zip/,
          /^\/dist\/HOSTY-temp-package/,
          /^\/data/,
          /^\/environments\.json/,
          /^\/default-hosts\.txt/,
          /^\/confluence-url\.txt/,
          /^\/node_modules\/(?!electron|react|react-dom|node-html-parser)/
        ]
      };
      
      // Only add icon if it's valid (skip if invalid to avoid errors)
      if (iconOption) {
        packagerOptions.icon = iconOption;
      }
      
      await packager(packagerOptions)
        .then(async (appPaths) => {
          // Restore original package.json
          fs.writeFileSync(packageJsonPath, originalPackageJsonContent);
          // Remove temp main.js
          if (fs.existsSync(tempMainPath)) {
            fs.unlinkSync(tempMainPath);
          }
          
          const packagerOutputDir = path.join(distDir, `${productName}-win32-x64`);
          if (fs.existsSync(packagerOutputDir)) {
            try {
              if (fs.existsSync(winUnpackedDir)) {
                fs.rmSync(winUnpackedDir, { recursive: true, force: true });
              }
              fs.renameSync(packagerOutputDir, winUnpackedDir);
              console.log('✓ Package created successfully');
              await processPackage();
            } catch (err) {
              console.error('Error moving package:', err.message);
              process.exit(1);
            }
          }
        })
        .catch(error => {
          // Restore original package.json on error
          try {
            fs.writeFileSync(packageJsonPath, originalPackageJsonContent);
            if (fs.existsSync(tempMainPath)) {
              fs.unlinkSync(tempMainPath);
            }
          } catch (cleanupErr) {
            // Ignore cleanup errors
          }
          console.error('Packaging failed:', error);
          process.exit(1);
        });
    } catch (fallbackError) {
      console.error('Fallback packaging also failed:', fallbackError.message);
      process.exit(1);
    }
  }
}

// Run main function
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

async function processPackage() {
  // Ensure no data directories or environment files are included
  const packagedDataDir = path.join(winUnpackedDir, 'data');
  if (fs.existsSync(packagedDataDir)) {
    console.log('Removing data directory from package...');
    fs.rmSync(packagedDataDir, { recursive: true, force: true });
  }

  // Also check for any data files in the root
  const packagedEnvironmentsFile = path.join(winUnpackedDir, 'environments.json');
  if (fs.existsSync(packagedEnvironmentsFile)) {
    console.log('Removing environments.json from package...');
    fs.unlinkSync(packagedEnvironmentsFile);
  }

  // Check in resources/app/data as well (electron-packager structure)
  const resourcesDataDir = path.join(winUnpackedDir, 'resources', 'app', 'data');
  if (fs.existsSync(resourcesDataDir)) {
    console.log('Removing data directory from resources/app...');
    fs.rmSync(resourcesDataDir, { recursive: true, force: true });
  }

  // Also check for data in resources/app.asar (if asar is used)
  const asarDataDir = path.join(winUnpackedDir, 'resources', 'app.asar', 'data');
  // Note: Can't directly check asar contents, but electron-packager should handle this

  // Ensure README.txt is in the package
  const readmeSrc = path.join(__dirname, '..', 'README.txt');
  const readmeDest = path.join(winUnpackedDir, 'README.txt');
  if (fs.existsSync(readmeSrc)) {
    fs.copyFileSync(readmeSrc, readmeDest);
    console.log('✓ README.txt copied to package');
  }

  // Create ZIP file
  const zipName = `${productName}-${version}-win.zip`;
  const zipPath = path.join(distDir, zipName);

  console.log(`\nCreating ZIP file: ${zipName}...`);
  try {
    // Remove existing ZIP if it exists
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    
    // Use archiver to create ZIP (handles large files better than PowerShell)
    const archiver = require('archiver');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    await new Promise((resolve, reject) => {
      output.on('close', () => {
        let zipSize = 0;
        if (fs.existsSync(zipPath)) {
          zipSize = fs.statSync(zipPath).size / (1024 * 1024);
        } else if (archive.pointer) {
          zipSize = archive.pointer / (1024 * 1024);
        }
        console.log(`\n✓ ZIP file created successfully!`);
        console.log(`  Location: ${zipPath}`);
        console.log(`  Size: ${zipSize.toFixed(2)} MB`);
        resolve();
      });
      
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        reject(err);
      });
      
      archive.pipe(output);
      archive.directory(winUnpackedDir, false);
      archive.finalize();
    });
  } catch (error) {
    console.error('Error creating ZIP:', error.message);
    console.log(`\nYou can manually create a ZIP from: ${winUnpackedDir}`);
    process.exit(1);
  }
}


