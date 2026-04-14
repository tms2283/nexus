#Requires -Version 5.1
<#
.SYNOPSIS
    setup-service.ps1 — Register Nexus as a Windows Service using NSSM.
    Optionally starts it and configures autostart.
#>
param(
    [Parameter(Mandatory)][string]$InstallDir,
    [string]$Port         = '3000',
    [string]$StartService = 'true'
)

$ErrorActionPreference = 'Stop'
$LogFile  = "$InstallDir\installer\install-deps.log"
$NssmExe  = "$InstallDir\tools\nssm.exe"
$NodeExe  = (Get-Command node -ErrorAction SilentlyContinue)?.Source
$AppScript = "$InstallDir\dist\index.js"
$ServiceName = 'NexusApp'

function Log($msg) {
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    "$ts  $msg" | Tee-Object -FilePath $LogFile -Append | Write-Host
}

Log "=== Service setup starting ==="

# ── Download NSSM if not already present ─────────────────────────────────────
if (-not (Test-Path $NssmExe)) {
    Log "NSSM not found — downloading nssm-2.24..."
    $nssmDir = "$InstallDir\tools"
    New-Item -ItemType Directory -Force -Path $nssmDir | Out-Null
    $nssmZip = "$env:TEMP\nssm-2.24.zip"
    try {
        Invoke-WebRequest -Uri "https://nssm.cc/release/nssm-2.24.zip" -OutFile $nssmZip -UseBasicParsing -TimeoutSec 30
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [System.IO.Compression.ZipFile]::OpenRead($nssmZip)
        $entry = $zip.Entries | Where-Object { $_.FullName -like "*win64/nssm.exe" } | Select-Object -First 1
        if ($entry) {
            [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $NssmExe, $true)
        }
        $zip.Dispose()
        Log "NSSM downloaded to $NssmExe"
    } catch {
        Log "WARNING: Could not download NSSM: $_"
        Log "Falling back to PowerShell-based service registration..."
        $NssmExe = $null
    }
}

Log "NSSM path: $NssmExe"
Log "Node path:  $NodeExe"

# Verify node and dist/index.js exist
if (-not $NodeExe) {
    Log "ERROR: node.exe not found on PATH after install."
    exit 1
}
if (-not (Test-Path $AppScript)) {
    Log "ERROR: $AppScript not found. Build may have failed."
    exit 1
}
if (-not (Test-Path $NssmExe)) {
    Log "ERROR: NSSM not found at $NssmExe"
    exit 1
}

# ── Remove existing service if present ───────────────────────────────────────
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
    Log "Removing existing $ServiceName service..."
    if ($existing.Status -eq 'Running') {
        if ($NssmExe) { & $NssmExe stop $ServiceName | Out-Null }
        else           { & sc.exe stop $ServiceName | Out-Null }
        Start-Sleep -Seconds 2
    }
    if ($NssmExe) { & $NssmExe remove $ServiceName confirm | Out-Null }
    else           { & sc.exe delete $ServiceName | Out-Null }
    Start-Sleep -Seconds 1
}

# ── Install service ──────────────────────────────────────────────────────────
$LogDir = "$InstallDir\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if ($NssmExe -and (Test-Path $NssmExe)) {
    # ── NSSM path (preferred) ────────────────────────────────────────────────
    Log "Installing $ServiceName via NSSM..."
    & $NssmExe install $ServiceName $NodeExe $AppScript
    & $NssmExe set $ServiceName AppDirectory   $InstallDir
    & $NssmExe set $ServiceName DisplayName    "Nexus Learning Platform"
    & $NssmExe set $ServiceName Description    "Nexus AI-powered learning platform server"
    & $NssmExe set $ServiceName Start          SERVICE_AUTO_START
    & $NssmExe set $ServiceName AppStdout      "$LogDir\nexus-out.log"
    & $NssmExe set $ServiceName AppStderr      "$LogDir\nexus-err.log"
    & $NssmExe set $ServiceName AppRotateFiles 1
    & $NssmExe set $ServiceName AppRotateBytes 10485760
    & $NssmExe set $ServiceName AppRestartDelay 3000
    & $NssmExe set $ServiceName AppEnvironmentExtra "PORT=$Port" "NODE_ENV=production"
} else {
    # ── PowerShell fallback: create service using New-Service ────────────────
    Log "Installing $ServiceName via New-Service (NSSM not available)..."
    $wrapperScript = "$InstallDir\installer\service-wrapper.ps1"
    @"
`$env:PORT = '$Port'
`$env:NODE_ENV = 'production'
Set-Location '$InstallDir'
& '$NodeExe' '$AppScript' *>> '$LogDir\nexus-out.log'
"@ | Set-Content $wrapperScript -Encoding UTF8

    $svcBin = "powershell.exe -ExecutionPolicy Bypass -NoProfile -File `"$wrapperScript`""
    New-Service -Name $ServiceName `
                -BinaryPathName $svcBin `
                -DisplayName "Nexus Learning Platform" `
                -Description "Nexus AI-powered learning platform server" `
                -StartupType Automatic | Out-Null
    Log "Service created via New-Service."
}

Log "Service installed. Starting..."

# ── Start service ─────────────────────────────────────────────────────────────
if ($StartService -eq 'true') {
    & $NssmExe start $ServiceName
    Start-Sleep -Seconds 3

    $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -eq 'Running') {
        Log "Nexus service is running on port $Port."
    } else {
        Log "WARNING: Service may not have started. Check $LogDir\nexus-err.log"
    }
} else {
    Log "Service installed but not started (user choice)."
}

# ── Create convenience cmd stubs ─────────────────────────────────────────────
$cmdsDir = "$InstallDir\installer"
New-Item -ItemType Directory -Force -Path $cmdsDir | Out-Null

@"
@echo off
start http://localhost:$Port
"@ | Set-Content "$cmdsDir\open-browser.cmd" -Encoding ASCII

@"
@echo off
sc start $ServiceName
echo Nexus service started. Open http://localhost:$Port
pause
"@ | Set-Content "$cmdsDir\start-service.cmd" -Encoding ASCII

@"
@echo off
sc stop $ServiceName
echo Nexus service stopped.
pause
"@ | Set-Content "$cmdsDir\stop-service.cmd" -Encoding ASCII

@"
@echo off
type "$LogDir\nexus-out.log" | more
pause
"@ | Set-Content "$cmdsDir\view-logs.cmd" -Encoding ASCII

Log "=== Service setup complete ==="
exit 0
