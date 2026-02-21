import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const Analytics = () => {
  const [chartData, setChartData] = useState<{ name: string; revenue: number; count: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
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
    fetch();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">Analytics</h2>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue by Package</CardTitle>
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
