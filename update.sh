#!/bin/bash
echo "--- Updating XKeen Config UI Container ---"

# Переходим в папку скрипта
cd "$(dirname "$0")"

# Создаем файл настроек, если его нет (предотвращает создание папки Докером)
if [ ! -f settings.json ]; then
    echo "{}" > settings.json
    chmod 666 settings.json
    echo "Created empty settings.json"
fi

# Создаем папку бекапов, если её нет
mkdir -p backups
chmod 777 backups

# Пересобираем и запускаем в фоне
docker compose up -d --build

# Удаляем старые неиспользуемые образы, чтобы не забивать место на MiniPC
docker image prune -f

echo "--- Update Complete! Container is running on port 3000 ---"
