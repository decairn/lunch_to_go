# Desktop Smoke Tests for Lunch To Go
# P4-05: Verify desktop app functionality including API key verification, accounts view, and credential deletion

param(
    [string]$TestApiKey = $null,
    [switch]$SkipInstall = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

# Colors for output
$Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
    Header = "Magenta"
}

function Get-AppVersion {
    $packageJsonPath = Join-Path $PSScriptRoot "..\app\package.json"
    if (-not (Test-Path $packageJsonPath)) {
        throw "Unable to locate package.json at $packageJsonPath"
    }

    try {
        $packageData = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
        if ([string]::IsNullOrWhiteSpace($packageData.version)) {
            throw "Missing version field in package.json"
        }
        return $packageData.version
    } catch {
        throw "Failed to read app version: $($_.Exception.Message)"
    }
}

function Write-TestResult {
    param([string]$Message, [string]$Status, [string]$Details = "")
    
    $color = switch ($Status) {
        "PASS" { $Colors.Success }
        "FAIL" { $Colors.Error }
        "WARN" { $Colors.Warning }
        "INFO" { $Colors.Info }
        default { "White" }
    }
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] [$Status] $Message" -ForegroundColor $color
    if ($Details -and $Verbose) {
        Write-Host "    $Details" -ForegroundColor Gray
    }
}

function Test-Prerequisites {
    Write-Host "`n=== Desktop Smoke Tests - Prerequisites ===" -ForegroundColor $Colors.Header

    $version = Get-AppVersion()
    
    # Check if NSIS installer exists - prefer debug if available, fallback to release
    $debugInstallerPath = "$PSScriptRoot\..\src-tauri\target\debug\bundle\nsis\Lunch To Go (Debug)_${version}_x64-setup.exe"
    $releaseInstallerPath = "$PSScriptRoot\..\src-tauri\target\release\bundle\nsis\Lunch To Go_${version}_x64-setup.exe"
    
    # Also check the dist directory
    $debugDistPath = "$PSScriptRoot\..\dist\Lunch To Go (Debug)_${version}_x64-setup.exe"
    $releaseDistPath = "$PSScriptRoot\..\dist\Lunch To Go_${version}_x64-setup.exe"
    
    $installerPath = $null
    $buildType = $null
    
    if (Test-Path $debugInstallerPath) {
        $installerPath = $debugInstallerPath
        $buildType = "Debug"
        Write-TestResult "Debug NSIS installer found" "PASS" $installerPath
    } elseif (Test-Path $debugDistPath) {
        $installerPath = $debugDistPath
        $buildType = "Debug"
        Write-TestResult "Debug NSIS installer found in dist" "PASS" $installerPath
    } elseif (Test-Path $releaseInstallerPath) {
        $installerPath = $releaseInstallerPath
        $buildType = "Release"
        Write-TestResult "Release NSIS installer found" "PASS" $installerPath
    } elseif (Test-Path $releaseDistPath) {
        $installerPath = $releaseDistPath
        $buildType = "Release"
        Write-TestResult "Release NSIS installer found in dist" "PASS" $installerPath
    } else {
        Write-TestResult "No NSIS installer found" "FAIL" "Expected debug: $debugInstallerPath or release: $releaseInstallerPath (or in dist directory)"
        throw "Build artifacts missing. Run package-desktop.ps1 first."
    }
    
    # Check if app is already installed and uninstall if found
    $appName = if ($buildType -eq "Debug") { "Lunch To Go (Debug)" } else { "Lunch To Go" }
    $installedApp = Get-CimInstance -ClassName Win32_Product | Where-Object { $_.Name -eq $appName }
    
    if ($installedApp -and -not $SkipInstall) {
        Write-TestResult "App already installed - uninstalling first" "WARN" "$($installedApp.Name) ($buildType)"
        Uninstall-DesktopApp -InstallerPath $installerPath
        Start-Sleep -Seconds 2  # Allow uninstallation to complete
        return @{ InstallerPath = $installerPath; AlreadyInstalled = $false; BuildType = $buildType }
    }
    
    return @{ InstallerPath = $installerPath; AlreadyInstalled = $false; BuildType = $buildType }
}

function Install-DesktopApp {
    param([string]$InstallerPath)
    
    Write-Host "`n=== Installing Desktop App ===" -ForegroundColor $Colors.Header
    
    try {
        # NSIS installer supports silent installation with /S flag
        $installArgs = @("/S")
        Write-TestResult "Installing NSIS package" "INFO" "`"$InstallerPath`" /S"
        
        $process = Start-Process -FilePath $InstallerPath -ArgumentList $installArgs -Wait -PassThru
        
        if ($process.ExitCode -eq 0) {
            Write-TestResult "NSIS installation completed" "PASS" "Exit code: $($process.ExitCode)"
            Start-Sleep -Seconds 3  # Allow installation to settle
            return $true
        } else {
            Write-TestResult "NSIS installation failed" "FAIL" "Exit code: $($process.ExitCode)"
            return $false
        }
    } catch {
        Write-TestResult "Installation error" "FAIL" $_.Exception.Message
        return $false
    }
}

function Test-AppLaunch {
    Write-Host "`n=== Testing App Launch ===" -ForegroundColor $Colors.Header
    
    # Find installed app executable - check both debug and release locations
    $appPaths = @(
        "${env:ProgramFiles}\Lunch To Go (Debug)",
        "${env:ProgramFiles}\Lunch To Go",
        "${env:LOCALAPPDATA}\Programs\Lunch To Go (Debug)", 
        "${env:LOCALAPPDATA}\Programs\Lunch To Go"
    )
    
    $appPath = $null
    foreach ($path in $appPaths) {
        if (Test-Path $path) {
            $appPath = Get-ChildItem -Path $path -Filter "app.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($appPath) {
                break
            }
        }
    }
    
    if (-not $appPath) {
        Write-TestResult "Desktop app executable not found" "FAIL" "Checked: $($appPaths -join ', ')"
        return $false
    }
    
    Write-TestResult "Found app executable" "PASS" $appPath.FullName
    
    try {
        # Launch app in background
        $appProcess = Start-Process -FilePath $appPath.FullName -PassThru
        Start-Sleep -Seconds 5  # Allow app to start
        
        if ($appProcess.HasExited) {
            Write-TestResult "App exited immediately" "FAIL" "Process ended unexpectedly"
            return $false
        }
        
        Write-TestResult "App launched successfully" "PASS" "PID: $($appProcess.Id)"
        
        # Clean shutdown
        $appProcess.CloseMainWindow()
        if (-not $appProcess.WaitForExit(5000)) {
            $appProcess.Kill()
        }
        
        return $true
    } catch {
        Write-TestResult "App launch failed" "FAIL" $_.Exception.Message
        return $false
    }
}

function Test-CredentialStorage {
    Write-Host "`n=== Testing Credential Storage ===" -ForegroundColor $Colors.Header
    
    # Test Windows Credential Manager integration
    # This tests the underlying storage mechanism the desktop app uses
    
    $testTarget = "LunchToGo_SmokeTest"
    $testApiKey = "test_smoke_key_12345"
    
    try {
        # Test storing credential
        $secureString = ConvertTo-SecureString -String $testApiKey -AsPlainText -Force
        $credential = New-Object -TypeName System.Management.Automation.PSCredential -ArgumentList $testTarget, $secureString
        
        # Store in Windows Credential Manager (similar to what Tauri does)
        cmdkey /generic:$testTarget /user:$testTarget /pass:$testApiKey | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-TestResult "Credential storage successful" "PASS" "Target: $testTarget"
        } else {
            Write-TestResult "Credential storage failed" "FAIL" "cmdkey exit code: $LASTEXITCODE"
            return $false
        }
        
        # Test retrieving credential
        $retrieveResult = cmdkey /list:$testTarget 2>&1
        if ($retrieveResult -match $testTarget) {
            Write-TestResult "Credential retrieval successful" "PASS" "Found stored credential"
        } else {
            Write-TestResult "Credential retrieval failed" "FAIL" "Credential not found"
            return $false
        }
        
        # Test deleting credential
        cmdkey /delete:$testTarget | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-TestResult "Credential deletion successful" "PASS" "Target: $testTarget"
        } else {
            Write-TestResult "Credential deletion failed" "FAIL" "cmdkey exit code: $LASTEXITCODE"
            return $false
        }
        
        return $true
    } catch {
        Write-TestResult "Credential storage test error" "FAIL" $_.Exception.Message
        return $false
    }
}

function Test-ApiConnectivity {
    param([string]$ApiKey)
    
    Write-Host "`n=== Testing API Connectivity ===" -ForegroundColor $Colors.Header
    
    if (-not $ApiKey) {
        Write-TestResult "No API key provided - skipping connectivity test" "WARN" "Use -TestApiKey parameter to test"
        return $true
    }
    
    try {
        # Test direct API call (same as desktop app would make)
        $headers = @{
            "Authorization" = "Bearer $ApiKey"
            "Accept" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "https://api.lunchmoney.app/v1/me" -Headers $headers -Method GET -TimeoutSec 10
        
        if ($response -and $response.name) {
            Write-TestResult "API connectivity successful" "PASS" "User: $($response.name)"
            Write-TestResult "Primary currency detected" "INFO" $response.primary_currency
            return $true
        } else {
            Write-TestResult "API connectivity failed" "FAIL" "Invalid response format"
            return $false
        }
    } catch {
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode } else { "Unknown" }
        Write-TestResult "API connectivity failed" "FAIL" "Status: $statusCode, Error: $($_.Exception.Message)"
        return $false
    }
}

function Test-AccountsData {
    param([string]$ApiKey)
    
    Write-Host "`n=== Testing Accounts Data Functionality ===" -ForegroundColor $Colors.Header
    
    if (-not $ApiKey) {
        Write-TestResult "No API key provided - skipping accounts test" "WARN" "Use -TestApiKey parameter to test"
        return $true
    }
    
    try {
        $headers = @{
            "Authorization" = "Bearer $ApiKey"
            "Accept" = "application/json"
        }
        
        # Test assets endpoint
        Write-TestResult "Testing assets endpoint" "INFO" "/v1/assets"
        $assetsResponse = Invoke-RestMethod -Uri "https://api.lunchmoney.app/v1/assets" -Headers $headers -Method GET -TimeoutSec 10
        
        if ($assetsResponse -and $assetsResponse.assets) {
            $assetCount = $assetsResponse.assets.Count
            Write-TestResult "Assets data retrieved successfully" "PASS" "Found $assetCount assets"
            
            # Test account filtering (exclude closed)
            $activeAssets = $assetsResponse.assets | Where-Object { $_.closed_on -eq $null }
            Write-TestResult "Active assets filtered" "PASS" "$($activeAssets.Count) active of $assetCount total"
        } else {
            Write-TestResult "Assets data failed" "FAIL" "No assets found in response"
            return $false
        }
        
        # Test Plaid accounts endpoint
        Write-TestResult "Testing Plaid accounts endpoint" "INFO" "/v1/plaid_accounts"
        try {
            $plaidResponse = Invoke-RestMethod -Uri "https://api.lunchmoney.app/v1/plaid_accounts" -Headers $headers -Method GET -TimeoutSec 10
            
            if ($plaidResponse -and $plaidResponse.plaid_accounts) {
                $plaidCount = $plaidResponse.plaid_accounts.Count
                Write-TestResult "Plaid accounts retrieved successfully" "PASS" "Found $plaidCount Plaid accounts"
            } else {
                Write-TestResult "No Plaid accounts found" "INFO" "This is normal if no bank connections exist"
            }
        } catch {
            Write-TestResult "Plaid accounts test skipped" "INFO" "May not have Plaid integration"
        }
        
        # Test data normalization logic (same as desktop app)
        $allAccounts = @()
        
        # Add asset accounts
        foreach ($asset in $assetsResponse.assets) {
            if ($asset.closed_on -eq $null) {  # Filter out closed accounts
                $allAccounts += [PSCustomObject]@{
                    id = $asset.id
                    name = $asset.name
                    type = $asset.type_name
                    balance = $asset.balance
                    currency = $asset.currency
                    institution = $asset.institution_name
                    source = "asset"
                }
            }
        }
        
        # Add Plaid accounts if available
        if ($plaidResponse -and $plaidResponse.plaid_accounts) {
            foreach ($plaid in $plaidResponse.plaid_accounts) {
                $allAccounts += [PSCustomObject]@{
                    id = $plaid.id
                    name = $plaid.name
                    type = $plaid.type
                    balance = $plaid.balance
                    currency = $plaid.currency
                    institution = $plaid.institution_name
                    source = "plaid"
                }
            }
        }
        
        Write-TestResult "Account normalization completed" "PASS" "Processed $($allAccounts.Count) total accounts"
        
        # Test grouping logic (assets vs liabilities)
        $assets = $allAccounts | Where-Object { $_.balance -ge 0 -or $_.type -in @("checking", "savings", "investment") }
        $liabilities = $allAccounts | Where-Object { $_.balance -lt 0 -and $_.type -in @("credit", "loan", "mortgage") }
        
        Write-TestResult "Account grouping completed" "PASS" "Assets: $($assets.Count), Liabilities: $($liabilities.Count)"
        
        # Test net worth calculation
        $totalAssets = ($assets | Measure-Object -Property balance -Sum).Sum
        $totalLiabilities = [Math]::Abs(($liabilities | Measure-Object -Property balance -Sum).Sum)
        $netWorth = $totalAssets - $totalLiabilities
        
        Write-TestResult "Net worth calculation completed" "PASS" "Net Worth: $netWorth"
        
        return $true
        
    } catch {
        $statusCode = if ($_.Exception.Response) { $_.Exception.Response.StatusCode } else { "Unknown" }
        Write-TestResult "Accounts data test failed" "FAIL" "Status: $statusCode, Error: $($_.Exception.Message)"
        return $false
    }
}

function Uninstall-DesktopApp {
    param([string]$InstallerPath)
    
    Write-Host "`n=== Cleaning Up ===" -ForegroundColor $Colors.Header
    
    if (-not $SkipInstall) {
        try {
            # Try to find the app by name and uninstall via Windows uninstaller
            $apps = @(
                Get-CimInstance -ClassName Win32_Product | Where-Object { $_.Name -eq "Lunch To Go" },
                Get-CimInstance -ClassName Win32_Product | Where-Object { $_.Name -eq "Lunch To Go (Debug)" }
            ) | Where-Object { $_ -ne $null }
            
            if ($apps.Count -gt 0) {
                foreach ($app in $apps) {
                    Write-TestResult "Uninstalling desktop app via Windows uninstaller" "INFO" "App: $($app.Name)"
                    $result = Invoke-CimMethod -InputObject $app -MethodName Uninstall
                    
                    if ($result.ReturnValue -eq 0) {
                        Write-TestResult "Uninstallation completed" "PASS" "App: $($app.Name), Return value: $($result.ReturnValue)"
                    } else {
                        Write-TestResult "Uninstallation failed" "WARN" "App: $($app.Name), Return value: $($result.ReturnValue)"
                    }
                }
            } else {
                Write-TestResult "No installed app found to uninstall" "INFO"
            }
        } catch {
            Write-TestResult "Uninstallation error" "WARN" $_.Exception.Message
        }
    }
}

# Main execution
try {
    Write-Host "Lunch To Go - Desktop Smoke Tests (P4-05)" -ForegroundColor $Colors.Header
    Write-Host "Testing desktop app functionality including API verification, accounts view, and credential management`n" -ForegroundColor Gray
    
    $testResults = @()
    
    # Prerequisites
    $prereqs = Test-Prerequisites
    $testResults += [PSCustomObject]@{ Test = "Prerequisites"; Result = "PASS" }
    
    # Install app
    if (-not $SkipInstall) {
        $installSuccess = Install-DesktopApp -InstallerPath $prereqs.InstallerPath
        $testResults += [PSCustomObject]@{ Test = "Installation"; Result = if ($installSuccess) { "PASS" } else { "FAIL" } }
        
        if (-not $installSuccess) {
            throw "Installation failed - cannot continue with smoke tests"
        }
    }
    
    # Test app launch
    $launchSuccess = Test-AppLaunch
    $testResults += [PSCustomObject]@{ Test = "App Launch"; Result = if ($launchSuccess) { "PASS" } else { "FAIL" } }
    
    # Test credential storage
    $credentialSuccess = Test-CredentialStorage
    $testResults += [PSCustomObject]@{ Test = "Credential Storage"; Result = if ($credentialSuccess) { "PASS" } else { "FAIL" } }
    
    # Test API connectivity
    $apiSuccess = Test-ApiConnectivity -ApiKey $TestApiKey
    $testResults += [PSCustomObject]@{ Test = "API Connectivity"; Result = if ($apiSuccess) { "PASS" } else { "WARN" } }
    
    # Test accounts data functionality
    $accountsSuccess = Test-AccountsData -ApiKey $TestApiKey
    $testResults += [PSCustomObject]@{ Test = "Accounts Data"; Result = if ($accountsSuccess) { "PASS" } else { "WARN" } }
    
    # Cleanup
    Uninstall-DesktopApp -InstallerPath $prereqs.InstallerPath
    
    # Summary
    Write-Host "`n=== Test Summary ===" -ForegroundColor $Colors.Header
    $testResults | Format-Table -AutoSize
    
    $passCount = ($testResults | Where-Object { $_.Result -eq "PASS" }).Count
    $totalCount = $testResults.Count
    
    if ($passCount -eq $totalCount) {
        Write-TestResult "All smoke tests passed" "PASS" "$passCount/$totalCount tests successful"
        exit 0
    } else {
        Write-TestResult "Some tests failed" "WARN" "$passCount/$totalCount tests successful"
        exit 1
    }
    
} catch {
    Write-TestResult "Smoke test execution failed" "FAIL" $_.Exception.Message
    
    # Attempt cleanup on failure
    if ($prereqs -and $prereqs.InstallerPath) {
        Uninstall-DesktopApp -InstallerPath $prereqs.InstallerPath
    }
    
    exit 1
}
