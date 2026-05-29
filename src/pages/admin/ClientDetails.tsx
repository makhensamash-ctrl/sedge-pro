import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Building2, Mail, Phone, MapPin, Loader2, Landmark } from "lucide-react";

interface Client {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  vat_number: string | null;
  notes: string | null;
  reference_id: string;
  created_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface Quotation {
  id: string;
  quotation_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

const ClientDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // Transactions
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  const [clientQuotations, setClientQuotations] = useState<Quotation[]>([]);
  
  // Edit Form Dialog State
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchClientDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setClient(null);
      } else {
        const clientData = data as Client;
        setClient(clientData);
        // Pre-fill form fields
        setName(clientData.name);
        setCompany(clientData.company || "");
        setEmail(clientData.email || "");
        setPhone(clientData.phone || "");
        setVatNumber(clientData.vat_number || "");
        setAddress(clientData.address || "");
        setNotes(clientData.notes || "");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load client details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientTransactions = async () => {
    if (!id) return;
    setLoadingTransactions(true);
    try {
      const [invRes, quoRes] = await Promise.all([
        supabase.from("invoices").select("id, invoice_number, total_amount, status, created_at").eq("client_id", id).order("created_at", { ascending: false }),
        supabase.from("quotations").select("id, quotation_number, total_amount, status, created_at").eq("client_id", id).order("created_at", { ascending: false })
      ]);

      if (invRes.error) throw invRes.error;
      if (quoRes.error) throw quoRes.error;

      setClientInvoices(invRes.data || []);
      setClientQuotations(quoRes.data || []);
    } catch (err: any) {
      console.error("Failed to load transactions:", err);
      toast.error("Failed to load transactions history.");
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchClientDetails();
    fetchClientTransactions();
  }, [id]);

  const handleEditOpen = () => {
    if (!client) return;
    setName(client.name);
    setCompany(client.company || "");
    setEmail(client.email || "");
    setPhone(client.phone || "");
    setVatNumber(client.vat_number || "");
    setAddress(client.address || "");
    setNotes(client.notes || "");
    setEditOpen(true);
  };

  const handleSaveEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Client name is required.");
      return;
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      company: company.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      vat_number: vatNumber.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
    };

    try {
      if (!id) return;
      const { error } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", id);

      if (error) throw error;
      toast.success("Client profile updated");
      setEditOpen(false);
      fetchClientDetails();
    } catch (err: any) {
      toast.error(err.message || "Failed to update client.");
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => {
    const totalInvs = clientInvoices.length;
    const unpaidInvs = clientInvoices.filter(i => i.status !== "paid");
    const totalQuotes = clientQuotations.length;

    const invoiceSum = clientInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0);
    const unpaidSum = unpaidInvs.reduce((sum, i) => sum + Number(i.total_amount), 0);
    const quotationSum = clientQuotations.reduce((sum, q) => sum + Number(q.total_amount), 0);

    return {
      totalInvs,
      unpaidInvs: unpaidInvs.length,
      totalQuotes,
      invoiceSum,
      unpaidSum,
      quotationSum
    };
  }, [clientInvoices, clientQuotations]);

  const getInvoiceStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid": return "bg-accent text-accent-foreground";
      case "draft": return "bg-muted text-muted-foreground";
      case "overdue": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getQuotationStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "accepted": return "bg-accent text-accent-foreground";
      case "sent": return "bg-primary text-primary-foreground";
      case "expired": case "rejected": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
        <p>Loading client details...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <Card className="border p-8 shadow-sm">
          <h2 className="text-xl font-bold mb-2">Client Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">The client reference identifier does not exist or has been removed.</p>
          <Button onClick={() => navigate("/admin/clients")} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Clients List
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate("/admin/clients")} title="Back to Clients List">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
              {client.name}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Reference ID: <span className="font-mono font-semibold">{client.reference_id}</span></p>
          </div>
        </div>
        
        <Button onClick={handleEditOpen} variant="outline">
          <Pencil className="w-4 h-4 mr-2" /> Edit Profile
        </Button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1: Client Info Profile card */}
        <div className="md:col-span-1 space-y-4">
          <Card className="border shadow-sm bg-muted/20">
            <CardHeader className="py-4"><CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Client Profile</CardTitle></CardHeader>
            <CardContent className="space-y-5 text-sm pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs"><Building2 className="w-3.5 h-3.5 shrink-0" />Company</div>
                <div className="font-medium text-foreground text-sm">{client.company || "—"}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs"><Mail className="w-3.5 h-3.5 shrink-0" />Email</div>
                <div className="font-medium text-foreground text-sm truncate">{client.email || "—"}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs"><Phone className="w-3.5 h-3.5 shrink-0" />Phone</div>
                <div className="font-medium text-foreground text-sm">{client.phone || "—"}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs"><Landmark className="w-3.5 h-3.5 shrink-0" />VAT Number</div>
                <div className="font-medium text-foreground text-sm">{client.vat_number || "—"}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground text-xs"><MapPin className="w-3.5 h-3.5 shrink-0" />Billing Address</div>
                <div className="text-xs text-foreground leading-relaxed whitespace-pre-line text-sm">{client.address || "—"}</div>
              </div>
              {client.notes && (
                <div className="space-y-1 pt-3 border-t">
                  <div className="text-muted-foreground text-xs">Notes</div>
                  <div className="text-xs text-muted-foreground leading-relaxed italic text-sm">{client.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Column 2 & 3: Statistics and Transaction tables */}
        <div className="md:col-span-2 space-y-6">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border shadow-sm"><CardContent className="p-4 text-center">
              <div className="text-2xl font-extrabold text-primary">{stats.totalInvs}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Total Invoices</div>
            </CardContent></Card>
            <Card className="border shadow-sm bg-destructive/5 border-destructive/10"><CardContent className="p-4 text-center">
              <div className="text-2xl font-extrabold text-destructive">R{stats.unpaidSum.toLocaleString("en-ZA")}</div>
              <div className="text-xs text-destructive mt-0.5">Unpaid Balance</div>
            </CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4 text-center">
              <div className="text-2xl font-extrabold text-foreground">R{stats.invoiceSum.toLocaleString("en-ZA")}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Total Billed</div>
            </CardContent></Card>
          </div>

          {/* Transaction Tabs */}
          <Tabs defaultValue="invoices" className="w-full border rounded-lg p-5 bg-background shadow-sm">
            <TabsList className="mb-4">
              <TabsTrigger value="invoices">Invoices ({stats.totalInvs})</TabsTrigger>
              <TabsTrigger value="quotations">Quotations ({stats.totalQuotes})</TabsTrigger>
            </TabsList>

            <TabsContent value="invoices">
              {loadingTransactions ? (
                <div className="text-center py-12 text-sm text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />Loading Invoices...</div>
              ) : clientInvoices.length === 0 ? (
                <p className="text-center py-12 text-sm text-muted-foreground">No invoices generated for this client yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-semibold text-sm">{inv.invoice_number}</TableCell>
                        <TableCell className="text-sm">R{Number(inv.total_amount).toLocaleString("en-ZA")}</TableCell>
                        <TableCell><Badge className={`text-xs h-5 px-2.5 ${getInvoiceStatusColor(inv.status)}`}>{inv.status}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(inv.created_at).toLocaleDateString("en-GB")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="quotations">
              {loadingTransactions ? (
                <div className="text-center py-12 text-sm text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />Loading Quotations...</div>
              ) : clientQuotations.length === 0 ? (
                <p className="text-center py-12 text-sm text-muted-foreground">No quotations generated for this client yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quote #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientQuotations.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="font-semibold text-sm">{q.quotation_number}</TableCell>
                        <TableCell className="text-sm">R{Number(q.total_amount).toLocaleString("en-ZA")}</TableCell>
                        <TableCell><Badge className={`text-xs h-5 px-2.5 ${getQuotationStatusColor(q.status)}`}>{q.status}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(q.created_at).toLocaleDateString("en-GB")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Form Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Client Profile</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveEditClient} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe" maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp" maxLength={100} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 82 123 4567" maxLength={50} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>VAT Number</Label>
              <Input value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="ZA400123456" maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label>Billing Address</Label>
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Financial Street, Sandton, Johannesburg" rows={3} maxLength={500} />
            </div>
            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Acquired via direct referral. Prefers monthly EFT billing." rows={3} maxLength={1000} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDetails;
