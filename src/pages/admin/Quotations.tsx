import { useState } from "react";
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
import { toast } from "sonner";
import { FileText, Plus, Search, Download, Eye, Filter, Send } from "lucide-react";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { QuotationPDF } from "@/components/invoicing/QuotationPDF";
import { ProductsDialog } from "@/components/invoicing/ProductsDialog";
import { ProductLineItems } from "@/components/invoicing/ProductLineItems";
import { ClientSearchSelect } from "@/components/invoicing/ClientSearchSelect";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Quotation {
  id: string;
  quotation_number: string;
  amount: number;
  total_amount: number;
  tax_amount?: number;
  currency: string;
  status: string;
  expiry_date: string | null;
  issue_date: string;
  description: string | null;
  notes: string | null;
  converted_to_invoice: boolean;
  business_profile_id: string | null;
  client_id: string | null;
  clients: { name: string; email?: string; phone?: string; address?: string; company?: string } | null;
  business_profiles: { business_name: string; business_logo?: string; contact_phone?: string; website_address?: string; physical_address?: string; bank_name?: string; account_holder_name?: string; account_number?: string; branch_code?: string; terms_and_conditions?: string } | null;
}

const Quotations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isProductAddDialogOpen, setIsProductAddDialogOpen] = useState(false);
  const [productPrefill, setProductPrefill] = useState<{ name: string; price: number } | null>(null);
  const [descriptionEditIndex, setDescriptionEditIndex] = useState<number | null>(null);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', company: '', email: '', phone: '', vat_number: '' });
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [isVatIncluded, setIsVatIncluded] = useState(true);
  const [businessProfiles, setBusinessProfiles] = useState<any[]>([]);
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
  const [viewLineItems, setViewLineItems] = useState<any[]>([]);
  const [sendingQuotation, setSendingQuotation] = useState<Quotation | null>(null);
  const [sendRecipient, setSendRecipient] = useState("");
  const [isSending, setIsSending] = useState(false);

  const generateQuotationNumber = () => {
    const now = new Date();
    return `QUO-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
  };

  const [newQuotation, setNewQuotation] = useState({
    quotation_number: generateQuotationNumber(), client_id: "", business_profile_id: "", expiry_date: "", status: "draft"
  });

  const { data: quotations = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-quotations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quotations').select(`*, clients(name, email, phone, address, company, vat_number), business_profiles(business_name, business_logo, contact_phone, website_address, physical_address, vat_number, bank_name, account_holder_name, account_number, branch_code, terms_and_conditions)`).order('created_at', { ascending: false });
      if (error) throw error;
      return data as Quotation[];
    }
  });

  useQuery({
    queryKey: ['admin-business-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('business_profiles').select('id, business_name, is_default').order('is_default', { ascending: false });
      if (error) throw error;
      setBusinessProfiles(data || []);
      if (data && data.length > 0 && !newQuotation.business_profile_id) {
        const def = data.find((p: any) => p.is_default) || data[0];
        setNewQuotation(prev => ({ ...prev, business_profile_id: def.id }));
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
    queryKey: ['admin-products-for-quotation'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('id, name, description, price').eq('is_active', true).order('name');
      if (error) throw error;
      setProducts(data || []);
      return data;
    },
    enabled: !!user
  });

  const filteredQuotations = quotations.filter(q => {
    const matchesSearch = (q.clients?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "accepted": return "bg-accent text-accent-foreground";
      case "sent": return "bg-primary text-primary-foreground";
      case "expired": case "rejected": return "bg-destructive text-destructive-foreground";
      case "draft": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const addClient = async () => {
    if (!newClient.name.trim()) { toast.error('Client name is required'); return; }
    try {
      const { data, error } = await supabase.from('clients').insert({ name: newClient.name.trim(), company: newClient.company.trim() || null, email: newClient.email.trim() || null, phone: newClient.phone.trim() || null, vat_number: newClient.vat_number.trim() || null }).select().single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
      setNewQuotation(prev => ({ ...prev, client_id: data.id }));
      setNewClient({ name: '', company: '', email: '', phone: '', vat_number: '' });
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

  const addQuotation = async () => {
    if (!newQuotation.quotation_number.trim()) { toast.error('Quotation number is required'); return; }
    if (!newQuotation.client_id) { toast.error('Please select a client'); return; }
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

      let businessProfileId = newQuotation.business_profile_id;
      if (!businessProfileId && businessProfiles.length > 0) {
        businessProfileId = (businessProfiles.find((p: any) => p.is_default) || businessProfiles[0]).id;
      }

      const { data: quotationData, error: quotationError } = await supabase.from('quotations').insert({
        quotation_number: newQuotation.quotation_number, client_id: newQuotation.client_id || null,
        business_profile_id: businessProfileId || null, amount: finalAmount, tax_amount: taxAmount,
        total_amount: totalAmount, expiry_date: newQuotation.expiry_date || null, status: newQuotation.status,
        created_by: user?.id
      } as any).select().single();

      if (quotationError) throw quotationError;

      const lineItems = selectedProducts.map((product: any, index: number) => ({
        quotation_id: quotationData.id, product_name: product.name, description: product.description,
        quantity: product.quantity, unit_price: product.price, total_price: getRowAmount(product), sort_order: index
      }));

      const { error: lineItemsError } = await supabase.from('quotation_line_items').insert(lineItems);
      if (lineItemsError) throw lineItemsError;

      toast.success('Quotation created');
      setIsCreateOpen(false);
      setNewQuotation({ quotation_number: generateQuotationNumber(), client_id: "", business_profile_id: businessProfiles.length > 0 ? (businessProfiles.find((p: any) => p.is_default)?.id || businessProfiles[0]?.id) : "", expiry_date: "", status: "draft" });
      setSelectedProducts([]);
      refetch();
    } catch (error: any) {
      toast.error(`Failed to create quotation: ${error?.message || 'Unknown error'}`);
    }
  };

  const convertToInvoice = async (quotation: Quotation) => {
    try {
      const now = new Date();
      const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;

      const { data: qLineItems } = await supabase.from('quotation_line_items').select('*').eq('quotation_id', quotation.id);

      const { data: newInvoice, error: invoiceError } = await supabase.from('invoices').insert({
        invoice_number: invoiceNumber, client_id: quotation.client_id,
        business_profile_id: quotation.business_profile_id, amount: quotation.amount,
        tax_amount: quotation.tax_amount || 0, total_amount: quotation.total_amount,
        status: 'draft', description: quotation.description, notes: quotation.notes,
        currency: quotation.currency || 'ZAR', created_by: user?.id
      } as any).select(`*, clients(name, email)`).single();

      if (invoiceError) throw invoiceError;

      if (qLineItems && qLineItems.length > 0) {
        const invoiceLineItems = qLineItems.map((item: any) => ({
          invoice_id: newInvoice.id, product_name: item.product_name, description: item.description,
          quantity: item.quantity, unit_price: item.unit_price, total_price: item.total_price
        }));
        await supabase.from('invoice_line_items').insert(invoiceLineItems);
      }

      // Create corresponding payment record
      await supabase.from('payments').insert({
        package_name: `Invoice ${invoiceNumber}`,
        amount_cents: Math.round(quotation.total_amount * 100),
        client_name: (newInvoice as any).clients?.name || quotation.clients?.name || '',
        customer_email: (newInvoice as any).clients?.email || quotation.clients?.email || null,
        status: 'pending',
        checkout_id: null,
        payment_id: null,
        metadata: { invoice_id: newInvoice.id, source: 'invoice' },
      } as any);

      await supabase.from('quotations').update({ converted_to_invoice: true }).eq('id', quotation.id);

      toast.success(`Converted to invoice ${invoiceNumber}`);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
    } catch (error) {
      toast.error('Failed to convert quotation');
    }
  };

  const viewQuotationDetails = async (quotation: Quotation) => {
    setViewingQuotation(quotation);
    const { data: lineItems } = await supabase.from('quotation_line_items').select('*').eq('quotation_id', quotation.id).order('sort_order');
    setViewLineItems(lineItems || []);
  };

  const openSendDialog = (q: Quotation) => {
    setSendingQuotation(q);
    setSendRecipient(q.clients?.email || "");
  };

  const handleSendQuotation = async () => {
    if (!sendingQuotation) return;
    if (!sendRecipient.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sendRecipient.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsSending(true);
    try {
      const { data: lineItems } = await supabase.from('quotation_line_items').select('*').eq('quotation_id', sendingQuotation.id).order('sort_order');
      const items = (lineItems || []).map((li: any) => ({
        name: li.product_name,
        description: li.description,
        quantity: Number(li.quantity),
        price: Number(li.unit_price),
        total: Number(li.total_price),
      }));

      let pdfBase64: string | undefined;
      try {
        const blob = await pdf(
          <QuotationPDF
            quotation={{ ...sendingQuotation, client: sendingQuotation.clients || undefined, business_profile: sendingQuotation.business_profiles || undefined }}
            items={items as any}
          />
        ).toBlob();
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        pdfBase64 = btoa(binary);
      } catch (e) {
        console.error("PDF generation failed, sending without attachment:", e);
      }

      const { data, error } = await supabase.functions.invoke("send-quotation-email", {
        body: { quotationId: sendingQuotation.id, recipient: sendRecipient.trim(), pdfBase64 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success(`Quotation emailed to ${sendRecipient.trim()}`);
      setSendingQuotation(null);
      refetch();
    } catch (e: any) {
      toast.error(`Failed to send: ${e?.message || "Unknown error"}`);
    } finally {
      setIsSending(false);
    }
  };

  const totalAmount = filteredQuotations.reduce((sum, q) => sum + Number(q.total_amount), 0);
  const acceptedAmount = filteredQuotations.filter(q => q.status === 'accepted').reduce((sum, q) => sum + Number(q.total_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Quotations</h2>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Create Quotation</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center">
          {isLoading ? <Skeleton className="h-8 w-16 mx-auto mb-2" /> : <div className="text-2xl font-bold text-primary">{filteredQuotations.length}</div>}
          <div className="text-sm text-muted-foreground">Total Quotations</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-foreground">R{totalAmount.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total Amount</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-accent">R{acceptedAmount.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Accepted</div>
        </CardContent></Card>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search quotations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote #</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : filteredQuotations.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No quotations found</TableCell></TableRow>
            ) : filteredQuotations.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-medium">{q.quotation_number}</TableCell>
                <TableCell>{q.clients?.name || '—'}</TableCell>
                <TableCell>R{Number(q.total_amount).toLocaleString()}</TableCell>
                <TableCell><Badge className={getStatusColor(q.status)}>{q.status}</Badge></TableCell>
                <TableCell className="text-sm">{new Date(q.issue_date).toLocaleDateString()}</TableCell>
                <TableCell className="text-sm">{q.expiry_date ? new Date(q.expiry_date).toLocaleDateString() : '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => viewQuotationDetails(q)} title="View"><Eye className="w-3 h-3" /></Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openSendDialog(q)}
                      title="Send via email"
                      disabled={!q.business_profiles}
                    >
                      <Send className="w-3 h-3" />
                    </Button>
                    {!q.converted_to_invoice ? (
                      <Button variant="ghost" size="sm" onClick={() => convertToInvoice(q)} title="Convert to Invoice"><FileText className="w-3 h-3" /></Button>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">Converted</Badge>
                    )}
                    {q.business_profiles && (
                      <PDFDownloadLink
                        document={<QuotationPDF quotation={{ ...q, client: q.clients || undefined, business_profile: q.business_profiles || undefined }} items={[]} />}
                        fileName={`quotation-${q.quotation_number}.pdf`}
                      >
                        {({ loading }) => (
                          <Button variant="ghost" size="sm" disabled={loading} title="Download PDF"><Download className="w-3 h-3" /></Button>
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

      {/* Create Quotation Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Quotation</DialogTitle></DialogHeader>
          <div className="space-y-6">
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <div>
                <Label>Quotation Number *</Label>
                <Input value={newQuotation.quotation_number} onChange={(e) => setNewQuotation({...newQuotation, quotation_number: e.target.value})} />
              </div>
              <div>
                <Label>Client *</Label>
                <ClientSearchSelect clients={clients} selectedClientId={newQuotation.client_id} onClientSelect={(id) => setNewQuotation({...newQuotation, client_id: id})} onAddNewClient={() => setIsAddClientOpen(true)} />
              </div>
            </div>
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <div>
                <Label>Business Profile</Label>
                <Select value={newQuotation.business_profile_id} onValueChange={(v) => setNewQuotation({...newQuotation, business_profile_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Select profile" /></SelectTrigger>
                  <SelectContent>
                    {businessProfiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.business_name} {p.is_default && "(Default)"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Expiry Date</Label>
                <Input type="date" value={newQuotation.expiry_date} onChange={(e) => setNewQuotation({...newQuotation, expiry_date: e.target.value})} />
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
                queryClient.invalidateQueries({ queryKey: ['admin-products-for-quotation'] });
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
                    <input type="radio" id="qvat-add" name="qvat" checked={!isVatIncluded} onChange={() => setIsVatIncluded(false)} className="h-4 w-4" />
                    <Label htmlFor="qvat-add" className="text-sm font-normal">Add VAT (15%)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="qvat-inc" name="qvat" checked={isVatIncluded} onChange={() => setIsVatIncluded(true)} className="h-4 w-4" />
                    <Label htmlFor="qvat-inc" className="text-sm font-normal">No VAT</Label>
                  </div>
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={newQuotation.status} onValueChange={(v) => setNewQuotation({...newQuotation, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={addQuotation}>Create Quotation</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Quotation Dialog */}
      <Dialog open={!!viewingQuotation} onOpenChange={() => setViewingQuotation(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Quotation {viewingQuotation?.quotation_number}</DialogTitle></DialogHeader>
          {viewingQuotation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{viewingQuotation.clients?.name || '—'}</span></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge className={getStatusColor(viewingQuotation.status)}>{viewingQuotation.status}</Badge></div>
                <div><span className="text-muted-foreground">Issue Date:</span> {new Date(viewingQuotation.issue_date).toLocaleDateString()}</div>
                <div><span className="text-muted-foreground">Expiry:</span> {viewingQuotation.expiry_date ? new Date(viewingQuotation.expiry_date).toLocaleDateString() : '—'}</div>
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
                <div className="flex justify-between"><span>Subtotal:</span><span>R{Number(viewingQuotation.amount).toLocaleString()}</span></div>
                {viewingQuotation.tax_amount && Number(viewingQuotation.tax_amount) > 0 && (
                  <div className="flex justify-between"><span>Tax:</span><span>R{Number(viewingQuotation.tax_amount).toLocaleString()}</span></div>
                )}
                <div className="flex justify-between font-bold text-lg"><span>Total:</span><span>R{Number(viewingQuotation.total_amount).toLocaleString()}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ProductsDialog
        isOpen={isProductAddDialogOpen}
        onClose={() => { setIsProductAddDialogOpen(false); setProductPrefill(null); setDescriptionEditIndex(null); }}
        openInAddMode={true}
        onProductAdded={handleProductAdded}
        prefillData={productPrefill}
      />

      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Client Name *</Label><Input value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})} placeholder="Client name" /></div>
            <div><Label>Company</Label><Input value={newClient.company} onChange={(e) => setNewClient({...newClient, company: e.target.value})} placeholder="Company" /></div>
            <div><Label>Email</Label><Input type="email" value={newClient.email} onChange={(e) => setNewClient({...newClient, email: e.target.value})} placeholder="Email" /></div>
            <div><Label>Phone</Label><Input value={newClient.phone} onChange={(e) => setNewClient({...newClient, phone: e.target.value})} placeholder="Phone" /></div>
            <div><Label>VAT Number</Label><Input value={newClient.vat_number} onChange={(e) => setNewClient({...newClient, vat_number: e.target.value})} placeholder="VAT number" /></div>
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

export default Quotations;