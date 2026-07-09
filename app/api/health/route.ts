import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/** فحص صحة API — يستخدمه النظام القديم لاكتشاف kv-server */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'bhd-om',
    kv: 'postgresql',
  });
}
