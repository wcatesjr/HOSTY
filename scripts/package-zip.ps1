# Package HOSTY into a ZIP file
# This script builds the app and creates a ZIP file for distribution

Write-Host "Building HOSTY application..." -ForegroundColor Green

# Build the application
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nAttempting to package with electron-builder (may require admin privileges)..." -ForegroundColor Yellow

# Try to use electron-builder with --dir flag to create unpacked directory
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
$env:SKIP_NOTARIZATION = "true"

# Use npx to run electron-builder with --dir
npx --yes electron-builder --dir --config.win.sign=null --config.win.signDlls=false

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nElectron-builder failed. Creating manual package structure..." -ForegroundColor Yellow
    
    # Manual packaging approach
    $distDir = "dist"
    $packageDir = "$distDir\HOSTY-win32-x64"
    
    if (Test-Path $packageDir) {
        Remove-Item -Recurse -Force $packageDir
    }
    New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
    
    Write-Host "Copying application files..." -ForegroundColor Yellow
    
    # Copy necessary files
    Copy-Item -Path "dist\main\**" -Destination "$packageDir\resources\app\main\" -Recurse -Force
    Copy-Item -Path "dist\renderer\**" -Destination "$packageDir\resources\app\renderer\" -Recurse -Force
    Copy-Item -Path "dist\shared\**" -Destination "$packageDir\resources\app\shared\" -Recurse -Force
    Copy-Item -Path "package.json" -Destination "$packageDir\resources\app\" -Force
    
    # Copy README.txt
    if (Test-Path "README.txt") {
        Copy-Item -Path "README.txt" -Destination "$packageDir\" -Force
    }
    
    Write-Host "Note: You'll need to manually copy Electron runtime files." -ForegroundColor Yellow
    Write-Host "For a complete package, run electron-builder as administrator." -ForegroundColor Yellow
}

# Create ZIP file
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$version = $packageJson.version
$productName = if ($packageJson.build.productName) { $packageJson.build.productName } else { $packageJson.name }
$zipName = "$productName-$version-win.zip"
$zipPath = "$distDir\$zipName"

$unpackedDir = "$distDir\win-unpacked"

if (Test-Path $unpackedDir) {
    Write-Host "`nCreating ZIP file from unpacked directory..." -ForegroundColor Green
    
    # Copy README.txt if it exists
    if (Test-Path "README.txt") {
        Copy-Item -Path "README.txt" -Destination "$unpackedDir\" -Force
    }
    
    # Remove existing ZIP if it exists
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    
    # Create ZIP using PowerShell
    Compress-Archive -Path "$unpackedDir\*" -DestinationPath $zipPath -Force
    
    Write-Host "`n✓ ZIP file created successfully!" -ForegroundColor Green
    Write-Host "  Location: $zipPath" -ForegroundColor Cyan
    $zipSize = (Get-Item $zipPath).Length / 1MB
    Write-Host "  Size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Cyan
} else {
    Write-Host "`nUnpacked directory not found. Package may have failed." -ForegroundColor Red
    exit 1
}









