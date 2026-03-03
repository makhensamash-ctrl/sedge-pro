import { useEffect, useState } from "react";
import { useNavigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLeadNotifications } from "@/hooks/useLeadNotifications";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, CreditCard, LogOut, BarChart3, Kanban, Package, FileText, Receipt, Building2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";
import MfaSetupDialog from "@/components/MfaSetupDialog";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/admin" },
  { label: "CRM", icon: Kanban, path: "/admin/crm" },
  { label: "Invoices", icon: FileText, path: "/admin/invoices" },
  { label: "Quotations", icon: Receipt, path: "/admin/quotations" },
  { label: "Payments", icon: CreditCard, path: "/admin/payments" },
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
  { label: "Packages", icon: Package, path: "/admin/packages" },
  { label: "Business Profile", icon: Building2, path: "/admin/business-profile" },
];

const AdminDashboard = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [mustSetupMfa, setMustSetupMfa] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useLeadNotifications(user?.id);

  useEffect(() => {
    if (user?.user_metadata?.must_change_password) {
      setMustChangePassword(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user || mustChangePassword) return;
    const check2fa = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("require_2fa")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!(profile as any)?.require_2fa) return;
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const hasVerifiedTotp = factors?.totp?.some((f) => f.status === "verified");
      if (!hasVerifiedTotp) setMustSetupMfa(true);
    };
    check2fa();
  }, [user, mustChangePassword]);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/admin/login");
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const SidebarNav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/60 mb-2 truncate">{user.email}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { signOut(); navigate("/admin/login"); }}
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-secondary">
      <ChangePasswordDialog open={mustChangePassword} onSuccess={() => setMustChangePassword(false)} />
      <MfaSetupDialog open={mustSetupMfa && !mustChangePassword} onSuccess={() => setMustSetupMfa(false)} />

      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
          <div className="p-6 border-b border-sidebar-border">
            <h1 className="text-lg font-bold text-sidebar-primary">SedgePro Admin</h1>
          </div>
          <SidebarNav />
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        {isMobile && (
          <header className="h-14 bg-sidebar flex items-center px-4 gap-3 shrink-0">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent/50">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
                <div className="p-6 border-b border-sidebar-border">
                  <h1 className="text-lg font-bold text-sidebar-primary">SedgePro Admin</h1>
                </div>
                <SidebarNav onNavigate={() => setSidebarOpen(false)} />
              </SheetContent>
            </Sheet>
            <h1 className="text-sm font-bold text-sidebar-primary truncate">SedgePro Admin</h1>
          </header>
        )}

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
