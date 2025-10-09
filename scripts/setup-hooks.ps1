param(
    [switch]$Force
)

$repoRoot = Split-Path -Path $PSScriptRoot -Parent
$hooksDir = Join-Path $repoRoot '.git/hooks'
if (-not (Test-Path $hooksDir)) {
    Write-Error "Git hooks directory not found. Initialize git in the repo before running this script." -Category ObjectNotFound
    exit 1
}

$hookPath = Join-Path $hooksDir 'pre-commit'
if ((Test-Path $hookPath) -and -not $Force) {
    Write-Host 'pre-commit hook already exists. Re-run with -Force to overwrite.' -ForegroundColor Yellow
    exit 0
}

$hookLines = @(
    '#!/bin/sh',
    'set -eu',
    '',
    'SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"',
    'REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"',
    '',
    'if command -v pwsh >/dev/null 2>&1; then',
    '  PWSH="pwsh"',
    'elif command -v powershell.exe >/dev/null 2>&1; then',
    '  PWSH="powershell.exe"',
    'else',
    '  echo "PowerShell is required to run repo hooks." >&2',
    '  exit 1',
    'fi',
    '',
    'run_pwsh() {',
    '  local script_path="$1"',
    '  if command -v cygpath >/dev/null 2>&1; then',
    '    script_path="$(cygpath -w "$script_path")"',
    '  fi',
    '  if [ "$PWSH" = "pwsh" ]; then',
    '    "$PWSH" -NoLogo -NoProfile -File "$script_path" || exit 1',
    '  else',
    '    "$PWSH" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "$script_path" || exit 1',
    '  fi',
    '}',
    '',
    'run_pwsh "$REPO_ROOT/scripts/lint.ps1"',
    'run_pwsh "$REPO_ROOT/scripts/docs-refresh.ps1"',
    '',
    'exit 0'
)

Set-Content -LiteralPath $hookPath -Value $hookLines -Encoding UTF8
Write-Host "pre-commit hook written to $hookPath" -ForegroundColor Green
