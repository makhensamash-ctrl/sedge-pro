import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, KeyRound } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  role: string;
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
  const [invitePassword, setInvitePassword] = useState("");
  const [inviting, setInviting] = useState(false);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");

    const merged = (profiles || []).map((p) => {
      const userRole = (roles || []).find((r) => r.user_id === p.user_id);
      return { id: p.user_id, email: p.email, full_name: p.full_name, created_at: p.created_at, role: userRole?.role || "none" };
    });

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-admin", {
        body: { email: inviteEmail, password: invitePassword, fullName: inviteName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Admin account created!");
      setOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInvitePassword("");
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
      const { data, error } = await supabase.functions.invoke("invite-admin", {
        body: { action: "update-password", userId: selectedUser.id, password: newPassword },
      });
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">User Management</h2>
        {isSuperAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="w-4 h-4 mr-2" />Create Admin</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Admin Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={invitePassword} onChange={(e) => setInvitePassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full" disabled={inviting}>
                  {inviting ? "Creating..." : "Create Admin"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              {isSuperAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={isSuperAdmin ? 5 : 4} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "super_admin" ? "default" : "secondary"}>{u.role}</Badge>
                </TableCell>
                <TableCell className="text-sm">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                {isSuperAdmin && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelectedUser(u); setPasswordOpen(true); }}
                    >
                      <KeyRound className="w-4 h-4 mr-1" />
                      Reset Password
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={passwordOpen} onOpenChange={(v) => { setPasswordOpen(v); if (!v) { setNewPassword(""); setSelectedUser(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Set a new password for <strong>{selectedUser?.email}</strong>
          </p>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" />
            </div>
            <Button type="submit" className="w-full" disabled={updatingPassword}>
              {updatingPassword ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;
