import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getToken } from 'next-auth/jwt';
import { apiGuard } from '@/lib/api-guard';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'properties');

export async function POST(request: NextRequest) {
  const guard = await apiGuard(request);
  if (!guard.allowed) return guard.response!;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = path.extname(file.name) || '.jpg';
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);

    await writeFile(filePath, buffer);

    const url = `/uploads/properties/${safeName}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
