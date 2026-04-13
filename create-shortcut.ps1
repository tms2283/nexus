$desktopPath = "C:\Users\tmsch\OneDrive\Desktop"
$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut("$desktopPath\Nexus.lnk")
$shortcut.TargetPath = "C:\Windows\System32\wscript.exe"
$shortcut.Arguments = "`"L:\Website\MANUS2\Launch Nexus (Silent).vbs`""
$shortcut.WorkingDirectory = "L:\Website\MANUS2"
$shortcut.Description = "Launch Nexus AI Learning Platform"
$shortcut.IconLocation = "C:\Windows\System32\shell32.dll,13"
$shortcut.Save()
Write-Host "Nexus shortcut created/updated on Desktop"
