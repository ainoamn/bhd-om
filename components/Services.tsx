const services = [
  {
    number: '01',
    title: 'بيع العقارات',
    description: 'اعثر على منزل أحلامك معنا – سيرشدك فريقنا الخبير خلال العملية ويضمن معاملة سلسة.',
    icon: '🏠',
  },
  {
    number: '02',
    title: 'إيجار العقارات',
    description: 'اعثر على عقار الإيجار الذي تحلم به معنا، حيث نقدم مجموعة متنوعة من الخيارات لتلبية احتياجاتك وتفضيلاتك.',
    icon: '🔑',
  },
  {
    number: '03',
    title: 'إدارة العقارات',
    description: 'ثِق بنا للتعامل مع الإدارة اليومية لعقارك، وتعظيم قيمته وتقليل توترك.',
    icon: '📊',
  },
  {
    number: '04',
    title: 'استثمارات مربحة',
    description: 'نقدم فرص استثمارية مربحة في سوق العقارات، مما يوفر عوائد عالية على الاستثمارات.',
    icon: '💰',
  },
];

export default function Services() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            ما نقدمه
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            نُبسِّط رحلة شراء وبيع واستئجار العقارات. يقدم فريقنا الخبير حلولاً عقارية شاملة مصممة خصيصًا لاحتياجاتك.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2"
            >
              <div className="text-5xl mb-4">{service.icon}</div>
              <div className="text-sm text-primary font-semibold mb-2">
                {service.number}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {service.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
