import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { UserPlus, Pencil, Trash2, Download, Upload, Loader2, Search, Building2, Mail, Phone, MapPin, FileText, Receipt, Eye, Landmark, HelpCircle } from "lucide-react";

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

const Clients = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog controls
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  
  // Active client selection
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // CSV Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");

      if (error) throw error;
      setClients((data as Client[]) || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load clients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const query = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(query) ||
        (c.company || "").toLowerCase().includes(query) ||
        (c.email || "").toLowerCase().includes(query) ||
        (c.reference_id || "").toLowerCase().includes(query)
      );
    });
  }, [clients, searchTerm]);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setName("");
    setCompany("");
    setEmail("");
    setPhone("");
    setVatNumber("");
    setAddress("");
    setNotes("");
    setFormOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setCompany(client.company || "");
    setEmail(client.email || "");
    setPhone(client.phone || "");
    setVatNumber(client.vat_number || "");
    setAddress(client.address || "");
    setNotes(client.notes || "");
    setFormOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
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
      if (editingClient) {
        const { error } = await supabase
          .from("clients")
          .update(payload)
          .eq("id", editingClient.id);

        if (error) throw error;
        toast.success("Client updated");
      } else {
        const { error } = await supabase
          .from("clients")
          .insert(payload);

        if (error) throw error;
        toast.success("Client created");
      }
      setFormOpen(false);
      fetchClients();
    } catch (err: any) {
      toast.error(err.message || "Failed to save client.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    // 1. Check if client has linked invoices or quotations
    try {
      const [invCount, quoCount] = await Promise.all([
        supabase.from("invoices").select("id", { count: "exact" }).eq("client_id", client.id),
        supabase.from("quotations").select("id", { count: "exact" }).eq("client_id", client.id)
      ]);

      if (invCount.error) throw invCount.error;
      if (quoCount.error) throw quoCount.error;

      const totalInvs = invCount.count || 0;
      const totalQuos = quoCount.count || 0;

      if (totalInvs > 0 || totalQuos > 0) {
        toast.error(
          `Cannot delete client. This client is currently linked to ${totalInvs} invoice(s) and ${totalQuos} quotation(s).`
        );
        return;
      }

      if (!confirm(`Are you sure you want to delete client "${client.name}"?`)) return;

      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", client.id);

      if (error) throw error;
      toast.success("Client deleted");
      fetchClients();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete deletion safety check.");
    }
  };

  const handleExportClientsCSV = () => {
    try {
      if (clients.length === 0) {
        toast.error("No clients found to export.");
        return;
      }
      
      const dataToExport = clients.map((c) => ({
        reference_id: c.reference_id,
        name: c.name,
        company: c.company || "",
        email: c.email || "",
        phone: c.phone || "",
        vat_number: c.vat_number || "",
        address: c.address || "",
        notes: c.notes || "",
        created_at: c.created_at,
      }));
      
      const csvContent = convertToCSV(dataToExport, [
        "reference_id",
        "name",
        "company",
        "email",
        "phone",
        "vat_number",
        "address",
        "notes",
        "created_at"
      ]);
      downloadFile(csvContent, "text/csv;charset=utf-8;", "sedge_pro_clients.csv");
      toast.success("Clients exported successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to export clients.");
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
        const nameIdx = headers.indexOf("name");
        const companyIdx = headers.indexOf("company");
        const emailIdx = headers.indexOf("email");
        const phoneIdx = headers.indexOf("phone");
        const vatIdx = headers.indexOf("vat_number");
        const addressIdx = headers.indexOf("address");
        const notesIdx = headers.indexOf("notes");

        if (nameIdx === -1) {
          throw new Error("CSV is missing required 'name' column.");
        }

        const clientsToImport: any[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length === 0 || (row.length === 1 && row[0] === "")) continue;

          const clientName = row[nameIdx]?.trim();
          if (!clientName) continue;

          clientsToImport.push({
            name: clientName,
            company: companyIdx !== -1 ? row[companyIdx]?.trim() || null : null,
            email: emailIdx !== -1 ? row[emailIdx]?.trim() || null : null,
            phone: phoneIdx !== -1 ? row[phoneIdx]?.trim() || null : null,
            vat_number: vatIdx !== -1 ? row[vatIdx]?.trim() || null : null,
            address: addressIdx !== -1 ? row[addressIdx]?.trim() || null : null,
            notes: notesIdx !== -1 ? row[notesIdx]?.trim() || null : null,
          });
        }

        if (clientsToImport.length === 0) {
          throw new Error("No valid client records found in the CSV.");
        }

        const { error } = await supabase.from("clients").insert(clientsToImport);
        if (error) throw error;

        toast.success(`Import complete! Successfully created ${clientsToImport.length} client(s).`);
        fetchClients();
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



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Clients Management</h2>
        
        <div className="flex flex-wrap gap-2">
          {/* CSV Import */}
          <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) setImportFile(null); }}>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />Import CSV
            </Button>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle className="flex items-center gap-2 font-bold"><Upload className="w-5 h-5 text-primary" />Import Clients</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/20 text-primary-foreground/90 flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary" />
                  <p className="text-xs leading-relaxed font-medium text-foreground">
                    CSV must contain a header row. The only required column is <strong>name</strong>. Optional supported columns are: <code>company</code>, <code>email</code>, <code>phone</code>, <code>vat_number</code>, <code>address</code>, and <code>notes</code>.
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
                      Importing Clients...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Clients
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* CSV Export */}
          <Button variant="outline" onClick={handleExportClientsCSV}>
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>

          {/* Add Client */}
          <Button onClick={handleOpenAdd}>
            <UserPlus className="w-4 h-4 mr-2" />Add Client
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search by name, company, email or reference ID..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="pl-10" 
        />
      </div>

      {/* Main Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Joined Date</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Loading clients...</TableCell></TableRow>
            ) : filteredClients.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No clients found</TableCell></TableRow>
            ) : filteredClients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-mono text-sm font-semibold">{client.reference_id}</TableCell>
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.company || <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                <TableCell className="text-sm">{client.email || <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                <TableCell className="text-sm">{client.phone || <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                <TableCell className="text-sm">{new Date(client.created_at).toLocaleDateString("en-GB")}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/clients/${client.id}`)} title="View Transactions"><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(client)} title="Edit Profile"><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClient(client)} title="Delete Client"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingClient ? "Edit Client Profile" : "Create New Client"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveClient} className="space-y-4 pt-2">
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
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingClient ? "Update Client" : "Create Client"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Clients;
