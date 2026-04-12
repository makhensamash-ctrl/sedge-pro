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
import { Loader2, CheckCircle2 } from "lucide-react";

interface EarlyBirdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const paymentPlans = [
  {
    id: "once-off",
    label: "Once-off Payment",
    price: "R20,000",
    description: "Single payment — best value",
  },
  {
    id: "monthly",
    label: "Monthly Instalments",
    price: "R3,000/month",
    description: "12 monthly payments of R3,000 (R36,000 total)",
  },
];

const heardAboutOptions = ["Google Search", "Social Media", "Referral", "Industry Event", "Word of Mouth", "Other"];

const EarlyBirdDialog = ({ open, onOpenChange }: EarlyBirdDialogProps) => {
  const [step, setStep] = useState<"form" | "success">("form");
  const [submitting, setSubmitting] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name.trim() || !formData.email.trim() || !formData.businessName.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const selectedPlan = paymentPlans.find((p) => p.id === formData.plan);
      const notesParts = [
        `Payment plan: ${selectedPlan?.label} (${selectedPlan?.price})`,
        `Business: ${formData.businessName}`,
        formData.regNumber ? `Reg Number: ${formData.regNumber}` : null,
        formData.billingAddress ? `Billing Address: ${formData.billingAddress}` : null,
        formData.heardAbout ? `Heard about us: ${formData.heardAbout}` : null,
      ].filter(Boolean).join("\n");

      const { error } = await supabase.functions.invoke("create-lead", {
        body: {
          client_name: formData.client_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          source: "Pre-Launch Promotion",
          notes: notesParts,
        },
      });

      if (error) throw error;
      setStep("success");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setTimeout(() => {
        setStep("form");
        setFormData({ client_name: "", email: "", phone: "", businessName: "", regNumber: "", billingAddress: "", heardAbout: "", plan: "once-off" });
      }, 300);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Join the Pre-Launch Promotion</DialogTitle>
              <DialogDescription>
                Secure your spot at exclusive launch pricing. Fill in your details and choose a payment plan.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="eb-name">Full Name *</Label>
                  <Input
                    id="eb-name"
                    placeholder="John Doe"
                    value={formData.client_name}
                    onChange={(e) => handleChange("client_name", e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eb-email">Email *</Label>
                  <Input
                    id="eb-email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                    maxLength={255}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eb-phone">Phone</Label>
                  <Input
                    id="eb-phone"
                    type="tel"
                    placeholder="+27 82 123 4567"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    maxLength={20}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eb-business">Business Name *</Label>
                  <Input
                    id="eb-business"
                    placeholder="My Construction Co."
                    value={formData.businessName}
                    onChange={(e) => handleChange("businessName", e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eb-reg">Registration Number</Label>
                  <Input
                    id="eb-reg"
                    placeholder="2024/123456/07"
                    value={formData.regNumber}
                    onChange={(e) => handleChange("regNumber", e.target.value)}
                    maxLength={50}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eb-address">Billing Address</Label>
                <Textarea
                  id="eb-address"
                  placeholder="123 Main Street, Sandton, 2196"
                  value={formData.billingAddress}
                  onChange={(e) => handleChange("billingAddress", e.target.value)}
                  rows={2}
                />
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
                <RadioGroup
                  value={formData.plan}
                  onValueChange={(v) => handleChange("plan", v)}
                  className="grid gap-3"
                >
                  {paymentPlans.map((plan) => (
                    <label
                      key={plan.id}
                      htmlFor={`plan-${plan.id}`}
                      className={`flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer transition-colors ${
                        formData.plan === plan.id
                          ? "border-accent bg-accent/5"
                          : "border-border hover:border-muted-foreground/30"
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

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Secure My Spot"
                )}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">You're In!</h3>
            <p className="text-muted-foreground max-w-sm">
              Thank you for joining the Pre-Launch Promotion. Our team will be in touch shortly to get you set up.
            </p>
            <Button className="mt-6" onClick={() => handleClose(false)}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EarlyBirdDialog;
