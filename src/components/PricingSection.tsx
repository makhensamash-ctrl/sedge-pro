import { motion } from "framer-motion";
import { Check } from "lucide-react";

const packages = [
  {
    name: "Certificates & Invoicing Services",
    price: "R2 997",
    suffix: "for up to 5 projects",
    features: [
      "Easy creation of payment certificates",
      "Attach photos as evidence",
      "Issue Tax Invoices and Statements of Accounts",
      "Monitor cashflow",
    ],
  },
  {
    name: "Profitability Management",
    price: "R9 997",
    suffix: "for up to 3 projects",
    popular: true,
    features: [
      "Track planned vs actual profit",
      "Identify profit leakages",
      "Manage cashflow",
      "Expert advise",
    ],
  },
  {
    name: "Project Collaboration Service",
    price: "R1 997",
    suffix: "for up to 3 projects",
    note: "Only available to those with existing packages",
    features: [
      "Realtime dashboards for clients and consultants",
      "Submit and track approvals online",
      "Receive, issue and record project communications online",
      "Track compliance to response timelines",
    ],
  },
];

const PricingSection = () => (
  <section id="pricing" className="py-20 bg-surface">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
          Contractor <span className="text-accent">Packages</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Choose the package that fits your project needs. All prices are per project.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {packages.map((pkg, i) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`relative rounded-2xl p-7 flex flex-col border ${
              pkg.popular
                ? "border-accent bg-card shadow-lg ring-2 ring-accent/30"
                : "border-border bg-card shadow-sm"
            } hover:shadow-lg transition-shadow`}
          >
            {pkg.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-4 py-1 rounded-full">
                Popular
              </span>
            )}

            <h3 className="text-lg font-semibold text-primary mb-3">
              {pkg.name}
            </h3>

            <div className="mb-2">
              <p className="text-3xl font-bold text-primary">
                {pkg.price}
              </p>
              <span className="text-sm text-muted-foreground">
                {pkg.suffix}
              </span>
            </div>

            {pkg.note && (
              <p className="text-xs text-muted-foreground italic mb-4">
                {pkg.note}
              </p>
            )}

            <ul className="space-y-3 mb-6 flex-1 mt-4">
              {pkg.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                  <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <a
              href="#contact"
              className={`block text-center py-2.5 rounded-full font-semibold text-sm transition-colors ${
                pkg.popular
                  ? "bg-accent text-accent-foreground hover:bg-green-dark"
                  : "bg-primary text-primary-foreground hover:bg-navy-light"
              }`}
            >
              Sign Up Now
            </a>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default PricingSection;
