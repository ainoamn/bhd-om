const properties = [
  {
    id: 1,
    type: 'شقة',
    location: 'كوينز',
    title: 'شقة عصرية أنيقة',
    description: 'اكتشف ذروة الحياة المعاصرة في شققنا العصرية الأنيقة والأنيقة.',
    price: '$150,000',
    image: '/api/placeholder/400/300',
  },
  {
    id: 2,
    type: 'شقة',
    location: 'كوينز',
    title: 'شقق معاصرة',
    description: 'اختبر المزيج المثالي بين التطور والحياة الحضرية في شققنا المعاصرة المتطورة.',
    price: '$150,000',
    image: '/api/placeholder/400/300',
  },
  {
    id: 3,
    type: 'شقة',
    location: 'كوينز',
    title: 'منازل عائلية في الضواحي',
    description: 'استمتع بسحر وسلام الحياة الضواحي في منازلنا الواسعة والمرحبة للعائلات الواحدة.',
    price: '$150,000',
    image: '/api/placeholder/400/300',
  },
];

export default function FeaturedProperties() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            العقارات المميزة
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            اكتشف مجموعتنا المختارة بعناية من العقارات المتميزة ذات الميزات الرائعة، المضمونة لتلبية احتياجاتك العقارية وتجاوز توقعاتك.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {properties.map((property) => (
            <div
              key={property.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-2"
            >
              <div className="h-64 bg-gradient-to-br from-primary to-primary-dark relative">
                <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-sm font-semibold text-primary">
                  {property.type}
                </div>
                <div className="absolute bottom-4 right-4 text-white">
                  <div className="text-sm opacity-90">{property.location}</div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {property.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {property.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">
                    {property.price}
                  </span>
                  <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors font-medium">
                    عرض التفاصيل
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <a
            href="/properties"
            className="inline-block bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-dark transition-all transform hover:scale-105 shadow-lg"
          >
            عرض جميع العقارات
          </a>
        </div>
      </div>
    </section>
  );
}
