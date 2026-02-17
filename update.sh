#!/bin/bash
echo "--- Updating XKeen Config UI ---"

cd "$(dirname "$0")"

echo "Fetching latest changes from GitHub..."
git checkout update.sh Dockerfile docker-compose.yml 2>/dev/null
git pull origin main

if [ ! -f settings.json ]; then
    echo "{}" > settings.json
    chmod 666 settings.json
fi

mkdir -p backups
chmod 777 backups 2>/dev/null

echo "Rebuilding Docker container..."
docker compose up -d --build
docker image prune -f

echo "--- Update Complete! ---"
