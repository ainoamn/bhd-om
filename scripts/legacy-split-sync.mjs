#!/usr/bin/env node
/**
 * Sync split legacy assets from bhd-real-estate.html monolith:
 * - modules/body-raw.html  (HTML between <body> early script and main <script>)
 * - js/app-main.js         (main inline script block)
 * - css/main.css           (inline <style> in head) — if missing/outdated
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'legacy', 'bhd-real-estate');
const MONOLITH = path.join(ROOT, 'bhd-real-estate.html');

function extractBetween(html, startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  if (start < 0) throw new Error(`Missing marker: ${startMarker}`);
  const from = start + startMarker.length;
  const end = html.indexOf(endMarker, from);
  if (end < 0) throw new Error(`Missing end marker: ${endMarker}`);
  return html.slice(from, end);
}

function main() {
  const html = fs.readFileSync(MONOLITH, 'utf8');

  const styleBlock = extractBetween(html, '<style>', '</style>');
  const cssPath = path.join(ROOT, 'css', 'main.css');
  fs.mkdirSync(path.dirname(cssPath), { recursive: true });
  fs.writeFileSync(cssPath, styleBlock.trim() + '\n', 'utf8');
  console.log('wrote', cssPath, `(${Math.round(fs.statSync(cssPath).size / 1024)} KB)`);

  const bodyStart = html.indexOf('<body>');
  const earlyScriptEnd = html.indexOf('</script>', bodyStart);
  const mainScriptStart = html.indexOf('<script>', earlyScriptEnd);
  if (bodyStart < 0 || mainScriptStart < 0) throw new Error('Could not locate body/main script boundaries');

  const bodyInner = html.slice(earlyScriptEnd + '</script>'.length, mainScriptStart).trim();
  const bodyPath = path.join(ROOT, 'modules', 'body-raw.html');
  fs.mkdirSync(path.dirname(bodyPath), { recursive: true });
  fs.writeFileSync(bodyPath, bodyInner + '\n', 'utf8');
  console.log('wrote', bodyPath, `(${Math.round(fs.statSync(bodyPath).size / 1024)} KB)`);

  const jsStart = mainScriptStart + '<script>'.length;
  const jsEnd = html.lastIndexOf('</script>');
  const jsBody = html.slice(jsStart, jsEnd).trim() + '\n';
  const jsPath = path.join(ROOT, 'js', 'app-main.js');
  fs.mkdirSync(path.dirname(jsPath), { recursive: true });
  fs.writeFileSync(jsPath, jsBody, 'utf8');
  console.log('wrote', jsPath, `(${Math.round(fs.statSync(jsPath).size / 1024)} KB)`);

  const shellPath = path.join(ROOT, 'bhd-real-estate-shell.html');
  console.log('shell', shellPath, `(${Math.round(fs.statSync(shellPath).size / 1024)} KB)`);
  console.log('done');
}

main();
