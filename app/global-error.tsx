'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
          <h2 className="text-3xl font-bold mb-4 text-red-600">خطأ حرج في التطبيق</h2>
          <p className="text-gray-600 mb-6">{error.message}</p>
          <button
            onClick={reset}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            إعادة تشغيل
          </button>
        </div>
      </body>
    </html>
  );
}
