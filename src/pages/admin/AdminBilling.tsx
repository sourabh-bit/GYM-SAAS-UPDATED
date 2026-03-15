import SuperAdminLayout from "@/components/dashboard/SuperAdminLayout";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, CreditCard, AlertTriangle, ArrowUpRight, Check, X, Clock, Crown, Plus } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { useResolvePlanRequest } from "@/hooks/usePlatformPlans";
import { toast } from "sonner";
import { format } from "date-fns";
import { useMemo } from "react";
import { useAdminBaseData } from "@/hooks/useAdminData";
import { formatCurrencyINR, formatCurrencyINRCompact } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendTelemetryEvent } from "@/lib/telemetry";
import { Link } from "react-router-dom";

const statusColors: Record<string, string> = {
  paid: "text-emerald-400",
  pending: "text-amber-400",
  failed: "text-destructive",
  approved: "text-emerald-400",
  rejected: "text-destructive",
};

const palette = [
  "hsl(160 70% 45%)",
  "hsl(40 90% 55%)",
  "hsl(270 70% 60%)",
  "hsl(0 70% 55%)",
  "hsl(210 70% 55%)",
];

const AdminBilling = () => {
  const { data, isLoading } = useAdminBaseData();
  const resolveRequest = useResolvePlanRequest();
  const { user } = useAuth();

  const derived = useMemo(() => {
    const gyms = data?.gyms ?? [];
    const plans = data?.plans ?? [];
    const requests = data?.planRequests ?? [];

    const planById = plans.reduce<Record<string, { name: string; price: number; billing_cycle: string }>>((acc, p) => {
      acc[p.id] = { name: p.name, price: Number(p.price || 0), billing_cycle: p.billing_cycle };
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

    const gymsWithPlan = activeGyms.length || 1;
    const avgRevenue = mrr / gymsWithPlan;

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: format(d, "MMM"),
      };
    });

    const buckets = months.reduce<Record<string, { revenue: number; expenses: number }>>((acc, m) => {
      acc[m.key] = { revenue: 0, expenses: 0 };
      return acc;
    }, {});

    gyms.forEach((g) => {
      const d = new Date(g.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!buckets[key]) return;
      const plan = g.current_plan_id ? planById[g.current_plan_id] : null;
      const monthly = plan ? (plan.billing_cycle?.toLowerCase().includes("year") ? plan.price / 12 : plan.price) : 0;
      buckets[key].revenue += monthly;
    });

    const revenueHistory = months.map((m) => ({
      month: m.label,
      revenue: Math.round(buckets[m.key].revenue),
      expenses: Math.round(buckets[m.key].expenses),
    }));

    const planCounts = gyms.reduce<Record<string, number>>((acc, g) => {
      const key = g.current_plan_id ? planById[g.current_plan_id]?.name || "Unknown" : "Trial";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const planDistribution = Object.entries(planCounts).map(([name, value], idx) => ({
      name,
      value,
      color: palette[idx % palette.length],
    }));

    const recentTransactions = requests.slice(0, 10).map((req) => {
      const plan = planById[req.requested_plan_id];
      const amount = plan ? formatCurrencyINR(plan.price) : formatCurrencyINR(0);
      return {
        id: req.id,
        gym: req.gym_name || "Unknown Gym",
        amount,
        type: req.request_type || "request",
        status: req.status,
        date: format(new Date(req.created_at), "dd MMM yyyy"),
      };
    });

    return {
      planById,
      pendingRequests: requests.filter((r) => r.status === "pending"),
      revenueHistory,
      planDistribution,
      recentTransactions,
      mrr,
      arr: mrr * 12,
      avgRevenue,
    };
  }, [data]);

  const handleResolve = async (
    requestId: string,
    status: "approved" | "rejected",
    gymId: string,
    planId: string,
    gymName: string | null,
    ownerName: string | null,
  ) => {
    try {
      await resolveRequest.mutateAsync({ requestId, status, gymId, planId });
      const actor = data?.profiles?.find((p) => p.id === user?.id);
      const auditEntry = {
        actor_user_id: user?.id ?? null,
        actor_name: actor?.full_name || actor?.email || "Admin",
        action: `plan_request.${status}`,
        category: "billing",
        target_id: requestId,
        target_label: gymName || "Unknown Gym",
        detail: `${ownerName || "Owner"} ${status === "approved" ? "approved" : "rejected"} a plan request.`,
        severity: status === "rejected" ? "medium" : "low",
        metadata: { gym_id: gymId, plan_id: planId },
      };
      await supabase.from("admin_audit_logs").insert(auditEntry);
      void sendTelemetryEvent({ type: "admin_audit", payload: auditEntry });
      toast.success(`Request ${status}!`);
    } catch {
      toast.error("Failed to update request");
    }
  };

  return (
    <SuperAdminLayout title="Platform Billing" subtitle="Revenue, subscriptions, and financial overview">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Plans</p>
          <h2 className="font-display text-lg font-bold">Platform Plans</h2>
        </div>
        <Button asChild variant="outline" className="h-9 px-3 gap-2">
          <Link to="/admin/plans">
            <Plus className="w-4 h-4" /> Create Plan
          </Link>
        </Button>
      </div>

      {derived.pendingRequests.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-glow-gold/30 rounded-2xl p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-glow-gold/10 flex items-center justify-center">
              <Crown className="w-4.5 h-4.5 text-glow-gold" />
            </div>
            <div>
              <h3 className="font-display font-bold">Plan Requests</h3>
              <p className="text-[10px] text-muted-foreground">{derived.pendingRequests.length} pending request{derived.pendingRequests.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="space-y-2">
            {derived.pendingRequests.map((req) => {
              const plan = derived.planById[req.requested_plan_id];
              return (
                <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-semibold truncate">{req.gym_name || "Unknown Gym"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {req.owner_name || "Owner"} - {req.request_type} to <span className="text-primary font-medium">{plan?.name || "Plan"}</span>
                      {plan && <span className="ml-1">{formatCurrencyINR(plan.price)}/{plan.billing_cycle}</span>}
                    </p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                      <Clock className="w-3 h-3 inline mr-0.5" />
                      {format(new Date(req.created_at), "dd MMM yyyy, h:mm a")}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      className="h-8 rounded-lg text-[11px] gap-1"
                      onClick={() => handleResolve(req.id, "approved", req.gym_id, req.requested_plan_id, req.gym_name, req.owner_name)}
                      disabled={resolveRequest.isPending}
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg text-[11px] gap-1 text-destructive border-destructive/30"
                      onClick={() => handleResolve(req.id, "rejected", req.gym_id, req.requested_plan_id, req.gym_name, req.owner_name)}
                      disabled={resolveRequest.isPending}
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total MRR", value: formatCurrencyINRCompact(derived.mrr), icon: DollarSign, change: "" },
          { label: "ARR", value: formatCurrencyINRCompact(derived.arr), icon: TrendingUp, change: "" },
          { label: "Avg Revenue/Gym", value: formatCurrencyINRCompact(derived.avgRevenue), icon: CreditCard, change: "" },
          { label: "Failed Payments", value: "0", icon: AlertTriangle, change: "" },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card border border-border rounded-2xl p-4">
            <kpi.icon className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="text-xl font-display font-bold">{kpi.value}</p>
            {kpi.change && <p className="text-[10px] text-emerald-400 font-semibold mt-1">{kpi.change}</p>}
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 bg-card border border-border rounded-2xl p-4 sm:p-6">
          <h3 className="font-display font-bold mb-4">Revenue vs Expenses</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={derived.revenueHistory}>
                <defs>
                  <linearGradient id="billingRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="billingExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))" }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#billingRev)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" stroke="hsl(var(--destructive))" fill="url(#billingExp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card border border-border rounded-2xl p-4 sm:p-6">
          <h3 className="font-display font-bold mb-4">Plan Distribution</h3>
          {isLoading && <p className="text-xs text-muted-foreground">Loading plans...</p>}
          {!isLoading && derived.planDistribution.length === 0 && (
            <p className="text-xs text-muted-foreground">No active plans yet.</p>
          )}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={derived.planDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                  {derived.planDistribution.map((entry) => (<Cell key={entry.name} fill={entry.color} />))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {derived.planDistribution.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />{p.name}</div>
                <span className="font-semibold">{p.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-card border border-border rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold">Recent Transactions</h3>
          <button className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">View All <ArrowUpRight className="w-3 h-3" /></button>
        </div>
        {isLoading && <p className="text-xs text-muted-foreground">Loading transactions...</p>}
        {!isLoading && derived.recentTransactions.length === 0 && (
          <p className="text-xs text-muted-foreground">No transactions yet.</p>
        )}
        <div className="space-y-2">
          {derived.recentTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/20 transition-colors">
              <div>
                <p className="text-sm font-medium">{tx.gym}</p>
                <p className="text-[10px] text-muted-foreground">{tx.type.replace("_", " ")} - {tx.date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{tx.amount}</p>
                <p className={`text-[10px] font-semibold capitalize ${statusColors[tx.status] || "text-muted-foreground"}`}>{tx.status}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </SuperAdminLayout>
  );
};

export default AdminBilling;
