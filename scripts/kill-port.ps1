$Port = 3001

$connections = netstat -ano | findstr ":$Port" | findstr "LISTENING"
if ($connections) {
    $pids = $connections | ForEach-Object {
        $parts = $_ -split '\s+'
        $parts[-1]
    } | Select-Object -Unique
    
    foreach ($pid in $pids) {
        if ($pid -and $pid -ne "0") {
            Write-Host "Killing process $pid on port $Port"
            taskkill /F /PID $pid 2>$null | Out-Null
        }
    }
    Start-Sleep -Milliseconds 500
}

