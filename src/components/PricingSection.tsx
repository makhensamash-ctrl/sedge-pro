import { motion } from "framer-motion";
import { Check } from "lucide-react";

const packages = [
  {
    name: "Certificates & Invoicing Services",
    price: "R2 997",
    features: [
      "Remove formula errors",
      "Issue Tax Invoices in 1 min",
      "Accurate Statements of Accounts",
      "Track cash position",
    ],
  },
  {
    name: "Profitability & Contracts Management",
    price: "R9 997",
    features: [
      "Track planned vs actual profit",
      "Stop profit leakages (theft/wastage)",
      "Manage cashflow",
      "Variation substantiation",
    ],
  },
  {
    name: "Contract Profitability Baseline Assessment",
    price: "R14 997",
    popular: true,
    features: [
      "Know contract profit margins",
      "Optimise procurement & logistics",
      "Plan delivery schedules",
      "Working capital planning",
    ],
  },
  {
    name: "Commercial Baseline Risk Assessment",
    price: "R24 997",
    features: [
      "Close financial gaps in BoQ",
      "Identify missing payable items",
      "Contractual claims opportunities",
      "Comprehensive risk register",
    ],
  },
  {
    name: "Project Collaboration Service",
    price: "R4 997",
    features: [
      "Access to collaboration software",
      "Realtime project dashboard",
      "Online workflows for approvals",
      "Team performance reports",
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {packages.map((pkg, i) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className={`relative rounded-2xl p-6 flex flex-col border ${
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

            <h3 className="text-base font-semibold text-primary mb-3 min-h-[48px]">
              {pkg.name}
            </h3>

            <div className="mb-5">
              <span className="text-xs text-muted-foreground">From</span>
              <p className="text-2xl font-bold text-primary">
                {pkg.price}
                <span className="text-sm font-normal text-muted-foreground">
                  /project
                </span>
              </p>
            </div>

            <ul className="space-y-3 mb-6 flex-1">
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
