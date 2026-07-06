export default function LocaleLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 text-sm">جاري التحميل...</p>
      </div>
    </div>
  );
}
