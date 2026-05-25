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
import { UserPlus, KeyRound, RotateCcw, Pencil, Plus, Trash2, Download, Upload, Loader2, AlertTriangle } from "lucide-react";

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

// Helper to convert array of objects to CSV string
const convertToCSV = (data: any[], headers: string[]): string => {
  let str = headers.join(',') + '\r\n';

  for (let i = 0; i < data.length; i++) {
    let line = '';
    for (let j = 0; j < headers.length; j++) {
      if (line !== '') line += ',';
      
      const head = headers[j];
      let val = data[i][head];
      if (val === undefined || val === null) {
        val = '';
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      
      let valStr = String(val);
      if (valStr.includes('"') || valStr.includes(',') || valStr.includes('\n') || valStr.includes('\r')) {
        valStr = '"' + valStr.replace(/"/g, '""') + '"';
      }
      line += valStr;
    }
    str += line + '\r\n';
  }
  return str;
};

// Helper to trigger file download
const downloadFile = (content: string, contentType: string, filename: string) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// A robust RFC 4180-compliant CSV parser
const parseCSV = (text: string): string[][] => {
  const lines: string[][] = [];
  let row: string[] = [];
  let inQuotes = false;
  let currentValue = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentValue += '"';
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        currentValue += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(currentValue);
        currentValue = '';
      } else if (char === '\n' || char === '\r') {
        row.push(currentValue);
        currentValue = '';
        if (row.some(val => val !== '') || char === '\n') {
          lines.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip LF if CRLF
        }
      } else {
        currentValue += char;
      }
    }
  }
  
  if (row.length > 0 || currentValue !== '') {
    row.push(currentValue);
    lines.push(row);
  }
  
  return lines;
};

const UsersManagement = () => {
  const { isAdmin } = useAuth();
  const isSuperAdmin = isAdmin;
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

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const handleExportUsersCSV = () => {
    try {
      if (users.length === 0) {
        toast.error("No users found to export.");
        return;
      }
      
      const dataToExport = users.map((u) => ({
        full_name: u.full_name || "",
        email: u.email,
        role: u.role,
        created_at: u.created_at,
      }));
      
      const csvContent = convertToCSV(dataToExport, ["full_name", "email", "role", "created_at"]);
      downloadFile(csvContent, "text/csv;charset=utf-8;", "sedge_pro_users.csv");
      toast.success("Users CSV downloaded successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to export users.");
    }
  };

  const handleImportCSV = async () => {
    if (!importFile) return;

    if (!importFile.name.endsWith(".csv")) {
      toast.error("Please select a valid CSV file.");
      return;
    }

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCSV(text);
        
        if (rows.length < 2) {
          throw new Error("CSV file is empty or missing data.");
        }

        const headers = rows[0].map(h => h.trim().toLowerCase());
        const emailIdx = headers.indexOf("email");
        let nameIdx = headers.indexOf("full_name");
        if (nameIdx === -1) nameIdx = headers.indexOf("fullname");
        if (nameIdx === -1) nameIdx = headers.indexOf("name");

        if (emailIdx === -1) {
          throw new Error("CSV is missing required 'email' column.");
        }

        const usersToImport: { email: string; fullName: string }[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length === 0 || (row.length === 1 && row[0] === "")) continue;

          const email = row[emailIdx]?.trim();
          if (!email) continue;

          const fullName = nameIdx !== -1 ? row[nameIdx]?.trim() || "" : "";
          usersToImport.push({ email, fullName });
        }

        if (usersToImport.length === 0) {
          throw new Error("No valid user records found in the CSV.");
        }

        setImportProgress({ current: 0, total: usersToImport.length });
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < usersToImport.length; i++) {
          const user = usersToImport[i];
          try {
            const { data, error } = await supabase.functions.invoke("invite-admin", {
              body: {
                email: user.email,
                fullName: user.fullName,
                password: "SergePro@987"
              }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            successCount++;
          } catch (err: any) {
            console.error(`Failed to import user ${user.email}:`, err);
            failCount++;
          }
          setImportProgress(prev => ({ ...prev, current: i + 1 }));
        }

        toast.success(`Import complete! Successfully created ${successCount} user(s). Failed: ${failCount}`);
        fetchUsers();
        setImportOpen(false);
        setImportFile(null);
      } catch (err: any) {
        toast.error(err.message || "Failed to import CSV.");
      } finally {
        setImporting(false);
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read the selected file.");
      setImporting(false);
    };

    reader.readAsText(importFile);
  };

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
      <div className="flex justify-between">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6">User Management</h2>
          <div className="flex gap-2">
      
              <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) setImportFile(null); }}>
                <DialogTrigger asChild>
                  <Button variant="outline"><Upload className="w-4 h-4 mr-2" />Import CSV</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle className="flex items-center gap-2 font-bold"><Upload className="w-5 h-5 text-amber-500" />Import Users</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                      <p className="text-xs leading-relaxed font-medium">
                        CSV must have <strong>email</strong> and optional <strong>full_name</strong> (or <strong>name</strong>) columns. Imported users will be created with default credentials (password <code>SergePro@987</code>) and welcome notifications will be sent automatically.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Select CSV File</Label>
                      <Input 
                        type="file" 
                        accept=".csv"
                        className="cursor-pointer file:text-xs file:font-medium text-xs bg-background/50 h-9"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <Button 
                      className="w-full text-xs font-semibold h-9" 
                      disabled={!importFile || importing} 
                      onClick={handleImportCSV}
                    >
                      {importing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing Users ({importProgress.current} / {importProgress.total})...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Import Users
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="outline" onClick={handleExportUsersCSV}>
                <Download className="w-4 h-4 mr-2" />Export CSV
              </Button>
              </div>


      </div>

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
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={isSuperAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
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
