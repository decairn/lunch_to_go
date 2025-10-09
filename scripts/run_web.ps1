param(
    [switch]$Turbo
)

$repoRoot = Split-Path -Path $PSScriptRoot -Parent
Set-Location -LiteralPath $repoRoot

if ($Turbo) {
    Remove-Item Env:NEXT_DISABLE_TURBOPACK -ErrorAction SilentlyContinue
    corepack pnpm --dir app run dev:turbo
} else {
    $env:NEXT_DISABLE_TURBOPACK = '1'
    corepack pnpm --dir app dev
}
