import { prisma } from '@/lib/prisma';
import { generateBhdSerial, isValidBhdSerial } from '@/lib/server/serialNumbers';

const PROP_TYPE: Record<string, string> = {
  RENT: 'R',
  SALE: 'S',
  INVESTMENT: 'I',
};

const PROJ_STATUS: Record<string, string> = {
  PLANNING: 'P',
  UNDER_DEVELOPMENT: 'D',
  UNDER_CONSTRUCTION: 'UC',
  COMPLETED: 'C',
};

export async function ensurePropertySerialNumber(p: {
  id: string;
  type: string;
  serialNumber: string;
}): Promise<string> {
  if (isValidBhdSerial(p.serialNumber)) return p.serialNumber;
  const code = PROP_TYPE[p.type] ?? 'X';
  const serial = await generateBhdSerial(`PRP-${code}`);
  await prisma.property.update({ where: { id: p.id }, data: { serialNumber: serial } });
  return serial;
}

export async function ensureProjectSerialNumber(p: {
  id: string;
  status: string;
  serialNumber: string;
}): Promise<string> {
  if (isValidBhdSerial(p.serialNumber)) return p.serialNumber;
  const code = PROJ_STATUS[p.status] ?? 'X';
  const serial = await generateBhdSerial(`PRJ-${code}`);
  await prisma.project.update({ where: { id: p.id }, data: { serialNumber: serial } });
  return serial;
}
