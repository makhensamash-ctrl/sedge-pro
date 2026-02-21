import { motion } from "framer-motion";
import { Check } from "lucide-react";
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
    unit: "for up to 5 projects",
    note: null,
  },
  {
    name: "Profitability Management",
    price: "R9 997",
    unit: "for up to 3 projects",
    note: null,
  },
  {
    name: "Project Collaboration Service",
    price: "R1 997",
    unit: "for up to 3 projects",
    note: "Only available to those with existing packages",
  },
];

const features = [
  { label: "Easy creation of payment certificates", plans: [true, true, true] },
  { label: "Attach photos as evidence", plans: [true, true, true] },
  { label: "Issue Tax Invoices and Statements of Accounts", plans: [true, true, true] },
  { label: "Monitor cashflow", plans: [true, true, true] },
  { label: "Track planned vs actual profit", plans: [true, true, true] },
  { label: "Identify profit leakages", plans: [true, true, true] },
  { label: "Manage cashflow", plans: [true, true, true] },
  { label: "Expert advise", plans: [true, true, true] },
  { label: "Realtime dashboards for clients and consultants", plans: [true, true, true] },
  { label: "Submit and track approvals online", plans: [true, true, true] },
  { label: "Receive, issue and record project communications online", plans: [true, true, true] },
  { label: "Track compliance to response timelines", plans: [true, true, true] },
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
              <TableHead className="min-w-[200px] text-primary font-bold text-sm">
                Features
              </TableHead>
              {packages.map((pkg) => (
                <TableHead key={pkg.name} className="text-center min-w-[180px]">
                  <div className="flex flex-col items-center gap-1 py-2">
                    <span className="text-primary font-bold text-sm leading-tight">
                      {pkg.name}
                    </span>
                    <span className="text-xl font-bold text-accent">{pkg.price}</span>
                    <span className="text-xs text-muted-foreground">{pkg.unit}</span>
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
            {features.map((feat, i) => (
              <TableRow key={feat.label} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                <TableCell className="text-sm text-foreground/80 font-medium">
                  {feat.label}
                </TableCell>
                {feat.plans.map((has, j) => (
                  <TableCell key={j} className="text-center">
                    {has && (
                      <Check className="w-5 h-5 text-accent mx-auto" />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* CTA row */}
        <div className="grid grid-cols-4 border-t border-border">
          <div />
          {packages.map((pkg) => (
            <div key={pkg.name} className="flex justify-center py-4">
              <a
                href="#contact"
                className="bg-accent text-accent-foreground hover:bg-accent/90 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors"
              >
                Sign Up Now
              </a>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default PricingSection;
