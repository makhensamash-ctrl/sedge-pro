import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const GreenCtaSection = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("create-lead", {
        body: {
          client_name: email.trim().split("@")[0] || email.trim(),
          email: email.trim().toLowerCase(),
          source: "cta_green_form",
          notes: "Pre-launch sign-up via Green CTA. Founding member.",
        },
      });

      if (error) throw error;

      toast.success("Welcome aboard! Pre-launch spot secured. Redirecting you to complete registration...");
      setEmail("");
      localStorage.setItem("sedge_lead_email", email.trim().toLowerCase());
      
      setTimeout(() => {
        window.location.href = "https://app.sedgepro.co.za/users/auth/register/";
      }, 1500);
    } catch (err: any) {
      console.error("Lead capture error:", err);
      toast.error(err.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="demo-form" className="py-20 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#5BB624] to-[#3F8A14] px-8 py-16 md:px-16 md:py-20 text-white shadow-2xl"
        >
          {/* Blueprint grid effect in background */}
          <div 
            className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:32px_32px]" 
            style={{ maskImage: "radial-gradient(ellipse at center, black, transparent 90%)", WebkitMaskImage: "radial-gradient(ellipse at center, black, transparent 90%)" }}
          />
          
          {/* Floating abstract glowing orbs */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
            {/* Soft Badge */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-1.5 bg-gradient-to-br from-primary via-[hsl(var(--navy-light))] to-primary  backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold tracking-wider uppercase mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Instant Demo Access
            </motion.div>

            {/* Title */}
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-6 text-white max-w-2xl">
             Access Free Demo for 7 Days 
            </h2>

            {/* Subhead */}
        

            {/* Interactive Demo Form */}
            <div className="w-full max-w-2xl  p-2.5 rounded-3xl  mb-6">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your professional email"
                  disabled={loading}
                  className="flex-1 bg-white/10 text-white placeholder:text-white/70 text-base border border-white px-5 py-3.5 rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all"
                  aria-label="Email address for demo"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-gradient-to-br from-primary via-[hsl(var(--navy-light))] to-primary  active:scale-95 text-white font-bold px-7 py-3.5 rounded-full flex items-center justify-center gap-2 shadow-lg shadow-black/10 transition-all shrink-0 cursor-pointer"
                >
                  {loading ? "Launching..." : "Access Free Demo"}
                  <ArrowRight className="w-4.5 h-4.5" />
                </button>
              </form>
            </div>

            {/* Reassurance text */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs md:text-sm text-white/80 font-medium mt-2">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-white" /> Zero Obligation
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-white" /> Instant Access
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-white" /> No credit card required
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default GreenCtaSection;
