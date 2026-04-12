import { motion } from "framer-motion";
import { ShieldCheck, Users, BarChart3, GraduationCap } from "lucide-react";

const highlights = [
{
  icon: ShieldCheck,
  title: "Contractor Performance & Profitability",
  desc: "We equip contractors with structured systems and expert support to improve financial visibility, strengthen control, and build resilient businesses."
},
{
  icon: Users,
  title: "Oversight & Industry Performance",
  desc: "We provide developers, associations, and regulators with digital infrastructure that strengthens oversight, enables sector monitoring, and maintains audit-ready project records, enhancing accountability and service delivery"
},
{
  icon: BarChart3,
  title: "Structured Professional Collaboration",
  desc: "We provide a digital collaborative platform that construction value chain stakeholders for efficient and high-quality development of projects across the various IDMS stages from project planning, design development, documentation, procurement, execution, handover and closeout."
},
{
  icon: GraduationCap,
  title: "Graduate Professional Development",
  desc: "We provide unemployed graduates with professional mentoring, relevant experience, link their post graduate research to industry needs whilst providing affordable industry capacity to contractors, clients and consultants."
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
        <p className="text-muted-foreground text-lg leading-relaxed">SEDGE Pro powers better project performance through a hybrid model that combines powerful project management software with on-demand project expertise. We exist to strengthen service delivery excellence, value for money, and shared success across the built environment. By aligning digital systems with practical industry expertise, we help drive better outcomes for organisations, projects, and the construction sector as a whole.





      
      
      
      
      
      </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8">
        {highlights.map((h, i) => <motion.div key={h.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
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