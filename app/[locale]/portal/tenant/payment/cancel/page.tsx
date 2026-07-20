/**
 * صفحة إلغاء الدفع — عند إلغاء عملية الدفع في Thawani
 * Server Component — تدعم Arabic RTL
 */

import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden text-center">
        {/* الشريط العلوي */}
        <div className="bg-gradient-to-l from-gray-600 to-gray-700 py-6">
          <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center text-5xl shadow-md">
            ❌
          </div>
        </div>

        {/* المحتوى */}
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            تم إلغاء العملية
          </h1>
          <p className="text-gray-500 mb-4">
            لم تكتمل عملية الدفع. لم يتم خصم أي مبلغ من حسابك.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-right">
            <p className="text-sm text-yellow-700">
              يمكنك المحاولة مرة أخرى في أي وقت. إذا واجهت مشكلة، يرجى التواصل مع الدعم الفني.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/ar/portal/tenant/v2"
              className="inline-block w-full px-6 py-3 bg-[#C8102E] text-white font-bold rounded-lg hover:bg-[#a00d24] transition-colors"
            >
              العودة إلى لوحة التحكم →
            </Link>

            <button
              onClick={() => typeof window !== "undefined" && window.history.back()}
              className="inline-block w-full px-6 py-3 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              🔄 المحاولة مرة أخرى
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
