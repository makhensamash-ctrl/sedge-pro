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
import { Plus, Pencil, Trash2, GripVertical, Star } from "lucide-react";

interface Package {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  description: string | null;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  position: number;
}

const Packages = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [priceCents, setPriceCents] = useState("");
  const [description, setDescription] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [isPopular, setIsPopular] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const fetchPackages = async () => {
    const { data } = await supabase.from("packages").select("*").order("position");
    setPackages((data as Package[]) || []);
  };

  useEffect(() => { fetchPackages(); }, []);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setPriceCents("");
    setDescription("");
    setFeaturesText("");
    setIsPopular(false);
    setIsActive(true);
    setDialogOpen(true);
  };

  const openEdit = (pkg: Package) => {
    setEditing(pkg);
    setName(pkg.name);
    setPriceCents(String(pkg.price_cents / 100));
    setDescription(pkg.description || "");
    setFeaturesText(pkg.features.join("\n"));
    setIsPopular(pkg.is_popular);
    setIsActive(pkg.is_active);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !priceCents) return;
    setSaving(true);

    const features = featuresText.split("\n").map((f) => f.trim()).filter(Boolean);
    const payload = {
      name: name.trim(),
      price_cents: Math.round(parseFloat(priceCents) * 100),
      description: description.trim() || null,
      features,
      is_popular: isPopular,
      is_active: isActive,
    };

    if (editing) {
      const { error } = await supabase.from("packages").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message);
      else toast.success("Package updated");
    } else {
      const maxPos = packages.reduce((max, p) => Math.max(max, p.position), -1);
      const { error } = await supabase.from("packages").insert({ ...payload, position: maxPos + 1 });
      if (error) toast.error(error.message);
      else toast.success("Package added");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchPackages();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this package? This won't affect existing payments.")) return;
    const { error } = await supabase.from("packages").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Package deleted"); fetchPackages(); }
  };

  const toggleActive = async (pkg: Package) => {
    const { error } = await supabase.from("packages").update({ is_active: !pkg.is_active }).eq("id", pkg.id);
    if (error) toast.error(error.message);
    else fetchPackages();
  };

  const formatPrice = (cents: number) => `R${(cents / 100).toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Packages</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your service packages visible on the website</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Package</Button>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="pt-6 overflow-x-auto">
          {packages.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No packages yet. Add your first package.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  
                  <TableHead>Features</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id} className={!pkg.is_active ? "opacity-50" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {pkg.name}
                        {pkg.is_popular && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-sm text-muted-foreground">{pkg.features.length} features</TableCell>
                    <TableCell>
                      <Badge
                        variant={pkg.is_active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => toggleActive(pkg)}
                      >
                        {pkg.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(pkg)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Package" : "Add Package"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Package Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Profitability Management" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" />
            </div>
            <div className="space-y-2">
              <Label>Features (one per line)</Label>
              <Textarea value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} rows={5} placeholder={"Feature 1\nFeature 2\nFeature 3"} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={isPopular} onCheckedChange={setIsPopular} />
                <Label>Mark as Popular</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving..." : editing ? "Update Package" : "Add Package"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Packages;
