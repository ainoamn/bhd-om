import { compare, hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

/** مفتاح `AppSetting` — يُخزَّن bcrypt hash فقط */
export const APP_SETTING_ADMIN_DATA_PIN_KEY = 'admin_data_reset_pin_hash';

const MIN_LEN = 8;

function resolveInitialPin(): string {
  const envPin = process.env.ADMIN_DATA_RESET_PIN?.trim();
  if (envPin && envPin.length >= MIN_LEN) return envPin;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'ADMIN_DATA_RESET_PIN must be set (8+ chars) before first use in production. Set it in Vercel Environment Variables.'
    );
  }
  const devPin = process.env.ADMIN_DATA_RESET_PIN_DEV?.trim();
  if (devPin && devPin.length >= MIN_LEN) return devPin;
  throw new Error(
    'ADMIN_DATA_RESET_PIN or ADMIN_DATA_RESET_PIN_DEV (8+ chars) required for admin data operations'
  );
}

/**
 * يضمن وجود صف رمز الحماية — يُنشأ من ADMIN_DATA_RESET_PIN فقط (لا قيمة افتراضية في الكود).
 */
export async function ensureAdminDataPinReady(): Promise<void> {
  const row = await prisma.appSetting.findUnique({
    where: { key: APP_SETTING_ADMIN_DATA_PIN_KEY },
  });
  if (row) return;

  const plain = resolveInitialPin();
  const h = await hash(plain, 10);
  await prisma.appSetting.create({
    data: {
      key: APP_SETTING_ADMIN_DATA_PIN_KEY,
      value: h,
    },
  });
}

/** بعد تصفير DB — يُعاد PIN من env فقط */
export async function seedDefaultAdminDataPinFromEnv(): Promise<void> {
  const plain = resolveInitialPin();
  const h = await hash(plain, 10);
  await prisma.appSetting.upsert({
    where: { key: APP_SETTING_ADMIN_DATA_PIN_KEY },
    create: { key: APP_SETTING_ADMIN_DATA_PIN_KEY, value: h },
    update: { value: h },
  });
}

/** @deprecated استخدم seedDefaultAdminDataPinFromEnv */
export async function seedDefaultAdminDataPinAbdul(): Promise<void> {
  return seedDefaultAdminDataPinFromEnv();
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
