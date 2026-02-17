import { NextResponse } from 'next/server';
import { NodeSSH } from 'node-ssh';
import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

async function getSettings() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

export async function GET() {
  const settings = await getSettings();
  if (!settings) return NextResponse.json({ error: 'Settings not found' }, { status: 400 });

  const ssh = new NodeSSH();
  try {
    await ssh.connect({
      host: settings.host,
      username: settings.username,
      port: settings.port || 22,
      password: settings.password,
    });

    const outbounds = await ssh.execCommand(`cat ${settings.remotePath}/04_outbounds.json`);
    const routing = await ssh.execCommand(`cat ${settings.remotePath}/05_routing.json`);

    await ssh.dispose();

    return NextResponse.json({
      outbounds: JSON.parse(outbounds.stdout.replace(/\/\/.*$/gm, '')), // Basic comment removal for JSON.parse
      routing: JSON.parse(routing.stdout.replace(/\/\/.*$/gm, '')),
      raw: {
        outbounds: outbounds.stdout,
        routing: routing.stdout
      }
    });
  } catch (error: any) {
    console.error('SSH fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
