import { motion } from "framer-motion";
import { Check, Clock, X, Check as CheckIcon, Building2, CreditCard, ArrowLeft, Copy, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";

interface PricingTier {
  id: string;
  name: string;
  price_cents: number;
  billing_cycle: string;
  is_active: boolean;
  position: number;
}

interface PackageData {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  description: string | null;
  features: string[];
  is_popular: boolean;
  position: number;
  package_pricing_tiers?: PricingTier[];
}

const formatPrice = (cents: number) => `R${(cents / 100).toLocaleString()}`;

const PricingSection = () => {
  const { value: pricing } = useSiteSetting("pricing", {
    heading_prefix: "Project Performance",
    heading_accent: "System",
    intro:
      "Eight service areas designed to support planning, procurement, delivery, monitoring and performance for contractors, consultants and clients across their entire projects portfolio. Each service has built-in digital tools designed for ease of use by ordinary people with limited experience background.",
  });
  
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [activePromotions, setActivePromotions] = useState<any[]>([]);
  const [globalBillingCycle, setGlobalBillingCycle] = useState<"once_off" | "monthly">("monthly");
  const [cardBillingCycles, setCardBillingCycles] = useState<Record<string, "once_off" | "monthly">>({});
  
  // Checkout controls
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);
  const [selectedPkg, setSelectedPkg] = useState<PackageData | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [heardAbout, setHeardAbout] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [billingAddress, setBillingAddress] = useState("");

  // Promo Code entry in Checkout
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any | null>(null);
  const [promoError, setPromoError] = useState("");

  // Step state for multi-step checkout
  const [checkoutStep, setCheckoutStep] = useState<"form" | "payment-method" | "eft-success" | "card-redirect">("form");
  const [paymentMethod, setPaymentMethod] = useState<"eft" | "card" | "free">("eft");
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Carousel API State for offset-aware edge shadow fading
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
      setCurrent(api.selectedScrollSnap());
      setCount(api.scrollSnapList().length);
    };

    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  const handleGlobalBillingToggle = (checked: boolean) => {
    const newCycle = checked ? "once_off" : "monthly";
    setGlobalBillingCycle(newCycle);
    setCardBillingCycles({}); // Sync all cards by removing specific overrides
  };

  const handleCardBillingToggle = (pkgId: string, checked: boolean) => {
    const newCycle = checked ? "once_off" : "monthly";
    setCardBillingCycles(prev => ({
      ...prev,
      [pkgId]: newCycle
    }));
  };

  useEffect(() => {
    // 1. Fetch Packages & Tiers
    supabase
      .from("packages")
      .select("*, package_pricing_tiers(*)")
      .eq("is_active", true)
      .order("position")
      .then(({ data }) => {
        const sortedPkgs = (data as any[] || []).map(pkg => ({
          ...pkg,
          package_pricing_tiers: pkg.package_pricing_tiers?.filter((t: any) => t.is_active).sort((a: any, b: any) => a.position - b.position) || []
        }));
        setPackages(sortedPkgs);
      });

    // 2. Fetch Auto-applied Promotions (code is null)
    supabase
      .from("promotions")
      .select("*")
      .eq("is_active", true)
      .is("code", null)
      .then(({ data }) => {
        const now = Date.now();
        const active = (data || []).filter((promo: any) => {
          const start = new Date(promo.start_date).getTime();
          const end = promo.end_date ? new Date(promo.end_date).getTime() : null;
          return start <= now && (end === null || now <= end);
        });
        setActivePromotions(active);
      });
  }, []);

  const getSelectedTier = (pkg: PackageData | null) => {
    if (!pkg) return null;
    const isFreePackage = pkg.price_cents === 0 || (pkg.package_pricing_tiers && pkg.package_pricing_tiers.some(t => t.price_cents === 0));
    const currentCycle = isFreePackage ? "monthly" : (cardBillingCycles[pkg.id] || globalBillingCycle);
    return pkg.package_pricing_tiers?.find(t => t.billing_cycle === currentCycle) 
      || pkg.package_pricing_tiers?.[0] 
      || null;
  };

  const getPromotionForPackage = (pkgId: string) => {
    // Manual applied code takes priority
    if (appliedPromo) {
      if (!appliedPromo.applicable_package_ids || appliedPromo.applicable_package_ids.includes(pkgId)) {
        return appliedPromo;
      }
    }
    // Fallback to auto-applied promotion
    return activePromotions.find(p => !p.applicable_package_ids || p.applicable_package_ids.includes(pkgId));
  };

  const calculateDiscountedPrice = (priceCents: number, promo: any) => {
    if (!promo) return priceCents;
    if (promo.discount_type === "percentage") {
      return Math.round(priceCents * (1 - promo.discount_value / 100));
    } else {
      return Math.max(0, priceCents - promo.discount_value);
    }
  };

  const handleSignUp = (pkg: PackageData) => {
    setSelectedPkg(pkg);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setHeardAbout("");
    setBusinessName("");
    setRegNumber("");
    setVatNumber("");
    setBillingAddress("");
    setPromoCodeInput("");
    setAppliedPromo(null);
    setPromoError("");
  };

  const handleApplyPromoCode = async () => {
    setPromoError("");
    if (!promoCodeInput.trim() || !selectedPkg) return;

    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("code", promoCodeInput.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        setPromoError("Invalid discount code.");
        setAppliedPromo(null);
        return;
      }

      // Validate duration
      const now = Date.now();
      const start = new Date(data.start_date).getTime();
      const end = data.end_date ? new Date(data.end_date).getTime() : null;

      if (now < start || (end !== null && now > end)) {
        setPromoError("This discount code has expired.");
        setAppliedPromo(null);
        return;
      }

      // Validate applicable packages
      if (data.applicable_package_ids && !data.applicable_package_ids.includes(selectedPkg.id)) {
        setPromoError("This code does not apply to this package.");
        setAppliedPromo(null);
        return;
      }

      setAppliedPromo(data);
      toast.success("Promo code applied!");
    } catch (err) {
      setPromoError("Could not validate coupon.");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;

    const tier = getSelectedTier(selectedPkg);
    if (!tier) {
      toast.error("No active pricing tier found for this selection.");
      return;
    }

    if (!customerName.trim() || !customerEmail.trim() || !businessName.trim() || !heardAbout) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Auto-select "free" when discounted price is R0
    const activePromo = getPromotionForPackage(selectedPkg.id);
    const finalPrice = calculateDiscountedPrice(tier.price_cents, activePromo);
    setPaymentMethod(finalPrice === 0 ? "free" : "eft");

    setCheckoutStep("payment-method");
  };

  const handlePaymentSubmit = async () => {
    if (!selectedPkg) return;

    const tier = getSelectedTier(selectedPkg);
    if (!tier) {
      toast.error("No active pricing tier found for this selection.");
      return;
    }

    const activePromo = getPromotionForPackage(selectedPkg.id);
    const secureAmountCents = calculateDiscountedPrice(tier.price_cents, activePromo);

    setSubmittingPayment(true);
    try {
      if (paymentMethod === "eft" || paymentMethod === "free") {
        // EFT Checkout via Edge Function
        const { data, error } = await supabase.functions.invoke("create-eft-checkout", {
          body: {
            packageName: selectedPkg.name,
            tierId: tier.id,
            promoCode: activePromo?.code || null,
            clientName: customerName.trim(),
            email: customerEmail.trim(),
            phone: customerPhone.trim() || null,
            businessName: businessName.trim(),
            regNumber: regNumber.trim() || null,
            vatNumber: vatNumber.trim() || null,
            billingAddress: billingAddress.trim() || null,
            heardAbout: heardAbout || null,
            paymentPlan: tier.billing_cycle === "once_off" ? "once-off" : "monthly",
            planLabel: tier.billing_cycle === "once_off" ? "Once-off Payment" : "Monthly Instalments",
            planPrice: formatPrice(secureAmountCents),
            amount: secureAmountCents / 100, // Fallback amount in Rands
          },
        });

        if (error) throw error;

        setBankDetails(data.bankDetails);
        setInvoiceNumber(data.invoiceNumber);
        setTotalAmount(data.totalAmount);
        setCheckoutStep("eft-success");
      } else {
        // Card Checkout via secure Yoco checkout
        setCheckoutStep("card-redirect");
        const { data, error } = await supabase.functions.invoke("create-yoco-checkout", {
          body: {
            packageName: selectedPkg.name,
            tierId: tier.id,
            promoCode: activePromo?.code || null,
            amount: secureAmountCents, // Fallback amount cents
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim(),
            customerPhone: customerPhone.trim(),
            heardAbout: heardAbout,
            businessName: businessName.trim(),
            regNumber: regNumber.trim(),
            vatNumber: vatNumber.trim(),
            billingAddress: billingAddress.trim(),
            paymentPlan: tier.billing_cycle,
            lineItems: [
              {
                displayName: `${selectedPkg.name} — ${tier.billing_cycle === "once_off" ? "Once-off" : "Monthly"}`,
                quantity: 1,
                pricingDetails: { price: secureAmountCents },
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
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      toast.error(err.message || "Something went wrong. Please try again.");
      if (paymentMethod === "card") {
        setCheckoutStep("payment-method");
      }
    } finally {
      setSubmittingPayment(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      if (checkoutStep === "eft-success") {
        window.location.href = "https://app.sedgepro.co.za";
        return;
      }
      setTimeout(() => {
        setCheckoutStep("form");
        setPaymentMethod("eft");
        setBankDetails(null);
        setInvoiceNumber("");
        setTotalAmount(0);
        setSelectedPkg(null);
        setCustomerName("");
        setCustomerEmail("");
        setCustomerPhone("");
        setBusinessName("");
        setRegNumber("");
        setVatNumber("");
        setBillingAddress("");
        setHeardAbout("");
        setPromoCodeInput("");
        setAppliedPromo(null);
        setPromoError("");
      }, 300);
    }
  };

  if (packages.length === 0) return null;

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            {pricing.heading_prefix} <span className="text-accent">{pricing.heading_accent}</span>
          </h2>
          <p className="text-muted-foreground text-lg  max-w-2xl mx-auto whitespace-pre-line">
            {pricing.intro}
          </p>
        </motion.div>

        {/* Global Billing Switcher styled like the image */}
        <div className="flex items-center justify-center gap-4 mb-14">
          <span 
            className={`text-base font-semibold cursor-pointer transition-colors duration-200 ${
              globalBillingCycle === "monthly" ? "text-primary" : "text-muted-foreground"
            }`}
            onClick={() => handleGlobalBillingToggle(false)}
          >
            Monthly instalments
          </span>
          
          <Switch
            id="global-billing-switcher"
            checked={globalBillingCycle === "once_off"}
            onCheckedChange={handleGlobalBillingToggle}
            className="h-7 w-14 bg-accent data-[state=checked]:bg-accent data-[state=unchecked]:bg-accent [&>span]:h-6 [&>span]:w-6 [&>span]:data-[state=checked]:translate-x-7 shrink-0"
          />
          
          <span 
            className={`text-base font-semibold cursor-pointer transition-colors duration-200 ${
              globalBillingCycle === "once_off" ? "text-primary" : "text-muted-foreground"
            }`}
            onClick={() => handleGlobalBillingToggle(true)}
          >
            Once-off (Annual)
          </span>
        </div>

        {/* Carousel Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative">
          <Carousel 
            setApi={setApi}
            opts={{
              align: "start",
              loop: false,
            }}
            className="w-full"
          >
            {/* Edge Shadow Gradients to fade cards out at the boundaries */}
            <div className={`absolute top-0 bottom-0 left-0 w-8 sm:w-16 bg-gradient-to-r from-gray-100 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${canScrollPrev ? "opacity-100" : "opacity-0"}`} />
            <div className={`absolute top-0 bottom-0 right-0 w-8 sm:w-16 bg-gradient-to-l from-gray-100 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${canScrollNext ? "opacity-100" : "opacity-0"}`} />
            <CarouselContent className="-ml-4 py-4">
              {packages.map((pkg, i) => {
                const isFreePackage = pkg.price_cents === 0 || (pkg.package_pricing_tiers && pkg.package_pricing_tiers.some(t => t.price_cents === 0));
                const currentCycle = isFreePackage ? "monthly" : (cardBillingCycles[pkg.id] || globalBillingCycle);
                const tier = getSelectedTier(pkg);
                const promo = tier ? getPromotionForPackage(pkg.id) : null;
                const discountedPrice = tier ? calculateDiscountedPrice(tier.price_cents, promo) : 0;
                const hasPromo = !!promo;

                const otherCycle = currentCycle === "once_off" ? "monthly" : "once_off";
                const otherTier = pkg.package_pricing_tiers?.find(t => t.billing_cycle === otherCycle);
                const otherDiscountedPrice = otherTier ? calculateDiscountedPrice(otherTier.price_cents, promo) : 0;

                return (
                  <CarouselItem key={pkg.id} className="pl-4 basis-[88%] sm:basis-[47%] lg:basis-[31.5%]">
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                      className={`relative flex flex-col h-full rounded-2xl border bg-surface/30 p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-accent/40 ${
                        pkg.is_popular ? "border-accent ring-2 ring-accent/20" : "border-border"
                      }`}
                    >
                      {pkg.is_popular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-xs font-bold px-4 py-1 rounded-full z-10">
                          Most Popular
                        </span>
                      )}

                      <div className="text-center mb-6">
                        <h3 className="text-lg font-bold capitalize text-primary mb-2 leading-tight min-h-[3.5rem] flex items-center justify-center">
                          {pkg.name}
                        </h3>
                        
                        {pkg.description && (
                          <p className="text-xs capitalize text-muted-foreground mb-4 min-h-[2.5rem]">{pkg.description}</p>
                        )}

                        {tier ? (
                          <div className="space-y-1 mt-4">
                            {hasPromo ? (
                              <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1.5 justify-center mb-1">
                                  <span className="text-sm line-through text-muted-foreground/60 font-semibold">
                                    {formatPrice(tier.price_cents)}
                                  </span>
                                  <Badge variant="secondary" className="bg-accent/50 text-accent/90 border-accent/100 text-[9px] font-bold px-1.5 py-0.5">
                                    {promo.discount_type === "percentage" ? `${promo.discount_value}% OFF` : `R${promo.discount_value/100} OFF`}
                                  </Badge>
                                </div>
                                <span className="text-3xl font-extrabold text-accent/90 tracking-tight">
                                  {formatPrice(discountedPrice)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-3xl font-extrabold text-foreground tracking-tight">
                                {formatPrice(tier.price_cents)}
                              </span>
                            )}
                            <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                              {tier.billing_cycle === "once_off" ? "once off" : "per month"}
                            </span>
                            {otherTier &&!isFreePackage && (
                              <span className="block text-xs text-muted-foreground/60 mt-1.5 font-medium">
                                or {formatPrice(otherDiscountedPrice)} {otherTier.billing_cycle === "once_off" ? "once off" : "per month"}
                              </span>
                            )}
                            {promo?.end_date && (
                              <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3 animate-pulse text-amber-500" />
                                Limited Promotion!
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-2 text-sm text-destructive font-medium">Pricing unavailable</div>
                        )}
                      </div>

                      <ul className="space-y-3 mb-8 flex-1 border-t pt-4">
                        {pkg.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2 text-sm text-foreground/80">
                            <Check className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Individual Card Billing Switcher */}
                      {pkg.package_pricing_tiers && pkg.package_pricing_tiers.length > 1 && (
                        <div className="flex items-center justify-center gap-2.5 my-4 pt-4 pb-2 border-t border-border/40">
                          <span 
                            className={`text-xs font-semibold cursor-pointer transition-colors ${
                              currentCycle === "monthly" ? "text-primary" : "text-muted-foreground/70"
                            } ${isFreePackage ? "cursor-not-allowed opacity-50" : ""}`}
                            onClick={() => !isFreePackage && handleCardBillingToggle(pkg.id, false)}
                          >
                            Monthly
                          </span>
                          
                          <Switch
                            checked={currentCycle === "once_off"}
                            onCheckedChange={(checked) => handleCardBillingToggle(pkg.id, checked)}
                            disabled={isFreePackage}
                            className="bg-accent data-[state=checked]:bg-accent data-[state=unchecked]:bg-accent"
                          />
                          
                          <span 
                            className={`text-xs font-semibold cursor-pointer transition-colors ${
                              currentCycle === "once_off" ? "text-primary" : "text-muted-foreground/70"
                            } ${isFreePackage ? "cursor-not-allowed opacity-50" : ""}`}
                            onClick={() => !isFreePackage && handleCardBillingToggle(pkg.id, true)}
                          >
                            Once-off (Annual)
                          </span>
                        </div>
                      )}

                      {tier && (
                        <div className="mt-auto">
                          <Button
                            onClick={() => handleSignUp(pkg)}
                            className={`w-full py-6 rounded-xl font-bold text-sm transition-all duration-300 ${
                              pkg.is_popular 
                                ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/25" 
                                : "bg-primary text-primary-foreground hover:bg-primary/95"
                            }`}
                          >
                            Get Started
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            
            <div className="hidden md:block">
              <CarouselPrevious className="-left-12 bg-accent hover:bg-accent/90 border-accent shadow-md text-accent-foreground transition-all" />
              <CarouselNext className="-right-12 bg-accent hover:bg-accent/90 border-accent shadow-md text-accent-foreground transition-all" />
            </div>
          </Carousel>

          {/* Bottom Carousel Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => api?.scrollPrev()}
              disabled={!canScrollPrev}
              className="w-10 h-10 rounded-full border-none bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all duration-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            
            <span className="text-sm font-bold text-foreground bg-surface/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border/40 shadow-sm min-w-[3.5rem] text-center">
              {current + 1} / {count || packages.length}
            </span>

            <Button
              variant="outline"
              size="icon"
              onClick={() => api?.scrollNext()}
              disabled={!canScrollNext}
              className="w-10 h-10 rounded-full border-none bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground shadow-md disabled:opacity-40 disabled:pointer-events-none transition-all duration-200"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Customer info dialog */}
      <Dialog open={!!selectedPkg} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          {(() => {
            if (!selectedPkg) return null;
            const tier = getSelectedTier(selectedPkg);
            const promo = selectedPkg ? getPromotionForPackage(selectedPkg.id) : null;
            const discountedPrice = tier ? calculateDiscountedPrice(tier.price_cents, promo) : 0;
            const heardAboutOptions = ["Google Search", "Social Media", "Referral", "Industry Event", "Word of Mouth", "Other"];

            return (
              <>
                {checkoutStep === "form" && (
                  <>
                    <DialogHeader className="pb-3 border-b">
                      <DialogTitle className="text-xl md:text-2xl font-bold text-slate-900 leading-snug">
                        Join the {selectedPkg.name}
                      </DialogTitle>
                      <p className="text-xs md:text-sm text-slate-500 mt-1.5 leading-relaxed">
                        Secure your spot at exclusive launch pricing. Fill in your details and choose a payment plan.
                      </p>
                    </DialogHeader>

                    <form onSubmit={handleFormSubmit} className="space-y-4 mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-1">
                          <Label htmlFor="customer-name" className="text-sm font-semibold text-slate-700">Full Name *</Label>
                          <Input id="customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="John Doe" required className="rounded-lg border-slate-200 focus-visible:ring-accent/90" />
                        </div>
                        <div className="space-y-1.5 col-span-1">
                          <Label htmlFor="customer-email" className="text-sm font-semibold text-slate-700">Email *</Label>
                          <Input id="customer-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="john@example.com" required className="rounded-lg border-slate-200 focus-visible:ring-accent/90" />
                        </div>
                        <div className="space-y-1.5 col-span-1">
                          <Label htmlFor="customer-phone" className="text-sm font-semibold text-slate-700">Phone</Label>
                          <Input id="customer-phone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="+27 82 123 4567" className="rounded-lg border-slate-200 focus-visible:ring-accent/90" />
                        </div>
                        <div className="space-y-1.5 col-span-1">
                          <Label htmlFor="business-name" className="text-sm font-semibold text-slate-700">Business Name *</Label>
                          <Input id="business-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="My Construction Co." required className="rounded-lg border-slate-200 focus-visible:ring-accent/90" />
                        </div>
                        <div className="space-y-1.5 col-span-1">
                          <Label htmlFor="reg-number" className="text-sm font-semibold text-slate-700">Registration Number</Label>
                          <Input id="reg-number" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="2024/123456/07" className="rounded-lg border-slate-200 focus-visible:ring-accent/90" />
                        </div>

                        <div className="space-y-1.5 col-span-1">
                          <Label htmlFor="vat-number" className="text-sm font-semibold text-slate-700">VAT Number</Label>
                          <Input id="vat-number" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="4012345678" className="rounded-lg border-slate-200 focus-visible:ring-accent/90" />
                        </div>
                        
                        
                        <div className="space-y-1.5 md:col-span-2">
                          <Label htmlFor="billing-address" className="text-sm font-semibold text-slate-700">Billing Address *</Label>
                          <Textarea id="billing-address" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} placeholder="123 Main Street, Sandton, 2196" required rows={2} className="rounded-lg border-slate-200 focus-visible:ring-accent/90" />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <Label htmlFor="heard-about" className="text-sm font-semibold text-slate-700">Where did you hear about us? *</Label>
                          <Select value={heardAbout} onValueChange={setHeardAbout} required>
                            <SelectTrigger id="heard-about" className="rounded-lg border-slate-200 focus-visible:ring-accent/90 text-left">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {heardAboutOptions.map((opt) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <h4 className="text-sm font-bold text-slate-800">Choose Your Payment Plan</h4>
                        {tier ? (
                          <div className="border border-accent/80 bg-emerald-50/10 rounded-xl p-4 flex justify-between items-center shadow-sm">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm md:text-base">
                                {tier.billing_cycle === "once_off" ? "Once-off Payment" : "Monthly Instalments"}
                              </span>
                              <span className="text-xs text-slate-500 mt-1">
                                {tier.billing_cycle === "once_off" 
                                  ? "Single payment — best value" 
                                  : `12 monthly payments of ${formatPrice(discountedPrice)} (${formatPrice(discountedPrice * 12)} total)`}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-lg md:text-xl font-extrabold text-accent/90 tracking-tight">
                                {formatPrice(discountedPrice)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-2 text-sm text-destructive font-medium">Pricing unavailable</div>
                        )}
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full py-6 mt-6 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg"
                      >
                        Continue to Payment
                      </Button>
                    </form>
                  </>
                )}

                {checkoutStep === "payment-method" && tier && (
                  <>
                    <DialogHeader className="pb-3 border-b">
                      <DialogTitle className="text-xl">
                        {discountedPrice === 0 ? "Confirm Registration" : "Select Payment Method"}
                      </DialogTitle>
                      <p className="text-xs md:text-sm text-slate-500 mt-1.5 leading-relaxed">
                        {discountedPrice === 0
                          ? "No payment is required — your total is R0. Confirm to complete your registration."
                          : `Choose how you'd like to pay for the ${tier.billing_cycle === "once_off" ? "Once-off Payment" : "Monthly Instalments"} (${formatPrice(discountedPrice)}).`}
                      </p>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                      {discountedPrice === 0 ? (
                        <RadioGroup value="free" className="grid gap-3">
                          <label
                            htmlFor="method-free"
                            className="flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors border-accent bg-accent/5"
                          >
                            <RadioGroupItem value="free" id="method-free" className="mt-0.5" />
                            <div className="flex items-center gap-3 flex-1">
                              <CheckIcon className="w-5 h-5 text-accent shrink-0" />
                              <div>
                                <span className="font-semibold text-foreground">Continue without payment</span>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Your total is R0. No payment is required to complete your registration.
                                </p>
                              </div>
                            </div>
                          </label>
                        </RadioGroup>
                      ) : (
                        <RadioGroup
                          value={paymentMethod}
                          onValueChange={(v) => setPaymentMethod(v as "eft" | "card")}
                          className="grid gap-3"
                        >
                          <label
                            htmlFor="method-eft"
                            className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                              paymentMethod === "eft" ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground/30"
                            }`}
                          >
                            <RadioGroupItem value="eft" id="method-eft" className="mt-0.5" />
                            <div className="flex items-center gap-3 flex-1">
                              <Building2 className="w-5 h-5 text-accent shrink-0" />
                              <div>
                                <span className="font-semibold text-foreground">EFT / Bank Transfer</span>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Pay via electronic funds transfer. An invoice will be generated and emailed to you.
                                </p>
                              </div>
                            </div>
                          </label>

                          <label
                            htmlFor="method-card"
                            className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                              paymentMethod === "card" ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground/30"
                            }`}
                          >
                            <RadioGroupItem value="card" id="method-card" className="mt-0.5" />
                            <div className="flex items-center gap-3 flex-1">
                              <CreditCard className="w-5 h-5 text-accent shrink-0" />
                              <div>
                                <span className="font-semibold text-foreground">Card Payment</span>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Pay instantly with your credit or debit card via secure checkout.
                                </p>
                              </div>
                            </div>
                          </label>
                        </RadioGroup>
                      )}

                      <div className="flex gap-3 pt-2">
                        <Button variant="outline" onClick={() => setCheckoutStep("form")} className="flex-1 rounded-xl py-6 font-bold text-sm">
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button onClick={handlePaymentSubmit} disabled={submittingPayment} className="flex-1 rounded-xl py-6 font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90" size="lg">
                          {submittingPayment ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : paymentMethod === "free" ? (
                            "Complete Registration"
                          ) : paymentMethod === "card" ? (
                            "Pay Now"
                          ) : (
                            "View Payment Details"
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {checkoutStep === "eft-success" && (
                  <div className="space-y-6 py-4">
                    <div className="flex flex-col items-center text-center">
                      <CheckCircle2 className="w-14 h-14 text-green-500 mb-3" />
                      <h3 className="text-xl font-bold mb-1">
                        {totalAmount === 0 ? "Registration Complete!" : "Invoice Generated!"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {totalAmount === 0 ? (
                          <>Your registration has been confirmed. Our team will be in touch to get you set up.</>
                        ) : (
                          <>Invoice <span className="font-semibold text-foreground">{invoiceNumber}</span> has been created. Please use the banking details below to complete your payment.</>
                        )}
                      </p>
                    </div>

                    {totalAmount > 0 && bankDetails && (
                      <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-left">
                        <h4 className="font-semibold text-sm text-foreground">Banking Details</h4>
                        {[
                          { label: "Bank", value: bankDetails.bankName },
                          { label: "Account Holder", value: bankDetails.accountHolder },
                          { label: "Account Number", value: bankDetails.accountNumber },
                          { label: "Branch Code", value: bankDetails.branchCode },
                          { label: "Reference", value: bankDetails.reference },
                          { label: "Amount", value: `R${totalAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}` },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{item.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{item.value}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(item.value || "")}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="Copy"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {totalAmount > 0 && (
                      <p className="text-xs text-muted-foreground text-center">
                        Please use your invoice number as the payment reference. Our team will confirm your payment and get you set up.
                      </p>
                    )}

                    <Button className="w-full rounded-xl py-6 font-bold" onClick={() => handleClose(false)}>
                      Ok
                    </Button>
                  </div>
                )}

                {checkoutStep === "card-redirect" && (
                  <div className="flex flex-col items-center text-center py-8">
                    <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
                    <h3 className="text-lg font-bold mb-2">Redirecting to Payment...</h3>
                    <p className="text-sm text-muted-foreground">You will be redirected to our secure payment page shortly.</p>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PricingSection;
