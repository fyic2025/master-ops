import Header from '@/components/Header';
import Hero from '@/components/Hero';
import CaseStudyTiles from '@/components/CaseStudyTiles';
import HowItWorks from '@/components/HowItWorks';
import Investment from '@/components/Investment';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <CaseStudyTiles />
        <Investment />
      </main>
      <Footer />
    </>
  );
}
