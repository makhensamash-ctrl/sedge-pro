import { useState } from "react";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FileText, Plus, Search, Download, Eye, Filter, CalendarIcon, X, RefreshCw } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/invoicing/InvoicePDF";
import { ProductsDialog } from "@/components/invoicing/ProductsDialog";
import { ProductLineItems } from "@/components/invoicing/ProductLineItems";
import { ClientSearchSelect } from "@/components/invoicing/ClientSearchSelect";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  total_amount: number;
  paid_amount?: number;
  tax_amount?: number;
  currency: string;
  status: string;
  due_date: string | null;
  issue_date: string;
  description: string | null;
  notes: string | null;
  business_profile_id: string | null;
  client_id: string | null;
  clients: { name: string; email?: string; phone?: string; address?: string; company?: string } | null;
  business_profiles: { business_name: string; business_logo?: string; contact_phone?: string; website_address?: string; physical_address?: string; bank_name?: string; account_holder_name?: string; account_number?: string; branch_code?: string; terms_and_conditions?: string } | null;
}

const Invoices = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProductAddDialogOpen, setIsProductAddDialogOpen] = useState(false);
  const [productPrefill, setProductPrefill] = useState<{ name: string; price: number } | null>(null);
  const [descriptionEditIndex, setDescriptionEditIndex] = useState<number | null>(null);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', company: '', email: '', phone: '' });
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [isVatIncluded, setIsVatIncluded] = useState(true);
  const [businessProfiles, setBusinessProfiles] = useState<any[]>([]);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [viewLineItems, setViewLineItems] = useState<any[]>([]);

  const generateInvoiceNumber = () => {
    const now = new Date();
    return `INV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
  };

  const [newInvoice, setNewInvoice] = useState({
    invoice_number: generateInvoiceNumber(), client_id: "", business_profile_id: "", due_date: "", status: "draft",
    is_recurring: false, recurrence_interval: "monthly", next_recurrence_date: ""
  });

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select(`*, clients(name, email, phone, address, company), business_profiles(business_name, business_logo, contact_phone, website_address, physical_address, bank_name, account_holder_name, account_number, branch_code, terms_and_conditions)`).order('created_at', { ascending: false });
      if (error) throw error;
      return data as Invoice[];
    }
  });

  useQuery({
    queryKey: ['admin-business-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('business_profiles').select('id, business_name, is_default').order('is_default', { ascending: false });
      if (error) throw error;
      setBusinessProfiles(data || []);
      if (data && data.length > 0 && !newInvoice.business_profile_id) {
        const def = data.find((p: any) => p.is_default) || data[0];
        setNewInvoice(prev => ({ ...prev, business_profile_id: def.id }));
      }
      return data;
    },
    enabled: !!user
  });

  useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name, company').order('name');
      if (error) throw error;
      setClients(data || []);
      return data;
    },
    enabled: !!user
  });

  useQuery({
    queryKey: ['admin-products-for-invoice'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('id, name, description, price').eq('is_active', true).order('name');
      if (error) throw error;
      setProducts(data || []);
      return data;
    },
    enabled: !!user
  });

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = (inv.clients?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
    const invDate = new Date(inv.issue_date);
    const fromDate = dateFrom ? new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate()) : null;
    const toDate = dateTo ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59, 999) : null;
    const matchesFrom = !fromDate || invDate >= fromDate;
    const matchesTo = !toDate || invDate <= toDate;
    return matchesSearch && matchesStatus && matchesFrom && matchesTo;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid": return "bg-accent text-accent-foreground";
      case "draft": return "bg-muted text-muted-foreground";
      case "overdue": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const addClient = async () => {
    if (!newClient.name.trim()) { toast.error('Client name is required'); return; }
    try {
      const { data, error } = await supabase.from('clients').insert({ name: newClient.name.trim(), company: newClient.company.trim() || null, email: newClient.email.trim() || null, phone: newClient.phone.trim() || null }).select().single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      setNewInvoice(prev => ({ ...prev, client_id: data.id }));
      setNewClient({ name: '', company: '', email: '', phone: '' });
      setIsAddClientOpen(false);
      toast.success('Client created');
    } catch (error) { toast.error('Failed to create client'); }
  };

  const handleProductAdded = (product: any) => {
    if (descriptionEditIndex !== null) {
      setSelectedProducts(prev => prev.map((p, i) => i === descriptionEditIndex ? { ...p, name: product.name, description: product.description, price: product.price } : p));
      setDescriptionEditIndex(null);
      return;
    }
    const existing = selectedProducts.find(p => p.id === product.id);
    if (existing) {
      setSelectedProducts(prev => prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
      setSelectedProducts(prev => [...prev, { ...product, quantity: 1 }]);
    }
  };

  const mapInvoiceStatusToPayment = (status: string) => {
    if (status === "paid") return "completed";
    if (status === "overdue") return "failed";
    return "pending";
  };

  const addInvoice = async () => {
    if (!newInvoice.invoice_number.trim()) { toast.error('Invoice number is required'); return; }
    if (!newInvoice.client_id) { toast.error('Please select a client'); return; }
    if (selectedProducts.length === 0) { toast.error('Please add at least one item'); return; }

    try {
      const getRowAmount = (item: any) => {
        const lineTotal = item.price * item.quantity;
        const discount = item.discount || 0;
        if (item.discountType === "R") return Math.max(0, lineTotal - discount);
        return lineTotal * (1 - discount / 100);
      };

      const finalAmount = selectedProducts.reduce((sum: number, p: any) => sum + getRowAmount(p), 0);
      const taxAmount = isVatIncluded ? 0 : finalAmount * 0.15;
      const totalAmount = finalAmount + taxAmount;

      let businessProfileId = newInvoice.business_profile_id;
      if (!businessProfileId && businessProfiles.length > 0) {
        businessProfileId = (businessProfiles.find((p: any) => p.is_default) || businessProfiles[0]).id;
      }

      const { data: invoiceData, error: invoiceError } = await supabase.from('invoices').insert({
        invoice_number: newInvoice.invoice_number, client_id: newInvoice.client_id || null,
        business_profile_id: businessProfileId || null, amount: finalAmount, tax_amount: taxAmount,
        total_amount: totalAmount, due_date: newInvoice.due_date || null, status: newInvoice.status,
        created_by: user?.id,
        is_recurring: newInvoice.is_recurring,
        recurrence_interval: newInvoice.is_recurring ? newInvoice.recurrence_interval : null,
        next_recurrence_date: newInvoice.is_recurring && newInvoice.next_recurrence_date ? newInvoice.next_recurrence_date : null,
      } as any).select(`*, clients(name, email)`).single();

      if (invoiceError) throw invoiceError;

      const lineItems = selectedProducts.map((product: any, index: number) => ({
        invoice_id: invoiceData.id, product_name: product.name, description: product.description,
        quantity: product.quantity, unit_price: product.price, total_price: getRowAmount(product), sort_order: index
      }));

      const { error: lineItemsError } = await supabase.from('invoice_line_items').insert(lineItems);
      if (lineItemsError) throw lineItemsError;

      // Create corresponding payment record
      const clientName = invoiceData.clients?.name || '';
      const clientEmail = invoiceData.clients?.email || null;
      await supabase.from('payments').insert({
        package_name: `Invoice ${invoiceData.invoice_number}`,
        amount_cents: Math.round(totalAmount * 100),
        client_name: clientName,
        customer_email: clientEmail,
        status: mapInvoiceStatusToPayment(newInvoice.status),
        checkout_id: null,
        payment_id: null,
        metadata: { invoice_id: invoiceData.id, source: 'invoice' },
      } as any);

      toast.success('Invoice created');
      setIsCreateOpen(false);
      setNewInvoice({ invoice_number: generateInvoiceNumber(), client_id: "", business_profile_id: businessProfiles.length > 0 ? (businessProfiles.find((p: any) => p.is_default)?.id || businessProfiles[0]?.id) : "", due_date: "", status: "draft", is_recurring: false, recurrence_interval: "monthly", next_recurrence_date: "" });
      setSelectedProducts([]);
      refetch();
    } catch (error: any) {
      toast.error(`Failed to create invoice: ${error?.message || 'Unknown error'}`);
    }
  };

  const updateInvoiceStatus = async (invoice: Invoice, newStatus: string) => {
    try {
      const { error } = await supabase.from('invoices').update({ status: newStatus }).eq('id', invoice.id);
      if (error) throw error;

      // Update corresponding payment record
      const { data: existingPayments } = await supabase
        .from('payments')
        .select('id, metadata')
        .filter('metadata->>invoice_id', 'eq', invoice.id);

      if (existingPayments && existingPayments.length > 0) {
        await supabase.from('payments')
          .update({ status: mapInvoiceStatusToPayment(newStatus) })
          .eq('id', existingPayments[0].id);
      }

      // When marked as paid, ensure a lead card exists in "Purchase Completed"
      if (newStatus === 'paid' && invoice.clients) {
        try {
          const clientName = invoice.clients.name;
          const clientEmail = invoice.clients.email;
          const clientPhone = invoice.clients.phone;

          const { data: pcStage } = await supabase
            .from('pipeline_stages')
            .select('id')
            .eq('name', 'Purchase Completed')
            .maybeSingle();

          if (pcStage) {
            // Check for existing lead by email or client name
            let existingLead = null;

            if (clientEmail) {
              const { data: byEmail } = await supabase
                .from('leads')
                .select('id, stage_id')
                .eq('email', clientEmail)
                .limit(1)
                .maybeSingle();
              existingLead = byEmail;
            }

            if (!existingLead) {
              const { data: byName } = await supabase
                .from('leads')
                .select('id, stage_id')
                .eq('client_name', clientName)
                .limit(1)
                .maybeSingle();
              existingLead = byName;
            }

            // Get next position in Purchase Completed
            const { data: lastLead } = await supabase
              .from('leads')
              .select('position')
              .eq('stage_id', pcStage.id)
              .order('position', { ascending: false })
              .limit(1)
              .maybeSingle();
            const nextPosition = (lastLead?.position ?? -1) + 1;

            if (existingLead) {
              // Move existing lead to Purchase Completed if not already there
              if (existingLead.stage_id !== pcStage.id) {
                await supabase.from('leads').update({
                  stage_id: pcStage.id,
                  position: nextPosition,
                  notes: `Invoice ${invoice.invoice_number} paid – R${Number(invoice.total_amount).toLocaleString()}`,
                }).eq('id', existingLead.id);
              }
            } else {
              // Create new lead in Purchase Completed
              await supabase.from('leads').insert({
                client_name: clientName,
                email: clientEmail || null,
                phone: clientPhone || null,
                source: 'Invoice',
                stage_id: pcStage.id,
                position: nextPosition,
                notes: `Invoice ${invoice.invoice_number} paid – R${Number(invoice.total_amount).toLocaleString()}`,
              });
            }
          }
        } catch (leadErr) {
          console.error('Failed to update/create lead for paid invoice:', leadErr);
        }
      }

      toast.success(`Invoice status updated to ${newStatus}`);
      setViewingInvoice({ ...invoice, status: newStatus });
      refetch();
    } catch (error: any) {
      toast.error(`Failed to update status: ${error?.message || 'Unknown error'}`);
    }
  };

  const viewInvoiceDetails = async (invoice: Invoice) => {
    setViewingInvoice(invoice);
    const { data: lineItems } = await supabase.from('invoice_line_items').select('*').eq('invoice_id', invoice.id).order('sort_order');
    setViewLineItems(lineItems || []);
  };

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
  const paidAmount = filteredInvoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + Number(inv.total_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Invoices</h2>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Create Invoice</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center">
          {isLoading ? <Skeleton className="h-8 w-16 mx-auto mb-2" /> : <div className="text-2xl font-bold text-primary">{filteredInvoices.length}</div>}
          <div className="text-sm text-muted-foreground">Total Invoices</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-foreground">R{totalAmount.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total Amount</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-accent">R{paidAmount.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Paid</div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="invoice sent-awaiting payment">Sent</SelectItem>
            <SelectItem value="partially paid">Partially Paid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
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

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
            ) : filteredInvoices.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                <TableCell>{inv.clients?.name || '—'}</TableCell>
                <TableCell>R{Number(inv.total_amount).toLocaleString()}</TableCell>
                <TableCell>
                  <Select value={inv.status} onValueChange={(val) => updateInvoiceStatus(inv, val)}>
                    <SelectTrigger className="h-7 w-auto min-w-[120px] text-xs border-0 bg-transparent p-1">
                      <Badge className={getStatusColor(inv.status)}>{inv.status}</Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="invoice sent-awaiting payment">Sent</SelectItem>
                      <SelectItem value="partially paid">Partially Paid</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm">{new Date(inv.issue_date).toLocaleDateString()}</TableCell>
                <TableCell className="text-sm">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => viewInvoiceDetails(inv)}><Eye className="w-3 h-3" /></Button>
                    {inv.business_profiles && (
                      <PDFDownloadLink
                        document={<InvoicePDF invoice={{ ...inv, client: inv.clients || undefined, business_profile: inv.business_profiles || undefined }} items={[]} />}
                        fileName={`invoice-${inv.invoice_number}.pdf`}
                      >
                        {({ loading }) => (
                          <Button variant="ghost" size="sm" disabled={loading}><Download className="w-3 h-3" /></Button>
                        )}
                      </PDFDownloadLink>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <div>
                <Label>Invoice Number *</Label>
                <Input value={newInvoice.invoice_number} onChange={(e) => setNewInvoice({...newInvoice, invoice_number: e.target.value})} />
              </div>
              <div>
                <Label>Client *</Label>
                <ClientSearchSelect clients={clients} selectedClientId={newInvoice.client_id} onClientSelect={(id) => setNewInvoice({...newInvoice, client_id: id})} onAddNewClient={() => setIsAddClientOpen(true)} />
              </div>
            </div>
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <div>
                <Label>Business Profile</Label>
                <Select value={newInvoice.business_profile_id} onValueChange={(v) => setNewInvoice({...newInvoice, business_profile_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select profile" /></SelectTrigger>
                  <SelectContent>
                    {businessProfiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.business_name} {p.is_default && "(Default)"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input type="date" value={newInvoice.due_date} onChange={(e) => setNewInvoice({...newInvoice, due_date: e.target.value})} />
              </div>
            </div>

            <ProductLineItems
              products={products}
              selectedProducts={selectedProducts}
              onSelectedProductsChange={setSelectedProducts}
              onAddNewProduct={() => setIsProductAddDialogOpen(true)}
              onSaveCustomProduct={async (name, price) => {
                const { error } = await supabase.from('products').insert({ name, price } as any);
                if (error) { toast.error('Failed to save product'); return; }
                toast.success(`"${name}" saved`);
                queryClient.invalidateQueries({ queryKey: ['admin-products-for-invoice'] });
              }}
              onAddDescription={(index, name, price) => {
                setDescriptionEditIndex(index);
                setProductPrefill({ name, price });
                setIsProductAddDialogOpen(true);
              }}
              isVatIncluded={isVatIncluded}
            />

            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <div className="space-y-3">
                <Label>VAT Handling</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="vat-add" name="vat" checked={!isVatIncluded} onChange={() => setIsVatIncluded(false)} className="h-4 w-4" />
                    <Label htmlFor="vat-add" className="text-sm font-normal">Add VAT (15%)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="vat-inc" name="vat" checked={isVatIncluded} onChange={() => setIsVatIncluded(true)} className="h-4 w-4" />
                    <Label htmlFor="vat-inc" className="text-sm font-normal">No VAT</Label>
                  </div>
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={newInvoice.status} onValueChange={(v) => setNewInvoice({...newInvoice, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="invoice sent-awaiting payment">Sent</SelectItem>
                    <SelectItem value="partially paid">Partially Paid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Recurring Invoice Section */}
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="is-recurring"
                  checked={newInvoice.is_recurring}
                  onChange={(e) => setNewInvoice({ ...newInvoice, is_recurring: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="is-recurring" className="text-sm font-medium cursor-pointer">Is this a recurring payment?</Label>
              </div>
              {newInvoice.is_recurring && (
                <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                  <div>
                    <Label>Recurrence Interval</Label>
                    <Select value={newInvoice.recurrence_interval} onValueChange={(v) => setNewInvoice({ ...newInvoice, recurrence_interval: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Next Invoice Date</Label>
                    <Input
                      type="date"
                      value={newInvoice.next_recurrence_date}
                      onChange={(e) => setNewInvoice({ ...newInvoice, next_recurrence_date: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={addInvoice}>Create Invoice</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewingInvoice} onOpenChange={() => setViewingInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Invoice {viewingInvoice?.invoice_number}</DialogTitle></DialogHeader>
          {viewingInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{viewingInvoice.clients?.name || '—'}</span></div>
               <div><span className="text-muted-foreground">Status:</span> <Badge className={getStatusColor(viewingInvoice.status)}>{viewingInvoice.status}</Badge></div>
               <div><span className="text-muted-foreground">Update Status:</span>
                 <Select value={viewingInvoice.status} onValueChange={(v) => updateInvoiceStatus(viewingInvoice, v)}>
                   <SelectTrigger className="w-full mt-1"><SelectValue /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="draft">Draft</SelectItem>
                     <SelectItem value="invoice sent-awaiting payment">Sent</SelectItem>
                     <SelectItem value="partially paid">Partially Paid</SelectItem>
                     <SelectItem value="paid">Paid</SelectItem>
                     <SelectItem value="overdue">Overdue</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
                <div><span className="text-muted-foreground">Issue Date:</span> {new Date(viewingInvoice.issue_date).toLocaleDateString()}</div>
                <div><span className="text-muted-foreground">Due Date:</span> {viewingInvoice.due_date ? new Date(viewingInvoice.due_date).toLocaleDateString() : '—'}</div>
              </div>
              {viewLineItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Line Items</h4>
                  {viewLineItems.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-start p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity} × R{Number(item.unit_price).toLocaleString()}</p>
                      </div>
                      <p className="font-semibold">R{Number(item.total_price).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between"><span>Subtotal:</span><span>R{Number(viewingInvoice.amount).toLocaleString()}</span></div>
                {viewingInvoice.tax_amount && Number(viewingInvoice.tax_amount) > 0 && (
                  <div className="flex justify-between"><span>Tax:</span><span>R{Number(viewingInvoice.tax_amount).toLocaleString()}</span></div>
                )}
                <div className="flex justify-between font-bold text-lg"><span>Total:</span><span>R{Number(viewingInvoice.total_amount).toLocaleString()}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <ProductsDialog
        isOpen={isProductAddDialogOpen}
        onClose={() => { setIsProductAddDialogOpen(false); setProductPrefill(null); setDescriptionEditIndex(null); }}
        openInAddMode={true}
        onProductAdded={handleProductAdded}
        prefillData={productPrefill}
      />

      {/* Add Client Dialog */}
      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Client Name *</Label><Input value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})} placeholder="Client name" /></div>
            <div><Label>Company</Label><Input value={newClient.company} onChange={(e) => setNewClient({...newClient, company: e.target.value})} placeholder="Company" /></div>
            <div><Label>Email</Label><Input type="email" value={newClient.email} onChange={(e) => setNewClient({...newClient, email: e.target.value})} placeholder="Email" /></div>
            <div><Label>Phone</Label><Input value={newClient.phone} onChange={(e) => setNewClient({...newClient, phone: e.target.value})} placeholder="Phone" /></div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsAddClientOpen(false)}>Cancel</Button>
            <Button onClick={addClient}>Add Client</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Invoices;