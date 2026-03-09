import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import HowItWorks from "@/components/HowItWorks";
import PricingSection from "@/components/PricingSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import ChatBubble from "@/components/ChatBubble";

const Index = () => (
  <>
    <Navbar />
    <main>
      <HeroSection />
      <AboutSection />
      <HowItWorks />
      <PricingSection />
      <ContactSection />
    </main>
    <Footer />
    <CookieConsent />
    <ChatBubble />
  </>
);

export default Index;
