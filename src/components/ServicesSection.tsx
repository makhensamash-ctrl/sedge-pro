import { motion } from "framer-motion";
import { useSiteSetting, useSiteCards } from "@/hooks/useSiteContent";
import { getIcon } from "@/lib/iconMap";
import { Check } from "lucide-react";

interface DefaultService {
  id: string;
  title: string;
  description: string;
  features: string[];
  icon: string;
}

const defaultServices: DefaultService[] = [
  {
    id: "default-1",
    title: "Quantity Surveying & Estimating",
    description: "Accurate material take-offs, budget estimates, and cost control for construction projects.",
    features: [
      "Precise bill of quantities (BOQ)",
      "Accurate material take-offs",
      "Comprehensive estimation & budgeting",
      "Interim valuation & payment certs"
    ],
    icon: "BarChart3",
  },
  {
    id: "default-2",
    title: "Project Management & Supervision",
    description: "Professional oversight, scheduling, and quality assurance throughout the project lifecycle.",
    features: [
      "Rigorous quality control",
      "Dynamic project planning & scheduling",
      "Proactive risk identification & mitigation",
      "Detailed site progress reporting"
    ],
    icon: "ShieldCheck",
  },
  {
    id: "default-3",
    title: "IDMS Development Support",
    description: "Full compliance and collaborative management across all stages of public sector infrastructure delivery.",
    features: [
      "Structured IDMS stage gates alignment",
      "Seamless professional collaboration",
      "Statutory compliance reporting",
      "Transparent audit trail management"
    ],
    icon: "Users",
  },
];

interface ServiceData {
  description: string;
  features: string[];
  is_active: boolean;
}

const parseServiceDescription = (raw: string): ServiceData => {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        description: parsed.description || "",
        features: Array.isArray(parsed.features) ? parsed.features : [],
        is_active: typeof parsed.is_active === "boolean" ? parsed.is_active : true,
      };
    }
  } catch (e) {
    // Fail silently, fallback to standard text
  }
  return {
    description: raw || "",
    features: [],
    is_active: true,
  };
};

const ServicesSection = () => {
  const { value: settings } = useSiteSetting("services", {
    heading_prefix: "Our",
    heading_accent: "Services",
    intro: "We provide a comprehensive range of professional services to support your projects.",
  });
  
  const { cards, loading } = useSiteCards("services");

  // Parse custom cards, filter inactive ones
  const parsedCards = (cards || []).map((card) => {
    const parsed = parseServiceDescription(card.description);
    return {
      id: card.id,
      title: card.title,
      description: parsed.description,
      features: parsed.features,
      is_active: parsed.is_active,
      icon: card.icon,
    };
  }).filter((card) => card.is_active !== false);

  // Fall back to high-quality defaults if no active custom services exist
  const displayCards = parsedCards.length > 0 ? parsedCards : defaultServices;

  return (
    <section id="services" className="py-20 bg-surface relative overflow-hidden">
      {/* Dynamic background accents for premium aesthetic */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-green-light/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
        
          <h2 className="text-3xl md:text-4xl font-bold text-primary mt-2 mb-4">
            {settings.heading_prefix} <span className="text-accent">{settings.heading_accent}</span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed whitespace-pre-line">
            {settings.intro}
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {displayCards.map((service, i) => {
              const Icon = service.icon && service.icon !== "None" ? getIcon(service.icon) : null;
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="bg-background/60 backdrop-blur-md border border-border/80 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:border-accent/40 hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden flex flex-col"
                >
                  <div>
                    {/* Subtle glassmorphic hover gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    
                    {/* Decorative circle glow */}
                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-accent/10 rounded-full blur-xl group-hover:bg-accent/20 transition-all duration-300 pointer-events-none" />

                    {Icon && (
                      <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent group-hover:scale-110 transition-all duration-300">
                        <Icon className="w-7 h-7 text-accent group-hover:text-accent-foreground transition-colors duration-300" />
                      </div>
                    )}
                    
                    <h3 className="text-xl font-bold text-primary mb-3 group-hover:text-accent transition-colors duration-200">
                      {service.title}
                    </h3>
                    
                    <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line mb-4 relative z-10">
                      {service.description}
                    </p>
                  </div>

                  {service.features && service.features.length > 0 && (
                    <ul className="space-y-2.5 mt-6 relative z-10 border-t border-border/50 pt-6">
                      {service.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-sm text-foreground/80 group-hover:text-foreground transition-colors duration-200">
                          <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default ServicesSection;
