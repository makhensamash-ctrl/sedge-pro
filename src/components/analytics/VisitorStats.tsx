import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, Calendar, CalendarDays, CalendarRange } from "lucide-react";

interface Stats {
  today: { total: number; unique: number };
  week: { total: number; unique: number };
  month: { total: number; unique: number };
  allTime: number;
}

const VisitorStats = () => {
  const [stats, setStats] = useState<Stats>({
    today: { total: 0, unique: 0 },
    week: { total: 0, unique: 0 },
    month: { total: 0, unique: 0 },
    allTime: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfWeek = new Date(now.getTime() - 7 * 86400000).toISOString();
      const startOfMonth = new Date(now.getTime() - 30 * 86400000).toISOString();

      const { data, error } = await supabase
        .from("site_visits")
        .select("visitor_id, created_at")
        .gte("created_at", startOfMonth)
        .order("created_at", { ascending: false });

      const { count: allTime } = await supabase
        .from("site_visits")
        .select("*", { count: "exact", head: true });

      if (error || !data) {
        setLoading(false);
        return;
      }

      const calc = (since: string) => {
        const filtered = data.filter((v) => v.created_at >= since);
        return {
          total: filtered.length,
          unique: new Set(filtered.map((v) => v.visitor_id)).size,
        };
      };

      setStats({
        today: calc(startOfDay),
        week: calc(startOfWeek),
        month: calc(startOfMonth),
        allTime: allTime || 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  const cards = [
    { label: "Today", icon: Calendar, data: stats.today, gradient: "from-[hsl(100,52%,42%)] to-[hsl(100,52%,55%)]" },
    { label: "Last 7 Days", icon: CalendarDays, data: stats.week, gradient: "from-[hsl(200,65%,45%)] to-[hsl(200,65%,60%)]" },
    { label: "Last 30 Days", icon: CalendarRange, data: stats.month, gradient: "from-[hsl(270,55%,50%)] to-[hsl(270,55%,65%)]" },
    { label: "All Time Visits", icon: Eye, data: { total: stats.allTime, unique: 0 }, gradient: "from-[hsl(210,65%,17%)] to-[hsl(210,45%,30%)]", hideUnique: true },
  ];

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">Website Visitors</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.label} className="relative overflow-hidden rounded-xl border border-border/50 p-4">
              <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-[0.07]`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br ${c.gradient}`}>
                    <c.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-foreground tracking-tight">
                  {loading ? "—" : c.data.total.toLocaleString()}
                </p>
                {!c.hideUnique && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {loading ? "—" : `${c.data.unique.toLocaleString()} unique`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default VisitorStats;
