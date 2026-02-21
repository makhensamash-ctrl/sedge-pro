import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Payment {
  id: string;
  checkout_id: string | null;
  package_name: string;
  amount_cents: number;
  status: string;
  customer_email: string | null;
  created_at: string;
}

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

  useEffect(() => {
    supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPayments((data as Payment[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">Payments</h2>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : payments.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No payments yet</TableCell></TableRow>
            ) : payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="font-medium">{p.package_name}</TableCell>
                <TableCell className="text-sm">{p.customer_email || "—"}</TableCell>
                <TableCell>R{(p.amount_cents / 100).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge className={statusColor(p.status)}>{p.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Payments;
