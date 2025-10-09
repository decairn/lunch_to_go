param()

$repoRoot = Split-Path -Path $PSScriptRoot -Parent
Set-Location -LiteralPath $repoRoot

if (-not (Test-Path '.prettierrc')) {
  Write-Warning 'Prettier config not found; skipping docs formatting.'
  return
}

$directories = @('docs', 'specs')
$files = foreach ($dir in $directories) {
  if (Test-Path $dir) {
    Get-ChildItem -Path $dir -Recurse -Filter '*.md' -File -ErrorAction SilentlyContinue
  }
}

if (-not $files) {
  Write-Warning 'No documentation files found; skipping Prettier.'
  return
}

$prettierArgs = @('--cache', '--write') + ($files | ForEach-Object { $_.FullName })
$pnpmArgs = @('pnpm', '--dir', 'app', 'exec', '--', 'prettier') + $prettierArgs
& corepack @pnpmArgs
