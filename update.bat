@echo off
echo --- Updating XKeen Config UI Container ---

:: Проверяем наличие docker-compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not installed or not in PATH!
    pause
    exit /b 1
)

:: Пересобираем и запускаем
docker-compose up -d --build

:: Очистка старых образов
docker image prune -f

echo --- Update Complete! ---
pause
