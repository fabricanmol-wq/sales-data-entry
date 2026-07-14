@echo off
TITLE Stop Sales Data Entry Server
echo =========================================
echo Stopping Sales Data Entry Server...
echo =========================================
echo.

echo Finding process running on port 8080...
set "ProcessId="
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :8080') DO (
    set ProcessId=%%T
    goto KillProcess
)

echo No server is currently running on port 8080.
pause
exit

:KillProcess
echo Found Server Process ID: %ProcessId%
echo Killing the process...
taskkill /F /PID %ProcessId%
echo.
echo Server has been successfully stopped! You can now close this window.
pause
