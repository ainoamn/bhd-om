import { NextRequest, NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';
import { apiGuard } from '@/lib/api-guard';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'properties');

export async function GET(request: NextRequest) {
  const guard = await apiGuard(request);
  if (!guard.allowed) return guard.response!;

  try {
    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get('path') || '';
    const safePath = path.normalize(rawPath).replace(/^(\.\.(\/|\|$))+/, '');
    if (safePath !== rawPath) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const targetDir = safePath
      ? path.join(process.cwd(), 'public', 'uploads', safePath)
      : UPLOAD_DIR;

    // Security: ensure the resolved path is still within public/uploads
    const resolvedTarget = path.resolve(targetDir);
    const resolvedBase = path.resolve(path.join(process.cwd(), 'public', 'uploads'));
    if (!resolvedTarget.startsWith(resolvedBase)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const files = await readdir(targetDir).catch(() => []);
    const images = files
      .filter((f) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
      .map((f) => safePath ? `/uploads/${safePath.replace(/\\/g, '/')}/${f}` : `/uploads/properties/${f}`)
      .sort()
      .reverse();
    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] });
  }
}
