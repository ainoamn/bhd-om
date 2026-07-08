#!/usr/bin/env node
/** One-time maintainer: replace raw NEXTAUTH_SECRET with getAuthSecret() in app/api */
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(process.cwd(), 'app', 'api');
const DEV_FALLBACK =
  /process\.env\.NEXTAUTH_SECRET\s*\|\|\s*\(process\.env\.NODE_ENV === 'development' \? 'bhd-dev-secret-not-for-production' : undefined\)/g;

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (name === 'route.ts') files.push(p);
  }
  return files;
}

const importLine = "import { getAuthSecret } from '@/lib/server/authSecret';";

for (const file of walk(root)) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('process.env.NEXTAUTH_SECRET')) continue;
  if (file.includes('check-env')) continue;

  src = src.replace(DEV_FALLBACK, 'getAuthSecret()');
  src = src.replace(/secret:\s*process\.env\.NEXTAUTH_SECRET/g, 'secret: getAuthSecret()');
  src = src.replace(/const secret = process\.env\.NEXTAUTH_SECRET;/g, 'const secret = getAuthSecret();');

  if (src.includes('getAuthSecret()') && !src.includes(importLine)) {
    const lines = src.split('\n');
    let insertAt = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) insertAt = i + 1;
      else if (lines[i].trim() === '' && insertAt > 0) break;
      else if (!lines[i].startsWith('import ') && lines[i].trim() !== '') break;
    }
    lines.splice(insertAt, 0, importLine);
    src = lines.join('\n');
  }

  fs.writeFileSync(file, src);
  console.log('updated', path.relative(process.cwd(), file));
}
