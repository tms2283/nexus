$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'

$mariaDir = "C:\mariadb"
$dataDir = "$mariaDir\data"

if (Test-Path "$mariaDir\bin\mysqld.exe") {
    Write-Host "MariaDB already at $mariaDir"
    exit 0
}

Write-Host "Downloading MariaDB 11.4 (portable ZIP)..."
$url = "https://archive.mariadb.org/mariadb-11.4.5/winx64-packages/mariadb-11.4.5-winx64.zip"
$zip = "$env:TEMP\mariadb.zip"

Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
Write-Host "Downloaded. Extracting..."

if (-not (Test-Path $mariaDir)) { New-Item -ItemType Directory -Path $mariaDir -Force | Out-Null }
Expand-Archive -Path $zip -DestinationPath "$env:TEMP\mariadb-extract" -Force

$inner = Get-ChildItem "$env:TEMP\mariadb-extract" | Select-Object -First 1
Copy-Item "$($inner.FullName)\*" $mariaDir -Recurse -Force

Write-Host "Extracted to $mariaDir"
Write-Host "Initializing data directory..."

& "$mariaDir\bin\mariadb-install-db.exe" --datadir=$dataDir --password="" 2>&1

Write-Host "MariaDB ready."
