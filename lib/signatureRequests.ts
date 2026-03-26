export type SignatureActorRole = 'ADMIN' | 'CLIENT' | 'OWNER' | 'BROKER';

export type SignatureRequestStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type SignatureRequest = {
  token: string;
  bookingId: string;
  contractKind?: 'RENT' | 'SALE' | 'INVESTMENT';
  actorRole: SignatureActorRole;
  actorPhone?: string;
  createdAt: string;
  completedAt?: string;
  failedAt?: string;
  failureCount?: number;
  lastError?: string;
  status: SignatureRequestStatus;
  // مخرجات التوثيق (تجريبية)
  selfieDataUrl?: string;
  signatureDataUrl?: string;
  signatureName?: string;
  deviceInfo?: string;
};

/** تطبيع رقم الواتساب: 968 + 8 أرقام لعُمان */
export function normalizeWhatsAppPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '').replace(/^0+/, '');
  if (digits.startsWith('968') && digits.length >= 11) return digits;
  if (digits.length >= 8) return '968' + digits.slice(-8);
  return '';
}

export function getWhatsAppUrl(phone: string, message: string): string | null {
  const waNum = normalizeWhatsAppPhone(phone);
  if (!waNum) return null;
  return `https://wa.me/${waNum}?text=${encodeURIComponent(message)}`;
}

export function generateSignatureToken(): string {
  // Token غير حساس لكنه يجب أن يكون غير قابل للتخمين تقريباً
  const rnd = Math.random().toString(36).slice(2);
  return `SIG-${Date.now()}-${rnd}`;
}

export function buildSignatureLink(origin: string, locale: string, token: string): string {
  return `${origin}/${locale}/sign/${encodeURIComponent(token)}`;
}

