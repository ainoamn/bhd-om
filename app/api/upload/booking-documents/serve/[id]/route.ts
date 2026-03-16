import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** تقديم ملف مرفوع من جدول BookingDocumentFile (عند عدم استخدام Vercel Blob) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const row = await prisma.bookingDocumentFile.findUnique({
      where: { id },
    });
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const contentType = row.mimeType || 'application/octet-stream';
    return new NextResponse(row.content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=31536000',
      },
    });
  } catch (e) {
    console.error('Booking document serve error:', e);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
