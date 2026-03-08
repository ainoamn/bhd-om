'use client';

/** عرض خفيف أثناء الانتقال بين صفحات لوحة التحكم — بدون حجب أو انتظار الجلسة */
export default function AdminLoading() {
  return (
    <div className="admin-main-inner flex items-center justify-center min-h-[200px]" aria-hidden>
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#8B6F47] border-t-transparent" />
    </div>
  );
}
