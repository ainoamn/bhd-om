/**
 * قائمة بوابات الدفع — يدعم ?region=all|oman|gulf
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  getAllProviders,
  getGulfProviders,
  getOmanProviders,
} from '@/lib/payment/manager';

export async function GET(req: NextRequest) {
  try {
    const region = (req.nextUrl.searchParams.get('region') || 'all').toLowerCase();
    const providers =
      region === 'oman'
        ? getOmanProviders()
        : region === 'gulf'
          ? getGulfProviders()
          : getAllProviders();

    return NextResponse.json({
      success: true,
      region,
      providers,
      enabledCount: providers.filter((p) => p.enabled).length,
      totalCount: providers.length,
    });
  } catch (error) {
    console.error('[Payment Providers] Error:', error);
    return NextResponse.json({ error: 'فشل جلب قائمة البوابات' }, { status: 500 });
  }
}
