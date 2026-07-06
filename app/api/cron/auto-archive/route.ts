import { NextRequest, NextResponse } from 'next/server';
import { runAutoArchive } from '@/lib/archive';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runAutoArchive();
  return NextResponse.json(result);
}
