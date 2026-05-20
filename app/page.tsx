import { Header } from "@/components/djhq/header"
import { HeroSection } from "@/components/djhq/hero-section"
import { FeaturesSection } from "@/components/djhq/features-section"
import { ProfileDemoSection } from "@/components/djhq/profile-demo-section"
import { DashboardPreviewSection } from "@/components/djhq/dashboard-preview-section"
import { ProducerToolsSection } from "@/components/djhq/producer-tools-section"
import { PricingSection } from "@/components/djhq/pricing-section"
import { Footer } from "@/components/djhq/footer"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <ProfileDemoSection />
      <DashboardPreviewSection />
      <ProducerToolsSection />
      <PricingSection />
      <Footer />
    </main>
  )
}
