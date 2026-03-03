import { motion } from "framer-motion";
import { Construction, Mail, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";

const Index = () => (
  <div className="min-h-screen bg-primary flex flex-col items-center justify-center relative overflow-hidden px-4">
    {/* Animated background elements */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary-foreground/5 rounded-full" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-primary-foreground/5 rounded-full" />
    </div>

    <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
      {/* Logo */}
      <motion.img
        src={logo}
        alt="SEDGE Pro"
        className="h-20 mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      />

      {/* Icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-20 h-20 rounded-2xl bg-accent/15 flex items-center justify-center mb-8"
      >
        <Construction className="w-10 h-10 text-accent" />
      </motion.div>

      {/* Heading */}
      <motion.h1
        className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4 leading-tight"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        Something Great Is{" "}
        <span className="text-accent">Coming Soon</span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        className="text-lg md:text-xl text-primary-foreground/60 mb-12 leading-relaxed max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.45 }}
      >
        We're building a powerful new experience for construction professionals.
        Stay tuned — it'll be worth the wait.
      </motion.p>

      {/* CTA */}
      <motion.a
        href="mailto:info@sedgeaccelerator.co.za"
        className="group inline-flex items-center gap-3 bg-accent text-accent-foreground px-8 py-4 rounded-full font-semibold text-lg hover:bg-green-dark transition-colors"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <Mail className="w-5 h-5" />
        Get In Touch
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </motion.a>

      {/* Divider line */}
      <motion.div
        className="mt-16 w-16 h-px bg-primary-foreground/20"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.8 }}
      />

      {/* Footer */}
      <motion.p
        className="mt-6 text-sm text-primary-foreground/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1 }}
      >
        © 2026 SEDGE Pro. All rights reserved.
      </motion.p>
    </div>
  </div>
);

export default Index;
