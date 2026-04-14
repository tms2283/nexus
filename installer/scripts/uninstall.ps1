#Requires -Version 5.1
<#
.SYNOPSIS
    uninstall.ps1 — Clean removal of Nexus service and data.
    Called by the Inno Setup uninstaller.
#>

$ErrorActionPreference = 'SilentlyContinue'
$ServiceName = 'NexusApp'

# Detect install dir from registry
$InstallDir = (Get-ItemProperty -Path 'HKLM:\SOFTWARE\Nexus' -Name 'InstallPath' -ErrorAction SilentlyContinue)?.InstallPath
$NssmExe    = if ($InstallDir) { "$InstallDir\tools\nssm.exe" } else { $null }

Write-Host "Stopping and removing Nexus service..."

# Stop and remove service
if ($NssmExe -and (Test-Path $NssmExe)) {
    & $NssmExe stop   $ServiceName 2>$null
    Start-Sleep -Seconds 2
    & $NssmExe remove $ServiceName confirm 2>$null
} else {
    # Fallback: use sc.exe
    & sc.exe stop   $ServiceName 2>$null
    Start-Sleep -Seconds 2
    & sc.exe delete $ServiceName 2>$null
}

Write-Host "Service removed."

# Note: we do NOT delete the .env file or database — user data is preserved.
# Inno Setup handles file deletion for tracked files.
Write-Host "Uninstall complete. Your .env and database have been preserved."
exit 0
