import { compare, hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

/** مفتاح `AppSetting` — يُخزَّن bcrypt hash فقط */
export const APP_SETTING_ADMIN_DATA_PIN_KEY = 'admin_data_reset_pin_hash';

const MIN_LEN = 8;

/** القيمة الافتراضية عند أول تشغيل أو بعد تصفير قاعدة البيانات (لا تُعرَض في الواجهة). */
const DEFAULT_ADMIN_DATA_PIN_PLAIN = 'Abdul100189@';

/**
 * يضمن وجود صف رمز الحماية: إن لم يوجد، يُنشأ من `ADMIN_DATA_RESET_PIN` (إن وُجد 8+ أحرف) وإلا من الافتراضي أعلاه.
 */
export async function ensureAdminDataPinReady(): Promise<void> {
  const row = await prisma.appSetting.findUnique({
    where: { key: APP_SETTING_ADMIN_DATA_PIN_KEY },
  });
  if (row) return;

  const envPin = process.env.ADMIN_DATA_RESET_PIN?.trim();
  const plain = envPin && envPin.length >= MIN_LEN ? envPin : DEFAULT_ADMIN_DATA_PIN_PLAIN;
  const h = await hash(plain, 10);
  await prisma.appSetting.create({
    data: {
      key: APP_SETTING_ADMIN_DATA_PIN_KEY,
      value: h,
    },
  });
}

/** بعد تصفير DB مع حذف `AppSetting` — يُعاد دائماً الافتراضي Abdul100189@ (مستقل عن env). */
export async function seedDefaultAdminDataPinAbdul(): Promise<void> {
  const h = await hash(DEFAULT_ADMIN_DATA_PIN_PLAIN, 10);
  await prisma.appSetting.upsert({
    where: { key: APP_SETTING_ADMIN_DATA_PIN_KEY },
    create: { key: APP_SETTING_ADMIN_DATA_PIN_KEY, value: h },
    update: { value: h },
  });
}

export async function isAdminDataPinConfigured(): Promise<boolean> {
  try {
    await ensureAdminDataPinReady();
    return true;
  } catch {
    return false;
  }
}

export async function verifyAdminDataPin(pin: string | undefined): Promise<boolean> {
  await ensureAdminDataPinReady();
  const row = await prisma.appSetting.findUnique({
    where: { key: APP_SETTING_ADMIN_DATA_PIN_KEY },
  });
  if (!row?.value) return false;
  const p = pin ?? '';
  if (p.length < MIN_LEN) return false;
  return compare(p, row.value);
}

export async function changeAdminDataPin(args: {
  currentPin: string;
  newPin: string;
  newPinRepeat: string;
}): Promise<{ ok: true } | { ok: false; code: 'MISMATCH' | 'SHORT' | 'INVALID_CURRENT' }> {
  const { currentPin, newPin, newPinRepeat } = args;
  if (newPin !== newPinRepeat) return { ok: false, code: 'MISMATCH' };
  if (newPin.length < MIN_LEN) return { ok: false, code: 'SHORT' };
  const ok = await verifyAdminDataPin(currentPin);
  if (!ok) return { ok: false, code: 'INVALID_CURRENT' };
  const h = await hash(newPin, 10);
  await prisma.appSetting.upsert({
    where: { key: APP_SETTING_ADMIN_DATA_PIN_KEY },
    create: { key: APP_SETTING_ADMIN_DATA_PIN_KEY, value: h },
    update: { value: h },
  });
  return { ok: true };
}
