import HeroOman from '@/components/home/HeroOman';
import StatsBar from '@/components/home/StatsBar';
import PropertiesPreview from '@/components/home/PropertiesPreview';
import WhyChooseUs from '@/components/home/WhyChooseUs';
import OmanGallery from '@/components/home/OmanGallery';
import Services from '@/components/home/Services';
import Testimonials from '@/components/home/Testimonials';
import CtaSection from '@/components/home/CtaSection';

export default function HomePage() {
  return (
    <main>
      <HeroOman />
      <StatsBar />
      <PropertiesPreview />
      <WhyChooseUs />
      <OmanGallery />
      <Services />
      <Testimonials />
      <CtaSection />
    </main>
  );
}
