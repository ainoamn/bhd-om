import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { uploadLegacyStoredFile } from '@/lib/server/legacyStoredFiles';

export const dynamic = 'force-dynamic';

const ALLOWED_CONTEXTS = new Set([
  'contract',
  'property',
  'registry',
  'reservation',
  'accounting',
  'addressbook',
  'system',
]);

/** رفع مرفق (عقد، شيك، عقار، سجل ملفات…) إلى PostgreSQL / Vercel Blob */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const roleOk = isAdminLikeRole(auth.role) || auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN';
    if (!roleOk) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const storeContextRaw = String(formData.get('storeContext') || 'contract').trim();
    const storeContext = ALLOWED_CONTEXTS.has(storeContextRaw) ? storeContextRaw : 'contract';
    const storeKey = String(formData.get('storeKey') || '').trim() || null;
    const fieldKey = String(formData.get('fieldKey') || '').trim() || null;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const saved = await uploadLegacyStoredFile(buffer, {
      fileName: file.name,
      mimeType: file.type || null,
      storeContext,
      storeKey,
      fieldKey,
    });

    return NextResponse.json({
      fileId: saved.fileId,
      url: saved.url,
      name: saved.fileName,
      mimeType: saved.mimeType,
      storedOnDisk: true,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === 'file_type_not_allowed') {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }
    if (msg === 'file_too_large') {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }
    console.error('legacy files upload error', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
