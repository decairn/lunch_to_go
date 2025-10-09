# Publish the Lunch To Go repository and optional release tag to GitHub.
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$Remote = "origin",
  [string]$Branch,
  [string]$TagName,
  [switch]$SkipTagCreation,
  [switch]$Push,
  [switch]$AllowDirty
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $repoRoot

try {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "git CLI is required but was not found in PATH."
  }

  if (-not $Branch) {
    $Branch = (git branch --show-current).Trim()
  }

  if (-not $Branch) {
    throw "Unable to resolve the current git branch. Please set -Branch explicitly."
  }

  if (-not $TagName) {
    $packageJsonPath = Join-Path $repoRoot "app\package.json"
    if (-not (Test-Path $packageJsonPath)) {
      throw "Unable to locate app\package.json to derive version. Specify -TagName manually."
    }

    $packageJson = Get-Content -Path $packageJsonPath -Raw | ConvertFrom-Json
    $version = $packageJson.version
    if (-not $version) {
      throw "package.json is missing a version field. Specify -TagName manually."
    }

    $TagName = "v$version"
  }

  $status = git status --porcelain
  if ($status -and -not $AllowDirty) {
    throw "Working tree has uncommitted changes. Commit or stash them first, or rerun with -AllowDirty."
  }

  $releaseNotesPath = Join-Path $repoRoot "docs\release-notes.md"
  $tagMessage = "Lunch To Go $TagName release"
  if (-not $SkipTagCreation -and (Test-Path $releaseNotesPath)) {
    $tagMessage = @"
Lunch To Go $TagName release

See docs/release-notes.md for changelog and artifact details.
"@
  }

  Write-Host "Repository root: $repoRoot"
  Write-Host "Remote: $Remote"
  Write-Host "Branch: $Branch"
  Write-Host "Tag: $TagName"
  if ($status) {
    Write-Warning "Working tree contains uncommitted changes."
  }

  if (-not $SkipTagCreation) {
    $tagExists = (git tag -l $TagName) -ne $null
    if ($tagExists) {
      Write-Host "Tag '$TagName' already exists; skipping creation."
    } else {
      if ($PSCmdlet.ShouldProcess("git tag $TagName", "Create annotated release tag")) {
        git tag -a $TagName -m $tagMessage
        Write-Host "Created tag $TagName."
      }
    }
  }

  if ($Push) {
    if ($PSCmdlet.ShouldProcess("git push $Remote $Branch", "Push branch and optional tag")) {
      git push $Remote $Branch
      if (-not $SkipTagCreation) {
        git push $Remote $TagName
      }
    }
  } else {
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  git push $Remote $Branch"
    if (-not $SkipTagCreation) {
      Write-Host "  git push $Remote $TagName"
    }
    Write-Host ""
    Write-Host "Follow GitHub UI steps to:"
    Write-Host "  - Mark the repository public (Settings -> General)."
    Write-Host "  - Enable Issues and Discussions under Settings -> General -> Features."
    Write-Host "  - Draft a GitHub release using docs/release-notes.md and dist artifacts."
  }
}
finally {
  Pop-Location
}
