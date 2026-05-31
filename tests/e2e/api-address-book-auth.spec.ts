import { test, expect } from '@playwright/test';
import type { Contact } from '@/lib/data/addressBook';
import { loginWithCredentials, resolveE2EAdminCredentials } from './helpers/auth';

function buildTestContact(suffix: string, phone: string, serialSeq: string): Contact {
  const year = new Date().getFullYear();
  const now = new Date().toISOString();
  return {
    id: `CNT-E2E-${suffix}`,
    contactType: 'PERSONAL',
    firstName: 'E2E',
    familyName: 'Auth',
    nationality: 'عماني',
    gender: 'MALE',
    phone,
    category: 'CLIENT',
    address: { fullAddress: 'E2E test address' },
    serialNumber: `CNT-C-${year}-${serialSeq}-S1`,
    createdAt: now,
    updatedAt: now,
  };
}

/** CSV بصيغة export — التصنيف في العمود 15 (index 14) */
function buildImportCsv(phone: string): string {
  const header = [
    'الاسم الأول', 'الاسم الثاني', 'الاسم الثالث', 'اسم العائلة', 'الجنسية', 'الجنس', 'الهاتف',
    'هاتف بديل', 'البريد', '', '', '', '', '', 'التصنيف',
  ].join(',');
  const row = [
    'Import', '', '', 'CSV', 'عماني', 'MALE', phone, '', 'e2e-import@example.test',
    '', '', '', '', '', 'CLIENT',
  ].join(',');
  return `${header}\n${row}`;
}

test.describe('API — address book (authenticated admin)', () => {
  test.beforeEach(async ({ page }) => {
    const creds = resolveE2EAdminCredentials();
    test.skip(!creds, 'Missing admin credentials');
    await loginWithCredentials(page, creds!);
  });

  test('GET /api/address-book returns array for admin', async ({ page }) => {
    const res = await page.request.get('/api/address-book');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('POST /api/address-book creates and archives contact', async ({ page }) => {
    const suffix = String(Date.now());
    const phone = `9689${suffix.slice(-7).padStart(7, '0')}`;
    const contact = buildTestContact(suffix, phone, suffix.slice(-4).padStart(4, '0'));

    const createRes = await page.request.post('/api/address-book', {
      data: contact,
    });
    expect(createRes.ok()).toBeTruthy();

    const listRes = await page.request.get('/api/address-book');
    expect(listRes.ok()).toBeTruthy();
    const list = (await listRes.json()) as Contact[];
    expect(list.some((c) => c.id === contact.id)).toBe(true);

    const archived = { ...contact, archived: true, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const archiveRes = await page.request.post('/api/address-book', { data: archived });
    expect(archiveRes.ok()).toBeTruthy();
  });

  test('POST import-csv imports row to server', async ({ page }) => {
    const phone = `9688${String(Date.now()).slice(-7).padStart(7, '0')}`;
    const res = await page.request.post('/api/admin/address-book/import-csv', {
      data: { csv: buildImportCsv(phone) },
    });
    if (!res.ok()) {
      const errBody = await res.text();
      expect(res.ok(), `import-csv failed: ${res.status()} ${errBody.slice(0, 200)}`).toBeTruthy();
    }
    const body = (await res.json()) as { imported?: number; skipped?: number };
    expect(typeof body.imported).toBe('number');
    expect((body.imported ?? 0) + (body.skipped ?? 0)).toBeGreaterThan(0);
  });

  test('merge-duplicates GET summary and POST merge same-phone rows', async ({ page }) => {
    const suffix = String(Date.now());
    const phone = `9687${suffix.slice(-7).padStart(7, '0')}`;
    const a = buildTestContact(`${suffix}-a`, phone, `${suffix.slice(-4)}1`.padStart(4, '0'));
    const b = buildTestContact(`${suffix}-b`, phone, `${suffix.slice(-4)}2`.padStart(4, '0'));

    expect((await page.request.post('/api/address-book', { data: a })).ok()).toBeTruthy();
    expect((await page.request.post('/api/address-book', { data: b })).ok()).toBeTruthy();

    const summaryRes = await page.request.get('/api/admin/address-book/merge-duplicates');
    expect(summaryRes.ok()).toBeTruthy();
    const summary = (await summaryRes.json()) as { groupCount?: number };
    expect((summary.groupCount ?? 0)).toBeGreaterThan(0);

    const mergeRes = await page.request.post('/api/admin/address-book/merge-duplicates');
    expect(mergeRes.ok()).toBeTruthy();
    const merged = (await mergeRes.json()) as { merged?: number };
    expect((merged.merged ?? 0)).toBeGreaterThan(0);
  });

  test('POST ensure-address-book ensures row for user created from contact', async ({ page }) => {
    const suffix = String(Date.now());
    const phone = `9686${suffix.slice(-7).padStart(7, '0')}`;
    const email = `e2e-ensure-${suffix}@example.test`;

    const createRes = await page.request.post('/api/admin/users/create-from-contact', {
      data: {
        name: `E2E Ensure ${suffix}`,
        email,
        phone,
        category: 'CLIENT',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = (await createRes.json()) as { userId?: string };
    const userId = String(created.userId || '').trim();
    expect(userId.length).toBeGreaterThan(4);

    const ensureRes = await page.request.post(`/api/admin/users/${userId}/ensure-address-book`);
    expect(ensureRes.ok()).toBeTruthy();
    const contact = (await ensureRes.json()) as Contact;
    expect(typeof contact.id).toBe('string');
    expect(String(contact.linkedUserId || contact.userId || '')).toBe(userId);

    const linkedRes = await page.request.get(`/api/admin/users/${userId}/linked-contact`);
    expect(linkedRes.ok()).toBeTruthy();
    const linked = (await linkedRes.json()) as Contact;
    expect(linked.id).toBe(contact.id);

    const ensureAgain = await page.request.post(`/api/admin/users/${userId}/ensure-address-book`);
    expect(ensureAgain.ok()).toBeTruthy();
    const contactAgain = (await ensureAgain.json()) as Contact;
    expect(contactAgain.id).toBe(contact.id);
  });
});

test.describe('API — linked-contact (authenticated user)', () => {
  test.beforeEach(async ({ page }) => {
    const creds = resolveE2EAdminCredentials();
    test.skip(!creds, 'Missing admin credentials');
    await loginWithCredentials(page, creds!);
  });

  test('GET /api/user/linked-contact ensures profile row', async ({ page }) => {
    const res = await page.request.get('/api/user/linked-contact');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).not.toBeNull();
    expect(typeof (body as { id?: string }).id).toBe('string');
    expect(String((body as { id?: string }).id).length).toBeGreaterThan(4);
  });

  test('PATCH /api/user/linked-contact updates and persists', async ({ page }) => {
    const marker = `E2E-${Date.now()}`;
    const patchRes = await page.request.patch('/api/user/linked-contact', {
      data: {
        firstName: marker,
        familyName: 'LinkedContact',
        nationality: 'عماني',
        gender: 'MALE',
        email: 'admin@bhd-om.com',
        phone: '96890001111',
        address: { fullAddress: 'E2E linked-contact address' },
      },
    });
    expect(patchRes.ok()).toBeTruthy();
    const saved = (await patchRes.json()) as Contact;
    expect(saved.firstName).toBe(marker);

    const getRes = await page.request.get('/api/user/linked-contact');
    expect(getRes.ok()).toBeTruthy();
    const loaded = (await getRes.json()) as Contact;
    expect(loaded.firstName).toBe(marker);
  });
});
