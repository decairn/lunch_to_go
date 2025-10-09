param([switch]$Release, [switch]$Debug)

$repoRoot = Split-Path -Path $PSScriptRoot -Parent
Set-Location -LiteralPath $repoRoot

Write-Host "=== Lunch To Go Desktop Packaging ===" -ForegroundColor Cyan

# Validate environment
Write-Host "Checking environment..." -ForegroundColor Yellow

# Check if we're in the right directory
if (-not (Test-Path "src-tauri/Cargo.toml")) {
    Write-Error "Not in project root. Expected to find src-tauri/Cargo.toml"
    exit 1
}

# Check if pnpm is available
$pnpmCmd = "pnpm"
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    # Try local pnpm.cmd in app directory
    if (Test-Path "app/pnpm.cmd") {
        Write-Host "Using local pnpm.cmd from app directory" -ForegroundColor Yellow
        $pnpmCmd = "app/pnpm.cmd"
    } else {
        Write-Error "pnpm not found. Please install pnpm globally: npm install -g pnpm"
        exit 1
    }
}

# Check if cargo is available
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    # Try adding the default Rust installation path
    $cargoPath = "$env:USERPROFILE\.cargo\bin"
    if (Test-Path $cargoPath) {
        Write-Host "Adding Rust cargo path to current session: $cargoPath" -ForegroundColor Yellow
        $env:PATH += ";$cargoPath"
    }
    
    # Check again
    if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
        Write-Error "cargo not found. Please install Rust: https://rustup.rs/"
        exit 1
    }
}

Write-Host "Environment checks passed." -ForegroundColor Green

# Step 1: Clean previous builds (optional)
Write-Host "`nCleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "app/out") {
    Remove-Item -Recurse -Force "app/out"
    Write-Host "Removed app/out directory" -ForegroundColor Gray
}

if (Test-Path "src-tauri/target/release") {
    Write-Host "Cleaning Rust release target..." -ForegroundColor Gray
    Set-Location "src-tauri"
    cargo clean --release
    Set-Location $repoRoot
}

# Step 2: Install frontend dependencies
Write-Host "`nInstalling frontend dependencies..." -ForegroundColor Yellow
Set-Location "app"
if ($env:FORCE_PNPM_INSTALL -eq "1") {
    Write-Host "FORCE_PNPM_INSTALL set. Running pnpm install..." -ForegroundColor Gray
    if ($pnpmCmd -eq "app/pnpm.cmd") {
        & ..\$pnpmCmd install
    } else {
        & $pnpmCmd install
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend dependency installation failed"
        exit 1
    }
    Write-Host "Frontend dependencies installed." -ForegroundColor Green
} else {
    Write-Host "Skipping pnpm install (dependencies assumed current). Set FORCE_PNPM_INSTALL=1 to override." -ForegroundColor Gray
}

# Step 3: Build frontend (Next.js)
Write-Host "`nBuilding Next.js frontend..." -ForegroundColor Yellow
if ($pnpmCmd -eq "app/pnpm.cmd") {
    & ..\$pnpmCmd build
} else {
    & $pnpmCmd build
}
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend build failed"
    exit 1
}

# Verify frontend build output
if (-not (Test-Path "out")) {
    Write-Error "Frontend build completed but out/ directory not found"
    exit 1
}

Write-Host "Frontend build completed successfully." -ForegroundColor Green
Set-Location $repoRoot

# Step 4: Build Tauri desktop application
Write-Host "`nBuilding Tauri desktop application..." -ForegroundColor Yellow
Set-Location "src-tauri"

if ($Debug) {
    Write-Host "Building in debug mode..." -ForegroundColor Cyan
    Write-Host "Using debug configuration (separate product name and identifier)..." -ForegroundColor Gray
    
    # Copy debug config to main config
    Copy-Item "tauri.debug.conf.json" "tauri.conf.json" -Force
    
    cargo tauri build --debug
} else {
    Write-Host "Building in release mode..." -ForegroundColor Cyan
    Write-Host "Using release configuration..." -ForegroundColor Gray
    
    # Copy release config to main config
    Copy-Item "tauri.release.conf.json" "tauri.conf.json" -Force
    
    cargo tauri build
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Tauri build failed"
    Set-Location $repoRoot
    exit 1
}

Write-Host "Tauri build completed successfully." -ForegroundColor Green
Set-Location $repoRoot

# Step 5: Locate and display build artifacts
Write-Host "`nLocating build artifacts..." -ForegroundColor Yellow

$buildMode = if ($Debug) { "debug" } else { "release" }
$targetDir = "src-tauri/target/$buildMode"

$installerFiles = @()
if (Test-Path "$targetDir/bundle") {
    Write-Host "`nBuild artifacts found:" -ForegroundColor Green
    Get-ChildItem "$targetDir/bundle" -Recurse -File | Where-Object { 
        $_.Extension -in @('.msi', '.msix', '.exe') 
    } | ForEach-Object {
        $sizeKB = [math]::Round($_.Length / 1KB, 2)
        Write-Host "  📦 $($_.Name) ($sizeKB KB)" -ForegroundColor Cyan
        Write-Host "     📁 $($_.FullName)" -ForegroundColor Gray
        $installerFiles += $_
    }
} else {
    Write-Warning "No bundle directory found at $targetDir/bundle"
}

# Step 6: Copy installers to /dist directory
Write-Host "`nCopying installers to distribution directory..." -ForegroundColor Yellow

$distDir = "$repoRoot/dist"
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
    Write-Host "Created dist directory: $distDir" -ForegroundColor Gray
}

foreach ($installer in $installerFiles) {
    $destPath = Join-Path $distDir $installer.Name
    Copy-Item -Path $installer.FullName -Destination $destPath -Force
    $sizeKB = [math]::Round($installer.Length / 1KB, 2)
    Write-Host "  📦 Copied: $($installer.Name) ($sizeKB KB)" -ForegroundColor Green
    Write-Host "     📁 To: $destPath" -ForegroundColor Gray
}

if ($installerFiles.Count -gt 0) {
    Write-Host "✅ $($installerFiles.Count) installer(s) copied to dist directory" -ForegroundColor Green
} else {
    Write-Warning "No installer files found to copy"
}

# Step 7: Success summary
Write-Host "`n=== Build Summary ===" -ForegroundColor Cyan
Write-Host "✅ Frontend build: Next.js production build completed" -ForegroundColor Green
Write-Host "✅ Desktop build: Tauri $buildMode build completed" -ForegroundColor Green
Write-Host "✅ Artifacts: Available in src-tauri/target/$buildMode/bundle/" -ForegroundColor Green
Write-Host "✅ Distribution: Installers copied to /dist directory" -ForegroundColor Green

if (-not $Debug) {
    Write-Host "`n💡 Run the NSIS setup executable (administrator recommended for install)" -ForegroundColor Yellow
    Write-Host "💡 For testing, you can also use: cargo tauri dev" -ForegroundColor Yellow
}

Write-Host "`n🎉 Desktop packaging completed successfully!" -ForegroundColor Green
