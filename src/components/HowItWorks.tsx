import { motion } from "framer-motion";
import { Settings, Users, FileText, BarChart3, Bell, CheckCircle, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Settings,
    num: "01",
    title: "Project Setup & Access",
    desc: "We setup your project within 48 hours and grant relevant access for project stakeholders to transact.",
  },
  {
    icon: FileText,
    num: "02",
    title: "Capture Data",
    desc: "Stakeholders create in-system documents, upload and capture regular project data.",
  },
  {
    icon: BarChart3,
    num: "03",
    title: "Auto Reports",
    desc: "System analyses and autogenerate professional reports and files all records.",
  },
  {
    icon: Bell,
    num: "04",
    title: "Performance Tracking",
    desc: "Users get customised performance reports and action trackers with notifications.",
  },
  {
    icon: CheckCircle,
    num: "05",
    title: "Decide",
    desc: "Quality real-time evidence-based decisions are made.",
  },
  {
    icon: TrendingUp,
    num: "06",
    title: "Continual Improvement",
    desc: "Stakeholders received customised continual improvement reports and industry insights.",
  },
];

const HowItWorks = () => (
  <section id="how-it-works" className="py-20 bg-background">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
          How It <span className="text-accent">Works</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Seven simple steps from project setup to decision making with no training required.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((s, i) => (
          <motion.div
            key={s.num}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.12 }}
            className="relative text-center group"
          >
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-5 relative z-10 group-hover:bg-accent transition-colors duration-300">
              <s.icon className="w-9 h-9 text-primary-foreground" />
            </div>

            <span className="text-xs font-bold tracking-widest text-accent uppercase mb-1 block">
              Step {s.num}
            </span>
            <h3 className="text-lg font-semibold text-primary mb-2">{s.title}</h3>
            <p className="text-muted-foreground text-sm">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
