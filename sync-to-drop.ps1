# ============================================
# sync-to-drop.ps1
# Copy changed/new project files into drop/ directory.
# Baseline = files already in drop. Copy source files that are
# newer than drop, or missing from drop.
# Skip: node_modules / .git / caches / build artifacts / drop itself.
# ============================================

$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot
$drop = Join-Path $src 'drop'

if (-not (Test-Path -LiteralPath $drop)) {
    New-Item -ItemType Directory -Path $drop | Out-Null
}

$excludeDirNames = @('.git', '.claude', '.expo', '$build', 'node_modules', '.gradle', '.kotlin', '.cxx', 'build', 'drop')
$skipTop = @('.git', '.claude', '.expo', '$build', 'node_modules', 'drop')

function Test-ExcludedDir([string]$relativePath) {
    foreach ($seg in $relativePath -split '[\\/]') {
        if ($excludeDirNames -contains $seg) { return $true }
    }
    return $false
}

$copied = 0
$skipped = 0
$failed = @()

$allFiles = Get-ChildItem -LiteralPath $src -Recurse -File -Force -ErrorAction SilentlyContinue

foreach ($f in $allFiles) {
    $rel = $f.FullName.Substring($src.Length).TrimStart('\', '/')

    $topSeg = ($rel -split '[\\/]')[0]
    if ($skipTop -contains $topSeg) { continue }

    if (Test-ExcludedDir $rel) { continue }

    $destPath = Join-Path $drop $rel
    $destDir = Split-Path $destPath -Parent

    $needCopy = $false
    if (-not (Test-Path -LiteralPath $destPath)) {
        $needCopy = $true
    } elseif ($f.LastWriteTimeUtc -gt (Get-Item -LiteralPath $destPath).LastWriteTimeUtc) {
        $needCopy = $true
    }

    if ($needCopy) {
        try {
            if (-not (Test-Path -LiteralPath $destDir)) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
            Copy-Item -LiteralPath $f.FullName -Destination $destPath -Force
            $copied++
        } catch {
            $failed += $rel
        }
    } else {
        $skipped++
    }
}

Write-Host ''
Write-Host '============================================' -ForegroundColor Cyan
Write-Host " sync done: copied $copied, skipped $skipped (unchanged)" -ForegroundColor Cyan
if ($failed.Count -gt 0) {
    Write-Host " failed $($failed.Count):" -ForegroundColor Yellow
    $failed | ForEach-Object { Write-Host "   - $_" -ForegroundColor Yellow }
}
Write-Host '============================================' -ForegroundColor Cyan
