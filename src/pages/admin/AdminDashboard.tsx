import SuperAdminLayout from "@/components/dashboard/SuperAdminLayout";
import { motion } from "framer-motion";
import { Building2, Users, DollarSign, Activity, TrendingUp, TrendingDown, AlertTriangle, ArrowUpRight } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo } from "react";
import { format } from "date-fns";
import { useAdminBaseData } from "@/hooks/useAdminData";
import { formatCurrencyINRCompact, formatCurrencyINR } from "@/lib/currency";

const AdminDashboard = () => {
  const { data, isLoading } = useAdminBaseData();

  const derived = useMemo(() => {
    const gyms = data?.gyms ?? [];
    const members = data?.members ?? [];
    const profiles = data?.profiles ?? [];
    const plans = data?.plans ?? [];
    const planRequests = data?.planRequests ?? [];

    const planById = plans.reduce<Record<string, { name: string; price: number; billing_cycle: string }>>((acc, p) => {
      acc[p.id] = { name: p.name, price: Number(p.price || 0), billing_cycle: p.billing_cycle };
      return acc;
    }, {});

    const membersByGym = members.reduce<Record<string, number>>((acc, m) => {
      acc[m.gym_id] = (acc[m.gym_id] || 0) + 1;
      return acc;
    }, {});

    const now = new Date();
    const activeGyms = gyms.filter((g) => g.current_plan_id && (!g.plan_expires_at || new Date(g.plan_expires_at) > now));
    const mrr = activeGyms.reduce((sum, g) => {
      const plan = g.current_plan_id ? planById[g.current_plan_id] : null;
      if (!plan) return sum;
      const monthly = plan.billing_cycle?.toLowerCase().includes("year") ? plan.price / 12 : plan.price;
      return sum + monthly;
    }, 0);

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: format(d, "MMM"),
      };
    });

    const buckets = months.reduce<Record<string, { revenue: number; gyms: number }>>((acc, m) => {
      acc[m.key] = { revenue: 0, gyms: 0 };
      return acc;
    }, {});

    gyms.forEach((g) => {
      const d = new Date(g.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!buckets[key]) return;
      const plan = g.current_plan_id ? planById[g.current_plan_id] : null;
      const monthly = plan ? (plan.billing_cycle?.toLowerCase().includes("year") ? plan.price / 12 : plan.price) : 0;
      buckets[key].revenue += monthly;
      buckets[key].gyms += 1;
    });

    const revenueData = months.map((m) => ({
      month: m.label,
      revenue: Math.round(buckets[m.key].revenue),
      gyms: buckets[m.key].gyms,
    }));

    const pendingRequests = planRequests.filter((r) => r.status === "pending");
    const recentGyms = gyms.filter((g) => {
      const createdAt = new Date(g.created_at);
      return now.getTime() - createdAt.getTime() < 24 * 60 * 60 * 1000;
    });

    const alerts = [
      ...(pendingRequests.length
        ? [{ id: "pending", type: "warning", message: `${pendingRequests.length} plan request(s) pending review`, time: "Just now" }]
        : []),
      ...(recentGyms.length
        ? [{ id: "new-gyms", type: "info", message: `${recentGyms.length} new gym signup(s) today`, time: "Today" }]
        : []),
    ];

    const topGyms = gyms
      .map((g) => {
        const count = membersByGym[g.id] || 0;
        const plan = g.current_plan_id ? planById[g.current_plan_id] : null;
        return {
          name: g.name,
          members: count,
          revenue: plan ? formatCurrencyINR(plan.price) : formatCurrencyINR(0),
          status: g.current_plan_id ? "active" : "trial",
        };
      })
      .sort((a, b) => b.members - a.members)
      .slice(0, 5);

    const kpis = [
      { label: "Total Gyms", value: gyms.length.toString(), change: "-", trend: "up", icon: Building2, color: "from-primary/20 to-primary/5" },
      { label: "Total Users", value: profiles.length.toString(), change: "-", trend: "up", icon: Users, color: "from-accent/20 to-accent/5" },
      { label: "MRR", value: formatCurrencyINRCompact(mrr), change: "-", trend: "up", icon: DollarSign, color: "from-emerald-500/20 to-emerald-500/5" },
      { label: "System Uptime", value: "N/A", change: "-", trend: "down", icon: Activity, color: "from-amber-500/20 to-amber-500/5" },
    ];

    return { revenueData, kpis, alerts, topGyms };
  }, [data]);

  return (
    <SuperAdminLayout title="Platform Overview" subtitle="Real-time platform metrics and alerts">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {derived.kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border rounded-2xl p-4 sm:p-5"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center mb-3`}>
              <kpi.icon className="w-5 h-5 text-foreground" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
            <p className="text-xl sm:text-2xl font-display font-bold mt-1">{kpi.value}</p>
            {kpi.change !== "-" && (
              <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${kpi.trend === "up" ? "text-emerald-400" : "text-amber-400"}`}>
                {kpi.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.change}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-card border border-border rounded-2xl p-4 sm:p-6"
        >
          <h3 className="font-display font-bold mb-4">Platform Revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={derived.revenueData}>
                <defs>
                  <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))" }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#adminRevGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-2xl p-4 sm:p-6"
        >
          <h3 className="font-display font-bold mb-4">System Alerts</h3>
          {isLoading && <p className="text-xs text-muted-foreground">Loading alerts...</p>}
          {!isLoading && derived.alerts.length === 0 && (
            <p className="text-xs text-muted-foreground">No alerts right now.</p>
          )}
          <div className="space-y-3">
            {derived.alerts.map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30">
                <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  alert.type === "critical" ? "text-destructive" : alert.type === "warning" ? "text-amber-400" : "text-primary"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-tight">{alert.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-2xl p-4 sm:p-6"
        >
          <h3 className="font-display font-bold mb-4">Gym Growth</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={derived.revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))" }} />
                <Bar dataKey="gyms" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-card border border-border rounded-2xl p-4 sm:p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold">Top Gyms</h3>
            <button className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">View All <ArrowUpRight className="w-3 h-3" /></button>
          </div>
          {isLoading && <p className="text-xs text-muted-foreground">Loading gyms...</p>}
          {!isLoading && derived.topGyms.length === 0 && (
            <p className="text-xs text-muted-foreground">No gyms yet.</p>
          )}
          <div className="space-y-3">
            {derived.topGyms.map((gym, i) => (
              <div key={gym.name} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/30 transition-colors">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{gym.name}</p>
                  <p className="text-[10px] text-muted-foreground">{gym.members} members</p>
                </div>
                <span className="text-sm font-semibold text-accent">{gym.revenue}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminDashboard;
