import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Building2, Upload, Trash2, Save, Loader2, Lock } from "lucide-react";

interface BusinessProfile {
  id: string;
  business_name: string | null;
  business_logo: string | null;
  contact_phone: string | null;
  physical_address: string | null;
  website_address: string | null;
  vat_number: string | null;
  bank_name: string | null;
  account_holder_name: string | null;
  account_number: string | null;
  branch_code: string | null;
  terms_and_conditions: string | null;
  is_default: boolean;
}

const BusinessProfile = () => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const canEdit = user?.email === "nyiko@sedgeaccelerator.co.za";
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["business-profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("*")
        .eq("is_default", true)
        .maybeSingle();
      if (error) throw error;
      return (data as BusinessProfile) || null;
    },
  });

  const [form, setForm] = useState<Partial<BusinessProfile>>({});

  const currentForm: Partial<BusinessProfile> = {
    business_name: form.business_name ?? profile?.business_name ?? "",
    business_logo: form.business_logo ?? profile?.business_logo ?? "",
    contact_phone: form.contact_phone ?? profile?.contact_phone ?? "",
    physical_address: form.physical_address ?? profile?.physical_address ?? "",
    website_address: form.website_address ?? profile?.website_address ?? "",
    vat_number: form.vat_number ?? profile?.vat_number ?? "",
    bank_name: form.bank_name ?? profile?.bank_name ?? "",
    account_holder_name: form.account_holder_name ?? profile?.account_holder_name ?? "",
    account_number: form.account_number ?? profile?.account_number ?? "",
    branch_code: form.branch_code ?? profile?.branch_code ?? "",
    terms_and_conditions: form.terms_and_conditions ?? profile?.terms_and_conditions ?? "",
  };

  const update = (field: keyof BusinessProfile, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        business_name: currentForm.business_name || null,
        business_logo: currentForm.business_logo || null,
        contact_phone: currentForm.contact_phone || null,
        physical_address: currentForm.physical_address || null,
        website_address: currentForm.website_address || null,
        vat_number: currentForm.vat_number || null,
        bank_name: currentForm.bank_name || null,
        account_holder_name: currentForm.account_holder_name || null,
        account_number: currentForm.account_number || null,
        branch_code: currentForm.branch_code || null,
        terms_and_conditions: currentForm.terms_and_conditions || null,
        is_default: true,
      };

      if (profile?.id) {
        const { error } = await supabase
          .from("business_profiles")
          .update(payload)
          .eq("id", profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_profiles")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Business profile saved");
      queryClient.invalidateQueries({ queryKey: ["business-profile"] });
      setForm({});
    },
    onError: () => toast.error("Failed to save profile"),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("product-photos").upload(fileName, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("product-photos").getPublicUrl(fileName);
      update("business_logo", publicUrl);
      toast.success("Logo uploaded");
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6" /> Business Profile
          {!canEdit && <Lock className="w-5 h-5 text-muted-foreground" />}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {canEdit
            ? "This information appears on your invoices and quotations."
            : "Only nyiko@sedgeaccelerator.co.za can edit business profile details."}
        </p>
      </div>

      {/* Company Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Company Details</CardTitle>
          <CardDescription>Your business name, logo, and contact info</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business Logo</Label>
            <div className="flex items-center gap-4">
              {currentForm.business_logo ? (
                <div className="relative">
                  <img
                    src={currentForm.business_logo}
                    alt="Logo"
                    className="w-20 h-20 object-contain rounded-md border bg-background"
                  />
                  {canEdit && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 w-6 h-6"
                      onClick={() => update("business_logo", "")}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="w-20 h-20 border-2 border-dashed rounded-md flex items-center justify-center text-muted-foreground">
                  <Building2 className="w-8 h-8" />
                </div>
              )}
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading || !canEdit}>
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Upload Logo"}
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input id="business_name" value={currentForm.business_name || ""} onChange={(e) => update("business_name", e.target.value)} placeholder="Your Company Name" disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input id="contact_phone" value={currentForm.contact_phone || ""} onChange={(e) => update("contact_phone", e.target.value)} placeholder="+27 12 345 6789" disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website_address">Website</Label>
              <Input id="website_address" value={currentForm.website_address || ""} onChange={(e) => update("website_address", e.target.value)} placeholder="https://example.com" disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vat_number">VAT Number</Label>
              <Input id="vat_number" value={currentForm.vat_number || ""} onChange={(e) => update("vat_number", e.target.value)} placeholder="e.g., 4123456789" disabled={!canEdit} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="physical_address">Physical Address</Label>
            <Textarea id="physical_address" value={currentForm.physical_address || ""} onChange={(e) => update("physical_address", e.target.value)} placeholder="123 Main Street, City, Province, Postal Code" className="min-h-20" disabled={!canEdit} />
          </div>
        </CardContent>
      </Card>

      {/* Banking Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Banking Details</CardTitle>
          <CardDescription>Displayed on invoices for payment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input id="bank_name" value={currentForm.bank_name || ""} onChange={(e) => update("bank_name", e.target.value)} placeholder="e.g., FNB, Standard Bank" disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_holder_name">Account Holder</Label>
              <Input id="account_holder_name" value={currentForm.account_holder_name || ""} onChange={(e) => update("account_holder_name", e.target.value)} placeholder="Account holder name" disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <Input id="account_number" value={currentForm.account_number || ""} onChange={(e) => update("account_number", e.target.value)} placeholder="Account number" disabled={!canEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch_code">Branch Code</Label>
              <Input id="branch_code" value={currentForm.branch_code || ""} onChange={(e) => update("branch_code", e.target.value)} placeholder="Branch code" disabled={!canEdit} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms & Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Terms & Conditions</CardTitle>
          <CardDescription>Default terms shown on documents</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={currentForm.terms_and_conditions || ""}
            onChange={(e) => update("terms_and_conditions", e.target.value)}
            placeholder="Enter your default terms and conditions..."
            className="min-h-32"
            disabled={!canEdit}
          />
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="lg">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Profile
          </Button>
        </div>
      )}
    </div>
  );
};

export default BusinessProfile;
