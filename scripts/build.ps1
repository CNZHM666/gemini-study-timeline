[CmdletBinding()]
param(
  [switch]$SkipDownload,
  [switch]$SkipZip,
  [string]$MarkedUrl = "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
  [string]$HighlightUrl = "https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/common.min.js"
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

function Download-File {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$OutputPath
  )

  $tmpPath = "$OutputPath.tmp"
  if (Test-Path $tmpPath) {
    Remove-Item -LiteralPath $tmpPath -Force
  }

  Write-Host "[download] $Url -> $OutputPath"
  Invoke-WebRequest -Uri $Url -OutFile $tmpPath -UseBasicParsing

  if (-not (Test-Path $tmpPath)) {
    throw "Download failed: temp file was not created: $tmpPath"
  }

  $size = (Get-Item -LiteralPath $tmpPath).Length
  if ($size -lt 1024) {
    throw "Download failed: file is too small ($size bytes). Check the network or CDN URL."
  }

  Move-Item -LiteralPath $tmpPath -Destination $OutputPath -Force
  Write-Host ("[ok] saved {0} ({1} bytes)" -f $OutputPath, $size)
}

$vendorDir = Join-Path $rootDir "vendor"
New-Item -ItemType Directory -Path $vendorDir -Force | Out-Null

$markedPath = Join-Path $vendorDir "marked.min.js"
$highlightPath = Join-Path $vendorDir "highlight.min.js"

if (-not $SkipDownload) {
  Download-File -Url $MarkedUrl -OutputPath $markedPath
  Download-File -Url $HighlightUrl -OutputPath $highlightPath
} else {
  Write-Host "[skip] dependency download skipped"
}

$manifestPath = Join-Path $rootDir "manifest.json"
if (-not (Test-Path $manifestPath)) {
  throw "manifest.json not found: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if (-not $manifest.version) {
  throw "manifest.json is missing the version field"
}

if (-not $SkipZip) {
  $archiveInputs = @(
    "manifest.json",
    "background.js",
    "content.js",
    "perf-bridge.js",
    "sidepanel.html",
    "sidepanel.js",
    "style.css",
    "workbench-override.css",
    "README.md",
    "LICENSE",
    "package.json",
    "vendor/marked.min.js",
    "vendor/highlight.min.js",
    "vendor/mathjax-config.js",
    "vendor/mathjax-tex-svg.js",
    "vendor/README.md"
  )

  $missing = @()
  foreach ($relPath in $archiveInputs) {
    $absPath = Join-Path $rootDir $relPath
    if (-not (Test-Path -LiteralPath $absPath)) {
      $missing += $relPath
    }
  }

  if ($missing.Count -gt 0) {
    throw "Packaging validation failed. Missing files: $($missing -join ', ')"
  }

  $distDir = Join-Path $rootDir "dist"
  New-Item -ItemType Directory -Path $distDir -Force | Out-Null

  $zipName = "gemini-study-timeline-v$($manifest.version).zip"
  $zipPath = Join-Path $distDir $zipName

  $stagingDir = Join-Path $rootDir ".package-temp"
  if (Test-Path -LiteralPath $stagingDir) {
    Remove-Item -LiteralPath $stagingDir -Recurse -Force
  }
  New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null

  foreach ($relPath in $archiveInputs) {
    $src = Join-Path $rootDir $relPath
    $dst = Join-Path $stagingDir $relPath
    $dstDir = Split-Path -Parent $dst

    if (-not (Test-Path -LiteralPath $dstDir)) {
      New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
    }

    Copy-Item -LiteralPath $src -Destination $dst -Force
  }

  if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
  }

  Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $zipPath -CompressionLevel Optimal
  Remove-Item -LiteralPath $stagingDir -Recurse -Force

  Write-Host "[done] package created: $zipPath"
} else {
  Write-Host "[skip] zip packaging skipped"
}
