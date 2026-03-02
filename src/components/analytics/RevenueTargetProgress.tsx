import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Target, TrendingUp } from "lucide-react";
import type { RevenueTarget } from "./RevenueTargetDialog";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const tooltipStyle = {
  backgroundColor: "hsl(210, 65%, 17%)",
  border: "none",
  borderRadius: "10px",
  padding: "10px 14px",
  color: "#fff",
  fontSize: "13px",
  boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
};

interface Props {
  targets: RevenueTarget[];
}

interface MonthlyRevenue {
  month: string;
  monthNum: number;
  year: number;
  actual: number;
  target: number;
}

const RevenueTargetProgress = ({ targets }: Props) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenue[]>([]);

  useEffect(() => {
    const fetchRevenue = async () => {
      const { data: payments } = await supabase
        .from("payments")
        .select("amount_cents, status, created_at")
        .eq("status", "completed");

      const revenueByMonth: Record<string, number> = {};
      (payments || []).forEach((p) => {
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        revenueByMonth[key] = (revenueByMonth[key] || 0) + p.amount_cents / 100;
      });

      // Build monthly chart data for the current year
      const currentYear = new Date().getFullYear();
      const monthlyTargets = targets.filter((t) => t.period_type === "monthly" && t.period_year === currentYear);
      const quarterlyTargets = targets.filter((t) => t.period_type === "quarterly" && t.period_year === currentYear);
      const yearlyTarget = targets.find((t) => t.period_type === "yearly" && t.period_year === currentYear);
      const yearlyMonthly = yearlyTarget ? yearlyTarget.target_amount_cents / 100 / 12 : 0;

      const data: MonthlyRevenue[] = MONTHS.map((m, i) => {
        const monthNum = i + 1;
        const mt = monthlyTargets.find((t) => t.period_month === monthNum);
        const qt = quarterlyTargets.find((t) => t.period_quarter === Math.ceil(monthNum / 3));
        const qtMonthly = qt ? qt.target_amount_cents / 100 / 3 : 0;

        // Priority: monthly > quarterly > yearly
        const targetVal = mt ? mt.target_amount_cents / 100 : qtMonthly > 0 ? qtMonthly : yearlyMonthly;

        return {
          month: m,
          monthNum,
          year: currentYear,
          actual: revenueByMonth[`${currentYear}-${monthNum}`] || 0,
          target: targetVal,
        };
      });

      setMonthlyData(data);
    };
    fetchRevenue();
  }, [targets]);

  if (targets.length === 0) return null;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed

  // Calculate summary stats
  const ytdActual = monthlyData.slice(0, currentMonth + 1).reduce((s, d) => s + d.actual, 0);
  const ytdTarget = monthlyData.slice(0, currentMonth + 1).reduce((s, d) => s + d.target, 0);
  const yearlyTarget = targets.find((t) => t.period_type === "yearly" && t.period_year === currentYear);
  const fullYearTarget = yearlyTarget ? yearlyTarget.target_amount_cents / 100 : monthlyData.reduce((s, d) => s + d.target, 0);
  const ytdPercent = ytdTarget > 0 ? Math.min(Math.round((ytdActual / ytdTarget) * 100), 200) : 0;
  const yearPercent = fullYearTarget > 0 ? Math.min(Math.round((ytdActual / fullYearTarget) * 100), 200) : 0;

  // Current quarter stats
  const currentQuarter = Math.ceil((currentMonth + 1) / 3);
  const qStart = (currentQuarter - 1) * 3;
  const qEnd = qStart + 3;
  const qActual = monthlyData.slice(qStart, Math.min(qEnd, currentMonth + 1)).reduce((s, d) => s + d.actual, 0);
  const qt = targets.find((t) => t.period_type === "quarterly" && t.period_year === currentYear && t.period_quarter === currentQuarter);
  const qTarget = qt ? qt.target_amount_cents / 100 : monthlyData.slice(qStart, qEnd).reduce((s, d) => s + d.target, 0);
  const qPercent = qTarget > 0 ? Math.min(Math.round((qActual / qTarget) * 100), 200) : 0;

  const progressCards = [
    { label: `YTD ${currentYear}`, actual: ytdActual, target: ytdTarget, percent: ytdPercent, color: "hsl(100, 52%, 47%)" },
    { label: `Q${currentQuarter} ${currentYear}`, actual: qActual, target: qTarget, percent: qPercent, color: "hsl(200, 65%, 50%)" },
    { label: `Full Year ${currentYear}`, actual: ytdActual, target: fullYearTarget, percent: yearPercent, color: "hsl(270, 55%, 55%)" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={tooltipStyle}>
        <p className="font-semibold mb-1">{label} {currentYear}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey}>
            {p.dataKey === "actual" ? "Revenue" : "Target"}: R{p.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Progress summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {progressCards.map((card) => (
          <Card key={card.label} className="border-0 shadow-md overflow-hidden">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                  backgroundColor: card.percent >= 100 ? "hsl(100, 52%, 90%)" : card.percent >= 70 ? "hsl(35, 85%, 90%)" : "hsl(0, 60%, 92%)",
                  color: card.percent >= 100 ? "hsl(100, 52%, 30%)" : card.percent >= 70 ? "hsl(35, 85%, 35%)" : "hsl(0, 60%, 40%)",
                }}>
                  {card.percent}%
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>R{card.actual.toLocaleString()}</span>
                  <span>R{card.target.toLocaleString()}</span>
                </div>
                <Progress value={Math.min(card.percent, 100)} className="h-2.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly actual vs target chart */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: "hsl(100, 52%, 47%)" }} />
            Revenue vs Target — {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyData} barGap={2}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(100, 52%, 47%)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="hsl(100, 52%, 47%)" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(210, 45%, 30%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(210, 45%, 30%)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 20%, 92%)" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(210, 15%, 45%)" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(210, 15%, 45%)" }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(210, 20%, 96%)" }} />
              <Bar dataKey="target" name="Target" fill="url(#targetGrad)" radius={[6, 6, 0, 0]} barSize={28} />
              <Bar dataKey="actual" name="Revenue" fill="url(#actualGrad)" radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(100, 52%, 47%)" }} />
              Actual Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(210, 45%, 30%)", opacity: 0.3 }} />
              Target
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueTargetProgress;
