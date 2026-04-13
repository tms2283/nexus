Set WshShell = CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")
Set oShortcut = WshShell.CreateShortcut(strDesktop & "\Nexus.lnk")
oShortcut.TargetPath = "C:\Windows\System32\wscript.exe"
oShortcut.Arguments = Chr(34) & "L:\Website\MANUS2\Launch Nexus (Silent).vbs" & Chr(34)
oShortcut.WorkingDirectory = "L:\Website\MANUS2"
oShortcut.Description = "Launch Nexus AI Learning Platform"
oShortcut.IconLocation = "C:\Windows\System32\shell32.dll,13"
oShortcut.Save
WScript.Echo "Shortcut created on Desktop"
