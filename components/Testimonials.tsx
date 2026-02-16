const testimonials = [
  {
    id: 1,
    name: 'جيمس أوليفر',
    rating: 5,
    text: 'لوريم إيبسوم دولور سيت أميت، كونسيكتيتور أديبيسسينج إليت. موريس إد كونفاليس نيوك. نام سكيليريسكيو بلاسيرات أورسي. ميسيناس آت بولفينار دوي. إن فيرمينتوم، ليكتوس سيد تينسيدنت أورناري، أركو إكس كونفاليس سابين، كويست فيستيبولوم ليبرو تيلوس كويست نيسل.',
  },
  {
    id: 2,
    name: 'جيمس أوليفر',
    rating: 5,
    text: 'لوريم إيبسوم دولور سيت أميت، كونسيكتيتور أديبيسسينج إليت. موريس إد كونفاليس نيوك. نام سكيليريسكيو بلاسيرات أورسي. ميسيناس آت بولفينار دوي. إن فيرمينتوم، ليكتوس سيد تينسيدنت أورناري، أركو إكس كونفاليس سابين، كويست فيستيبولوم ليبرو تيلوس كويست نيسل.',
  },
];

export default function Testimonials() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            اقرأ من العملاء الذين وجدوا المكان المثالي
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            اكتشف شهادات من عملاء راضين وجدوا عقارات أحلامهم معنا، الخبراء الموثوقين لمساعدتك في العثور على المكان المثالي لتسميه منزلاً.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-white p-8 rounded-xl shadow-lg"
            >
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>
              <p className="text-gray-700 mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>
              <div className="font-semibold text-gray-900">
                {testimonial.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
