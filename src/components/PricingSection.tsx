import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

const packages = [
  {
    name: "Certificates & Invoicing Services",
    price: "R2 997",
    period: "for up to 5 projects",
  },
  {
    name: "Profitability Management",
    price: "R9 997",
    period: "for up to 3 projects",
  },
  {
    name: "Project Collaboration Service",
    price: "R1 997",
    period: "for up to 3 projects",
    note: "Only available to those with existing packages",
  },
];

const features = [
  { label: "Easy creation of payment certificates", plans: [true, false, false] },
  { label: "Attach photos as evidence", plans: [true, false, false] },
  { label: "Issue Tax Invoices and Statements of Accounts", plans: [true, false, false] },
  { label: "Monitor cashflow", plans: [true, false, false] },
  { label: "Track planned vs actual profit", plans: [false, true, false] },
  { label: "Identify profit leakages", plans: [false, true, false] },
  { label: "Manage cashflow", plans: [false, true, false] },
  { label: "Expert advise", plans: [false, true, false] },
  { label: "Realtime dashboards for clients and consultants", plans: [false, false, true] },
  { label: "Submit and track approvals online", plans: [false, false, true] },
  { label: "Receive, issue and record project communications online", plans: [false, false, true] },
  { label: "Track compliance to response timelines", plans: [false, false, true] },
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
          Choose the package that fits your project needs.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5">
              <TableHead className="min-w-[220px] text-primary font-semibold">
                Features
              </TableHead>
              {packages.map((pkg) => (
                <TableHead key={pkg.name} className="text-center min-w-[180px]">
                  <div className="flex flex-col items-center gap-1 py-2">
                    <span className="text-sm font-bold text-primary leading-tight">
                      {pkg.name}
                    </span>
                    <span className="text-xl font-bold text-accent">{pkg.price}</span>
                    <span className="text-xs text-muted-foreground">{pkg.period}</span>
                    {pkg.note && (
                      <span className="text-[10px] text-muted-foreground italic leading-tight max-w-[160px]">
                        ({pkg.note})
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {features.map((feature) => (
              <TableRow key={feature.label}>
                <TableCell className="text-sm text-foreground/80 font-medium">
                  {feature.label}
                </TableCell>
                {feature.plans.map((included, i) => (
                  <TableCell key={i} className="text-center">
                    {included ? (
                      <Check className="w-5 h-5 text-accent mx-auto" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-6 border-t border-border">
          {packages.map((pkg) => (
            <a
              key={pkg.name}
              href="#contact"
              className="inline-block text-center py-2.5 px-8 rounded-full font-semibold text-sm bg-accent text-accent-foreground hover:bg-green-dark transition-colors"
            >
              Get {pkg.name.split(" ")[0]}
            </a>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default PricingSection;
