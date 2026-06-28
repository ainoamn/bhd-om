import fs from 'node:fs';

const html = fs.readFileSync('legacy/bhd-real-estate/bhd-real-estate.html', 'utf8');
const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
let i = 0;
let bad = 0;
let m;
while ((m = re.exec(html))) {
  const attrs = m[1] || '';
  const inner = m[2];
  if (/type\s*=\s*["']application\/json["']/i.test(attrs)) continue;
  if (/src\s*=/.test(attrs)) continue;
  i++;
  try {
    // eslint-disable-next-line no-new-func
    new Function(inner);
  } catch (e) {
    bad++;
    console.error(`Script block #${i} error: ${e.message}`);
    const lines = inner.split('\n');
    const match = e.message.match(/:(\d+):/);
    if (match) {
      const ln = Number(match[1]);
      for (let j = Math.max(0, ln - 3); j < Math.min(lines.length, ln + 2); j++) {
        console.error(`${j + 1}: ${lines[j]}`);
      }
    }
  }
}
console.log(`Checked ${i} inline script blocks; errors: ${bad}`);
process.exit(bad ? 1 : 0);
