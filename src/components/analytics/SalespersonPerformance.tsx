import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Trophy } from "lucide-react";

const COLORS = [
  "hsl(100, 52%, 47%)",
  "hsl(200, 65%, 50%)",
  "hsl(270, 55%, 55%)",
  "hsl(35, 85%, 55%)",
  "hsl(210, 45%, 30%)",
];

const tooltipStyle = {
  backgroundColor: "hsl(210, 65%, 17%)",
  border: "none",
  borderRadius: "10px",
  padding: "10px 14px",
  color: "#fff",
  fontSize: "13px",
  boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
};

interface SalespersonStat {
  id: string;
  name: string;
  totalLeads: number;
  convertedLeads: number;
  revenue: number;
}

const SalespersonPerformance = () => {
  const [stats, setStats] = useState<SalespersonStat[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data: salespersons } = await supabase.from("salespersons").select("id, name");
      if (!salespersons || salespersons.length === 0) return;

      const { data: leads } = await supabase.from("leads").select("id, salesperson_id, client_name, email");
      const { data: payments } = await supabase.from("payments").select("customer_email, amount_cents, status");

      const completedPayments = (payments || []).filter((p) => p.status === "completed");
      // Build email -> revenue map
      const emailRevenue: Record<string, number> = {};
      completedPayments.forEach((p) => {
        if (p.customer_email) {
          emailRevenue[p.customer_email.toLowerCase()] = (emailRevenue[p.customer_email.toLowerCase()] || 0) + p.amount_cents / 100;
        }
      });

      const result: SalespersonStat[] = salespersons.map((sp) => {
        const spLeads = (leads || []).filter((l) => l.salesperson_id === sp.id);
        let revenue = 0;
        let converted = 0;
        spLeads.forEach((l) => {
          if (l.email && emailRevenue[l.email.toLowerCase()]) {
            revenue += emailRevenue[l.email.toLowerCase()];
            converted += 1;
          }
        });
        return { id: sp.id, name: sp.name, totalLeads: spLeads.length, convertedLeads: converted, revenue };
      });

      result.sort((a, b) => b.totalLeads - a.totalLeads);
      setStats(result);
    };
    fetch();
  }, []);

  if (stats.length === 0) return null;

  const chartData = stats.map((s) => ({ name: s.name.split(" ")[0], leads: s.totalLeads, revenue: s.revenue }));

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Salesperson Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salesperson</TableHead>
                <TableHead className="text-right">Leads</TableHead>
                <TableHead className="text-right">Conversions</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Conv. Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    {i === 0 && s.totalLeads > 0 && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
                    {s.name}
                  </TableCell>
                  <TableCell className="text-right">{s.totalLeads}</TableCell>
                  <TableCell className="text-right">{s.convertedLeads}</TableCell>
                  <TableCell className="text-right">R{s.revenue.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {s.totalLeads > 0 ? `${Math.round((s.convertedLeads / s.totalLeads) * 100)}%` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Leads by Salesperson</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 92%)" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(210, 15%, 45%)" }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(210, 15%, 45%)" }} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(210, 20%, 96%)" }} />
              <Bar dataKey="leads" radius={[8, 8, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalespersonPerformance;
