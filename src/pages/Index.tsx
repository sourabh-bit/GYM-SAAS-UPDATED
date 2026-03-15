import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import AutoScrollShowcaseSection from "@/components/landing/AutoScrollShowcaseSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import FeatureDepthSection from "@/components/landing/FeatureDepthSection";
import DemoSection from "@/components/landing/DemoSection";
import PricingSection from "@/components/landing/PricingSection";
import FAQSection from "@/components/landing/FAQSection";
import CTASection from "@/components/landing/CTASection";
import FooterSection from "@/components/landing/FooterSection";
import BottomNav from "@/components/BottomNav";

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <AutoScrollShowcaseSection />
      <BenefitsSection />
      <FeatureDepthSection />
      <DemoSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <FooterSection />
      <BottomNav />
    </div>
  );
};

export default Index;
