import { motion } from "framer-motion";
import { useSiteSetting, useSiteCards } from "@/hooks/useSiteContent";
import { getIcon } from "@/lib/iconMap";

const AboutSection = () => {
  const { value: settings } = useSiteSetting("about", {
    heading_prefix: "About",
    heading_accent: "SEDGE Pro",
    intro: "",
  });
  const { cards } = useSiteCards("about");

  return (
    <section id="about" className="py-20 bg-surface">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            {settings.heading_prefix} <span className="text-accent">{settings.heading_accent}</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-line">
            {settings.intro}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {cards.map((card, i) => {
            const Icon = getIcon(card.icon);
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="bg-card rounded-xl p-8 shadow-sm border border-border hover:shadow-md transition-shadow text-center"
              >
                <div className="w-14 h-14 rounded-full bg-green-light flex items-center justify-center mx-auto mb-5">
                  <Icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-primary mb-2">{card.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
                  {card.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
