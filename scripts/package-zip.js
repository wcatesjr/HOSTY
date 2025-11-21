const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Set environment to skip code signing
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';

const distDir = path.join(__dirname, '..', 'dist');
const packageJson = require(path.join(__dirname, '..', 'package.json'));
const version = packageJson.version;
const productName = packageJson.build.productName || packageJson.name;

console.log('Building application...');
try {
  // First build the app
  execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  
  console.log('\nCreating unpacked directory...');
  // Create directory structure manually since electron-builder is having issues
  // We'll use electron-packager or just manually structure it
  
  // For now, let's try electron-builder with --dir but skip signing entirely
  const electronBuilder = require('electron-builder');
  const builderConfig = packageJson.build;
  
  // Override to completely skip signing
  builderConfig.win.sign = false;
  builderConfig.win.signDlls = false;
  
  console.log('Packaging to directory...');
  // Use electron-packager as alternative
  const packager = require('electron-packager');
  
  packager({
    dir: path.join(__dirname, '..'),
    out: distDir,
    platform: 'win32',
    arch: 'x64',
    overwrite: true,
    asar: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    name: productName,
    appVersion: version,
    ignore: [
      /node_modules/,
      /\.git/,
      /src/,
      /tsconfig.*\.json/,
      /webpack\.config\.js/,
      /\.vscode/,
      /scripts/,
      /README\.md/,
      /SETUP\.md/,
      /data/,
      /dist\/data/,
      /environments\.json/,
      /default-hosts\.txt/,
      /confluence-url\.txt/
    ]
  }).then(appPaths => {
    console.log(`\nPackaged to: ${appPaths[0]}`);
    
    // Ensure no data directories or environment files are included
    const packagedDataDir = path.join(appPaths[0], 'data');
    if (fs.existsSync(packagedDataDir)) {
      console.log('Removing data directory from package...');
      fs.rmSync(packagedDataDir, { recursive: true, force: true });
    }
    
    // Also check for any data files in the root
    const packagedEnvironmentsFile = path.join(appPaths[0], 'environments.json');
    if (fs.existsSync(packagedEnvironmentsFile)) {
      console.log('Removing environments.json from package...');
      fs.unlinkSync(packagedEnvironmentsFile);
    }
    
    // Copy README.txt to the packaged directory
    const readmeSrc = path.join(__dirname, '..', 'README.txt');
    const readmeDest = path.join(appPaths[0], 'README.txt');
    if (fs.existsSync(readmeSrc)) {
      fs.copyFileSync(readmeSrc, readmeDest);
      console.log('Copied README.txt to package');
    }
    
    // Create ZIP file
    const zipPath = path.join(distDir, `${productName}-${version}-win.zip`);
    console.log(`\nCreating ZIP file: ${zipPath}`);
    
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log(`\n✓ ZIP file created successfully!`);
      console.log(`  Size: ${archive.pointer()} bytes`);
      console.log(`  Location: ${zipPath}`);
    });
    
    archive.on('error', (err) => {
      throw err;
    });
    
    archive.pipe(output);
    archive.directory(appPaths[0], false);
    archive.finalize();
  }).catch(err => {
    console.error('Error packaging:', err);
    process.exit(1);
  });
  
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}


