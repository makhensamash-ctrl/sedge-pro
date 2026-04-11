import { motion } from "framer-motion";
import { Check, Clock, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import EarlyBirdDialog from "@/components/EarlyBirdDialog";

const DEADLINE = new Date("2026-04-30T23:59:59").getTime();

const features = [
  "Ongoing remote expert support",
  "Full access to all system modules",
  "Unlimited users",
  "Unlimited projects",
  "Guided remote onboarding and setup",
  "Simple and easy to use, no specialised expertise required",
];

const AprilPromotion = () => {
  const [timeLeft, setTimeLeft] = useState(DEADLINE - Date.now());
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = DEADLINE - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        clearInterval(timer);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (timeLeft <= 0) return null;

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  const timeUnits = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: minutes },
    { label: "Seconds", value: seconds },
  ];

  return (
    <section className="relative py-16 md:py-24 bg-gradient-to-br from-primary via-[hsl(var(--navy-light))] to-primary overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-accent rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
      </div>

      {/* Limited time badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="absolute top-6 right-6 md:top-10 md:right-10"
      >
        <span className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground text-xs font-bold px-4 py-2 rounded-full shadow-lg">
          <Clock className="w-3.5 h-3.5" />
          APRIL ONLY
        </span>
      </motion.div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 text-accent mb-4">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-semibold tracking-widest uppercase">
              April Launch Special Offer
            </span>
            <Sparkles className="w-5 h-5" />
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
            Exclusive Launch Pricing,{" "}
            <span className="text-accent">Available This Month Only</span>
          </h2>

          <p className="text-primary-foreground/80 text-base md:text-lg mb-2 leading-relaxed">
            We've officially launched our system, and for this April only, you
            can access our complete platform and expert support services for a
            fraction of the cost through our exclusive launch offer.
          </p>

          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="text-2xl md:text-3xl line-through text-primary-foreground/40 font-semibold">
              R100,000
            </span>
            <span className="text-4xl md:text-5xl font-extrabold text-accent">
              R20,000
            </span>
            <span className="text-primary-foreground/60 text-sm">per year</span>
          </div>
        </motion.div>

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex justify-center gap-3 md:gap-5 mb-3"
        >
          {timeUnits.map((unit) => (
            <div key={unit.label} className="text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 flex items-center justify-center mb-1.5">
                <span className="text-2xl md:text-3xl font-bold text-primary-foreground tabular-nums">
                  {String(unit.value).padStart(2, "0")}
                </span>
              </div>
              <span className="text-[10px] md:text-xs text-primary-foreground/60 uppercase tracking-wider font-medium">
                {unit.label}
              </span>
            </div>
          ))}
        </motion.div>

        <p className="text-center text-primary-foreground/50 text-sm mb-10">
          Offer valid until 30 April 2026
        </p>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 max-w-2xl mx-auto mb-10"
        >
          {features.map((feat) => (
            <div
              key={feat}
              className="flex items-start gap-2.5 text-primary-foreground/90"
            >
              <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <span className="text-sm">{feat}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="text-center"
        >
          <Button
            size="lg"
            onClick={() => setDialogOpen(true)}
            className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full px-10 py-6 text-base font-bold shadow-lg shadow-accent/25 animate-pulse"
          >
            Join Early Bird Promotion
          </Button>
        </motion.div>
      </div>

      <EarlyBirdDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  );
};

export default AprilPromotion;
