import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
    features: [
      "Easy creation of payment certificates",
      "Attach photos as evidence",
      "Issue Tax Invoices and Statements of Accounts",
      "Monitor cashflow",
      "Expert advise",
      "Realtime dashboards for clients and consultants",
    ],
  },
  {
    name: "Profitability Management",
    price: "R9 997",
    amountCents: 999700,
    unit: "for up to 3 projects",
    note: null,
    popular: true,
    features: [
      "Track planned vs actual profit",
      "Identify profit leakages",
      "Manage cashflow",
      "Expert advise",
      "Realtime dashboards for clients and consultants",
      "Monitor cashflow",
    ],
  },
  {
    name: "Project Collaboration Service",
    price: "R1 997",
    amountCents: 199700,
    unit: "for up to 3 projects",
    note: "Only available to those with existing packages",
    features: [
      "Submit and track approvals online",
      "Receive, issue and record project communications online",
      "Track compliance to response timelines",
      "Realtime dashboards for clients and consultants",
      "Expert advise",
    ],
  },
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

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {packages.map((pkg, i) => (
            <motion.div
              key={pkg.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md ${
                pkg.popular ? "border-accent ring-2 ring-accent/20" : "border-border"
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-4 py-1 rounded-full">
                  Most Popular
                </span>
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-primary mb-2 leading-tight min-h-[3.5rem] flex items-center justify-center">
                  {pkg.name}
                </h3>
                <div className="text-3xl font-extrabold text-accent mb-1">{pkg.price}</div>
                <span className="text-sm text-muted-foreground">{pkg.unit}</span>
                {pkg.note && (
                  <p className="text-xs text-muted-foreground italic mt-2">({pkg.note})</p>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {pkg.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSignUp(pkg)}
                disabled={loadingPkg !== null}
                className={`w-full rounded-full font-semibold ${
                  pkg.popular
                    ? "bg-accent text-accent-foreground hover:bg-accent/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {loadingPkg === pkg.name ? "Loading..." : "Sign Up Now"}
              </Button>
            </motion.div>
          ))}
        </div>
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
