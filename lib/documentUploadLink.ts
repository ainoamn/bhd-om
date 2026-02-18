/**
 * رابط رفع المستندات - إرسال للمستأجر عبر الواتساب والبريد
 */

export function getDocumentUploadLink(
  origin: string,
  locale: string,
  propertyId: number,
  bookingId: string,
  email?: string
): string {
  const url = `${origin}/${locale}/properties/${propertyId}/contract-terms?bookingId=${bookingId}${email ? `&email=${encodeURIComponent(email)}` : ''}`;
  return url;
}

/** تطبيع رقم الواتساب: 968 + 8 أرقام لعُمان */
function normalizeWhatsAppPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '').replace(/^0+/, '');
  if (digits.startsWith('968') && digits.length >= 11) return digits;
  if (digits.length >= 8) return '968' + digits.slice(-8);
  return '';
}

/** الرسالة المرسلة للمستأجر (عربي وإنجليزي) */
export function getDocumentLinkMessage(link: string, ar: boolean): string {
  if (ar) {
    return `مرحباً،\nتم تأكيد استلام مبلغ الحجز.\nيرجى إكمال إجراءات توثيق العقد عن طريق رفع المستندات المطلوبة على الرابط التالي:\n${link}`;
  }
  return `Hello,\nYour booking payment has been confirmed.\nPlease complete the contract documentation by uploading the required documents at this link:\n${link}`;
}

/** فتح الواتساب مع رسالة مسبقة الإعداد */
export function openWhatsAppWithMessage(phone: string, message: string): void {
  const waNum = normalizeWhatsAppPhone(phone);
  if (!waNum) return;
  const url = `https://wa.me/${waNum}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
}

/** فتح عميل البريد مع رسالة مسبقة الإعداد */
export function openEmailWithMessage(to: string, subject: string, body: string): void {
  if (!to?.trim()) return;
  const url = `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(url);
}
