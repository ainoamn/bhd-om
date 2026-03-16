import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { put } from '@vercel/blob';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'booking-documents');

const ALLOWED_EXT = /\.(pdf|jpg|jpeg|png|gif|webp)$/i;

/** على Vercel نظام الملفات للقراءة فقط — نستخدم Vercel Blob عند توفر BLOB_READ_WRITE_TOKEN */
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = path.extname(file.name) || '';
    if (!ALLOWED_EXT.test(ext)) {
      return NextResponse.json({ error: 'File type not allowed. Use PDF or images only.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (useBlob) {
      const pathname = `booking-documents/${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
      const blob = await put(pathname, buffer, {
        access: 'public',
        addRandomSuffix: true,
        contentType: file.type || undefined,
      });
      return NextResponse.json({ url: blob.url, name: file.name });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    await writeFile(filePath, buffer);
    const url = `/uploads/booking-documents/${safeName}`;
    return NextResponse.json({ url, name: file.name });
  } catch (err) {
    console.error('Booking documents upload error:', err);
    if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: 'Upload not configured. Add BLOB_READ_WRITE_TOKEN in Vercel Storage.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
