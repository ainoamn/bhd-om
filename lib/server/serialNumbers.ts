import { prisma } from '@/lib/prisma';

const DEFAULT_PAD = 4;

export function buildSerialCounterKey(typeCode: string, year = new Date().getFullYear()): string {
  return `BHD-${year}-${typeCode}`;
}

export function formatBhdSerial(typeCode: string, sequence: number, year = new Date().getFullYear(), pad = DEFAULT_PAD): string {
  return `BHD-${year}-${typeCode}-${String(sequence).padStart(pad, '0')}`;
}

export function isValidBhdSerial(serial: string | null | undefined): boolean {
  return /^BHD-\d{4}-[A-Z0-9-]+-\d{4,6}$/i.test(String(serial || '').trim());
}

export async function generateBhdSerial(typeCode: string, options?: { year?: number; pad?: number }) {
  const year = options?.year ?? new Date().getFullYear();
  const pad = options?.pad ?? DEFAULT_PAD;
  const key = buildSerialCounterKey(typeCode, year);
  const counter = await prisma.serialCounter.upsert({
    where: { key },
    create: { key, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
  });
  return formatBhdSerial(typeCode, counter.lastValue, year, pad);
}
