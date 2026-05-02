[CmdletBinding()]
param(
  [ValidateSet("patch", "minor", "major")]
  [string]$Bump = "patch",
  [string]$Notes = "Automated release: version bump, checks, and packaging.",
  [switch]$SkipDownload,
  [switch]$DryRun,
  [switch]$OpenDist
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = if (Test-Path (Join-Path $scriptDir "manifest.json")) {
  $scriptDir
} else {
  Split-Path -Parent $scriptDir
}
Set-Location $rootDir

$manifestPath = Join-Path $rootDir "manifest.json"
$changelogPath = Join-Path $rootDir "CHANGELOG.md"
$buildScriptPath = Join-Path $scriptDir "build.ps1"

function Assert-PathExists {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Label
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "$Label does not exist: $Path"
  }
}

function Assert-CommandExists {
  param([Parameter(Mandatory = $true)][string]$CommandName)

  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if (-not $command) {
    throw "Command not found: $CommandName. Please install it and add to PATH."
  }
}

function Read-JsonObject {
  param([Parameter(Mandatory = $true)][string]$Path)

  $raw = Get-Content -LiteralPath $Path -Raw
  while ($raw.Length -gt 0 -and $raw[0] -eq [char]0xFEFF) {
    $raw = $raw.Substring(1)
  }
  return ($raw | ConvertFrom-Json)
}

function Write-Utf8NoBomFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $text = $Content
  while ($text.Length -gt 0 -and $text[0] -eq [char]0xFEFF) {
    $text = $text.Substring(1)
  }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $text, $utf8NoBom)
}

function Get-BumpedVersion {
  param(
    [Parameter(Mandatory = $true)][string]$Version,
    [Parameter(Mandatory = $true)][string]$Level
  )

  $parts = $Version.Split(".")
  if ($parts.Count -ne 3) {
    throw "manifest version must be x.y.z. Current: $Version"
  }

  [int]$major = $parts[0]
  [int]$minor = $parts[1]
  [int]$patch = $parts[2]

  switch ($Level) {
    "major" {
      $major += 1
      $minor = 0
      $patch = 0
      break
    }
    "minor" {
      $minor += 1
      $patch = 0
      break
    }
    default {
      $patch += 1
      break
    }
  }

  return "$major.$minor.$patch"
}

function Update-ManifestVersion {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$OldVersion,
    [Parameter(Mandatory = $true)][string]$NewVersion,
    [Parameter(Mandatory = $true)][bool]$IsDryRun
  )

  $manifestObj = Read-JsonObject -Path $Path
  if (-not $manifestObj.version) {
    throw "manifest.json missing version"
  }

  if ($manifestObj.version -ne $OldVersion) {
    throw "manifest.json version mismatch. expected $OldVersion, got $($manifestObj.version)"
  }

  if ($IsDryRun) {
    Write-Host "[dry-run] manifest version: $OldVersion -> $NewVersion"
    return
  }

  $manifestObj.version = $NewVersion
  $updated = $manifestObj | ConvertTo-Json -Depth 20
  Write-Utf8NoBomFile -Path $Path -Content $updated
  Write-Host "[ok] manifest version: $OldVersion -> $NewVersion"
}

function Update-Changelog {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Version,
    [Parameter(Mandatory = $true)][string]$NotesText,
    [Parameter(Mandatory = $true)][bool]$IsDryRun
  )

  $today = Get-Date -Format "yyyy-MM-dd"
  $entryTitle = "## v$Version - $today"
  $entryBody = "$entryTitle`r`n- $NotesText`r`n`r`n"

  if (-not (Test-Path -LiteralPath $Path)) {
    $base = "# Changelog`r`n`r`n$entryBody"
    if ($IsDryRun) {
      Write-Host "[dry-run] CHANGELOG.md will be created with $entryTitle"
      return
    }

    Write-Utf8NoBomFile -Path $Path -Content $base
    Write-Host "[ok] created CHANGELOG.md with $entryTitle"
    return
  }

  $raw = Get-Content -LiteralPath $Path -Raw
  if ($raw -match [Regex]::Escape($entryTitle)) {
    Write-Host "[skip] CHANGELOG already contains $entryTitle"
    return
  }

  if ($raw -notmatch '^#\s+Changelog') {
    $raw = "# Changelog`r`n`r`n$raw"
  }

  $lines = $raw -split "`r?`n"
  $headerLineCount = 1
  if ($lines.Count -ge 2 -and [string]::IsNullOrWhiteSpace($lines[1])) {
    $headerLineCount = 2
  }

  $prefix = ($lines[0..($headerLineCount - 1)] -join "`r`n")
  $rest = ""
  if ($lines.Count -gt $headerLineCount) {
    $rest = ($lines[$headerLineCount..($lines.Count - 1)] -join "`r`n").TrimStart()
  }

  $updated = "$prefix`r`n$entryBody$rest"

  if ($IsDryRun) {
    Write-Host "[dry-run] CHANGELOG entry to add: $entryTitle"
    return
  }

  Write-Utf8NoBomFile -Path $Path -Content $updated
  Write-Host "[ok] CHANGELOG updated: $entryTitle"
}

function Run-PreflightChecks {
  param(
    [Parameter(Mandatory = $true)][string]$RootDir,
    [Parameter(Mandatory = $true)][string]$BuildScriptPath
  )

  $requiredFiles = @(
    "manifest.json",
    "background.js",
    "content.js",
    "perf-bridge.js",
    "sidepanel.js",
    "sidepanel.html",
    "style.css"
  )

  foreach ($file in $requiredFiles) {
    Assert-PathExists -Path (Join-Path $RootDir $file) -Label "Required file"
  }
  Assert-PathExists -Path $BuildScriptPath -Label "build.ps1"

  Assert-CommandExists -CommandName "node"

  Write-Host "[check] node --check content.js"
  & node --check (Join-Path $RootDir "content.js")
  if ($LASTEXITCODE -ne 0) {
    throw "content.js syntax check failed"
  }

  Write-Host "[check] node --check sidepanel.js"
  & node --check (Join-Path $RootDir "sidepanel.js")
  if ($LASTEXITCODE -ne 0) {
    throw "sidepanel.js syntax check failed"
  }

  Write-Host "[check] node --check perf-bridge.js"
  & node --check (Join-Path $RootDir "perf-bridge.js")
  if ($LASTEXITCODE -ne 0) {
    throw "perf-bridge.js syntax check failed"
  }

  $manifestObj = Read-JsonObject -Path (Join-Path $RootDir "manifest.json")
  if (-not $manifestObj.version) {
    throw "manifest.json missing version"
  }

  Write-Host "[ok] preflight checks passed"
}

Assert-PathExists -Path $manifestPath -Label "manifest.json"
Assert-PathExists -Path $buildScriptPath -Label "build.ps1"

$manifestObj = Read-JsonObject -Path $manifestPath
$oldVersion = [string]$manifestObj.version
if ($oldVersion -notmatch '^\d+\.\d+\.\d+$') {
  throw "Could not parse version from manifest.json (expected x.y.z)."
}
$newVersion = Get-BumpedVersion -Version $oldVersion -Level $Bump
$targetZip = Join-Path $rootDir ("dist\gemini-study-timeline-v$newVersion.zip")

Write-Host "[info] release level: $Bump"
Write-Host "[info] version: $oldVersion -> $newVersion"

Run-PreflightChecks -RootDir $rootDir -BuildScriptPath $buildScriptPath
Update-ManifestVersion -Path $manifestPath -OldVersion $oldVersion -NewVersion $newVersion -IsDryRun:$DryRun
Update-Changelog -Path $changelogPath -Version $newVersion -NotesText $Notes -IsDryRun:$DryRun

if ($DryRun) {
  if ($OpenDist) {
    Write-Host "[dry-run] dist folder will not be opened in dry-run mode"
  }
  Write-Host "[dry-run] build not executed. target: $targetZip"
  exit 0
}

Write-Host "[info] running build.ps1..."
& $buildScriptPath -SkipDownload:$SkipDownload
if ($LASTEXITCODE -ne 0) {
  throw "build.ps1 failed"
}

Write-Host "[done] release completed"
Write-Host "[done] package: $targetZip"

if ($OpenDist) {
  $distDir = Join-Path $rootDir "dist"
  if (Test-Path -LiteralPath $distDir) {
    Write-Host "[info] opening dist folder: $distDir"
    Start-Process explorer.exe $distDir
  } else {
    Write-Warning "dist folder not found: $distDir"
  }
}
