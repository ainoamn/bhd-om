import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { put } from '@vercel/blob';
import { prisma } from '@/lib/prisma';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'booking-documents');

const ALLOWED_EXT = /\.(pdf|jpg|jpeg|png|gif|webp)$/i;
const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

/** عند توفر BLOB_READ_WRITE_TOKEN نستخدم Vercel Blob؛ وإلا على Vercel نستخدم قاعدة البيانات */
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const useDb = !!process.env.VERCEL && !useBlob;

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
    if (buffer.length > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: `File too large. Max ${MAX_SIZE_MB} MB.` }, { status: 400 });
    }

    if (useBlob) {
      const pathname = `booking-documents/${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
      const blob = await put(pathname, buffer, {
        access: 'public',
        addRandomSuffix: true,
        contentType: file.type || undefined,
      });
      return NextResponse.json({ url: blob.url, name: file.name });
    }

    if (useDb) {
      const row = await prisma.bookingDocumentFile.create({
        data: {
          fileName: file.name,
          mimeType: file.type || null,
          content: buffer,
        },
      });
      const url = `/api/upload/booking-documents/serve/${row.id}`;
      return NextResponse.json({ url, name: file.name });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    await writeFile(filePath, buffer);
    const url = `/uploads/booking-documents/${safeName}`;
    return NextResponse.json({ url, name: file.name });
  } catch (err) {
    console.error('Booking documents upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
