/**
 * يضيف CLOUD_API_URL إلى server/.env إن لم يكن موجوداً.
 * node tools/ensure-server-cloud-env.js [--url http://127.0.0.1:3790]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, 'server', '.env');
const examplePath = path.join(root, 'server', '.env.example');

const args = process.argv.slice(2);
const url =
  args.find((a, i) => args[i - 1] === '--url') || 'http://127.0.0.1:3790';

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(examplePath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log('Created server/.env from .env.example');
  } else {
    fs.writeFileSync(envPath, `PORT=3789\nCLOUD_API_URL=${url}\n`, 'utf8');
    console.log('Created minimal server/.env');
  }
}

let text = fs.readFileSync(envPath, 'utf8');
if (/^CLOUD_API_URL=/m.test(text)) {
  console.log('CLOUD_API_URL already set in server/.env');
  process.exit(0);
}

text = text.replace(/^#\s*CLOUD_API_URL=.*$/m, `CLOUD_API_URL=${url}`);
if (/^CLOUD_API_URL=/m.test(text)) {
  fs.writeFileSync(envPath, text, 'utf8');
  console.log('Uncommented CLOUD_API_URL in server/.env');
  process.exit(0);
}

const line = `CLOUD_API_URL=${url}`;
if (!text.endsWith('\n')) text += '\n';
text += `${line}\n`;
fs.writeFileSync(envPath, text, 'utf8');
console.log('Added to server/.env:', line);
