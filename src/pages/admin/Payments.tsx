import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Plus, Upload, FileText, X, CalendarIcon, Filter, Search } from "lucide-react";
import { toast } from "sonner";

interface Payment {
  id: string;
  checkout_id: string | null;
  package_name: string;
  amount_cents: number;
  status: string;
  customer_email: string | null;
  client_name: string | null;
  proof_url: string | null;
  created_at: string;
}

const packages = [
  { name: "Certificates & Invoicing", amount: 299700 },
  { name: "Profitability Management", amount: 999700 },
  { name: "Project Collaboration Service", amount: 199700 },
];

const statusColor = (s: string) => {
  switch (s) {
    case "completed": return "bg-accent text-accent-foreground";
    case "failed": return "bg-destructive text-destructive-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

const Payments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [clientName, setClientName] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("completed");
  const [completedLeads, setCompletedLeads] = useState<{ id: string; client_name: string; email: string | null; package: string | null }[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const fetchPayments = () => {
    supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPayments((data as Payment[]) || []);
        setLoading(false);
      });
  };

  const fetchCompletedLeads = async () => {
    const { data: stages } = await supabase.from("pipeline_stages").select("id, name");
    const stage = (stages || []).find((s) => s.name === "Purchase Completed");
    if (!stage) return;
    const { data: leads } = await supabase.from("leads").select("id, client_name, email, package").eq("stage_id", stage.id);
    const { data: completedPayments } = await supabase.from("payments").select("customer_email, client_name").eq("status", "completed");
    const paidEmails = new Set((completedPayments || []).map((p) => p.customer_email?.toLowerCase()).filter(Boolean));
    const paidNames = new Set((completedPayments || []).map((p) => p.client_name?.toLowerCase()).filter(Boolean));
    const unpaidLeads = (leads || []).filter((l) => {
      const emailMatch = l.email && paidEmails.has(l.email.toLowerCase());
      const nameMatch = paidNames.has(l.client_name.toLowerCase());
      return !emailMatch && !nameMatch;
    });
    setCompletedLeads(unpaidLeads);
  };

  useEffect(() => { fetchPayments(); fetchCompletedLeads(); }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesStatus = statusFilter === "All" || p.status === statusFilter;
      const matchesSearch = !searchTerm ||
        (p.client_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.customer_email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.package_name.toLowerCase().includes(searchTerm.toLowerCase());
      const paymentDate = new Date(p.created_at);
      const fromDate = dateFrom ? new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate()) : null;
      const toDate = dateTo ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59, 999) : null;
      const matchesFrom = !fromDate || paymentDate >= fromDate;
      const matchesTo = !toDate || paymentDate <= toDate;
      return matchesStatus && matchesSearch && matchesFrom && matchesTo;
    });
  }, [payments, statusFilter, searchTerm, dateFrom, dateTo]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    setSaving(true);

    let proofUrl: string | null = null;

    if (proofFile) {
      const ext = proofFile.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(filePath, proofFile);
      if (uploadError) {
        toast.error("Failed to upload proof: " + uploadError.message);
        setSaving(false);
        return;
      }
      proofUrl = filePath;
    }

    const pkg = packages.find((p) => p.name === selectedPackage);
    const amountCents = customAmount ? Math.round(parseFloat(customAmount) * 100) : (pkg?.amount || 0);

    const { error } = await supabase.from("payments").insert({
      package_name: selectedPackage,
      amount_cents: amountCents,
      customer_email: customerEmail.trim() || null,
      client_name: clientName.trim() || null,
      proof_url: proofUrl,
      status: paymentStatus,
      checkout_id: null,
      payment_id: null,
    } as any);

    if (error) {
      toast.error(error.message);
    } else {
      if (paymentStatus === "completed" && clientName) {
        try {
          const { data: pcStage } = await supabase
            .from("pipeline_stages")
            .select("id")
            .eq("name", "Purchase Completed")
            .maybeSingle();

          if (pcStage) {
            const lead = completedLeads.find((l) => l.client_name === clientName);
            if (!lead) {
              const emailToSearch = customerEmail.trim();
              if (emailToSearch) {
                const { data: leadByEmail } = await supabase
                  .from("leads")
                  .select("id, stage_id")
                  .eq("email", emailToSearch)
                  .neq("stage_id", pcStage.id)
                  .limit(1)
                  .maybeSingle();

                if (leadByEmail) {
                  const { data: lastLead } = await supabase
                    .from("leads")
                    .select("position")
                    .eq("stage_id", pcStage.id)
                    .order("position", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  await supabase.from("leads").update({
                    stage_id: pcStage.id,
                    position: (lastLead?.position ?? -1) + 1,
                  }).eq("id", leadByEmail.id);
                }
              }
            }
          }
        } catch (e) {
          console.error("Failed to move lead to Purchase Completed:", e);
        }
      }

      toast.success("Payment recorded");
      setDialogOpen(false);
      setCustomerEmail("");
      setClientName("");
      setSelectedPackage("");
      setCustomAmount("");
      setPaymentStatus("completed");
      setProofFile(null);
      fetchPayments();
    }
    setSaving(false);
  };

  const handlePackageChange = (val: string) => {
    setSelectedPackage(val);
    const pkg = packages.find((p) => p.name === val);
    setCustomAmount(pkg ? (pkg.amount / 100).toString() : "");
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Payments</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Manual Payment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search client, email, package..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full sm:w-auto justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="w-4 h-4 mr-2" />
              {dateFrom ? format(dateFrom, "dd MMM yyyy") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full sm:w-auto justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="w-4 h-4 mr-2" />
              {dateTo ? format(dateTo, "dd MMM yyyy") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo || statusFilter !== "All" || searchTerm) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setStatusFilter("All"); setSearchTerm(""); }}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filteredPayments.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No payments found</TableCell></TableRow>
            ) : filteredPayments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{p.client_name || "—"}</TableCell>
                <TableCell>{p.package_name}</TableCell>
                <TableCell className="text-sm">{p.customer_email || "—"}</TableCell>
                <TableCell>R{(p.amount_cents / 100).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={statusColor(p.status)}>{p.status}</Badge>
                </TableCell>
                <TableCell>
                  {p.proof_url ? (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={async () => {
                      const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(p.proof_url!, 300);
                      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                    }}>
                      <FileText className="w-3 h-3 mr-1" /> View
                    </Button>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.checkout_id ? "Yoco" : "Manual"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manual Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Package *</Label>
              <Select value={selectedPackage} onValueChange={handlePackageChange}>
                <SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger>
                <SelectContent>
                  {packages.map((p) => (
                    <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client Name *</Label>
              <Select value={clientName} onValueChange={(val) => {
                setClientName(val);
                const lead = completedLeads.find((l) => l.client_name === val);
                if (lead?.email) setCustomerEmail(lead.email);
                if (lead?.package) {
                  setSelectedPackage(lead.package);
                  const pkg = packages.find((p) => p.name === lead.package);
                  if (pkg) setCustomAmount((pkg.amount / 100).toString());
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {completedLeads.map((l) => (
                    <SelectItem key={l.id} value={l.client_name}>{l.client_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Customer Email</Label>
              <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="client@example.com" maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label>Amount (R)</Label>
              <Input type="number" step="0.01" min="0" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="0.00" required />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Proof of Payment</Label>
              {proofFile ? (
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{proofFile.name}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setProofFile(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center gap-2 p-3 rounded-md border border-dashed border-muted-foreground/30 cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to attach file</span>
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
                      setProofFile(file);
                    }
                  }} />
                </label>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={saving || !selectedPackage || !clientName}>
              {saving ? "Saving..." : "Record Payment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payments;
