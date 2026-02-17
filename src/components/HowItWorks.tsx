import { motion } from "framer-motion";
import { ClipboardList, FolderSync, LayoutDashboard, Lightbulb } from "lucide-react";

const steps = [
  {
    icon: ClipboardList,
    num: "01",
    title: "Capture Data",
    desc: "Site teams input data easily via mobile or desktop.",
  },
  {
    icon: FolderSync,
    num: "02",
    title: "Organize",
    desc: "System automates compliance and sorting instantly.",
  },
  {
    icon: LayoutDashboard,
    num: "03",
    title: "View",
    desc: "Live dashboards for instant project insights.",
  },
  {
    icon: Lightbulb,
    num: "04",
    title: "Decide",
    desc: "Make smarter business decisions in real time.",
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
          Four simple steps from data capture to decision making.
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
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-border" />
            )}

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
