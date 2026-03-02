import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts";
import { Users, CreditCard, UserX, TrendingUp } from "lucide-react";
import SalespersonPerformance from "@/components/analytics/SalespersonPerformance";
import DateRangeFilter, { DateRange } from "@/components/analytics/DateRangeFilter";
import RevenueTargetDialog, { RevenueTarget } from "@/components/analytics/RevenueTargetDialog";
import RevenueTargetProgress from "@/components/analytics/RevenueTargetProgress";

const PALETTE = {
  navy: "hsl(210, 65%, 17%)",
  navyLight: "hsl(210, 45%, 30%)",
  green: "hsl(100, 52%, 47%)",
  greenLight: "hsl(100, 52%, 60%)",
  blue: "hsl(200, 65%, 50%)",
  blueLight: "hsl(200, 65%, 65%)",
  violet: "hsl(270, 55%, 55%)",
  amber: "hsl(35, 85%, 55%)",
};

const PIE_COLORS = [PALETTE.green, PALETTE.blue, PALETTE.violet, PALETTE.amber, PALETTE.navyLight];

const customTooltipStyle = {
  backgroundColor: "hsl(210, 65%, 17%)",
  border: "none",
  borderRadius: "10px",
  padding: "10px 14px",
  color: "#fff",
  fontSize: "13px",
  boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
};

const Analytics = () => {
  const [targets, setTargets] = useState<RevenueTarget[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [chartData, setChartData] = useState<{ name: string; revenue: number; count: number }[]>([]);
  const [leadsByPackage, setLeadsByPackage] = useState<{ name: string; count: number }[]>([]);
  const [leadsBySource, setLeadsBySource] = useState<{ name: string; count: number }[]>([]);
  const [leadsByGeneratedBy, setLeadsByGeneratedBy] = useState<{ name: string; count: number }[]>([]);
  const [leadsByStage, setLeadsByStage] = useState<{ name: string; count: number; color: string }[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const fetchTargets = useCallback(async () => {
    const { data } = await supabase.from("revenue_targets").select("*").order("period_year").order("period_month");
    setTargets((data as RevenueTarget[]) || []);
  }, []);

  useEffect(() => { fetchTargets(); }, [fetchTargets]);

  useEffect(() => {
    const fromISO = dateRange.from?.toISOString();
    const toISO = dateRange.to ? new Date(dateRange.to.getTime() + 86400000 - 1).toISOString() : undefined;

    const fetchPayments = async () => {
      let query = supabase.from("payments").select("package_name, amount_cents, status, created_at");
      if (fromISO) query = query.gte("created_at", fromISO);
      if (toISO) query = query.lte("created_at", toISO);
      const { data: payments } = await query;
      const completed = (payments || []).filter((p) => p.status === "completed");

      const byPackage: Record<string, { revenue: number; count: number }> = {};
      let rev = 0;
      completed.forEach((p) => {
        if (!byPackage[p.package_name]) byPackage[p.package_name] = { revenue: 0, count: 0 };
        byPackage[p.package_name].revenue += p.amount_cents / 100;
        byPackage[p.package_name].count += 1;
        rev += p.amount_cents / 100;
      });
      setTotalRevenue(rev);
      setChartData(Object.entries(byPackage).map(([name, v]) => ({ name: name.split(" ").slice(0, 2).join(" "), ...v })));
    };

    const fetchLeads = async () => {
      let query = supabase.from("leads").select("package, source, stage_id, generated_by, created_at");
      if (fromISO) query = query.gte("created_at", fromISO);
      if (toISO) query = query.lte("created_at", toISO);
      const { data: leads } = await query;
      const { data: stages } = await supabase.from("pipeline_stages").select("id, name, color, position").order("position");
      if (!leads) return;
      setTotalLeads(leads.length);

      if (stages) {
        const stageMap: Record<string, { name: string; count: number; color: string }> = {};
        stages.forEach((s) => { stageMap[s.id] = { name: s.name, count: 0, color: s.color }; });
        leads.forEach((l) => { if (stageMap[l.stage_id]) stageMap[l.stage_id].count += 1; });
        setLeadsByStage(stages.map((s) => stageMap[s.id]));
      }

      const pkgMap: Record<string, number> = {};
      leads.forEach((l) => { const key = l.package || "Unassigned"; pkgMap[key] = (pkgMap[key] || 0) + 1; });
      setLeadsByPackage(Object.entries(pkgMap).map(([name, count]) => ({ name, count })));

      const srcMap: Record<string, number> = {};
      leads.forEach((l) => { const key = l.source || "Unknown"; srcMap[key] = (srcMap[key] || 0) + 1; });
      setLeadsBySource(Object.entries(srcMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));

      const genMap: Record<string, number> = {};
      leads.forEach((l) => { const key = (l as any).generated_by || "Not Set"; genMap[key] = (genMap[key] || 0) + 1; });
      setLeadsByGeneratedBy(Object.entries(genMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
    };

    fetchPayments();
    fetchLeads();
  }, [dateRange]);

  const paidConversions = chartData.reduce((s, d) => s + d.count, 0);
  const convertedLeads = leadsByStage.find((s) => s.name === "Purchase Completed")?.count || 0;
  const unassigned = leadsByPackage.find((p) => p.name === "Unassigned")?.count || 0;

  const statCards = [
    { label: "Total Leads", value: totalLeads, icon: Users, gradient: "from-[hsl(210,65%,17%)] to-[hsl(210,45%,30%)]" },
    { label: "Conversions", value: convertedLeads, icon: CreditCard, gradient: "from-[hsl(100,52%,42%)] to-[hsl(100,52%,55%)]" },
    { label: "Total Revenue", value: `R${totalRevenue.toLocaleString()}`, icon: TrendingUp, gradient: "from-[hsl(200,65%,45%)] to-[hsl(200,65%,60%)]" },
    { label: "Unassigned Leads", value: unassigned, icon: UserX, gradient: "from-[hsl(35,85%,50%)] to-[hsl(35,85%,62%)]" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
          <p className="text-sm text-muted-foreground mt-1">Track your sales pipeline and revenue performance</p>
        </div>
        <div className="flex items-center gap-2">
          <RevenueTargetDialog targets={targets} onRefresh={fetchTargets} />
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
      </div>

      {/* Revenue Target Progress */}
      <RevenueTargetProgress targets={targets} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="relative overflow-hidden border-0 shadow-md">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-[0.07]`} />
            <CardContent className="pt-5 pb-4 relative">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.gradient}`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-foreground tracking-tight">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline stage funnel */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {leadsByStage.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No stage data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={leadsByStage} barSize={40}>
                <defs>
                  {leadsByStage.map((entry, i) => (
                    <linearGradient key={i} id={`stageGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={entry.color} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={entry.color} stopOpacity={0.5} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 92%)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(210, 15%, 45%)" }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(210, 15%, 45%)" }} />
                <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: "hsl(210, 20%, 96%)" }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {leadsByStage.map((_, i) => (
                    <Cell key={i} fill={`url(#stageGrad-${i})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Two-col: Package distribution + Source breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Package Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsByPackage.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No leads yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <defs>
                    {leadsByPackage.map((_, i) => (
                      <linearGradient key={i} id={`pieGrad-${i}`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={PIE_COLORS[i % PIE_COLORS.length]} stopOpacity={1} />
                        <stop offset="100%" stopColor={PIE_COLORS[i % PIE_COLORS.length]} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={leadsByPackage}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={3}
                    cornerRadius={6}
                    label={({ name, count }) => `${name} (${count})`}
                    labelLine={{ stroke: "hsl(210, 15%, 70%)" }}
                  >
                    {leadsByPackage.map((_, i) => (
                      <Cell key={i} fill={`url(#pieGrad-${i})`} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={customTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsBySource.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No leads yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leadsBySource} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 92%)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(210, 15%, 45%)" }} />
                  <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(210, 15%, 45%)" }} />
                  <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: "hsl(210, 20%, 96%)" }} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} fill={PALETTE.blue}>
                    {leadsBySource.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two-col: Generated By + Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Lead Generation Channel</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsByGeneratedBy.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={leadsByGeneratedBy} layout="vertical" barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 92%)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(210, 15%, 45%)" }} />
                  <YAxis dataKey="name" type="category" width={130} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(210, 15%, 45%)" }} />
                  <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: "hsl(210, 20%, 96%)" }} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {leadsByGeneratedBy.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue by Package</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">No completed payments yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={PALETTE.green} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={PALETTE.green} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 92%)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(210, 15%, 45%)" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(210, 15%, 45%)" }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={customTooltipStyle} formatter={(value: number) => [`R${value.toLocaleString()}`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke={PALETTE.green} strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ fill: PALETTE.green, r: 5, strokeWidth: 2, stroke: "#fff" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Salesperson Performance */}
      <SalespersonPerformance
        dateFrom={dateRange.from?.toISOString()}
        dateTo={dateRange.to ? new Date(dateRange.to.getTime() + 86400000 - 1).toISOString() : undefined}
      />
    </div>
  );
};

export default Analytics;
