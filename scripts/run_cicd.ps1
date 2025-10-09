param(
    [switch]$IncludeDesktopHardening,
    [string]$SmokeTestApiKey
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Path $PSScriptRoot -Parent
Set-Location -LiteralPath $repoRoot

$scriptsDir = Join-Path $repoRoot "scripts"

function Invoke-Step {
    param(
        [string]$Name,
        [string]$ScriptName,
        [string[]]$Arguments = @()
    )

    $scriptPath = Join-Path $scriptsDir $ScriptName

    if (-not (Test-Path -LiteralPath $scriptPath)) {
        throw "Script '$ScriptName' not found at $scriptPath."
    }

    Write-Host ""
    Write-Host "=== Running $Name ===" -ForegroundColor Cyan

    & $scriptPath @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Step '$Name' failed with exit code $LASTEXITCODE."
    }

    Write-Host "=== Completed $Name ===" -ForegroundColor Green
}

$ciSteps = @(
    @{ Name = "Lint & Audit"; Script = "lint.ps1"; Args = @() },
    @{ Name = "Unit & Component Tests"; Script = "test.ps1"; Args = @() },
    @{ Name = "Playwright E2E Suite"; Script = "playwright.ps1"; Args = @() },
    @{ Name = "Next.js Production Build"; Script = "build-web.ps1"; Args = @() },
    @{ Name = "Desktop Packaging"; Script = "package-desktop.ps1"; Args = @() },
    @{ Name = "Documentation Refresh"; Script = "docs-refresh.ps1"; Args = @() }
)

foreach ($step in $ciSteps) {
    Invoke-Step -Name $step.Name -ScriptName $step.Script -Arguments $step.Args
}

if ($IncludeDesktopHardening) {
    $smokeArgs = @()
    if ($SmokeTestApiKey) {
        $smokeArgs += @("-TestApiKey", $SmokeTestApiKey)
    }

    Invoke-Step -Name "Desktop Smoke Tests" -ScriptName "smoke-test-desktop.ps1" -Arguments $smokeArgs
}

Write-Host ""
Write-Host "All requested CI/CD steps completed successfully." -ForegroundColor Green
