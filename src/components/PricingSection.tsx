import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
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

interface PackageData {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  description: string | null;
  features: string[];
  is_popular: boolean;
  position: number;
}

const PricingSection = () => {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<PackageData | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [heardAbout, setHeardAbout] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [billingAddress, setBillingAddress] = useState("");

  useEffect(() => {
    supabase
      .from("packages")
      .select("id, name, price_cents, currency, description, features, is_popular, position")
      .eq("is_active", true)
      .order("position")
      .then(({ data }) => setPackages((data as PackageData[]) || []));
  }, []);

  const formatPrice = (cents: number) => `R${(cents / 100).toLocaleString()}`;

  const handleSignUp = (pkg: PackageData) => {
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
          amount: selectedPkg.price_cents,
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
              pricingDetails: { price: selectedPkg.price_cents },
              description: selectedPkg.description || selectedPkg.name,
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

  if (packages.length === 0) return null;

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
            Project Performance System <span className="text-accent">Modules</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A comprehensive set of modules designed to support planning, procurement, delivery, and performance across your projects.
          </p>
        </motion.div>

        <div className={`grid gap-6 max-w-5xl mx-auto ${packages.length === 1 ? "md:grid-cols-1 max-w-md" : packages.length === 2 ? "md:grid-cols-2 max-w-3xl" : "md:grid-cols-3"}`}>
          {packages.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md ${
                pkg.is_popular ? "border-accent ring-2 ring-accent/20" : "border-border"
              }`}
            >
              {pkg.is_popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-4 py-1 rounded-full">
                  Most Popular
                </span>
              )}

              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-primary mb-2 leading-tight min-h-[3.5rem] flex items-center justify-center">
                  {pkg.name}
                </h3>
                
                {pkg.description && (
                  <span className="text-sm text-muted-foreground">{pkg.description}</span>
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
              {loadingPkg ? "Redirecting..." : "Proceed"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PricingSection;
