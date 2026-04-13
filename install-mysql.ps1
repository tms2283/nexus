$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'

$mysqlDir = "C:\mysql"
$dataDir = "$mysqlDir\data"

# Check if already extracted
if (Test-Path "$mysqlDir\bin\mysqld.exe") {
    Write-Host "MySQL already installed at $mysqlDir"
    exit 0
}

Write-Host "Downloading MySQL 8.0 ZIP (no-install)..."
$url = "https://cdn.mysql.com/Downloads/MySQL-8.0/mysql-8.0.42-winx64.zip"
$zip = "$env:TEMP\mysql.zip"

try {
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    Write-Host "Downloaded. Extracting..."
} catch {
    Write-Host "CDN failed, trying alternate mirror..."
    $url2 = "https://downloads.mysql.com/archives/get/p/23/file/mysql-8.0.40-winx64.zip"
    Invoke-WebRequest -Uri $url2 -OutFile $zip -UseBasicParsing
}

# Extract
if (-not (Test-Path $mysqlDir)) { New-Item -ItemType Directory -Path $mysqlDir -Force | Out-Null }
Expand-Archive -Path $zip -DestinationPath "$env:TEMP\mysql-extract" -Force

# Move inner folder contents to C:\mysql
$inner = Get-ChildItem "$env:TEMP\mysql-extract" | Select-Object -First 1
Copy-Item "$($inner.FullName)\*" $mysqlDir -Recurse -Force

Write-Host "MySQL extracted to $mysqlDir"
Write-Host "Initializing data directory..."

# Initialize MySQL
& "$mysqlDir\bin\mysqld.exe" --initialize-insecure --basedir=$mysqlDir --datadir=$dataDir 2>&1

Write-Host "Done. MySQL ready at $mysqlDir\bin\mysqld.exe"
