/**
 * محتوى الموقع المركزي - للأقسام والصور والنصوص
 * يُستخدم في الصفحات وفي لوحة إدارة الموقع
 */

export interface SiteSection {
  id: string;
  page: string;
  section: string;
  labelAr: string;
  labelEn: string;
  type: 'text' | 'html' | 'image' | 'list';
}

export interface SiteContentStore {
  hero: {
    titleAr: string;
    titleEn: string;
    subtitleAr: string;
    subtitleEn: string;
    descriptionAr: string;
    descriptionEn: string;
    backgroundImage: string;
  };
  about: {
    titleAr: string;
    titleEn: string;
    descriptionAr: string;
    descriptionEn: string;
    image: string;
  };
  services: {
    titleAr: string;
    titleEn: string;
    subtitleAr: string;
    subtitleEn: string;
    items: Array<{
      number: string;
      titleAr: string;
      titleEn: string;
      descAr: string;
      descEn: string;
    }>;
  };
  propertiesRent: {
    titleAr: string;
    titleEn: string;
    subtitleAr: string;
    subtitleEn: string;
  };
  propertiesSale: {
    titleAr: string;
    titleEn: string;
    subtitleAr: string;
    subtitleEn: string;
  };
  projects: {
    titleAr: string;
    titleEn: string;
    subtitleAr: string;
    subtitleEn: string;
  };
  contact: {
    titleAr: string;
    titleEn: string;
    subtitleAr: string;
    subtitleEn: string;
  };
  testimonials: {
    titleAr: string;
    titleEn: string;
    subtitleAr: string;
    subtitleEn: string;
    items: Array<{
      nameAr: string;
      nameEn: string;
      textAr: string;
      textEn: string;
      image: string;
    }>;
  };
  statistics: Array<{
    id: string;
    value: number;
    labelAr: string;
    labelEn: string;
  }>;
  /** محتوى صفحات الموقع الفردية */
  pagesProperties: { heroTitleAr: string; heroTitleEn: string; heroSubtitleAr: string; heroSubtitleEn: string; heroImage: string };
  pagesProjects: { heroTitleAr: string; heroTitleEn: string; heroDescriptionAr: string; heroDescriptionEn: string; heroImage: string };
  pagesServices: { heroTitleAr: string; heroTitleEn: string; heroSubtitleAr: string; heroSubtitleEn: string; heroImage: string };
  pagesAbout: { heroTitleAr: string; heroTitleEn: string; heroSubtitleAr: string; heroSubtitleEn: string; heroImage: string; mainTitleAr: string; mainTitleEn: string; contentAr: string; contentEn: string; image: string };
  pagesContact: { heroTitleAr: string; heroTitleEn: string; heroSubtitleAr: string; heroSubtitleEn: string; heroImage: string };
}

export const siteContent: SiteContentStore = {
  hero: {
    titleAr: 'بن حمود للتطوير',
    titleEn: 'Bin Hamood Development',
    subtitleAr: 'ش ش و',
    subtitleEn: 'SPC',
    descriptionAr: 'شركة عمانية رائدة في مجال التطوير العقاري والاستثمار، نقدم حلولاً متكاملة وشاملة في بناء وتطوير المشاريع السكنية والتجارية في جميع أنحاء سلطنة عمان. نحن ملتزمون بتقديم أعلى معايير الجودة والتميز في كل مشروع نقوم به.',
    descriptionEn: 'A leading Omani company in real estate development and investment, we provide integrated and comprehensive solutions for building and developing residential and commercial projects throughout the Sultanate of Oman. We are committed to delivering the highest standards of quality and excellence in every project we undertake.',
    backgroundImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80',
  },
  about: {
    titleAr: 'ربط الناس بالمنازل المثالية هو شغفنا.',
    titleEn: 'Connecting People To Perfect Homes Is Our Passion.',
    descriptionAr: 'مع شغف حقيقي لمساعدة الناس في العثور على منازل أحلامهم، نحن مخلصون لربط المشترين والبائعين في سوق العقارات. ثق بنا لجعل تجربة شراء أو بيع منزلك سلسة ومرضية.',
    descriptionEn: 'With a genuine passion for helping people find their dream homes, we are dedicated to connecting buyers and sellers in the real estate market. Trust us to make your home buying or selling experience smooth and satisfying.',
    image: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800&q=80',
  },
  services: {
    titleAr: 'ما نقدمه',
    titleEn: 'What We Offer',
    subtitleAr: 'نُبسِّط رحلة شراء وبيع واستئجار العقارات. يقدم فريقنا الخبير حلولاً عقارية شاملة مصممة خصيصًا لاحتياجاتك.',
    subtitleEn: 'We simplify the journey of buying, selling and renting real estate. Our expert team provides comprehensive real estate solutions designed specifically for your needs.',
    items: [
      { number: '01', titleAr: 'بيع العقارات', titleEn: 'Sell Properties', descAr: 'اعثر على منزل أحلامك معنا – سيرشدك فريقنا الخبير خلال العملية ويضمن معاملة سلسة.', descEn: 'Find your dream home with us – our expert team will guide you through the process and ensure a smooth transaction.' },
      { number: '02', titleAr: 'إيجار العقارات', titleEn: 'Rent Properties', descAr: 'اعثر على عقار الإيجار الذي تحلم به معنا، حيث نقدم مجموعة متنوعة من الخيارات لتلبية احتياجاتك وتفضيلاتك.', descEn: 'Find your dream rental property with us, where we offer a variety of options to meet your needs and preferences.' },
      { number: '03', titleAr: 'إدارة العقارات', titleEn: 'Property Management', descAr: 'ثِق بنا للتعامل مع الإدارة اليومية لعقارك، وتعظيم قيمته وتقليل توترك.', descEn: 'Trust us to handle the daily management of your property, maximize its value and reduce your stress.' },
      { number: '04', titleAr: 'استثمارات مربحة', titleEn: 'Profitable Investments', descAr: 'نقدم فرص استثمارية مربحة في سوق العقارات، مما يوفر عوائد عالية على الاستثمارات.', descEn: 'We offer profitable investment opportunities in the real estate market, providing high returns on investments.' },
    ],
  },
  propertiesRent: {
    titleAr: 'عقارات للإيجار',
    titleEn: 'Properties for Rent',
    subtitleAr: 'اكتشف مجموعتنا المختارة من العقارات المتاحة للإيجار',
    subtitleEn: 'Discover our selected collection of properties available for rent',
  },
  propertiesSale: {
    titleAr: 'عقارات للبيع',
    titleEn: 'Properties for Sale',
    subtitleAr: 'اكتشف مجموعتنا المختارة من العقارات المتاحة للبيع',
    subtitleEn: 'Discover our selected collection of properties available for sale',
  },
  projects: {
    titleAr: 'العقارات المميزة',
    titleEn: 'Featured Properties',
    subtitleAr: 'اكتشف مجموعتنا المختارة بعناية من العقارات المتميزة ذات الميزات الرائعة، المضمونة لتلبية احتياجاتك العقارية وتجاوز توقعاتك.',
    subtitleEn: 'Discover our carefully selected collection of distinguished properties with amazing features, guaranteed to meet your real estate needs and exceed your expectations.',
  },
  contact: {
    titleAr: 'اتصل بنا',
    titleEn: 'Contact Us',
    subtitleAr: 'حدد موعدًا',
    subtitleEn: 'Schedule An Appointment',
  },
  testimonials: {
    titleAr: 'اقرأ من العملاء الذين وجدوا المكان المثالي حيث يمكنهم إنشاء…',
    titleEn: 'Read From Clients Who Found The Perfect Place Where They Can Create…',
    subtitleAr: 'اكتشف شهادات من عملاء راضين وجدوا عقارات أحلامهم معنا، الخبراء الموثوقين لمساعدتك في العثور على المكان المثالي لتسميه منزلاً.',
    subtitleEn: 'Discover testimonials from satisfied clients who found their dream properties with us, the trusted experts to help you find the perfect place to call home.',
    items: [
      { nameAr: 'جيمس أوليفر', nameEn: 'James Oliver', textAr: 'لوريم إيبسوم دولور سيت أميت، كونسيكتيتور أديبيسسينج إليت.', textEn: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80' },
      { nameAr: 'جيمس أوليفر', nameEn: 'James Oliver', textAr: 'لوريم إيبسوم دولور سيت أميت، كونسيكتيتور أديبيسسينج إليت.', textEn: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80' },
    ],
  },
  statistics: [
    { id: 'managed', value: 245, labelAr: 'عقار مُدار', labelEn: 'Managed Properties' },
    { id: 'sold', value: 128, labelAr: 'عقار مبيع', labelEn: 'Sold Properties' },
    { id: 'built', value: 89, labelAr: 'عقار مبني', labelEn: 'Built Properties' },
    { id: 'under-construction', value: 42, labelAr: 'قيد التنفيذ', labelEn: 'Under Construction' },
    { id: 'visitors', value: 15420, labelAr: 'زائر للموقع', labelEn: 'Website Visitors' },
    { id: 'clients', value: 356, labelAr: 'عميل', labelEn: 'Clients' },
  ],
  pagesProperties: {
    heroTitleAr: 'العقارات المتاحة',
    heroTitleEn: 'Available Properties',
    heroSubtitleAr: 'اكتشف مجموعتنا المختارة بعناية من العقارات المتاحة للإيجار والبيع',
    heroSubtitleEn: 'Discover our carefully selected collection of properties available for rent and sale',
    heroImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80',
  },
  pagesProjects: {
    heroTitleAr: 'المشاريع المميزة',
    heroTitleEn: 'Featured Properties',
    heroDescriptionAr: 'اكتشف مشاريعنا المنجزة والمشاريع قيد التنفيذ والتطوير في جميع أنحاء سلطنة عمان.',
    heroDescriptionEn: 'Discover our completed projects and projects under construction and development throughout the Sultanate of Oman.',
    heroImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80',
  },
  pagesServices: {
    heroTitleAr: 'خدماتنا',
    heroTitleEn: 'Our Services',
    heroSubtitleAr: 'حلول عقارية شاملة لجميع احتياجاتك',
    heroSubtitleEn: 'Comprehensive real estate solutions for all your needs',
    heroImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80',
  },
  pagesAbout: {
    heroTitleAr: 'عن الشركة',
    heroTitleEn: 'About Us',
    heroSubtitleAr: 'تعرف على شركة بن حمود للتطوير',
    heroSubtitleEn: 'Learn about Bin Hamood Development',
    heroImage: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&q=80',
    mainTitleAr: 'عن بن حمود للتطوير',
    mainTitleEn: 'About Bin Hamood Development',
    contentAr: 'بن حمود للتطوير هي شركة عمانية رائدة في مجال التطوير العقاري والاستثمار، تأسست بهدف تقديم حلول متكاملة وشاملة في بناء وتطوير المشاريع السكنية والتجارية في جميع أنحاء سلطنة عمان.',
    contentEn: 'Bin Hamood Development is a leading Omani company in real estate development and investment, established with the aim of providing integrated and comprehensive solutions for building and developing residential and commercial projects throughout the Sultanate of Oman.',
    image: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200&q=80',
  },
  pagesContact: {
    heroTitleAr: 'اتصل بنا',
    heroTitleEn: 'Contact Us',
    heroSubtitleAr: 'نحن هنا لمساعدتك في جميع احتياجاتك العقارية',
    heroSubtitleEn: 'We are here to help you with all your real estate needs',
    heroImage: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920&q=80',
  },
};

// تحرير محتوى - للاستخدام مع React state (يُحدّث في الذاكرة، يُربط بقاعدة البيانات لاحقاً)
let editableContent: SiteContentStore = JSON.parse(JSON.stringify(siteContent));

export function getSiteContent(): SiteContentStore {
  return editableContent;
}

export function updateSiteSection(path: string, value: string): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = editableContent as unknown as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (!(key in current) || typeof current[key] !== 'object') current[key] = {};
    current = current[key] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

export function resetSiteContent(): void {
  editableContent = JSON.parse(JSON.stringify(siteContent));
}

export type SiteSectionItem = { id: string; blockKey: string; pathAr: string; pathEn?: string; labelAr: string; labelEn: string; type: 'text' | 'textarea' | 'image' };

export const sitePagesForAdmin: Array<{
  id: string;
  labelAr: string;
  labelEn: string;
  sections: SiteSectionItem[];
}> = [
  {
    id: 'home',
    labelAr: 'الصفحة الرئيسية',
    labelEn: 'Home Page',
    sections: [
      { id: 'hero-title', blockKey: 'hero', pathAr: 'hero.titleAr', pathEn: 'hero.titleEn', labelAr: 'عنوان البوستر', labelEn: 'Hero Title', type: 'text' },
      { id: 'hero-subtitle', blockKey: 'hero', pathAr: 'hero.subtitleAr', pathEn: 'hero.subtitleEn', labelAr: 'العنوان الفرعي للبوستر', labelEn: 'Hero Subtitle', type: 'text' },
      { id: 'hero-desc', blockKey: 'hero', pathAr: 'hero.descriptionAr', pathEn: 'hero.descriptionEn', labelAr: 'وصف البوستر', labelEn: 'Hero Description', type: 'textarea' },
      { id: 'hero-image', blockKey: 'hero', pathAr: 'hero.backgroundImage', labelAr: 'صورة خلفية البوستر', labelEn: 'Hero Background Image', type: 'image' },
      { id: 'about-title', blockKey: 'about', pathAr: 'about.titleAr', pathEn: 'about.titleEn', labelAr: 'عنوان قسم عن الشركة', labelEn: 'About Section Title', type: 'text' },
      { id: 'about-desc', blockKey: 'about', pathAr: 'about.descriptionAr', pathEn: 'about.descriptionEn', labelAr: 'وصف قسم عن الشركة', labelEn: 'About Description', type: 'textarea' },
      { id: 'about-image', blockKey: 'about', pathAr: 'about.image', labelAr: 'صورة قسم عن الشركة', labelEn: 'About Section Image', type: 'image' },
      { id: 'services-title', blockKey: 'services', pathAr: 'services.titleAr', pathEn: 'services.titleEn', labelAr: 'عنوان قسم الخدمات', labelEn: 'Services Section Title', type: 'text' },
      { id: 'services-subtitle', blockKey: 'services', pathAr: 'services.subtitleAr', pathEn: 'services.subtitleEn', labelAr: 'وصف قسم الخدمات', labelEn: 'Services Subtitle', type: 'textarea' },
      { id: 'properties-rent-title', blockKey: 'propertiesRent', pathAr: 'propertiesRent.titleAr', pathEn: 'propertiesRent.titleEn', labelAr: 'عنوان عقارات للإيجار', labelEn: 'Properties for Rent Title', type: 'text' },
      { id: 'properties-sale-title', blockKey: 'propertiesSale', pathAr: 'propertiesSale.titleAr', pathEn: 'propertiesSale.titleEn', labelAr: 'عنوان عقارات للبيع', labelEn: 'Properties for Sale Title', type: 'text' },
      { id: 'projects-title', blockKey: 'projects', pathAr: 'projects.titleAr', pathEn: 'projects.titleEn', labelAr: 'عنوان قسم المشاريع', labelEn: 'Projects Section Title', type: 'text' },
      { id: 'projects-subtitle', blockKey: 'projects', pathAr: 'projects.subtitleAr', pathEn: 'projects.subtitleEn', labelAr: 'وصف قسم المشاريع', labelEn: 'Projects Subtitle', type: 'textarea' },
      { id: 'contact-title', blockKey: 'contact', pathAr: 'contact.titleAr', pathEn: 'contact.titleEn', labelAr: 'عنوان قسم التواصل', labelEn: 'Contact Section Title', type: 'text' },
      { id: 'contact-subtitle', blockKey: 'contact', pathAr: 'contact.subtitleAr', pathEn: 'contact.subtitleEn', labelAr: 'العنوان الفرعي للتواصل', labelEn: 'Contact Subtitle', type: 'text' },
    ],
  },
  {
    id: 'properties',
    labelAr: 'صفحة العقارات',
    labelEn: 'Properties Page',
    sections: [
      { id: 'props-hero-title', blockKey: 'pagesProperties', pathAr: 'pagesProperties.heroTitleAr', pathEn: 'pagesProperties.heroTitleEn', labelAr: 'عنوان البوستر', labelEn: 'Hero Title', type: 'text' },
      { id: 'props-hero-subtitle', blockKey: 'pagesProperties', pathAr: 'pagesProperties.heroSubtitleAr', pathEn: 'pagesProperties.heroSubtitleEn', labelAr: 'الوصف', labelEn: 'Subtitle', type: 'textarea' },
      { id: 'props-hero-image', blockKey: 'pagesProperties', pathAr: 'pagesProperties.heroImage', labelAr: 'صورة الخلفية', labelEn: 'Background Image', type: 'image' },
    ],
  },
  {
    id: 'projects',
    labelAr: 'صفحة المشاريع',
    labelEn: 'Projects Page',
    sections: [
      { id: 'proj-hero-title', blockKey: 'pagesProjects', pathAr: 'pagesProjects.heroTitleAr', pathEn: 'pagesProjects.heroTitleEn', labelAr: 'عنوان البوستر', labelEn: 'Hero Title', type: 'text' },
      { id: 'proj-hero-desc', blockKey: 'pagesProjects', pathAr: 'pagesProjects.heroDescriptionAr', pathEn: 'pagesProjects.heroDescriptionEn', labelAr: 'وصف البوستر', labelEn: 'Hero Description', type: 'textarea' },
      { id: 'proj-hero-image', blockKey: 'pagesProjects', pathAr: 'pagesProjects.heroImage', labelAr: 'صورة الخلفية', labelEn: 'Background Image', type: 'image' },
    ],
  },
  {
    id: 'services',
    labelAr: 'صفحة الخدمات',
    labelEn: 'Services Page',
    sections: [
      { id: 'svc-hero-title', blockKey: 'pagesServices', pathAr: 'pagesServices.heroTitleAr', pathEn: 'pagesServices.heroTitleEn', labelAr: 'عنوان البوستر', labelEn: 'Hero Title', type: 'text' },
      { id: 'svc-hero-subtitle', blockKey: 'pagesServices', pathAr: 'pagesServices.heroSubtitleAr', pathEn: 'pagesServices.heroSubtitleEn', labelAr: 'الوصف', labelEn: 'Subtitle', type: 'text' },
      { id: 'svc-hero-image', blockKey: 'pagesServices', pathAr: 'pagesServices.heroImage', labelAr: 'صورة الخلفية', labelEn: 'Background Image', type: 'image' },
    ],
  },
  {
    id: 'about',
    labelAr: 'صفحة عنا',
    labelEn: 'About Page',
    sections: [
      { id: 'abt-hero-title', blockKey: 'pagesAbout', pathAr: 'pagesAbout.heroTitleAr', pathEn: 'pagesAbout.heroTitleEn', labelAr: 'عنوان البوستر', labelEn: 'Hero Title', type: 'text' },
      { id: 'abt-hero-subtitle', blockKey: 'pagesAbout', pathAr: 'pagesAbout.heroSubtitleAr', pathEn: 'pagesAbout.heroSubtitleEn', labelAr: 'العنوان الفرعي', labelEn: 'Hero Subtitle', type: 'text' },
      { id: 'abt-hero-image', blockKey: 'pagesAbout', pathAr: 'pagesAbout.heroImage', labelAr: 'صورة البوستر', labelEn: 'Hero Image', type: 'image' },
      { id: 'abt-main-title', blockKey: 'pagesAbout', pathAr: 'pagesAbout.mainTitleAr', pathEn: 'pagesAbout.mainTitleEn', labelAr: 'العنوان الرئيسي', labelEn: 'Main Title', type: 'text' },
      { id: 'abt-content', blockKey: 'pagesAbout', pathAr: 'pagesAbout.contentAr', pathEn: 'pagesAbout.contentEn', labelAr: 'المحتوى', labelEn: 'Content', type: 'textarea' },
      { id: 'abt-image', blockKey: 'pagesAbout', pathAr: 'pagesAbout.image', labelAr: 'صورة المحتوى', labelEn: 'Content Image', type: 'image' },
    ],
  },
  {
    id: 'contact',
    labelAr: 'صفحة التواصل',
    labelEn: 'Contact Page',
    sections: [
      { id: 'cnt-hero-title', blockKey: 'pagesContact', pathAr: 'pagesContact.heroTitleAr', pathEn: 'pagesContact.heroTitleEn', labelAr: 'عنوان البوستر', labelEn: 'Hero Title', type: 'text' },
      { id: 'cnt-hero-subtitle', blockKey: 'pagesContact', pathAr: 'pagesContact.heroSubtitleAr', pathEn: 'pagesContact.heroSubtitleEn', labelAr: 'العنوان الفرعي', labelEn: 'Subtitle', type: 'text' },
      { id: 'cnt-hero-image', blockKey: 'pagesContact', pathAr: 'pagesContact.heroImage', labelAr: 'صورة الخلفية', labelEn: 'Background Image', type: 'image' },
    ],
  },
];

export const siteSectionsForAdmin: SiteSectionItem[] = sitePagesForAdmin.flatMap((p) => p.sections);

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    current = (current as Record<string, unknown>)?.[part];
  }
  return typeof current === 'string' ? current : '';
}

export function getSectionValue(path: string): string {
  return getNestedValue(editableContent as unknown as Record<string, unknown>, path);
}
