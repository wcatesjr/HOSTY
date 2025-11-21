# PowerShell script to create desktop shortcut for HOSTY
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\wcs2\Desktop\HOSTY.lnk")
$Shortcut.TargetPath = "E:\HOSTY\start-hosty-admin.bat"
$Shortcut.WorkingDirectory = "E:\HOSTY"
$Shortcut.Description = "HOSTY - HOSTS File Manager"
$Shortcut.IconLocation = "C:\Windows\System32\shell32.dll,71"
$Shortcut.Save()

Write-Host "Shortcut created successfully at C:\Users\wcs2\Desktop\HOSTY.lnk"
Write-Host "Note: The application requires administrator privileges to modify HOSTS file."
Write-Host "The shortcut will automatically request admin privileges when clicked."
