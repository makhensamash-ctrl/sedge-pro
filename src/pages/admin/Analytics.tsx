import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["hsl(100, 52%, 47%)", "hsl(200, 65%, 50%)", "hsl(35, 85%, 55%)", "hsl(280, 55%, 55%)"];

const Analytics = () => {
  const [chartData, setChartData] = useState<{ name: string; revenue: number; count: number }[]>([]);
  const [leadsByPackage, setLeadsByPackage] = useState<{ name: string; count: number }[]>([]);
  const [leadsBySource, setLeadsBySource] = useState<{ name: string; count: number }[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);

  useEffect(() => {
    const fetchPayments = async () => {
      const { data: payments } = await supabase.from("payments").select("package_name, amount_cents, status");
      const completed = (payments || []).filter((p) => p.status === "completed");

      const byPackage: Record<string, { revenue: number; count: number }> = {};
      completed.forEach((p) => {
        if (!byPackage[p.package_name]) byPackage[p.package_name] = { revenue: 0, count: 0 };
        byPackage[p.package_name].revenue += p.amount_cents / 100;
        byPackage[p.package_name].count += 1;
      });

      setChartData(Object.entries(byPackage).map(([name, v]) => ({ name: name.split(" ").slice(0, 2).join(" "), ...v })));
    };

    const fetchLeads = async () => {
      const { data: leads } = await supabase.from("leads").select("package, source");
      if (!leads) return;
      setTotalLeads(leads.length);

      // By package
      const pkgMap: Record<string, number> = {};
      leads.forEach((l) => {
        const key = l.package || "Unassigned";
        pkgMap[key] = (pkgMap[key] || 0) + 1;
      });
      setLeadsByPackage(Object.entries(pkgMap).map(([name, count]) => ({ name, count })));

      // By source
      const srcMap: Record<string, number> = {};
      leads.forEach((l) => {
        const key = l.source || "Unknown";
        srcMap[key] = (srcMap[key] || 0) + 1;
      });
      setLeadsBySource(Object.entries(srcMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
    };

    fetchPayments();
    fetchLeads();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">Analytics</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Leads</p>
            <p className="text-3xl font-bold text-foreground">{totalLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Paid Conversions</p>
            <p className="text-3xl font-bold text-foreground">{chartData.reduce((s, d) => s + d.count, 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Unassigned Leads</p>
            <p className="text-3xl font-bold text-foreground">{leadsByPackage.find((p) => p.name === "Unassigned")?.count || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Leads by Package */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads by Package</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsByPackage.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No leads yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={leadsByPackage} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, count }) => `${name} (${count})`}>
                    {leadsByPackage.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Leads by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsBySource.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No leads yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leadsBySource} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={140} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(200, 65%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Package */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue by Package (Paid)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No completed payment data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`R${value.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(100, 52%, 47%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
