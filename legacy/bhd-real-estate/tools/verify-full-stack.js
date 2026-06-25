/**
 * فحص الواجهة + البروكسي السحابي (مسار المستخدم الحقيقي).
 * node tools/verify-full-stack.js [--web http://127.0.0.1:3789]
 */
import './load-api-env.js';

const args = process.argv.slice(2);
const webBase = (
  args.find((a, i) => args[i - 1] === '--web') ||
  process.env.WEB_URL ||
  'http://127.0.0.1:3789'
).replace(/\/$/, '');

async function check(label, url, opts) {
  try {
    const r = await fetch(url, opts);
    const ok = r.ok;
    console.log(ok ? `  ✓ ${label}` : `  ✗ ${label} — HTTP ${r.status}`);
    return ok;
  } catch (e) {
    console.error(`  ✗ ${label} — ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('\nBHD Full Stack (web + cloud proxy)');
  console.log('Web:', webBase);

  const results = [];
  results.push(await check('Web health', `${webBase}/api/health`));
  results.push(await check('HTML', `${webBase}/`));
  results.push(await check('Cloud proxy /api/v1/health', `${webBase}/api/v1/health`));

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@bhd.local';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin1234!';

  try {
    const r = await fetch(`${webBase}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (data.accessToken) {
      console.log('  ✓ Login via proxy');
      results.push(true);
      const h = { Authorization: `Bearer ${data.accessToken}` };
      results.push(await check('Units summary via proxy', `${webBase}/api/v1/units/summary`, { headers: h }));
    } else {
      console.log('  ✗ Login via proxy');
      results.push(false);
    }
  } catch (e) {
    console.error('  ✗ Login via proxy —', e.message);
    results.push(false);
  }

  const failed = results.filter((x) => !x).length;
  console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed — same path as browsers.');
  process.exit(failed ? 1 : 0);
}

main();
