const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const packager = require('electron-packager');

const packageJson = require(path.join(__dirname, '..', 'package.json'));
const version = packageJson.version;
const productName = packageJson.build.productName || packageJson.name;
const distDir = path.join(__dirname, '..', 'dist');

console.log('Building application first...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

console.log('\nPackaging application...');

packager({
  dir: path.join(__dirname, '..'), // Package from root where node_modules exists
  out: path.join(distDir, 'packages'),
  platform: 'win32',
  arch: 'x64',
  overwrite: true,
  asar: false,
  icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
  name: productName,
  appVersion: version,
  afterCopy: [
    (buildPath, electronVersion, platform, arch) => {
      // Copy built files to the correct location in the packaged app
      const appResourcesPath = path.join(buildPath, 'resources', 'app');
      // The dist files should already be in place, but ensure structure is correct
      console.log('App packaged to:', appResourcesPath);
    }
  ],
  ignore: [
    /^\/src/,
    /^\/tsconfig.*\.json/,
    /^\/webpack\.config\.js/,
    /^\/\.vscode/,
    /^\/scripts\/(?!create-zip)/,
    /^\/README\.md/,
    /^\/SETUP\.md/,
    /^\/\.gitignore/,
    /^\/npm-run\.bat/,
    /^\/\.git/,
    /^\/dist\/packages/,
    /^\/dist\/win-unpacked/
  ]
}).then(appPaths => {
  const appPath = appPaths[0];
  console.log(`\nPackaged to: ${appPath}`);
  
  // Copy README.txt
  const readmeSrc = path.join(__dirname, '..', 'README.txt');
  const readmeDest = path.join(appPath, 'README.txt');
  if (fs.existsSync(readmeSrc)) {
    fs.copyFileSync(readmeSrc, readmeDest);
    console.log('Copied README.txt to package');
  }
  
  // Create ZIP using PowerShell Compress-Archive
  const zipName = `${productName}-${version}-win.zip`;
  const zipPath = path.join(distDir, zipName);
  
  console.log(`\nCreating ZIP file...`);
  try {
    // Use PowerShell to create ZIP
    const psCommand = `Compress-Archive -Path "${appPath}\\*" -DestinationPath "${zipPath}" -Force`;
    execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
    
    const zipSize = fs.statSync(zipPath).size / (1024 * 1024);
    console.log(`\n✓ ZIP file created successfully!`);
    console.log(`  Location: ${zipPath}`);
    console.log(`  Size: ${zipSize.toFixed(2)} MB`);
  } catch (error) {
    console.error('Error creating ZIP:', error.message);
    console.log(`\nYou can manually create a ZIP from: ${appPath}`);
  }
}).catch(err => {
  console.error('Error packaging:', err);
  process.exit(1);
});

