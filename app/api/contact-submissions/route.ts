import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimitRequest } from '@/lib/rate-limit';
import { z } from 'zod';
import { encryptAtRest } from '@/lib/server/piiField';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const contactSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  message: z.string().max(5000).optional(),
  type: z.enum(['CONTACT', 'CALLBACK']).optional(),
});

/** إرسال رسالة تواصل من الزوار */
export async function POST(req: NextRequest) {
  const limited = await rateLimitRequest(req, 'contact', 5, 3600);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { name, email, phone, message, type } = parsed.data;
    const typeNorm = (type || 'CONTACT').toUpperCase() as 'CONTACT' | 'CALLBACK';
    const emailTrim = (email || '').trim().toLowerCase();

    if (typeNorm === 'CONTACT' && !emailTrim) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (typeNorm === 'CALLBACK' && !String(phone || '').trim()) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 });
    }

    const row = await prisma.contactSubmission.create({
      data: {
        name: name.trim(),
        email: emailTrim || `${name.replace(/\s+/g, '.').toLowerCase()}@callback.local`,
        phone: String(phone || '').trim() || null,
        message: String(message || '').trim() ? encryptAtRest(String(message).trim()) : null,
        type: typeNorm === 'CALLBACK' ? 'CALLBACK' : 'CONTACT',
      },
    });
    return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
  } catch (e) {
    console.error('POST /api/contact-submissions:', e);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
