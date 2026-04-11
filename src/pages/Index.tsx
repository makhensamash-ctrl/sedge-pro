import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AprilPromotion from "@/components/AprilPromotion";
import AboutSection from "@/components/AboutSection";
import HowItWorks from "@/components/HowItWorks";
import PricingSection from "@/components/PricingSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import ChatBubble from "@/components/ChatBubble";

const Index = () => (
  <>
    <Navbar />
    <main>
      <HeroSection />
      <AboutSection />
      <HowItWorks />
      <AprilPromotion />
      <PricingSection />
      <ContactSection />
    </main>
    <Footer />
    <ChatBubble />
  </>
);

export default Index;
