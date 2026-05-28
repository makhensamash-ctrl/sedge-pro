import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, Tag, Percent, Calendar, Check, X, Award } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface PricingTier {
  id?: string;
  name: string;
  price_cents: number | "";
  billing_cycle: string;
  is_active: boolean;
  position: number;
}

interface Package {
  id: string;
  name: string;
  description: string | null;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  position: number;
  package_pricing_tiers?: PricingTier[];
}

interface Promotion {
  id: string;
  name: string;
  code: string | null;
  discount_type: string;
  discount_value: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  applicable_package_ids: string[] | null;
  created_at: string;
}

const formatPrice = (cents: number) => `R${(cents / 100).toLocaleString()}`;

const formatForDateTimeLocal = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Packages = () => {
  const [activeTab, setActiveTab] = useState("packages");
  const [packages, setPackages] = useState<Package[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  
  // Dialog controls
  const [pkgDialogOpen, setPkgDialogOpen] = useState(false);
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Package | null>(null);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [saving, setSaving] = useState(false);

  // Package Form state
  const [pkgName, setPkgName] = useState("");
  const [pkgDescription, setPkgDescription] = useState("");
  const [pkgFeaturesText, setPkgFeaturesText] = useState("");
  const [pkgIsPopular, setPkgIsPopular] = useState(false);
  const [pkgIsActive, setPkgIsActive] = useState(true);
  const [pkgTiers, setPkgTiers] = useState<PricingTier[]>([]);
  const [initialTiers, setInitialTiers] = useState<PricingTier[]>([]);

  // Promotion Form state
  const [promoName, setPromoName] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [promoIsActive, setPromoIsActive] = useState(true);
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);

  const fetchPackages = async () => {
    const { data } = await supabase
      .from("packages")
      .select("*, package_pricing_tiers(*)")
      .order("position");
    
    // Sort tiers inside packages by position
    const sortedPkgs = (data as Package[] || []).map(pkg => ({
      ...pkg,
      package_pricing_tiers: pkg.package_pricing_tiers?.sort((a, b) => a.position - b.position) || []
    }));
    
    setPackages(sortedPkgs);
  };

  const fetchPromotions = async () => {
    const { data } = await supabase
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: false });
    setPromotions((data as Promotion[]) || []);
  };

  useEffect(() => {
    fetchPackages();
    fetchPromotions();
  }, []);

  // Package Handlers
  const openAddPkg = () => {
    setEditingPkg(null);
    setPkgName("");
    setPkgDescription("");
    setPkgFeaturesText("");
    setPkgIsPopular(false);
    setPkgIsActive(true);
    setPkgTiers([
      { name: "Once-off Payment", price_cents: 0, billing_cycle: "once_off", is_active: true, position: 0 },
      { name: "Monthly instalments", price_cents: 0, billing_cycle: "monthly", is_active: true, position: 1 }
    ]);
    setInitialTiers([]);
    setPkgDialogOpen(true);
  };

  const openEditPkg = (pkg: Package) => {
    setEditingPkg(pkg);
    setPkgName(pkg.name);
    setPkgDescription(pkg.description || "");
    setPkgFeaturesText(pkg.features.join("\n"));
    setPkgIsPopular(pkg.is_popular);
    setPkgIsActive(pkg.is_active);
    
    const fetchedTiers = pkg.package_pricing_tiers || [];
    setPkgTiers([...fetchedTiers]);
    setInitialTiers([...fetchedTiers]);
    setPkgDialogOpen(true);
  };

  const handleAddTier = () => {
    setPkgTiers([
      ...pkgTiers,
      {
        name: pkgTiers.length === 0 ? "Once-off Payment" : `Tier ${pkgTiers.length + 1}`,
        price_cents: 0,
        billing_cycle: "monthly",
        is_active: true,
        position: pkgTiers.length
      }
    ]);
  };

  const handleUpdateTier = (index: number, key: keyof PricingTier, value: any) => {
    const updated = [...pkgTiers];
    updated[index] = { ...updated[index], [key]: value };
    setPkgTiers(updated);
  };

  const handleRemoveTier = (index: number) => {
    setPkgTiers(pkgTiers.filter((_, i) => i !== index));
  };

  const handleSavePkg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName.trim()) return;
    if (pkgTiers.length === 0) {
      toast.error("Please add at least one pricing tier for the package.");
      return;
    }
    setSaving(true);

    try {
      const features = pkgFeaturesText.split("\n").map((f) => f.trim()).filter(Boolean);
      const pkgPayload = {
        name: pkgName.trim(),
        price_cents: Number(pkgTiers[0]?.price_cents) || 0, // Legacy fallback
        description: pkgDescription.trim() || null,
        features,
        is_popular: pkgIsPopular,
        is_active: pkgIsActive,
      };

      let packageId: string;

      if (editingPkg) {
        packageId = editingPkg.id;
        const { error } = await supabase.from("packages").update(pkgPayload).eq("id", packageId);
        if (error) throw error;
      } else {
        const maxPos = packages.reduce((max, p) => Math.max(max, p.position), -1);
        const { data, error } = await supabase
          .from("packages")
          .insert({ ...pkgPayload, position: maxPos + 1 })
          .select("id")
          .single();
        if (error) throw error;
        packageId = data.id;
      }

      // Handle Pricing Tiers CRUD
      // 1. Identify deleted tiers
      const tiersToDelete = initialTiers.filter(init => !pkgTiers.some(t => t.id === init.id));
      if (tiersToDelete.length > 0) {
        const deleteIds = tiersToDelete.map(t => t.id!).filter(Boolean);
        const { error } = await supabase.from("package_pricing_tiers").delete().in("id", deleteIds);
        if (error) throw error;
      }

      // 2. Insert/Update active tiers
      for (let i = 0; i < pkgTiers.length; i++) {
        const tier = pkgTiers[i];
        const tierPayload = {
          package_id: packageId,
          name: tier.name.trim(),
          price_cents: Number(tier.price_cents) || 0,
          billing_cycle: tier.billing_cycle,
          is_active: tier.is_active,
          position: i
        };

        if (tier.id) {
          const { error } = await supabase.from("package_pricing_tiers").update(tierPayload).eq("id", tier.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("package_pricing_tiers").insert(tierPayload);
          if (error) throw error;
        }
      }

      toast.success(editingPkg ? "Package and pricing tiers updated" : "Package and pricing tiers added");
      setPkgDialogOpen(false);
      fetchPackages();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save package");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePkg = async (id: string) => {
    if (!confirm("Delete this package and all its pricing tiers?")) return;
    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Package deleted");
      fetchPackages();
    }
  };

  const togglePkgActive = async (pkg: Package) => {
    const { error } = await supabase.from("packages").update({ is_active: !pkg.is_active }).eq("id", pkg.id);
    if (error) toast.error(error.message);
    else fetchPackages();
  };

  // Promotion Handlers
  const openAddPromo = () => {
    setEditingPromo(null);
    setPromoName("");
    setPromoCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setStartDate(formatForDateTimeLocal(new Date().toISOString()));
    setEndDate("");
    setPromoIsActive(true);
    setSelectedPackageIds([]);
    setPromoDialogOpen(true);
  };

  const openEditPromo = (promo: Promotion) => {
    setEditingPromo(promo);
    setPromoName(promo.name);
    setPromoCode(promo.code || "");
    setDiscountType(promo.discount_type);
    setDiscountValue(promo.discount_type === "percentage" ? String(promo.discount_value) : String(promo.discount_value / 100));
    setStartDate(formatForDateTimeLocal(promo.start_date));
    setEndDate(formatForDateTimeLocal(promo.end_date));
    setPromoIsActive(promo.is_active);
    setSelectedPackageIds(promo.applicable_package_ids || []);
    setPromoDialogOpen(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoName.trim() || !discountValue || !startDate) return;
    setSaving(true);

    try {
      const val = Number(discountValue);
      const parsedValue = discountType === "percentage" ? Math.round(val) : Math.round(val * 100);

      const payload = {
        name: promoName.trim(),
        code: promoCode.trim() || null,
        discount_type: discountType,
        discount_value: parsedValue,
        start_date: new Date(startDate).toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        is_active: promoIsActive,
        applicable_package_ids: selectedPackageIds.length > 0 ? selectedPackageIds : null
      };

      if (editingPromo) {
        const { error } = await supabase.from("promotions").update(payload).eq("id", editingPromo.id);
        if (error) throw error;
        toast.success("Promotion updated");
      } else {
        const { error } = await supabase.from("promotions").insert(payload);
        if (error) throw error;
        toast.success("Promotion created");
      }

      setPromoDialogOpen(false);
      fetchPromotions();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save promotion");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promotion?")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Promotion deleted");
      fetchPromotions();
    }
  };

  const togglePromoActive = async (promo: Promotion) => {
    const { error } = await supabase.from("promotions").update({ is_active: !promo.is_active }).eq("id", promo.id);
    if (error) toast.error(error.message);
    else fetchPromotions();
  };

  const togglePackageSelection = (pkgId: string) => {
    if (selectedPackageIds.includes(pkgId)) {
      setSelectedPackageIds(selectedPackageIds.filter(id => id !== pkgId));
    } else {
      setSelectedPackageIds([...selectedPackageIds, pkgId]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Packages & Promotions</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage service tiers pricing, features, and active promotions.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 max-w-sm mb-4">
          <TabsTrigger value="packages">Packages & Tiers</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAddPkg}>
              <Plus className="w-4 h-4 mr-2" /> Add Package
            </Button>
          </div>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6 overflow-x-auto">
              {packages.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">No packages configured. Add your first package.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead>Once-off / Annual Price</TableHead>
                      <TableHead>Monthly Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packages.map((pkg) => (
                      <TableRow key={pkg.id} className={!pkg.is_active ? "opacity-60" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {pkg.name}
                            {pkg.is_popular && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{pkg.features.length} features</TableCell>
                        
                        {/* Once-off / Annual Price Column */}
                        <TableCell>
                          {(() => {
                            const tier = pkg.package_pricing_tiers?.find(t => t.billing_cycle === "once_off" || t.billing_cycle === "annual");
                            if (!tier) return <span className="text-muted-foreground text-xs font-mono">-</span>;
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-sm">{formatPrice(Number(tier.price_cents))}</span>
                                <span className="text-[10px] text-muted-foreground uppercase">{tier.billing_cycle === "once_off" ? "once-off" : "annual"}</span>
                                {!tier.is_active && <Badge variant="secondary" className="text-[9px] w-fit mt-0.5">Inactive</Badge>}
                              </div>
                            );
                          })()}
                        </TableCell>

                        {/* Monthly Price Column */}
                        <TableCell>
                          {(() => {
                            const tier = pkg.package_pricing_tiers?.find(t => t.billing_cycle === "monthly");
                            if (!tier) return <span className="text-muted-foreground text-xs font-mono">-</span>;
                            return (
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-sm text-primary">{formatPrice(Number(tier.price_cents))}</span>
                                <span className="text-[10px] text-muted-foreground uppercase">monthly</span>
                                {!tier.is_active && <Badge variant="secondary" className="text-[9px] w-fit mt-0.5">Inactive</Badge>}
                              </div>
                            );
                          })()}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={pkg.is_active ? "default" : "secondary"}
                            className="cursor-pointer"
                            onClick={() => togglePkgActive(pkg)}
                          >
                            {pkg.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditPkg(pkg)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeletePkg(pkg.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAddPromo} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="w-4 h-4 mr-2" /> Add Promotion
            </Button>
          </div>

          <Card className="border-0 shadow-md">
            <CardContent className="pt-6 overflow-x-auto">
              {promotions.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">No active promotions or discounts configured.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Promo Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Applies To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotions.map((promo) => {
                      const isExpired = promo.end_date && new Date(promo.end_date).getTime() < Date.now();
                      
                      return (
                        <TableRow key={promo.id} className={!promo.is_active || isExpired ? "opacity-60" : ""}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {promo.name}
                              {!promo.code && <Badge variant="secondary" className="text-[10px] bg-sky-100 text-sky-800 border-sky-200">Auto-Applied</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm font-semibold">{promo.code || "-"}</TableCell>
                          <TableCell className="font-semibold text-emerald-600">
                            {promo.discount_type === "percentage" ? `${promo.discount_value}%` : formatPrice(promo.discount_value)} Off
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div className="space-y-0.5">
                              <span className="block">Start: {new Date(promo.start_date).toLocaleDateString()}</span>
                              {promo.end_date && (
                                <span className={`block font-medium ${isExpired ? "text-destructive" : ""}`}>
                                  End: {new Date(promo.end_date).toLocaleDateString()} {isExpired && "(Expired)"}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {promo.applicable_package_ids && promo.applicable_package_ids.length > 0 ? (
                              <div className="flex flex-col gap-0.5 max-w-[150px] truncate">
                                {promo.applicable_package_ids.map(id => {
                                  const pkg = packages.find(p => p.id === id);
                                  return <span key={id} className="text-muted-foreground truncate">• {pkg?.name || "Unknown Package"}</span>;
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-500 font-medium">All Packages</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={promo.is_active && !isExpired ? "default" : "secondary"}
                              className="cursor-pointer"
                              onClick={() => togglePromoActive(promo)}
                            >
                              {isExpired ? "Expired" : promo.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditPromo(promo)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeletePromo(promo.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Package & Tiers Dialog */}
      <Dialog open={pkgDialogOpen} onOpenChange={setPkgDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPkg ? "Edit Package" : "Add Package"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePkg} className="space-y-4">
            <div className="space-y-2">
              <Label>Package Name *</Label>
              <Input value={pkgName} onChange={(e) => setPkgName(e.target.value)} required placeholder="e.g. Certificates & Invoicing" />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={pkgDescription} onChange={(e) => setPkgDescription(e.target.value)} placeholder="Short description" />
            </div>
            
            <div className="space-y-2">
              <Label>Features (one per line)</Label>
              <Textarea value={pkgFeaturesText} onChange={(e) => setPkgFeaturesText(e.target.value)} rows={4} placeholder={"Feature 1\nFeature 2\nFeature 3"} />
            </div>

            {/* Pricing Tiers Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Pricing Tiers</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddTier}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Tier
                </Button>
              </div>
              
              {pkgTiers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No pricing tiers added yet. Each package needs at least one active tier.</p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {pkgTiers.map((tier, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-end border p-3 rounded-lg bg-muted/20 relative">
                      <div className="flex-1 w-full space-y-1">
                        <Label className="text-xs">Tier Name *</Label>
                        <Input value={tier.name} onChange={(e) => handleUpdateTier(index, "name", e.target.value)} required placeholder="Once-off Payment" />
                      </div>
                      
                      <div className="w-full sm:w-28 space-y-1">
                        <Label className="text-xs">Price (Rands) *</Label>
                        <Input
                          type="number"
                          step="1"
                          value={tier.price_cents === "" || tier.price_cents === undefined ? "" : String(Number(tier.price_cents) / 100)}
                          onChange={(e) => handleUpdateTier(index, "price_cents", e.target.value === "" ? "" : (Math.round(parseFloat(e.target.value) * 100) || 0))}
                          required
                          min={0} 
                          placeholder="299.00"
                        />
                      </div>
                      
                      <div className="w-full sm:w-36 space-y-1">
                        <Label className="text-xs">Billing Cycle</Label>
                        <Select value={tier.billing_cycle} onValueChange={(v) => handleUpdateTier(index, "billing_cycle", v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="once_off">Once-off</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="annual">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex gap-4 items-center justify-between sm:justify-start w-full sm:w-auto h-10 px-2 sm:border sm:rounded-md bg-transparent sm:bg-background">
                        <span className="text-[10px] text-muted-foreground sm:hidden">Active:</span>
                        <Switch checked={tier.is_active} onCheckedChange={(v) => handleUpdateTier(index, "is_active", v)} />
                      </div>
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-destructive hover:bg-destructive/10 shrink-0 self-end sm:self-auto"
                        onClick={() => handleRemoveTier(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Switch checked={pkgIsPopular} onCheckedChange={setPkgIsPopular} />
                <Label>Mark as Popular</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={pkgIsActive} onCheckedChange={setPkgIsActive} />
                <Label>Active</Label>
              </div>
            </div>

            <Button type="submit" className="w-full mt-4" disabled={saving}>
              {saving ? "Saving..." : editingPkg ? "Update Package & Tiers" : "Add Package & Tiers"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Promotion Dialog */}
      <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPromo ? "Edit Promotion" : "Add Promotion"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSavePromo} className="space-y-4">
            <div className="space-y-2">
              <Label>Promotion Name *</Label>
              <Input value={promoName} onChange={(e) => setPromoName(e.target.value)} required placeholder="e.g. Pre-Launch Discount" />
            </div>

            <div className="space-y-2">
              <Label>Promo Code (optional)</Label>
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="e.g. PRELAUNCH (leave blank for auto-applied discount)"
              />
              <p className="text-[11px] text-muted-foreground">If blank, this promotion applies automatically to all buyers of the package.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Discount Type</Label>
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount (R)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Discount Value *</Label>
                <Input
                  type="number"
                  required
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percentage" ? "e.g. 20" : "e.g. 500.00"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date *</Label>
                <Input
                  type="datetime-local"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Expiry Date (optional)</Label>
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Applicable Packages Selection */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm font-semibold">Applicable Packages (optional)</Label>
              <p className="text-[11px] text-muted-foreground mb-2">Select which packages this promotion applies to. Leave blank to apply to all packages.</p>
              
              <div className="border rounded-md p-3 max-h-[140px] overflow-y-auto space-y-2 bg-muted/10">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`pkg-select-${pkg.id}`}
                      checked={selectedPackageIds.includes(pkg.id)}
                      onCheckedChange={() => togglePackageSelection(pkg.id)}
                    />
                    <label htmlFor={`pkg-select-${pkg.id}`} className="text-sm font-medium leading-none cursor-pointer">
                      {pkg.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Switch checked={promoIsActive} onCheckedChange={setPromoIsActive} />
              <Label>Promotion Active</Label>
            </div>

            <Button type="submit" className="w-full mt-4" disabled={saving}>
              {saving ? "Saving..." : editingPromo ? "Update Promotion" : "Create Promotion"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Packages;
