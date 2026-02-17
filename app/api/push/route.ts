import { NextResponse } from 'next/server';
import { NodeSSH } from 'node-ssh';
import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');
const BACKUPS_DIR = path.join(process.cwd(), 'backups');

function cleanConfig(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanConfig);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (!key.startsWith('_')) {
        newObj[key] = cleanConfig(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
        controller.enqueue(encoder.encode(JSON.stringify({ msg, type }) + '\n'));
      };

      try {
        const settingsData = await fs.readFile(SETTINGS_FILE, 'utf8');
        const settings = JSON.parse(settingsData);
        const body = await req.json();
        
        const outboundsClean = cleanConfig(body.outbounds);
        const routingClean = cleanConfig(body.routing);

        const timestamp = new Date().getTime();
        const isoDate = new Date().toISOString().replace(/[:.]/g, '-');
        const outboundsStr = JSON.stringify(outboundsClean, null, 2);
        const routingStr = JSON.stringify(routingClean, null, 2);

        // 1. Создаем локальный бекап на МиниПК (это основной архив)
        sendLog('Создание локального бекапа...', 'info');
        await fs.mkdir(BACKUPS_DIR, { recursive: true });
        await fs.writeFile(path.join(BACKUPS_DIR, `04_outbounds_${isoDate}.json`), outboundsStr);
        await fs.writeFile(path.join(BACKUPS_DIR, `05_routing_${isoDate}.json`), routingStr);

        const tmpOutPath = `/tmp/out_${timestamp}.json`;
        const tmpRotPath = `/tmp/rot_${timestamp}.json`;
        await fs.writeFile(tmpOutPath, outboundsStr);
        await fs.writeFile(tmpRotPath, routingStr);

        const ssh = new NodeSSH();
        sendLog(`Подключение к ${settings.host}...`, 'info');
        await ssh.connect({
          host: settings.host,
          username: settings.username,
          port: settings.port || 22,
          password: settings.password,
        });

        // БЕКАП НА РОУТЕРЕ УДАЛЕН ДЛЯ СОХРАНЕНИЯ ЧИСТОТЫ ПАПОК
        sendLog('Обновление файлов на роутере...', 'info');
        await ssh.putFile(tmpOutPath, `${settings.remotePath}/04_outbounds.json`);
        await ssh.putFile(tmpRotPath, `${settings.remotePath}/05_routing.json`);
        
        sendLog('Файлы успешно обновлены.', 'success');

        await fs.unlink(tmpOutPath);
        await fs.unlink(tmpRotPath);

        sendLog('Перезапуск xkeen...', 'info');
        const restartResult = await ssh.execCommand('xkeen -restart');
        sendLog('Готово! Изменения применены.', 'success');
        
        await ssh.dispose();
        controller.close();
      } catch (error: any) {
        sendLog(`ОШИБКА: ${error.message}`, 'error');
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } });
}
