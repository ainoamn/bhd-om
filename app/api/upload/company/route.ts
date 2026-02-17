import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'company');
const ALLOWED_EXT = /\.(jpg|jpeg|png|gif|webp|svg)$/i;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = path.extname(file.name) || '.png';
    if (!ALLOWED_EXT.test(ext)) {
      return NextResponse.json({ error: 'Image files only (jpg, png, gif, webp, svg)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await mkdir(UPLOAD_DIR, { recursive: true });

    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);

    await writeFile(filePath, buffer);

    const url = `/uploads/company/${safeName}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Company upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
