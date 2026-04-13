$ProgressPreference = 'SilentlyContinue'
$url = 'https://dev.mysql.com/get/Downloads/MySQLInstaller/mysql-installer-community-8.0.42.0.msi'
$out = 'C:\Users\tmsch\Downloads\mysql-installer.msi'
Write-Host "Downloading MySQL installer..."
try {
    Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
    Write-Host "Downloaded to $out"
} catch {
    Write-Host "Direct download failed, trying alternate..."
    # Try the web installer (smaller, downloads components)
    $url2 = 'https://dev.mysql.com/get/Downloads/MySQLInstaller/mysql-installer-web-community-8.0.42.0.msi'
    try {
        Invoke-WebRequest -Uri $url2 -OutFile $out -UseBasicParsing
        Write-Host "Downloaded web installer to $out"
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)"
    }
}
