# Restart server script
Write-Host "Stopping existing Node.js processes on port 3002..."
Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue | ForEach-Object {
    $processId = $_.OwningProcess
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Write-Host "Stopped process $processId"
}

Start-Sleep -Seconds 2

Write-Host "Starting server..."
Set-Location $PSScriptRoot
Start-Process powershell -ArgumentList "-NoExit", "-Command", "node server.js" -WindowStyle Normal

Write-Host "Server should be starting. Check the new window for logs."
