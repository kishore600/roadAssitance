import { Header } from '@/components/header'
import { HeroSection } from '@/components/hero-section'
import { ServicesSection } from '@/components/services-section'
import { FeaturesSection } from '@/components/features-section'
import { HowItWorks } from '@/components/how-it-works'
import { PricingPreview } from '@/components/pricing-preview'
import { AboutSection } from '@/components/about-section'
import { SafetySection } from '@/components/safety-section'
import { BlogSection } from '@/components/blog-section'
import { ContactSection } from '@/components/contact-section'
import { CTASection } from '@/components/cta-section'
import { Footer } from '@/components/footer'

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <HeroSection />
        <ServicesSection />
        <FeaturesSection />
        <HowItWorks />
        <PricingPreview />
        <AboutSection />
        <SafetySection />
        <BlogSection />
        <ContactSection />
        <CTASection />
        <Footer />
      </main>
    </>
  )
}
