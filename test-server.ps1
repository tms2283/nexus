$r = Invoke-WebRequest -Uri 'http://localhost:3002/' -UseBasicParsing
Write-Host "Status: $($r.StatusCode)"
Write-Host "Length: $($r.Content.Length)"
