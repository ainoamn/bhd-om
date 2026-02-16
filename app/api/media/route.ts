import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'properties');

export async function GET() {
  try {
    const files = await readdir(UPLOAD_DIR).catch(() => []);
    const images = files
      .filter((f) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
      .map((f) => `/uploads/properties/${f}`)
      .sort()
      .reverse();
    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] });
  }
}
