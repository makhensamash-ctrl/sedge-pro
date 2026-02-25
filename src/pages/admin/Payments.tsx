import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, FileText, X } from "lucide-react";
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
    setCompletedLeads(leads || []);
  };

  useEffect(() => { fetchPayments(); fetchCompletedLeads(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    setSaving(true);

    let proofUrl: string | null = null;

    // Upload proof of payment if attached
    if (proofFile) {
      const ext = proofFile.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(filePath, proofFile);
      if (uploadError) {
        toast.error("Failed to upload proof: " + uploadError.message);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("payment-proofs").getPublicUrl(filePath);
      // Since bucket is private, store the path instead
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Payments</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Manual Payment
        </Button>
      </div>
      <div className="rounded-lg border bg-card">
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
            ) : payments.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No payments yet</TableCell></TableRow>
            ) : payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{(p as any).client_name || "—"}</TableCell>
                <TableCell>{p.package_name}</TableCell>
                <TableCell className="text-sm">{p.customer_email || "—"}</TableCell>
                <TableCell>R{(p.amount_cents / 100).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={statusColor(p.status)}>{p.status}</Badge>
                </TableCell>
                <TableCell>
                  {(p as any).proof_url ? (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={async () => {
                      const { data } = await supabase.storage.from("payment-proofs").createSignedUrl((p as any).proof_url, 300);
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
