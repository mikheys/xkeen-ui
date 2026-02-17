import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');

const DEFAULT_SETTINGS = {
  host: '192.168.1.1',
  username: 'root',
  port: 22,
  password: '',
  remotePath: '/opt/etc/xray/configs'
};

export async function GET() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf8');
    const saved = JSON.parse(data);
    // Merge saved settings with defaults to ensure no fields are lost
    return NextResponse.json({ ...DEFAULT_SETTINGS, ...saved });
  } catch (error) {
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
}
