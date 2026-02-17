@echo off
echo Starting XKeen Config UI...
npm run dev
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start server! Try running install.bat first.
    pause
    exit /b 1
)
pause
