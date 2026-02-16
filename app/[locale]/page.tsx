import Hero from '@/components/home/Hero';
import Services from '@/components/home/Services';
import PropertiesPreview from '@/components/home/PropertiesPreview';
import ProjectsPreview from '@/components/home/ProjectsPreview';
import AboutPreview from '@/components/home/AboutPreview';
import Testimonials from '@/components/home/Testimonials';
import ContactSection from '@/components/home/ContactSection';

export default function HomePage() {
  return (
    <>
      <Hero />
      <PropertiesPreview />
      <Services />
      <ProjectsPreview />
      <AboutPreview />
      <Testimonials />
      <ContactSection />
    </>
  );
}
