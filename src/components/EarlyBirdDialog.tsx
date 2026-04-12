import { useState } from "react";
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

interface EarlyBirdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const paymentPlans = [
  { id: "once-off", label: "Once-off Payment", price: "R20,000", description: "Single payment — best value", amountCents: 2000000 },
  { id: "monthly", label: "Monthly Instalments", price: "R3,000/month", description: "12 monthly payments of R3,000 (R36,000 total)", amountCents: 300000 },
];

const heardAboutOptions = ["Google Search", "Social Media", "Referral", "Industry Event", "Word of Mouth", "Other"];

type Step = "form" | "payment-method" | "eft-success" | "card-redirect";

interface BankDetails {
  bankName: string;
  accountNumber: string;
  branchCode: string;
  accountHolder: string;
  reference: string;
}

const EarlyBirdDialog = ({ open, onOpenChange }: EarlyBirdDialogProps) => {
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
          },
        });

        if (error) throw error;

        setBankDetails(data.bankDetails);
        setInvoiceNumber(data.invoiceNumber);
        setTotalAmount(data.totalAmount);
        setStep("eft-success");
      } else {
        // Card payment via Yoco
        const { data, error } = await supabase.functions.invoke("create-yoco-checkout", {
          body: {
            packageName: `Pre-Launch Promotion (${selectedPlan.label})`,
            amount: selectedPlan.amountCents,
            customerName: formData.client_name.trim(),
            customerEmail: formData.email.trim(),
            customerPhone: formData.phone.trim(),
            heardAbout: formData.heardAbout,
            businessName: formData.businessName.trim(),
            regNumber: formData.regNumber.trim(),
            billingAddress: formData.billingAddress.trim(),
            lineItems: [
              {
                displayName: `Pre-Launch Promotion — ${selectedPlan.label}`,
                quantity: 1,
                pricingDetails: { price: selectedPlan.amountCents },
                description: selectedPlan.description,
              },
            ],
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
                <div className="space-y-1.5">
                  <Label htmlFor="eb-reg">Registration Number</Label>
                  <Input id="eb-reg" placeholder="2024/123456/07" value={formData.regNumber} onChange={(e) => handleChange("regNumber", e.target.value)} maxLength={50} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eb-address">Billing Address</Label>
                <Textarea id="eb-address" placeholder="123 Main Street, Sandton, 2196" value={formData.billingAddress} onChange={(e) => handleChange("billingAddress", e.target.value)} rows={2} />
              </div>

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
