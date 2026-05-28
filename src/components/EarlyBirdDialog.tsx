import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, CreditCard, Building2, ArrowLeft, Copy } from "lucide-react";
import { useSiteSetting } from "@/hooks/useSiteContent";

interface EarlyBirdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    client_name?: string;
    email?: string;
    phone?: string;
    businessName?: string;
    regNumber?: string;
    billingAddress?: string;
    heardAbout?: string;
    plan?: string;
    fromExternal?: boolean;
  };
}

const parsePriceToCents = (priceStr: string | number | undefined | null, defaultCents: number): number => {
  if (priceStr === undefined || priceStr === null) return defaultCents;
  const str = String(priceStr).trim();
  if (!str) return defaultCents;

  const cleaned = str.replace(/[^0-9.]/g, "");
  if (!cleaned) return defaultCents;

  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return defaultCents;

  const dotIndex = cleaned.lastIndexOf(".");
  if (dotIndex !== -1 && cleaned.length - dotIndex - 1 === 2) {
    return Math.round(parsed * 100);
  }

  return Math.round(parseFloat(cleaned.replace(/\./g, "")) * 100);
};

const heardAboutOptions = ["Google Search", "Social Media", "Referral", "Industry Event", "Word of Mouth", "Other"];


type Step = "form" | "payment-method" | "eft-success" | "card-redirect";

interface BankDetails {
  bankName: string;
  accountNumber: string;
  branchCode: string;
  accountHolder: string;
  reference: string;
}

const EarlyBirdDialog = ({ open, onOpenChange, initialData }: EarlyBirdDialogProps) => {
  const { value: promo } = useSiteSetting("prelaunch", {
    once_off: "5000",
    monthly: "700",
  });

  const paymentPlans = useMemo(() => {
    const onceOffCents = parsePriceToCents(promo.once_off, 500000);
    const onceOffRands = onceOffCents / 100;

    const monthlyCents = parsePriceToCents(promo.monthly, 70000);
    const monthlyRands = monthlyCents / 100;
    const totalMonthlyRands = monthlyRands * 12;

    return [
      {
        id: "once-off",
        label: "Once-off Payment",
        price: `R ${onceOffRands.toLocaleString("en-ZA")}`,
        description: "Single payment — best value",
        amountCents: onceOffCents,
      },
      {
        id: "monthly",
        label: "Monthly Instalments",
        price: `R ${monthlyRands.toLocaleString("en-ZA")}`,
        description: `12 monthly payments of R ${monthlyRands.toLocaleString("en-ZA")} (R ${totalMonthlyRands.toLocaleString("en-ZA")} total)`,
        amountCents: monthlyCents,
      },
    ];
  }, [promo.once_off, promo.monthly]);

  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"eft" | "card">("eft");
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [formData, setFormData] = useState({
    client_name: "",
    email: "",
    phone: "",
    businessName: "",
    regNumber: "",
    billingAddress: "",
    heardAbout: "",
    plan: "once-off",
  });

  // Promo code states
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState("");
  const [verifyingPromo, setVerifyingPromo] = useState(false);

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

  useEffect(() => {
    if (open && initialData) {
      setFormData((prev) => {
        const next = { ...prev };
        if (initialData.client_name) next.client_name = initialData.client_name;
        if (initialData.email) next.email = initialData.email;
        if (initialData.phone) next.phone = initialData.phone;
        if (initialData.businessName) next.businessName = initialData.businessName;
        if (initialData.regNumber) next.regNumber = initialData.regNumber;
        if (initialData.billingAddress) next.billingAddress = initialData.billingAddress;
        if (initialData.heardAbout) {
          const matchedOption = heardAboutOptions.find(
            (opt) => opt.toLowerCase() === initialData.heardAbout?.toLowerCase()
          );
          next.heardAbout = matchedOption || initialData.heardAbout;
        }
        if (initialData.plan && (initialData.plan === "once-off" || initialData.plan === "monthly")) {
          next.plan = initialData.plan;
        }
        return next;
      });
    }
  }, [open, initialData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const selectedPlan = paymentPlans.find((p) => p.id === formData.plan)!;


  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name.trim() || !formData.email.trim() || !formData.businessName.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setStep("payment-method");
  };

  const handlePaymentSubmit = async () => {
    setSubmitting(true);

    const baseAmountCents = selectedPlan.amountCents;
    let finalAmountCents = baseAmountCents;

    if (appliedPromo) {
      if (appliedPromo.discount_type === "percentage") {
        finalAmountCents = Math.round(baseAmountCents * (100 - appliedPromo.discount_value) / 100);
      } else {
        finalAmountCents = Math.max(100, baseAmountCents - appliedPromo.discount_value);
      }
    }

    try {
      if (paymentMethod === "eft") {
        const { data, error } = await supabase.functions.invoke("create-eft-checkout", {
          body: {
            clientName: formData.client_name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim() || null,
            businessName: formData.businessName.trim(),
            regNumber: formData.regNumber.trim() || null,
            billingAddress: formData.billingAddress.trim() || null,
            heardAbout: formData.heardAbout || null,
            paymentPlan: formData.plan,
            planLabel: selectedPlan.label,
            planPrice: selectedPlan.price,
            amount: finalAmountCents / 100,
            promoCode: appliedPromo ? appliedPromo.code : null,
          },
        });

        if (error) throw error;
         console.log(data);

        setBankDetails(data.bankDetails);
        setInvoiceNumber(data.invoiceNumber);
        setTotalAmount(data.totalAmount);
        setStep("eft-success");
      } else {
        // Card payment via Yoco
        const { data, error } = await supabase.functions.invoke("create-yoco-checkout", {
          body: {
            packageName: `Pre-Launch Promotion (${selectedPlan.label})`,
            amount: finalAmountCents,
            customerName: formData.client_name.trim(),
            customerEmail: formData.email.trim(),
            customerPhone: formData.phone.trim(),
            heardAbout: formData.heardAbout,
            businessName: formData.businessName.trim(),
            regNumber: formData.regNumber.trim(),
            billingAddress: formData.billingAddress.trim(),
            paymentPlan: formData.plan,
            promoCode: appliedPromo ? appliedPromo.code : null,
          },
        });

        if (error) throw error;
        if (data?.redirectUrl) {
          setStep("card-redirect");
          window.location.href = data.redirectUrl;
        } else {
          throw new Error("No redirect URL received");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        setStep("form");
        setPaymentMethod("eft");
        setBankDetails(null);
        setInvoiceNumber("");
        setTotalAmount(0);
        setPromoCode("");
        setAppliedPromo(null);
        setPromoError("");
        setFormData({ client_name: "", email: "", phone: "", businessName: "", regNumber: "", billingAddress: "", heardAbout: "", plan: "once-off" });
      }, 300);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Join the Pre-Launch Promotion</DialogTitle>
              <DialogDescription>
                Secure your spot at exclusive launch pricing. Fill in your details and choose a payment plan.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleFormSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="eb-name">Full Name *</Label>
                  <Input id="eb-name" placeholder="John Doe" value={formData.client_name} onChange={(e) => handleChange("client_name", e.target.value)} required maxLength={100} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eb-email">Email *</Label>
                  <Input id="eb-email" type="email" placeholder="john@example.com" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required maxLength={255} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eb-phone">Phone</Label>
                  <Input id="eb-phone" type="tel" placeholder="+27 82 123 4567" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} maxLength={20} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eb-business">Business Name *</Label>
                  <Input id="eb-business" placeholder="My Construction Co." value={formData.businessName} onChange={(e) => handleChange("businessName", e.target.value)} required maxLength={100} />
                </div>
                {!initialData?.fromExternal && (
                  <div className="space-y-1.5">
                    <Label htmlFor="eb-reg">Registration Number</Label>
                    <Input id="eb-reg" placeholder="2024/123456/07" value={formData.regNumber} onChange={(e) => handleChange("regNumber", e.target.value)} maxLength={50} />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eb-address">Billing Address</Label>
                <Textarea id="eb-address" placeholder="123 Main Street, Sandton, 2196" value={formData.billingAddress} onChange={(e) => handleChange("billingAddress", e.target.value)} rows={2} />
              </div>

              {!initialData?.fromExternal && (
                <div className="space-y-1.5">
                  <Label htmlFor="eb-heard">Where did you hear about us?</Label>
                  <Select value={formData.heardAbout} onValueChange={(v) => handleChange("heardAbout", v)}>
                    <SelectTrigger id="eb-heard">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      {heardAboutOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2.5">
                <Label className="text-sm font-semibold">Choose Your Payment Plan</Label>
                <RadioGroup value={formData.plan} onValueChange={(v) => handleChange("plan", v)} className="grid gap-3">
                  {paymentPlans.map((plan) => (
                    <label
                      key={plan.id}
                      htmlFor={`plan-${plan.id}`}
                      className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                        formData.plan === plan.id ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <RadioGroupItem value={plan.id} id={`plan-${plan.id}`} className="mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between">
                          <span className="font-semibold text-foreground">{plan.label}</span>
                          <span className="font-bold text-accent">{plan.price}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {/* Promo Code Input */}
              <div className="space-y-2 border-t pt-3 mt-3">
                <Label htmlFor="eb-promo">Promo Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="eb-promo"
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

              {/* Price Summary */}
              <div className="bg-muted/40 p-3 rounded-lg border text-sm space-y-1.5 mt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Plan Price:</span>
                  <span className="font-semibold">{selectedPlan.price}</span>
                </div>
                {appliedPromo && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Discount Applied:</span>
                    <span>
                      -{appliedPromo.discount_type === "percentage"
                        ? `${appliedPromo.discount_value}%`
                        : `R ${(appliedPromo.discount_value / 100).toLocaleString()}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1.5 font-bold text-foreground">
                  <span>Total Due:</span>
                  <span className="text-accent text-base">
                    {(() => {
                      const basePrice = selectedPlan.amountCents;
                      if (!appliedPromo) return selectedPlan.price;
                      let final = basePrice;
                      if (appliedPromo.discount_type === "percentage") {
                        final = Math.round(basePrice * (100 - appliedPromo.discount_value) / 100);
                      } else {
                        final = Math.max(100, basePrice - appliedPromo.discount_value);
                      }
                      return `R ${(final / 100).toLocaleString("en-ZA")}`;
                    })()}
                  </span>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Continue to Payment
              </Button>
            </form>
          </>
        )}

        {step === "payment-method" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Select Payment Method</DialogTitle>
              <DialogDescription>
                Choose how you'd like to pay for the {selectedPlan.label} ({selectedPlan.price}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
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

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("form")} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handlePaymentSubmit} disabled={submitting} className="flex-1" size="lg">
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : paymentMethod === "card" ? (
                    "Pay Now"
                  ) : (
                    "Generate Invoice"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "eft-success" && (
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="w-14 h-14 text-green-500 mb-3" />
              <h3 className="text-xl font-bold mb-1">Invoice Generated!</h3>
              <p className="text-sm text-muted-foreground">
                Invoice <span className="font-semibold text-foreground">{invoiceNumber}</span> has been created. Please use the banking details below to complete your payment.
              </p>
            </div>

            {bankDetails && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
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

            <p className="text-xs text-muted-foreground text-center">
              Please use your invoice number as the payment reference. Our team will confirm your payment and get you set up.
            </p>

            <Button className="w-full" onClick={() => handleClose(false)}>
              Close
            </Button>
          </div>
        )}

        {step === "card-redirect" && (
          <div className="flex flex-col items-center text-center py-8">
            <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
            <h3 className="text-lg font-bold mb-2">Redirecting to Payment...</h3>
            <p className="text-sm text-muted-foreground">You will be redirected to our secure payment page shortly.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EarlyBirdDialog;
