import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const packages = [
  {
    name: "Certificates & Invoicing Services",
    price: "R2 997",
    amountCents: 299700,
    unit: "for up to 5 projects",
    note: null,
  },
  {
    name: "Profitability Management",
    price: "R9 997",
    amountCents: 999700,
    unit: "for up to 3 projects",
    note: null,
  },
  {
    name: "Project Collaboration Service",
    price: "R1 997",
    amountCents: 199700,
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

const PricingSection = () => {
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<typeof packages[0] | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [heardAbout, setHeardAbout] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [billingAddress, setBillingAddress] = useState("");

  const handleSignUp = (pkg: typeof packages[0]) => {
    setSelectedPkg(pkg);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setHeardAbout("");
    setBusinessName("");
    setRegNumber("");
    setBillingAddress("");
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;

    setLoadingPkg(selectedPkg.name);
    try {
      const { data, error } = await supabase.functions.invoke("create-yoco-checkout", {
        body: {
          packageName: selectedPkg.name,
          amount: selectedPkg.amountCents,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          heardAbout: heardAbout.trim(),
          businessName: businessName.trim(),
          regNumber: regNumber.trim(),
          billingAddress: billingAddress.trim(),
          lineItems: [
            {
              displayName: selectedPkg.name,
              quantity: 1,
              pricingDetails: { price: selectedPkg.amountCents },
              description: selectedPkg.unit,
            },
          ],
        },
      });

      if (error) throw error;
      if (data?.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error("No redirect URL received");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error("Could not start checkout. Please try again.");
    } finally {
      setLoadingPkg(null);
      setSelectedPkg(null);
    }
  };

  return (
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
                <button
                  onClick={() => handleSignUp(pkg)}
                  disabled={loadingPkg !== null}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors disabled:opacity-50"
                >
                  {loadingPkg === pkg.name ? "Loading..." : "Sign Up Now"}
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Customer info dialog */}
      <Dialog open={!!selectedPkg} onOpenChange={(open) => !open && setSelectedPkg(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your Details</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            Please provide your details before proceeding to payment for <span className="font-semibold text-foreground">{selectedPkg?.name}</span>.
          </p>
          <form onSubmit={handleCheckout} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Full Name *</Label>
              <Input id="customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">Email *</Label>
              <Input id="customer-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="john@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input id="customer-phone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+27 82 123 4567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business-name">Business Name *</Label>
              <Input id="business-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="My Construction Co." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-number">Registration Number (if applicable)</Label>
              <Input id="reg-number" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="2024/123456/07" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billing-address">Billing Address *</Label>
              <Textarea id="billing-address" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} placeholder="123 Main Street, Sandton, 2196" required rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heard-about">Where did you hear about us? *</Label>
              <Select value={heardAbout} onValueChange={setHeardAbout} required>
                <SelectTrigger id="heard-about">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {["Google Search", "Social Media", "Referral", "Industry Event", "Word of Mouth", "Other"].map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loadingPkg !== null || !heardAbout}>
              {loadingPkg ? "Redirecting..." : `Pay ${selectedPkg?.price}`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PricingSection;
