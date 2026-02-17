import { NextResponse } from 'next/server';
import { NodeSSH } from 'node-ssh';
import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

// Функция очистки JSON от служебных полей
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
        
        // Очистка перед записью
        const outbounds = cleanConfig(body.outbounds);
        const routing = cleanConfig(body.routing);

        const timestamp = new Date().getTime();
        const outboundsStr = JSON.stringify(outbounds, null, 2);
        const routingStr = JSON.stringify(routing, null, 2);

        // Временные файлы в контейнере для SFTP
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

        sendLog('Передача файлов на роутер...', 'info');
        const backupTs = new Date().toISOString().replace(/[:.]/g, '-');
        
        await ssh.execCommand(`cp ${settings.remotePath}/04_outbounds.json ${settings.remotePath}/04_outbounds.json.bak-${backupTs}`);
        await ssh.execCommand(`cp ${settings.remotePath}/05_routing.json ${settings.remotePath}/05_routing.json.bak-${backupTs}`);

        // Используем пуленепробиваемый putFile
        await ssh.putFile(tmpOutPath, `${settings.remotePath}/04_outbounds.json`);
        await ssh.putFile(tmpRotPath, `${settings.remotePath}/05_routing.json`);
        
        sendLog('Файлы обновлены.', 'success');

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
