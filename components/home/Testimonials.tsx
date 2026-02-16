'use client';

import { useLocale } from 'next-intl';
import Image from 'next/image';

const testimonials = [
  {
    name: 'جيمس أوليفر',
    nameEn: 'James Oliver',
    text: 'لوريم إيبسوم دولور سيت أميت، كونسيكتيتور أديبيسسينج إليت. موريس إد كونفاليس نيوك. نام سكيليريسكيو بلاسيرات أورسي. ميسيناس آت بولفينار دوي. إن فيرمينتوم، ليكتوس سيد تينسيدنت أورناري، أركو إكس كونفاليس سابين، كويست فيستيبولوم ليبرو تيلوس كويست نيسل.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  },
  {
    name: 'جيمس أوليفر',
    nameEn: 'James Oliver',
    text: 'لوريم إيبسوم دولور سيت أميت، كونسيكتيتور أديبيسسينج إليت. موريس إد كونفاليس نيوك. نام سكيليريسكيو بلاسيرات أورسي. ميسيناس آت بولفينار دوي. إن فيرمينتوم، ليكتوس سيد تينسيدنت أورناري، أركو إكس كونفاليس سابين، كويست فيستيبولوم ليبرو تيلوس كويست نيسل.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  },
];

export default function Testimonials() {
  const locale = useLocale();

  return (
    <section className="py-32 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            {locale === 'ar' 
              ? 'اقرأ من العملاء الذين وجدوا المكان المثالي حيث يمكنهم إنشاء…' 
              : 'Read From Clients Who Found The Perfect Place Where They Can Create…'}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            {locale === 'ar'
              ? 'اكتشف شهادات من عملاء راضين وجدوا عقارات أحلامهم معنا، الخبراء الموثوقين لمساعدتك في العثور على المكان المثالي لتسميه منزلاً.'
              : 'Discover testimonials from satisfied clients who found their dream properties with us, the trusted experts to help you find the perfect place to call home.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg p-10"
            >
              <div className="flex items-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>
              <p className="text-gray-700 leading-relaxed mb-8 italic text-base">
                "{locale === 'ar' ? testimonial.text : testimonial.text}"
              </p>
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-full overflow-hidden">
                  <Image
                    src={testimonial.image}
                    alt={locale === 'ar' ? testimonial.name : testimonial.nameEn}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-lg">
                    {locale === 'ar' ? testimonial.name : testimonial.nameEn}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
