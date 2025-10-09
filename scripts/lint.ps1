param()

$repoRoot = Split-Path -Path $PSScriptRoot -Parent
Set-Location -LiteralPath $repoRoot

corepack pnpm --dir app lint
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

corepack pnpm audit --dir app --prod
