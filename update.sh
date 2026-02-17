#!/bin/bash
echo "--- Updating XKeen Config UI Container ---"

# Переходим в папку скрипта
cd "$(dirname "$0")"

# Пересобираем и запускаем в фоне
docker-compose up -d --build

# Удаляем старые неиспользуемые образы, чтобы не забивать место на MiniPC
docker image prune -f

echo "--- Update Complete! Container is running on port 3000 ---"
