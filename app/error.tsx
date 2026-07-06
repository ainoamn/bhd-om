'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-2xl font-bold mb-4 text-red-600">حدث خطأ غير متوقع</h2>
      <p className="text-gray-600 mb-6">{error.message || 'يرجى المحاولة مرة أخرى'}</p>
      <button
        onClick={reset}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
