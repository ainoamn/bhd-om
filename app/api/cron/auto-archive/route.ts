import { NextRequest, NextResponse } from 'next/server';
import { runAutoArchive } from '@/lib/archive';
import { verifyBearerSecret } from '@/lib/server/bearerAuth';
import { getCronSecret, isProduction } from '@/lib/server/envValidation';

export async function GET(req: NextRequest) {
  const secret = isProduction() ? getCronSecret() : (process.env.CRON_SECRET || '').trim();
  if (!secret) {
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 });
  }
  const authHeader = req.headers.get('authorization');
  if (!verifyBearerSecret(authHeader, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runAutoArchive();
  return NextResponse.json(result);
}
