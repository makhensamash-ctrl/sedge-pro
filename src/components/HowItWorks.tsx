import { motion } from "framer-motion";
import { useSiteSetting, useSiteCards } from "@/hooks/useSiteContent";
import { getIcon } from "@/lib/iconMap";

const HowItWorks = () => {
  const { value: settings } = useSiteSetting("how_it_works", {
    heading_prefix: "How It",
    heading_accent: "Works",
    intro: "",
  });
  const { cards } = useSiteCards("how_it_works");

  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            {settings.heading_prefix} <span className="text-accent">{settings.heading_accent}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto whitespace-pre-line">
            {settings.intro}
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {cards.map((step, i) => {
            const Icon = getIcon(step.icon);
            const num = String(i + 1).padStart(2, "0");
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative text-center group"
              >
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-5 relative z-10 group-hover:bg-accent transition-colors duration-300">
                  <Icon className="w-9 h-9 text-primary-foreground" />
                </div>

                <span className="text-xs font-bold tracking-widest text-accent uppercase mb-1 block">
                  Step {num}
                </span>
                <h3 className="text-lg font-semibold text-primary mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm whitespace-pre-line">{step.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
