import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSiteSetting } from "@/hooks/useSiteContent";
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
  price_cents_annual: number;
  currency: string;
  description: string | null;
  features: string[];
  is_popular: boolean;
  position: number;
}

const PricingSection = () => {
  const { value: pricing } = useSiteSetting("pricing", {
    heading_prefix: "Project Performance",
    heading_accent: "System",
    intro:
      "Eight service areas designed to support planning, procurement, delivery, monitoring and performance for contractors, consultants and clients across their entire projects portfolio. Each service has built-in digital tools designed for ease of use by ordinary people with limited experience background.",
  });
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<PackageData | null>(null);
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
  
  // Checkout details state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [heardAbout, setHeardAbout] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  
  // Promo code states
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState("");
  const [verifyingPromo, setVerifyingPromo] = useState(false);

  useEffect(() => {
    supabase
      .from("packages")
      .select("id, name, price_cents, price_cents_annual, currency, description, features, is_popular, position")
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
    setPromoCode("");
    setAppliedPromo(null);
    setPromoError("");
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setVerifyingPromo(true);
    setPromoError("");
    setAppliedPromo(null);

    try {
      const codeToSearch = promoCode.trim().toUpperCase();
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("code", codeToSearch)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setPromoError("Promo code is invalid.");
        return;
      }

      if (!data.is_active) {
        setPromoError("This promo code is no longer active.");
        return;
      }

      // Verify date ranges
      const now = new Date().getTime();
      const starts = data.starts_at ? new Date(data.starts_at).getTime() : null;
      const ends = data.ends_at ? new Date(data.ends_at).getTime() : null;

      if (starts && now < starts) {
        setPromoError("This promotion has not started yet.");
        return;
      }

      if (ends && now > ends) {
        setPromoError("This promotion has expired.");
        return;
      }

      if (data.max_redemptions !== null && data.redemptions_count >= data.max_redemptions) {
        setPromoError("This promotion code has reached its usage limit.");
        return;
      }

      setAppliedPromo(data);
      toast.success(`Promo code "${codeToSearch}" applied!`);
    } catch (err: any) {
      console.error("Promo apply error:", err);
      setPromoError("Failed to verify code. Please try again.");
    } finally {
      setVerifyingPromo(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;

    const basePriceCents = billingInterval === "monthly" 
      ? selectedPkg.price_cents 
      : (selectedPkg.price_cents_annual || (selectedPkg.price_cents * 10));
    
    let finalPriceCents = basePriceCents;

    if (appliedPromo) {
      if (appliedPromo.discount_type === "percentage") {
        finalPriceCents = Math.round(basePriceCents * (100 - appliedPromo.discount_value) / 100);
      } else {
        finalPriceCents = Math.max(100, basePriceCents - appliedPromo.discount_value);
      }
    }

    setLoadingPkg(selectedPkg.name);
    try {
      const { data, error } = await supabase.functions.invoke("create-yoco-checkout", {
        body: {
          packageName: `${selectedPkg.name} (${billingInterval === "monthly" ? "Monthly" : "Annual"})`,
          amount: finalPriceCents,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          heardAbout: heardAbout.trim(),
          businessName: businessName.trim(),
          regNumber: regNumber.trim(),
          billingAddress: billingAddress.trim(),
          paymentPlan: billingInterval,
          promoCode: appliedPromo ? appliedPromo.code : null,
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
          className="text-center mb-6"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            {pricing.heading_prefix} <span className="text-accent">{pricing.heading_accent}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto whitespace-pre-line">
            {pricing.intro}
          </p>
        </motion.div>

        {/* Pricing Cycle Switcher */}
        <div className="flex justify-center items-center gap-4 mb-14">
          <span className={`text-sm font-semibold transition-colors ${billingInterval === "monthly" ? "text-primary" : "text-muted-foreground"}`}>Monthly</span>
          <button
            onClick={() => setBillingInterval(billingInterval === "monthly" ? "annual" : "monthly")}
            className="relative w-14 h-8 bg-muted rounded-full transition-colors focus:outline-none"
          >
            <div
              className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-accent transition-transform shadow-sm ${
                billingInterval === "annual" ? "translate-x-6" : ""
              }`}
            />
          </button>
          <span className={`text-sm font-semibold transition-colors flex items-center gap-1.5 ${billingInterval === "annual" ? "text-primary" : "text-muted-foreground"}`}>
            Annually
            <span className="bg-accent/10 text-accent text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-accent/20 animate-pulse">
              Save ~16%
            </span>
          </span>
        </div>

        <div className={`grid gap-6 max-w-5xl mx-auto ${packages.length === 1 ? "md:grid-cols-1 max-w-md" : packages.length === 2 ? "md:grid-cols-2 max-w-3xl" : "md:grid-cols-3"}`}>
          {packages.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-lg ${
                pkg.is_popular ? "border-accent ring-2 ring-accent/20 scale-105 z-10" : "border-border"
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
                
                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-foreground">
                    {formatPrice(billingInterval === "monthly" ? pkg.price_cents : (pkg.price_cents_annual || (pkg.price_cents * 10)))}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium ml-1">
                    {billingInterval === "monthly" ? "/mo" : "/yr"}
                  </span>
                </div>

                {pkg.description && (
                  <p className="text-sm text-muted-foreground min-h-[2.5rem] leading-relaxed">{pkg.description}</p>
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
                className={`w-full py-6 font-bold rounded-xl transition-all shadow-sm ${
                  pkg.is_popular 
                    ? "bg-accent text-accent-foreground hover:bg-accent/90" 
                    : "bg-primary text-primary-foreground hover:bg-primary/95"
                }`}
              >
                Get Started
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Customer info dialog */}
      <Dialog open={!!selectedPkg} onOpenChange={(open) => !open && setSelectedPkg(null)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Your Details</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            Please provide your details before proceeding to secure payment for <span className="font-semibold text-foreground">{selectedPkg?.name}</span>.
          </p>

          {selectedPkg && (
            <div className="bg-muted/40 p-3 rounded-lg border text-sm space-y-1.5 mb-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selected Plan:</span>
                <span className="font-semibold">{selectedPkg.name} ({billingInterval === "monthly" ? "Monthly" : "Annual"})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-medium">
                  {formatPrice(billingInterval === "monthly" ? selectedPkg.price_cents : (selectedPkg.price_cents_annual || (selectedPkg.price_cents * 10)))}
                </span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>Discount Applied:</span>
                  <span>
                    -{appliedPromo.discount_type === "percentage"
                      ? `${appliedPromo.discount_value}%`
                      : formatPrice(appliedPromo.discount_value)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1.5 font-bold text-foreground">
                <span>Total Amount:</span>
                <span className="text-accent text-base">
                  {(() => {
                    const basePrice = billingInterval === "monthly" 
                      ? selectedPkg.price_cents 
                      : (selectedPkg.price_cents_annual || (selectedPkg.price_cents * 10));
                    if (!appliedPromo) return formatPrice(basePrice);
                    if (appliedPromo.discount_type === "percentage") {
                      return formatPrice(Math.round(basePrice * (100 - appliedPromo.discount_value) / 100));
                    }
                    return formatPrice(Math.max(100, basePrice - appliedPromo.discount_value));
                  })()}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleCheckout} className="space-y-3 pr-1">
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

            {/* Promo Code Fields */}
            <div className="space-y-2 border-t pt-3 mt-3">
              <Label htmlFor="promo-code">Promo Code</Label>
              <div className="flex gap-2">
                <Input
                  id="promo-code"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    setPromoError("");
                    setAppliedPromo(null);
                  }}
                  placeholder="e.g. SEDGE50"
                  disabled={!!appliedPromo || verifyingPromo}
                  className="font-mono uppercase tracking-wider"
                />
                {appliedPromo ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAppliedPromo(null);
                      setPromoCode("");
                    }}
                    className="text-destructive border-destructive/20 hover:bg-destructive/10 shrink-0"
                  >
                    Clear
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyPromo}
                    disabled={verifyingPromo || !promoCode.trim()}
                    className="shrink-0"
                  >
                    {verifyingPromo ? "Verifying..." : "Apply"}
                  </Button>
                )}
              </div>
              {promoError && <p className="text-xs text-destructive font-semibold">{promoError}</p>}
              {appliedPromo && (
                <p className="text-xs text-green-600 font-bold">
                  ✓ Code applied! {appliedPromo.discount_type === "percentage" ? `${appliedPromo.discount_value}% discount` : `R ${(appliedPromo.discount_value / 100).toLocaleString()} discount`}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full mt-4 bg-accent text-accent-foreground hover:bg-accent/90" disabled={loadingPkg !== null || !heardAbout}>
              {loadingPkg ? "Redirecting to Secure Gateway..." : "Proceed to Payment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PricingSection;
