import LandingNav from "../components/landing/LandingNav";
import HeroSection from "../components/landing/HeroSection";
import DualModesSection from "../components/landing/DualModesSection";
import ProductPreviewShowcase from "../components/landing/ProductPreviewShowcase";
import BenefitsSection from "../components/landing/BenefitsSection";
import FeatureGridSection from "../components/landing/FeatureGridSection";
import PricingSection from "../components/landing/PricingSection";
import FaqSection from "../components/landing/FaqSection";
import ContactSection from "../components/landing/ContactSection";
import LandingFooter from "../components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="landing-page-root">
      {/* 1. Header & Accessible Navigation */}
      <LandingNav />

      {/* Main Content Landmark */}
      <main id="main-content" className="landing">
        {/* 2. Hero Section with 30-Sec Closing Interactive Widget */}
        <HeroSection />

        {/* 3. Dual Modes: Small Shop vs Large POS Shop */}
        <DualModesSection />

        {/* 4. Product Preview Interactive Simulator (POS, Daily Closing, Udhar Khata) */}
        <ProductPreviewShowcase />

        {/* 5. Benefits Section (Time-Saving, Transaction Visibility, Cloud Backup) */}
        <BenefitsSection />

        {/* 6. Comprehensive Feature Grid */}
        <FeatureGridSection />

        {/* 7. Authoritative Pricing Plans from Subscription API */}
        <PricingSection />

        {/* 8. Frequently Asked Questions Accordion */}
        <FaqSection />

        {/* 9. Contact / Free Store Setup Consultation */}
        <ContactSection />
      </main>

      {/* 10. Footer with Brand, Support, Policies */}
      <LandingFooter />
    </div>
  );
}
