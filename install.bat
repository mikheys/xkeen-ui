@echo off
echo Installing XKeen Config UI dependencies...
npm install
if %errorlevel% neq 0 (
    echo [ERROR] Installation failed! Make sure Node.js and npm are installed.
    pause
    exit /b 1
)
echo [SUCCESS] Dependencies installed! Run start.bat to begin.
pause
