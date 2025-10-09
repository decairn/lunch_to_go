param()

$repoRoot = Split-Path -Path $PSScriptRoot -Parent
Set-Location -LiteralPath $repoRoot

corepack pnpm --dir app test
