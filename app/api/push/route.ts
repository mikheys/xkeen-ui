import { NextResponse } from 'next/server';
import { NodeSSH } from 'node-ssh';
import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');
const BACKUPS_DIR = path.join(process.cwd(), 'backups');

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
        const { outbounds, routing } = body;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

        sendLog('Создание локального бекапа...', 'info');
        await fs.mkdir(BACKUPS_DIR, { recursive: true });
        await fs.writeFile(path.join(BACKUPS_DIR, `04_outbounds_${timestamp}.json`), JSON.stringify(outbounds, null, 2));
        await fs.writeFile(path.join(BACKUPS_DIR, `05_routing_${timestamp}.json`), JSON.stringify(routing, null, 2));

        const ssh = new NodeSSH();
        sendLog(`Подключение к ${settings.host}...`, 'info');
        await ssh.connect({
          host: settings.host,
          username: settings.username,
          port: settings.port || 22,
          password: settings.password,
        });

        sendLog('Запись файлов конфигурации...', 'info');
        // Remote backup
        await ssh.execCommand(`cp ${settings.remotePath}/04_outbounds.json ${settings.remotePath}/04_outbounds.json.bak-${timestamp}`);
        await ssh.execCommand(`cp ${settings.remotePath}/05_routing.json ${settings.remotePath}/05_routing.json.bak-${timestamp}`);
        
        // Write
        await ssh.execCommand(`echo '${JSON.stringify(outbounds, null, 2).replace(/'/g, "'\\''")}' > ${settings.remotePath}/04_outbounds.json`);
        await ssh.execCommand(`echo '${JSON.stringify(routing, null, 2).replace(/'/g, "'\\''")}' > ${settings.remotePath}/05_routing.json`);

        sendLog('Перезапуск сервиса xkeen...', 'info');
        const restartResult = await ssh.execCommand('xkeen -restart');
        
        // --- SMART ERROR DETECTION ---
        const output = restartResult.stdout + restartResult.stderr;
        if (output.toLowerCase().includes('failed') || output.includes('Не удалось запустить') || output.includes('error')) {
          sendLog('ВНИМАНИЕ: Ошибка при запуске Xray!', 'error');
          const lines = output.split('\n');
          lines.slice(-5).forEach(line => {
            if (line.trim()) sendLog(`Роутер: ${line}`, 'error');
          });
          sendLog('Проверьте правильность тегов GeoIP/Geosite.', 'error');
        } else {
          sendLog('Конфигурация успешно применена!', 'success');
        }
        
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
