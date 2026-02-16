'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">حدث خطأ</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark"
        >
          حاول مرة أخرى
        </button>
      </div>
    </div>
  );
}
