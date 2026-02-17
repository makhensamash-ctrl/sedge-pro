import { motion } from "framer-motion";
import heroImage from "@/assets/hero-image.jpg";

const HeroSection = () => (
  <section
    id="home"
    className="relative min-h-[90vh] flex items-center pt-16 overflow-hidden bg-primary"
  >
    {/* Background image with overlay */}
    <div className="absolute inset-0">
      <img
        src={heroImage}
        alt="Construction management platform with expert support"
        className="w-full h-full object-cover opacity-30"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/60 to-primary/30" />
    </div>

    <div className="container mx-auto px-4 relative z-10">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-xl"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-primary-foreground mb-6">
            Better Project Decisions. Better Outcomes.{" "}
            <span className="text-accent">In Real Time.</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 leading-relaxed">
            The only platform combining powerful construction management
            software with on-demand expert support.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="#contact"
              className="border-2 border-primary-foreground/60 text-primary-foreground px-7 py-3 rounded-full font-semibold hover:bg-primary-foreground/10 transition-colors"
            >
              Watch Demo
            </a>
            <a
              href="#pricing"
              className="bg-accent text-accent-foreground px-7 py-3 rounded-full font-semibold hover:bg-green-dark transition-colors"
            >
              View Contractor Packages
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="hidden lg:block"
        >
          <img
            src={heroImage}
            alt="Software dashboard and expert support team"
            className="rounded-2xl shadow-2xl w-full"
          />
        </motion.div>
      </div>
    </div>
  </section>
);

export default HeroSection;
