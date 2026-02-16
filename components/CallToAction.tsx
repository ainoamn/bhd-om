import Link from 'next/link';

export default function CallToAction() {
  return (
    <section className="py-20 bg-gradient-to-br from-primary to-primary-dark text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            ربط الناس بالمنازل المثالية هو شغفنا
          </h2>
          <p className="text-lg md:text-xl mb-8 text-gray-100">
            مع شغف حقيقي لمساعدة الناس في العثور على منازل أحلامهم، نحن مخلصون لربط المشترين والبائعين في سوق العقارات. ثق بنا لجعل تجربة شراء أو بيع منزلك سلسة ومرضية.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-secondary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-yellow-600 transition-all transform hover:scale-105 shadow-lg"
            >
              حدد موعدًا
            </Link>
            <Link
              href="/about"
              className="bg-white text-primary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
            >
              اقرأ المزيد
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
