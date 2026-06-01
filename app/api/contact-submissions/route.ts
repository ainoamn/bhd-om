import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** إرسال رسالة تواصل من الزوار — عام */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      phone?: string;
      message?: string;
      type?: string;
    };
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const type = String(body.type || 'CONTACT').trim().toUpperCase();
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 });
    }
    if (type === 'CONTACT' && (!email || !email.includes('@'))) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (type === 'CALLBACK' && !String(body.phone || '').trim()) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }

    const row = await prisma.contactSubmission.create({
      data: {
        name,
        email: email || `${name.replace(/\s+/g, '.').toLowerCase()}@callback.local`,
        phone: String(body.phone || '').trim() || null,
        message: String(body.message || '').trim() || null,
        type: type === 'CALLBACK' ? 'CALLBACK' : 'CONTACT',
      },
    });
    return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
  } catch (e) {
    console.error('POST /api/contact-submissions:', e);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
