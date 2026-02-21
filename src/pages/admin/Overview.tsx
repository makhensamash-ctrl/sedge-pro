import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Users, TrendingUp, DollarSign } from "lucide-react";

const Overview = () => {
  const [stats, setStats] = useState({ totalPayments: 0, totalRevenue: 0, totalUsers: 0, completedPayments: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [paymentsRes, profilesRes] = await Promise.all([
        supabase.from("payments").select("amount_cents, status"),
        supabase.from("profiles").select("id"),
      ]);

      const payments = paymentsRes.data || [];
      const completed = payments.filter((p) => p.status === "completed");
      setStats({
        totalPayments: payments.length,
        completedPayments: completed.length,
        totalRevenue: completed.reduce((sum, p) => sum + p.amount_cents, 0),
        totalUsers: profilesRes.data?.length || 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { title: "Total Revenue", value: `R${(stats.totalRevenue / 100).toLocaleString()}`, icon: DollarSign, color: "text-accent" },
    { title: "Total Payments", value: stats.totalPayments, icon: CreditCard, color: "text-primary" },
    { title: "Completed", value: stats.completedPayments, icon: TrendingUp, color: "text-accent" },
    { title: "Admin Users", value: stats.totalUsers, icon: Users, color: "text-primary" },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">Dashboard Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Overview;
