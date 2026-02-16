export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">404</h2>
        <p className="text-xl text-gray-600 mb-8">الصفحة غير موجودة</p>
        <a href="/ar" className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark">
          العودة للصفحة الرئيسية
        </a>
      </div>
    </div>
  );
}
