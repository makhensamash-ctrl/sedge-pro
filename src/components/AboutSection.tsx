import { motion } from "framer-motion";
import { ShieldCheck, Users, BarChart3 } from "lucide-react";

const highlights = [
{
  icon: ShieldCheck,
  title: "Trusted Platform",
  desc: "Built for contractors by construction professionals, so no professionals are required to use it."
},
{
  icon: Users,
  title: "Expert Support",
  desc: "We don't just give you software — we give you the support to use it."
},
{
  icon: BarChart3,
  title: "Scalable Growth",
  desc: "Helping construction businesses build profitable and scalable operations."
}];


const AboutSection = () =>
<section id="about" className="py-20 bg-surface">
    <div className="container mx-auto px-4">
      <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="max-w-3xl mx-auto text-center mb-14">

        <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
          About <span className="text-accent">SEDGE Pro</span>
        </h2>
        <p className="text-muted-foreground text-lg leading-relaxed">SEDGE Pro supports contractors in building profitable and scalable businesses. Our hybrid platform combines powerful project management software with curated, on-demand expert support — so you're never alone in making crSEDGE Pro assists contractors in building profitable and scalable businesses. Our hybrid platform combines powerful project management software with curated, on-demand expert support — so you're never alone in making critical decisions.





      </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8">
        {highlights.map((h, i) =>
      <motion.div
        key={h.title}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: i * 0.15 }}
        className="bg-card rounded-xl p-8 shadow-sm border border-border hover:shadow-md transition-shadow text-center">

            <div className="w-14 h-14 rounded-full bg-green-light flex items-center justify-center mx-auto mb-5">
              <h.icon className="w-7 h-7 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">
              {h.title}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {h.desc}
            </p>
          </motion.div>
      )}
      </div>
    </div>
  </section>;


export default AboutSection;