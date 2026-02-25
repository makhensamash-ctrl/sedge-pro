import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UserPlus } from "lucide-react";

interface Salesperson {
  id: string;
  name: string;
  email: string | null;
  user_id: string | null;
  created_at: string;
}

interface AdminProfile {
  user_id: string;
  full_name: string | null;
  email: string;
}

const Salespersons = () => {
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Salesperson | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [linkedUserId, setLinkedUserId] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const { data } = await supabase.from("salespersons").select("*").order("created_at");
    setSalespersons(data || []);

    // Fetch admin users for linking
    const { data: roles } = await supabase.from("user_roles").select("user_id");
    if (roles && roles.length > 0) {
      const ids = roles.map((r) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
      setAdmins(profiles || []);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setEmail("");
    setLinkedUserId("");
    setDialogOpen(true);
  };

  const openEdit = (sp: Salesperson) => {
    setEditing(sp);
    setName(sp.name);
    setEmail(sp.email || "");
    setLinkedUserId(sp.user_id || "");
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      email: email.trim() || null,
      user_id: linkedUserId || null,
    };

    if (editing) {
      const { error } = await supabase.from("salespersons").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message);
      else toast.success("Salesperson updated");
    } else {
      const { error } = await supabase.from("salespersons").insert(payload);
      if (error) toast.error(error.message);
      else toast.success("Salesperson added");
    }

    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this salesperson?")) return;
    const { error } = await supabase.from("salespersons").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removed"); fetchData(); }
  };

  const handleImportAdmin = async (admin: AdminProfile) => {
    const exists = salespersons.find((s) => s.user_id === admin.user_id);
    if (exists) { toast.info("Already added"); return; }
    const { error } = await supabase.from("salespersons").insert({
      name: admin.full_name || admin.email,
      email: admin.email,
      user_id: admin.user_id,
    });
    if (error) toast.error(error.message);
    else { toast.success("Admin imported as salesperson"); fetchData(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Salespersons</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your sales team members</p>
        </div>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Salesperson</Button>
      </div>

      {/* Quick import admins */}
      {admins.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Import Admins as Salespersons</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {admins.map((a) => {
              const alreadyAdded = salespersons.some((s) => s.user_id === a.user_id);
              return (
                <Button key={a.user_id} variant={alreadyAdded ? "secondary" : "outline"} size="sm" disabled={alreadyAdded} onClick={() => handleImportAdmin(a)}>
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  {a.full_name || a.email}
                  {alreadyAdded && " ✓"}
                </Button>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-md">
        <CardContent className="pt-6">
          {salespersons.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No salespersons yet. Add one or import from admins above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Linked Admin</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salespersons.map((sp) => {
                  const linkedAdmin = admins.find((a) => a.user_id === sp.user_id);
                  return (
                    <TableRow key={sp.id}>
                      <TableCell className="font-medium">{sp.name}</TableCell>
                      <TableCell>{sp.email || "—"}</TableCell>
                      <TableCell>{linkedAdmin ? linkedAdmin.full_name || linkedAdmin.email : "External"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(sp)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(sp.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Salesperson" : "Add Salesperson"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Link to Admin (optional)</Label>
              <Select value={linkedUserId} onValueChange={setLinkedUserId}>
                <SelectTrigger><SelectValue placeholder="None (external salesperson)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {admins.map((a) => (
                    <SelectItem key={a.user_id} value={a.user_id}>{a.full_name || a.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Add"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Salespersons;
