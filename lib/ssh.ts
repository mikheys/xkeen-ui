import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';

const ssh = new NodeSSH();

export async function connectSSH(config: any) {
  try {
    await ssh.connect({
      host: config.host,
      username: config.username,
      port: config.port || 22,
      password: config.password,
    });
    return ssh;
  } catch (error) {
    console.error('SSH connection error:', error);
    throw error;
  }
}

export async function fetchConfigFile(ssh: NodeSSH, remotePath: string) {
  try {
    const content = await ssh.execCommand(`cat ${remotePath}`);
    if (content.stderr) throw new Error(content.stderr);
    return content.stdout;
  } catch (error) {
    console.error(`Error fetching file ${remotePath}:`, error);
    throw error;
  }
}

export async function pushConfigFile(ssh: NodeSSH, remotePath: string, content: string) {
  try {
    // 1. Create backup on router
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await ssh.execCommand(`cp ${remotePath} ${remotePath}.bak-${timestamp}`);
    
    // 2. Write new content
    // We use a temporary file to avoid partial writes
    const tempPath = `/tmp/xkeen_config_temp_${timestamp}`;
    await ssh.execCommand(`echo '${content.replace(/'/g, "'''")}' > ${tempPath}`);
    await ssh.execCommand(`mv ${tempPath} ${remotePath}`);
    
    return true;
  } catch (error) {
    console.error(`Error pushing file ${remotePath}:`, error);
    throw error;
  }
}
