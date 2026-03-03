import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, KeyRound, RotateCcw, Pencil, Plus, Trash2 } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: string;
  require_2fa: boolean;
}

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

const UsersManagement = () => {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editNameUser, setEditNameUser] = useState<AdminUser | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Salesperson state
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([]);
  const [spDialogOpen, setSpDialogOpen] = useState(false);
  const [editingSp, setEditingSp] = useState<Salesperson | null>(null);
  const [spName, setSpName] = useState("");
  const [spEmail, setSpEmail] = useState("");
  const [spLinkedUserId, setSpLinkedUserId] = useState("");
  const [spSaving, setSpSaving] = useState(false);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");

    const merged = (profiles || []).map((p) => {
      const userRole = (roles || []).find((r) => r.user_id === p.user_id);
      return { id: p.user_id, email: p.email, full_name: p.full_name, created_at: p.created_at, role: userRole?.role || "none", require_2fa: (p as any).require_2fa ?? false };
    });

    setUsers(merged);
    setLoading(false);

    // Build admin profiles for salesperson linking
    if (roles && roles.length > 0) {
      const ids = roles.map((r) => r.user_id);
      const adminProfs = (profiles || []).filter((p) => ids.includes(p.user_id)).map((p) => ({ user_id: p.user_id, full_name: p.full_name, email: p.email }));
      setAdminProfiles(adminProfs);
    }
  };

  const fetchSalespersons = async () => {
    const { data } = await supabase.from("salespersons").select("*").order("created_at");
    setSalespersons((data as Salesperson[]) || []);
  };

  useEffect(() => { fetchUsers(); fetchSalespersons(); }, []);

  const toggleUser2fa = async (userId: string, checked: boolean) => {
    try {
      const { error } = await supabase.from("profiles").update({ require_2fa: checked } as any).eq("user_id", userId);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, require_2fa: checked } : u));
      toast.success(checked ? "2FA enabled for user" : "2FA disabled for user");
    } catch (err: any) {
      toast.error(err.message || "Failed to update 2FA setting");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-admin", { body: { email: inviteEmail, fullName: inviteName } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Admin account created! They will receive a default password set by the system.");
      setOpen(false);
      setInviteEmail("");
      setInviteName("");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create admin");
    } finally {
      setInviting(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setUpdatingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-admin", { body: { action: "update-password", userId: selectedUser.id, password: newPassword } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Password updated for ${selectedUser.email}`);
      setPasswordOpen(false);
      setNewPassword("");
      setSelectedUser(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleResetAll = async () => {
    if (!confirm("Reset ALL admin passwords to the default? Each user will be prompted to change their password on next login.")) return;
    setResettingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-admin", { body: { action: "reset-all-passwords" } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Passwords reset for ${data.updated} user(s). They will be prompted to change on next login.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset passwords");
    } finally {
      setResettingAll(false);
    }
  };

  const handleEditName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNameUser) return;
    setSavingName(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: editNameValue.trim() }).eq("user_id", editNameUser.id);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => u.id === editNameUser.id ? { ...u, full_name: editNameValue.trim() } : u));
      toast.success("Name updated");
      setEditNameOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  // Salesperson handlers
  const openAddSp = () => { setEditingSp(null); setSpName(""); setSpEmail(""); setSpLinkedUserId(""); setSpDialogOpen(true); };
  const openEditSp = (sp: Salesperson) => { setEditingSp(sp); setSpName(sp.name); setSpEmail(sp.email || ""); setSpLinkedUserId(sp.user_id || ""); setSpDialogOpen(true); };

  const handleSaveSp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spName.trim()) return;
    setSpSaving(true);
    const payload = { name: spName.trim(), email: spEmail.trim() || null, user_id: spLinkedUserId || null };
    if (editingSp) {
      const { error } = await supabase.from("salespersons").update(payload).eq("id", editingSp.id);
      if (error) toast.error(error.message); else toast.success("Salesperson updated");
    } else {
      const { error } = await supabase.from("salespersons").insert(payload);
      if (error) toast.error(error.message); else toast.success("Salesperson added");
    }
    setSpSaving(false);
    setSpDialogOpen(false);
    fetchSalespersons();
  };

  const handleDeleteSp = async (id: string) => {
    if (!confirm("Remove this salesperson?")) return;
    const { error } = await supabase.from("salespersons").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Removed"); fetchSalespersons(); }
  };

  const handleImportAdmin = async (admin: AdminProfile) => {
    if (salespersons.find((s) => s.user_id === admin.user_id)) { toast.info("Already added"); return; }
    const { error } = await supabase.from("salespersons").insert({ name: admin.full_name || admin.email, email: admin.email, user_id: admin.user_id });
    if (error) toast.error(error.message); else { toast.success("Admin imported as salesperson"); fetchSalespersons(); }
  };

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">User Management</h2>

      <Tabs defaultValue="admins" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="salespersons">Salespersons</TabsTrigger>
        </TabsList>

        <TabsContent value="admins">
          {isSuperAdmin && (
            <div className="flex flex-col sm:flex-row gap-2 mb-4 sm:justify-end">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button><UserPlus className="w-4 h-4 mr-2" />Create Admin</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Admin Account</DialogTitle></DialogHeader>
                  <form onSubmit={handleInvite} className="space-y-4">
                    <div className="space-y-2"><Label>Full Name</Label><Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} required /></div>
                    <div className="space-y-2"><Label>Email</Label><Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required /></div>
                    <p className="text-sm text-muted-foreground">A default password (configured securely in the cloud) will be assigned — user will be prompted to change on first login.</p>
                    <Button type="submit" className="w-full" disabled={inviting}>{inviting ? "Creating..." : "Create Admin"}</Button>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={handleResetAll} disabled={resettingAll}>
                <RotateCcw className="w-4 h-4 mr-2" />{resettingAll ? "Resetting..." : "Reset All Passwords"}
              </Button>
            </div>
          )}

          <div className="rounded-lg border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  {isSuperAdmin && <TableHead className="text-center">2FA</TableHead>}
                  <TableHead>Joined</TableHead>
                  {isSuperAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={isSuperAdmin ? 6 : 4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Badge variant={u.role === "super_admin" ? "default" : "secondary"}>{u.role}</Badge></TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-center">
                        <Switch checked={u.require_2fa} onCheckedChange={(checked) => toggleUser2fa(u.id, checked)} />
                      </TableCell>
                    )}
                    <TableCell className="text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditNameUser(u); setEditNameValue(u.full_name || ""); setEditNameOpen(true); }}>
                            <Pencil className="w-4 h-4 mr-1" />Edit Name
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedUser(u); setPasswordOpen(true); }}>
                            <KeyRound className="w-4 h-4 mr-1" />Reset Password
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="salespersons">
          <div className="flex justify-end mb-4">
            <Button onClick={openAddSp}><Plus className="w-4 h-4 mr-2" />Add Salesperson</Button>
          </div>

          {adminProfiles.length > 0 && (
            <Card className="border-0 shadow-md mb-4">
              <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Import Admins as Salespersons</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {adminProfiles.map((a) => {
                  const alreadyAdded = salespersons.some((s) => s.user_id === a.user_id);
                  return (
                    <Button key={a.user_id} variant={alreadyAdded ? "secondary" : "outline"} size="sm" disabled={alreadyAdded} onClick={() => handleImportAdmin(a)}>
                      <UserPlus className="w-3.5 h-3.5 mr-1.5" />{a.full_name || a.email}{alreadyAdded && " ✓"}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg border bg-card overflow-x-auto">
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
                    const linkedAdmin = adminProfiles.find((a) => a.user_id === sp.user_id);
                    return (
                      <TableRow key={sp.id}>
                        <TableCell className="font-medium">{sp.name}</TableCell>
                        <TableCell>{sp.email || "—"}</TableCell>
                        <TableCell>{linkedAdmin ? linkedAdmin.full_name || linkedAdmin.email : "External"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditSp(sp)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSp(sp.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Password Reset Dialog */}
      <Dialog open={passwordOpen} onOpenChange={(v) => { setPasswordOpen(v); if (!v) { setNewPassword(""); setSelectedUser(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">Set a new password for <strong>{selectedUser?.email}</strong></p>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2"><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" /></div>
            <Button type="submit" className="w-full" disabled={updatingPassword}>{updatingPassword ? "Updating..." : "Update Password"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Name Dialog */}
      <Dialog open={editNameOpen} onOpenChange={(v) => { setEditNameOpen(v); if (!v) { setEditNameUser(null); setEditNameValue(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Admin Name</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">Update the name for <strong>{editNameUser?.email}</strong></p>
          <form onSubmit={handleEditName} className="space-y-4">
            <div className="space-y-2"><Label>Full Name</Label><Input value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)} required placeholder="Enter full name" /></div>
            <Button type="submit" className="w-full" disabled={savingName}>{savingName ? "Saving..." : "Save Name"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Salesperson Dialog */}
      <Dialog open={spDialogOpen} onOpenChange={setSpDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSp ? "Edit Salesperson" : "Add Salesperson"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveSp} className="space-y-4">
            <div className="space-y-2"><Label>Name *</Label><Input value={spName} onChange={(e) => setSpName(e.target.value)} required placeholder="Full name" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={spEmail} onChange={(e) => setSpEmail(e.target.value)} placeholder="email@example.com" /></div>
            <div className="space-y-2">
              <Label>Link to Admin (optional)</Label>
              <Select value={spLinkedUserId} onValueChange={setSpLinkedUserId}>
                <SelectTrigger><SelectValue placeholder="None (external salesperson)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {adminProfiles.map((a) => (
                    <SelectItem key={a.user_id} value={a.user_id}>{a.full_name || a.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={spSaving}>{spSaving ? "Saving..." : editingSp ? "Update" : "Add"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;
