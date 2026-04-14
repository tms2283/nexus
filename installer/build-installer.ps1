<#
.SYNOPSIS
    build-installer.ps1 — Download NSSM, check for Inno Setup, compile nexus.iss.

.DESCRIPTION
    Run this script once from the repo root (or installer/) to produce
    installer\Output\nexus-setup.exe

    Prerequisites:
      - Inno Setup 6 installed (https://jrsoftware.org/isdl.php)
        OR iscc.exe on PATH
      - Internet access (to download NSSM the first time)

.EXAMPLE
    .\installer\build-installer.ps1
#>

$ErrorActionPreference = 'Stop'
$RepoRoot    = Split-Path $PSScriptRoot -Parent
$InstallerDir = "$RepoRoot\installer"

Write-Host "`n=== Nexus Windows Installer Builder ===" -ForegroundColor Cyan

# ── 1. Download NSSM (bundled into installer) ─────────────────────────────────
$NssmDir = "$InstallerDir\tools\nssm-2.24\win64"
if (-not (Test-Path "$NssmDir\nssm.exe")) {
    Write-Host "Downloading NSSM 2.24..."
    New-Item -ItemType Directory -Force -Path "$InstallerDir\tools" | Out-Null
    $nssmZip = "$env:TEMP\nssm-2.24.zip"
    Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile $nssmZip -UseBasicParsing
    Expand-Archive -Path $nssmZip -DestinationPath "$InstallerDir\tools" -Force
    Write-Host "NSSM extracted to $NssmDir"
}

# ── 2. Create placeholder assets (icon + license) ────────────────────────────
$AssetsDir = "$InstallerDir\assets"
New-Item -ItemType Directory -Force -Path $AssetsDir | Out-Null

# If no custom icon exists, skip (Inno Setup handles missing icon gracefully)
if (-not (Test-Path "$AssetsDir\nexus.ico")) {
    Write-Host "No nexus.ico found in installer\assets\ — installer will use default icon." -ForegroundColor Yellow
    Write-Host "  To add a custom icon: place nexus.ico in installer\assets\"
    # Remove icon reference from .iss to avoid compile error
    $issContent = Get-Content "$InstallerDir\nexus.iss" -Raw
    $issContent = $issContent -replace 'SetupIconFile=assets\\nexus\.ico\r?\n', ''
    Set-Content "$InstallerDir\nexus.iss" $issContent -NoNewline
}

# Create a minimal LICENSE file if one doesn't exist
if (-not (Test-Path "$RepoRoot\LICENSE")) {
    $licenseText = @'
MIT License

Copyright (c) 2026 Tim Schmoyer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
'@
    $licenseText | Set-Content "$RepoRoot\LICENSE" -Encoding UTF8
    Write-Host "Created LICENSE file."
}

# ── 3. Find ISCC.exe (Inno Setup Compiler) ───────────────────────────────────
$iscc = Get-Command iscc -ErrorAction SilentlyContinue
if (-not $iscc) {
    $candidates = @(
        "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
        "${env:ProgramFiles}\Inno Setup 6\ISCC.exe",
        "C:\InnoSetup\ISCC.exe"
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) { $iscc = $c; break }
    }
}

if (-not $iscc) {
    Write-Host "`nInno Setup not found." -ForegroundColor Red
    Write-Host "Please install Inno Setup 6 from: https://jrsoftware.org/isdl.php" -ForegroundColor Yellow
    Write-Host "Then re-run this script."
    exit 1
}

Write-Host "Found Inno Setup: $iscc" -ForegroundColor Green

# ── 4. Compile ────────────────────────────────────────────────────────────────
Write-Host "`nCompiling installer..." -ForegroundColor Cyan
$issFile = "$InstallerDir\nexus.iss"

& $iscc $issFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "Compilation failed (exit $LASTEXITCODE)." -ForegroundColor Red
    exit $LASTEXITCODE
}

$output = "$InstallerDir\Output\nexus-setup.exe"
if (Test-Path $output) {
    $size = [math]::Round((Get-Item $output).Length / 1MB, 1)
    Write-Host "`n=== Build complete ===" -ForegroundColor Green
    Write-Host "Output: $output ($size MB)"
    Write-Host "`nTo test: run $output on a Windows machine."
} else {
    Write-Host "Build finished but output file not found at $output" -ForegroundColor Yellow
}
