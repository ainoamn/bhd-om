/**
 * إعداد الوصول من أجهزة الفريق على الشبكة المحلية.
 * node tools/enable-lan-access.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function localIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const list of Object.values(nets)) {
    for (const n of list || []) {
      if (n.family === 'IPv4' && !n.internal) ips.push(n.address);
    }
  }
  return ips;
}

function setEnvKey(filePath, key, value) {
  let text = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const re = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  if (re.test(text)) text = text.replace(re, line);
  else text = `${text.trimEnd()}\n${line}\n`;
  fs.writeFileSync(filePath, text, 'utf8');
}

function appendCorsOrigins(apiEnvPath, origins) {
  let text = fs.readFileSync(apiEnvPath, 'utf8');
  const m = text.match(/^CORS_ORIGINS=(.*)$/m);
  const existing = m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
  const merged = [...new Set([...existing, ...origins])];
  setEnvKey(apiEnvPath, 'CORS_ORIGINS', merged.join(','));
}

const ips = localIps();
const primary = ips[0] || '127.0.0.1';

const serverEnv = path.join(root, 'server', '.env');
const apiEnv = path.join(root, 'apps', 'api', '.env');

if (!fs.existsSync(serverEnv)) {
  fs.copyFileSync(path.join(root, 'server', '.env.example'), serverEnv);
}

setEnvKey(serverEnv, 'HOST', '0.0.0.0');
if (!/^CLOUD_API_URL=/m.test(fs.readFileSync(serverEnv, 'utf8'))) {
  setEnvKey(serverEnv, 'CLOUD_API_URL', 'http://127.0.0.1:3790');
}

if (fs.existsSync(apiEnv)) {
  const cors = [
    'http://localhost:3789',
    'http://127.0.0.1:3789',
    ...ips.map((ip) => `http://${ip}:3789`),
  ];
  appendCorsOrigins(apiEnv, cors);
}

console.log('\nLAN access configured');
console.log('Server HOST=0.0.0.0 (all interfaces)');
console.log('');
console.log('Team URLs (share with staff):');
ips.forEach((ip) => console.log(`  http://${ip}:3789/`));
if (!ips.length) console.log('  (no LAN IP found — check network adapter)');
console.log('');
console.log('On this PC only: http://localhost:3789/');
console.log('');
console.log('Restart: تشغيل-الخادم.cmd');
console.log('If blocked, allow port 3789 in Windows Firewall.');
console.log('');
