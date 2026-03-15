import React, { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, Users, Calendar, Filter,
  IndianRupee, UserCheck, UserMinus, Wallet, AlertTriangle,
  CheckCircle2, FileText, UserPlus, Target,
  BarChart3, Star, RefreshCw, FileDown, Zap, CalendarCheck
} from "lucide-react";
import { useMembers } from "@/hooks/useMembers";
import { useTrainers } from "@/hooks/useTrainers";
import { useAttendance } from "@/hooks/useAttendance";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { usePlans } from "@/hooks/usePlans";
import { isDemoGymMode } from "@/lib/demoMode";
import { useGymAccess } from "@/hooks/useGymAccess";
import FeatureLock from "@/components/FeatureLock";
import { getDemoGymProfile } from "@/lib/demoGymData";
import { formatCurrencyINR } from "@/lib/currency";
import { format, subDays, differenceInDays, differenceInMonths } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const fade = (d: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.35 } });
const formatInr = (value: number, options?: Intl.NumberFormatOptions) =>
  formatCurrencyINR(value, options);
const truncateText = (value: string, max = 14) => (value.length > max ? `${value.slice(0, max - 3)}...` : value);
const safeFormat = (value: string | null | undefined, fmt: string, fallback = "--") => {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : format(d, fmt);
};

type DistributionDatum = { name: string; value: number; color: string };
type DistributionItem = DistributionDatum & { percent: number };
type DistributionStats = { total: number; items: DistributionItem[] };
const MAX_REPORT_WINDOW_DAYS = 180;

const buildDistributionStats = (rows: DistributionDatum[]): DistributionStats => {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const items = rows.map((row) => ({
    ...row,
    percent: total > 0 ? Number(((row.value / total) * 100).toFixed(1)) : 0,
  }));
  return { total, items };
};

const clampDateWindow = (start: string, end: string) => {
  let normalizedStart = start;
  let normalizedEnd = end;

  if (normalizedStart > normalizedEnd) {
    [normalizedStart, normalizedEnd] = [normalizedEnd, normalizedStart];
  }

  const windowDays =
    Math.ceil((new Date(normalizedEnd).getTime() - new Date(normalizedStart).getTime()) / 86400000) + 1;

  if (windowDays > MAX_REPORT_WINDOW_DAYS) {
    normalizedStart = format(
      subDays(new Date(normalizedEnd), MAX_REPORT_WINDOW_DAYS - 1),
      "yyyy-MM-dd",
    );
  }

  return { start: normalizedStart, end: normalizedEnd };
};

const ChartTip = React.forwardRef<HTMLDivElement, any>(({ active, payload, label }, ref) => {
  if (!active || !payload?.length) return null;
  return (
    <div ref={ref} className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs font-bold" style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.name.toLowerCase().includes("revenue") ? formatInr(p.value) : p.value}
        </p>
      ))}
    </div>
  );
});

const DistributionTip = React.forwardRef<HTMLDivElement, any>(({ active, payload }, ref) => {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as DistributionItem | undefined;
  if (!point) return null;

  return (
    <div ref={ref} className="bg-card border border-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] font-semibold">{point.name}</p>
      <p className="text-[10px] text-muted-foreground">Count: {point.value}</p>
      <p className="text-[10px] text-muted-foreground">Share: {point.percent.toFixed(1)}%</p>
    </div>
  );
});

const ReportsPage = () => {
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode();
  const { access, isLoading: accessLoading } = useGymAccess();
  const { data: members = [] } = useMembers();
  const { data: trainers = [] } = useTrainers();
  const { data: attendanceRecords = [] } = useAttendance();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: plans = [] } = usePlans();
  const [gymName, setGymName] = useState("My Gym");

  if (accessLoading) {
    return (
      <DashboardLayout title="Reports" subtitle="Analytics, revenue insights & member financial statements">
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (access.isLocked) {
    return (
      <DashboardLayout title="Reports" subtitle="Analytics, revenue insights & member financial statements">
        <FeatureLock
          title="Plan Required"
          description="Your trial has ended. Choose a plan to unlock reports and continue using the platform."
        />
      </DashboardLayout>
    );
  }

  if (!access.features.reports_advanced) {
    return (
      <DashboardLayout title="Reports" subtitle="Analytics, revenue insights & member financial statements">
        <FeatureLock
          title="Reports Locked"
          description="Upgrade to Growth to unlock advanced reports, revenue analytics, and PDF exports."
        />
      </DashboardLayout>
    );
  }

  useEffect(() => {
    if (isDemoMode) {
      setGymName(getDemoGymProfile().name || "Demo Gym");
      return;
    }
    if (!gymId) return;
    supabase.from("gyms").select("name").eq("id", gymId).single().then(({ data }) => {
      if (data?.name) setGymName(data.name);
    });
  }, [gymId, isDemoMode]);

  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const applyDateWindow = (nextStart: string, nextEnd: string) => {
    if (!nextStart || !nextEnd) return;
    const clamped = clampDateWindow(nextStart, nextEnd);
    setStartDate(clamped.start);
    setEndDate(clamped.end);
  };

  // === Computed data ===
  const filteredSubs = useMemo(() => subscriptions.filter(s => {
    const d = s.created_at.slice(0, 10);
    return (d >= startDate && d <= endDate) && (planFilter === "all" || s.plan_name === planFilter) && (statusFilter === "all" || s.payment_status === statusFilter);
  }), [subscriptions, startDate, endDate, planFilter, statusFilter]);

  const filteredMembers = useMemo(() => members.filter(m => {
    const d = m.created_at.slice(0, 10);
    return d >= startDate && d <= endDate;
  }), [members, startDate, endDate]);

  const totalRevenue = useMemo(() => {
    const memRev = members.filter(m => m.payment_date && m.payment_date.slice(0, 10) >= startDate && m.payment_date.slice(0, 10) <= endDate).reduce((s, m) => s + (m.last_payment || 0), 0);
    const subRev = filteredSubs.reduce((s, sub) => s + (sub.amount_paid || 0), 0);
    return Math.max(memRev, subRev);
  }, [members, filteredSubs, startDate, endDate]);

  const renewals = useMemo(() => filteredSubs.filter(s => { const m = members.find(mm => mm.id === s.member_id); return m && m.created_at.slice(0, 10) < startDate; }).length, [filteredSubs, members, startDate]);

  const topPlan = useMemo(() => {
    const c: Record<string, number> = {};
    filteredSubs.forEach(s => { c[s.plan_name || "Unknown"] = (c[s.plan_name || "Unknown"] || 0) + 1; });
    const sorted = Object.entries(c).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "--";
  }, [filteredSubs]);

  const revenueGrowth = useMemo(() => {
    const days = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000));
    const ps = format(subDays(new Date(startDate), days), "yyyy-MM-dd");
    const pe = format(subDays(new Date(startDate), 1), "yyyy-MM-dd");
    const pr = members.filter(m => m.payment_date && m.payment_date.slice(0, 10) >= ps && m.payment_date.slice(0, 10) <= pe).reduce((s, m) => s + (m.last_payment || 0), 0);
    if (pr === 0 && totalRevenue > 0) return 100;
    if (pr === 0) return 0;
    return Math.round(((totalRevenue - pr) / pr) * 100);
  }, [totalRevenue, members, startDate, endDate]);

  const activeMembers = members.filter(m => m.status === "active").length;
  const expiredMembers = members.filter(m => m.status === "expired").length;
  const totalDue = members.reduce((s, m) => s + (m.due_amount || 0), 0);
  const paidMembers = members.filter(m => m.payment_status === "paid").length;
  const collectionRate = members.length > 0 ? ((paidMembers / members.length) * 100).toFixed(1) : "0";
  const overdueMembers = members.filter(m => m.payment_status === "overdue");
  const pendingMembers = members.filter(m => m.payment_status === "pending");
  const attentionMembers = [...overdueMembers, ...pendingMembers];

  const revenueTrendData = useMemo(() => {
    const days = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
    const max = Math.min(days, 60);
    return Array.from({ length: max }, (_, i) => {
      const date = subDays(new Date(endDate), max - 1 - i);
      const dayStr = format(date, "yyyy-MM-dd");
      const sa = subscriptions.filter(s => s.created_at.slice(0, 10) === dayStr).reduce((sum, s) => sum + (s.amount_paid || 0), 0);
      const ma = members.filter(m => m.payment_date && m.payment_date.slice(0, 10) === dayStr).reduce((sum, m) => sum + (m.last_payment || 0), 0);
      return { day: format(date, "dd MMM"), revenue: Math.max(sa, ma) };
    });
  }, [subscriptions, members, startDate, endDate]);

  const planWiseRevenue = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    filteredSubs.forEach(s => { const n = s.plan_name || "Unknown"; if (!map[n]) map[n] = { count: 0, revenue: 0 }; map[n].count++; map[n].revenue += s.amount_paid || 0; });
    members.filter(m => m.payment_date && m.payment_date.slice(0, 10) >= startDate && m.payment_date.slice(0, 10) <= endDate).forEach(m => {
      const n = m.plan_name || "Unknown"; if (!map[n]) map[n] = { count: 0, revenue: 0 };
      if (!filteredSubs.some(s => s.member_id === m.id && s.plan_name === m.plan_name)) { map[n].count++; map[n].revenue += m.last_payment || 0; }
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSubs, members, startDate, endDate]);

  const planPerformance = useMemo(() => plans.map(plan => {
    const enrolled = members.filter(m => m.plan_id === plan.id).length;
    const active = members.filter(m => m.plan_id === plan.id && m.status === "active").length;
    const expired = members.filter(m => m.plan_id === plan.id && m.status === "expired").length;
    const revenue = members.filter(m => m.plan_id === plan.id && m.payment_date).reduce((s, m) => s + (m.last_payment || 0), 0);
    const renewalCount = subscriptions.filter(s => s.plan_id === plan.id).length;
    return { name: plan.name, price: plan.price, enrolled, active, expired, revenue, renewalRate: enrolled > 0 ? Math.round((renewalCount / enrolled) * 100) : 0 };
  }).filter(p => p.enrolled > 0 || p.revenue > 0), [plans, members, subscriptions]);

  const statusPieData = [
    { name: "Active", value: activeMembers, color: "hsl(160 70% 45%)" },
    { name: "Expired", value: expiredMembers, color: "hsl(0 70% 55%)" },
    { name: "Frozen", value: members.filter(m => m.status === "frozen").length, color: "hsl(40 90% 55%)" },
    { name: "Trial", value: members.filter(m => m.status === "trial").length, color: "hsl(270 70% 60%)" },
  ].filter(s => s.value > 0);

  const paymentPieData = [
    { name: "Paid", value: paidMembers, color: "hsl(160 70% 45%)" },
    { name: "Pending", value: pendingMembers.length, color: "hsl(40 90% 55%)" },
    { name: "Overdue", value: overdueMembers.length, color: "hsl(0 70% 55%)" },
    { name: "Partial", value: members.filter(m => m.payment_status === "partial").length, color: "hsl(300 70% 60%)" },
  ].filter(s => s.value > 0);

  const statusDistribution = buildDistributionStats(statusPieData);
  const paymentDistribution = buildDistributionStats(paymentPieData);

  const attendanceChartData = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dayStr = format(date, "yyyy-MM-dd");
    return { day: format(date, "dd/MM"), checkins: attendanceRecords.filter(r => r.check_in.slice(0, 10) === dayStr).length };
  }), [attendanceRecords]);

  const planNames = [...new Set(members.map(m => m.plan_name).filter(Boolean))];

  // PDF
  const selectedMember = members.find(m => m.id === selectedMemberId);
  const memberSubs = useMemo(() => selectedMemberId ? subscriptions.filter(s => s.member_id === selectedMemberId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : [], [selectedMemberId, subscriptions]);
  const memberAttendance = useMemo(() => selectedMemberId ? attendanceRecords.filter(a => a.member_id === selectedMemberId) : [], [selectedMemberId, attendanceRecords]);

  const exportAnalyticsPDF = async () => {
    const reportData = {
      gymName,
      reportPeriod: `${safeFormat(startDate, "dd MMM yyyy")} -> ${safeFormat(endDate, "dd MMM yyyy")}`,
      totalMembers: members.length,
      totalRevenue,
      revenueGrowth,
      activeMembers,
      expiredMembers,
      newMembers: filteredMembers.length,
      renewals,
      collectionRate: `${collectionRate}%`,
      totalDue,
      topPlan,
      planPerformance,
      planWiseRevenue,
      statusDistribution: statusPieData.map(s => ({ name: s.name, value: s.value })),
      paymentDistribution: paymentPieData.map(s => ({ name: s.name, value: s.value })),
      attentionMembers: attentionMembers.map(m => ({
        name: m.name,
        plan: m.plan_name || "No plan",
        phone: m.phone || "--",
        paymentStatus: m.payment_status,
        dueAmount: m.due_amount,
        expiry: safeFormat(m.expiry_at, "dd MMM yyyy"),
      })),
      allMembers: members.map(m => ({
        name: m.name,
        email: m.email || "",
        phone: m.phone || "",
        plan: m.plan_name || "No plan",
        status: m.status,
        paymentStatus: m.payment_status,
        dueAmount: m.due_amount,
        lastPayment: m.last_payment || 0,
        joined: safeFormat(m.joined_at, "dd MMM yyyy"),
        expiry: safeFormat(m.expiry_at, "dd MMM yyyy"),
      })),
    };
    const { default: generateAnalyticsReport } = await import("@/utils/generateAnalyticsReport");
    generateAnalyticsReport(reportData);
  };

  const handleGeneratePDF = async () => {
    if (!selectedMember) return;
    const plan = plans.find(p => p.id === selectedMember.plan_id);
    const latestSub = memberSubs[0];
    
    // Deduplicate: if multiple subs exist for the same plan+month, use the one with highest amount_paid
    const deduped = memberSubs.reduce((acc, sub) => {
      const key = `${sub.plan_id || ""}_${safeFormat(sub.start_date, "yyyy-MM", "unknown")}`;
      const existing = acc.get(key);
      if (!existing || (sub.amount_paid || 0) > (existing.amount_paid || 0)) {
        acc.set(key, sub);
      }
      return acc;
    }, new Map<string, typeof memberSubs[0]>());
    const uniqueSubs = Array.from(deduped.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const totalPaid = uniqueSubs.reduce((s, sub) => s + (sub.amount_paid || 0), 0);
    const totalPending = Math.max(0, selectedMember.due_amount || 0);
    const monthsSinceJoin = Math.max(1, differenceInMonths(new Date(), new Date(selectedMember.joined_at)) || 1);
    const totalVisits = memberAttendance.length;
    const daysSinceJoin = Math.max(1, differenceInDays(new Date(), new Date(selectedMember.joined_at)));

    // Determine actual payment status per subscription
    const payments = uniqueSubs.map(s => {
      let status: string;
      if (s.amount_paid >= s.amount && s.amount > 0) {
        status = "Paid";
      } else if (s.amount_paid > 0 && s.amount_paid < s.amount) {
        status = "Partial";
      } else {
        status = "Pending";
      }
      return {
        month: safeFormat(s.start_date, "MMM yyyy"),
        invoice: `INV-${s.id.slice(0, 8).toUpperCase()}`,
        paidDate: s.amount_paid > 0 ? safeFormat(s.created_at, "dd MMM yyyy") : "--",
        amount: formatInr(
          s.amount_paid > 0 ? s.amount_paid : s.amount || 0,
          { minimumFractionDigits: 2, maximumFractionDigits: 2 },
        ),
        status,
      };
    });

    const data = {
      gymName,
      name: selectedMember.name, email: selectedMember.email || "--", phone: selectedMember.phone || "--",
      joinDate: safeFormat(selectedMember.joined_at, "dd MMM yyyy"),
      plan: plan?.name || selectedMember.plan_name || "No Plan",
      planPrice: formatInr(plan?.price || 0, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      subscriptionStart: latestSub ? safeFormat(latestSub.start_date, "dd MMM yyyy") : "--",
      subscriptionEnd: latestSub?.end_date ? safeFormat(latestSub.end_date, "dd MMM yyyy") : "--",
      status: selectedMember.status.charAt(0).toUpperCase() + selectedMember.status.slice(1),
      totalPaid: formatInr(totalPaid, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totalPending: formatInr(totalPending, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      lateFees: formatInr(0, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      payments,
      totalVisits, avgVisitsPerMonth: Math.round(totalVisits / monthsSinceJoin), consistency: ((totalVisits / daysSinceJoin) * 100).toFixed(2) + "%",
    };
    const { default: generateMemberPDF } = await import("@/utils/generateMemberPDF");
    generateMemberPDF(data);
  };

  // === KPI config ===
  const kpis = [
    { label: "Revenue", value: formatInr(totalRevenue), note: "Collected in selected dates", icon: IndianRupee, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
    { label: "New Members", value: filteredMembers.length.toString(), note: "Joined in selected dates", icon: UserPlus, color: "text-glow-cyan", bg: "bg-glow-cyan/10 border-glow-cyan/20" },
    { label: "Renewals", value: renewals.toString(), note: "Members who renewed", icon: RefreshCw, color: "text-glow-gold", bg: "bg-glow-gold/10 border-glow-gold/20" },
    { label: "Top Plan", value: truncateText(topPlan === "--" ? "No data" : topPlan, 16), note: "Most purchased plan", icon: Star, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
    { label: "Growth", value: `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth}%`, note: "Compared to previous period", icon: TrendingUp, color: revenueGrowth >= 0 ? "text-glow-green" : "text-destructive", bg: revenueGrowth >= 0 ? "bg-glow-green/10 border-glow-green/20" : "bg-destructive/10 border-destructive/20" },
  ];

  const secondaryKpis = [
    { label: "Active", value: activeMembers.toString(), icon: UserCheck, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
    { label: "Expired", value: expiredMembers.toString(), icon: UserMinus, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
    { label: "Collection", value: `${collectionRate}%`, icon: CheckCircle2, color: "text-glow-green", bg: "bg-glow-green/10 border-glow-green/20" },
    { label: "Total Due", value: formatInr(totalDue), icon: AlertTriangle, color: "text-glow-gold", bg: "bg-glow-gold/10 border-glow-gold/20" },
  ];

  return (
    <DashboardLayout title="Reports" subtitle="Analytics, revenue insights & member financial statements">
      <div className="space-y-4">

        {/* Top Bar: Export + Filters Toggle */}
        <motion.div {...fade(0)} className="flex items-center justify-between gap-2">
          <Button variant="glow" size="sm" className="gap-2 rounded-xl text-xs h-9 px-4" onClick={exportAnalyticsPDF}>
            <FileDown className="w-4 h-4" /> Export Report PDF
          </Button>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            className="gap-1.5 rounded-xl text-[11px] h-8"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-3.5 h-3.5" /> Filters
          </Button>
        </motion.div>

        {/* Collapsible Filters */}
        {showFilters && (
          <motion.div {...fade(0)} className="bg-card border border-border rounded-2xl p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-primary" /> Date Range
              </span>
              <span className="text-[9px] text-muted-foreground font-mono">{startDate} {"->"} {endDate}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={startDate} onChange={e => applyDateWindow(e.target.value, endDate)} className="h-8 text-[11px] bg-secondary/40 border-border rounded-xl" />
              <Input type="date" value={endDate} onChange={e => applyDateWindow(startDate, e.target.value)} className="h-8 text-[11px] bg-secondary/40 border-border rounded-xl" />
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="h-8 text-[11px] bg-secondary/40 border-border rounded-xl"><SelectValue placeholder="All plans" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All plans</SelectItem>{planNames.map(p => <SelectItem key={p} value={p!}>{p}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-[11px] bg-secondary/40 border-border rounded-xl"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="overdue">Overdue</SelectItem><SelectItem value="partial">Partial</SelectItem></SelectContent>
              </Select>
            </div>
            <p className="text-[9px] text-muted-foreground mt-2">
              Date window is capped at {MAX_REPORT_WINDOW_DAYS} days for report performance.
            </p>
          </motion.div>
        )}

        {/* Primary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {kpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              {...fade(0.05 + i * 0.03)}
              className="min-w-0 bg-card border border-border rounded-2xl p-3 sm:p-4"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${kpi.bg}`}>
                  <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
                </div>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">{kpi.label}</span>
              </div>
                <p className={`font-display text-lg sm:text-xl font-bold ${kpi.color} leading-tight truncate`}>{kpi.value}</p>
                {"note" in kpi && <p className="text-[9px] text-muted-foreground mt-1">{kpi.note}</p>}
            </motion.div>
          ))}
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {secondaryKpis.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              {...fade(0.15 + i * 0.03)}
              className="bg-card border border-border rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5"
            >
              <kpi.icon className={`w-4 h-4 ${kpi.color} flex-shrink-0`} />
              <div className="min-w-0">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                <p className={`font-display text-sm font-bold ${kpi.color} truncate`}>{kpi.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Revenue Trend */}
        <motion.div {...fade(0.2)} className="bg-card border border-border rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="font-display font-bold text-sm">Revenue Trend</h3>
          </div>
          <div className="h-40 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData}>
                <defs><linearGradient id="rg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(revenueTrendData.length / 6))} />
                <YAxis
                  tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    value >= 1000
                      ? `${formatInr(value / 1000, { maximumFractionDigits: 0 })}k`
                      : formatInr(value)
                  }
                  width={56}
                />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rg1)" strokeWidth={2} name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Plan Revenue + Pie Charts */}
        <div className="grid lg:grid-cols-2 gap-3">
          {/* Plan Revenue Bars */}
          <motion.div {...fade(0.25)} className="bg-card border border-border rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-primary" />
              <h3 className="font-display font-bold text-sm">Plan Revenue</h3>
            </div>
            {planWiseRevenue.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No revenue data</p>
            ) : (
              <div className="space-y-3.5">
                {planWiseRevenue.map((p, i) => {
                  const maxRev = planWiseRevenue[0]?.revenue || 1;
                  return (
                    <div key={p.name} className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold capitalize leading-tight truncate">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.count} member{p.count === 1 ? "" : "s"}</p>
                        </div>
                        <span className="font-display text-xs font-bold text-primary text-right whitespace-nowrap">{formatInr(p.revenue)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary/70 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(p.revenue / maxRev) * 100}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }} className="h-full rounded-full bg-primary" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Distribution Pies */}
          <motion.div {...fade(0.3)} className="bg-card border border-border rounded-2xl p-4 sm:p-5">
            <h3 className="font-display font-bold text-sm mb-3">Distribution</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {[
                {
                  title: "Member Status",
                  subtitle: "Active, expired, frozen, trial",
                  stats: statusDistribution,
                },
                {
                  title: "Payment Status",
                  subtitle: "Paid, pending, overdue, partial",
                  stats: paymentDistribution,
                },
              ].map(({ title, subtitle, stats }) => (
                <div key={title} className="rounded-xl border border-border/50 bg-secondary/20 p-3">
                  <div className="mb-2.5">
                    <p className="text-[11px] font-semibold">{title}</p>
                    <p className="text-[9px] text-muted-foreground">{subtitle}</p>
                  </div>

                  {stats.total === 0 ? (
                    <div className="h-36 rounded-lg border border-dashed border-border/60 bg-background/30 flex items-center justify-center">
                      <p className="text-[10px] text-muted-foreground">No distribution data</p>
                    </div>
                  ) : (
                    <>
                      <div className="relative h-32 sm:h-36 mb-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.items}
                              dataKey="value"
                              cx="50%"
                              cy="50%"
                              innerRadius={24}
                              outerRadius={42}
                              paddingAngle={3}
                              strokeWidth={0}
                            >
                              {stats.items.map((item) => (
                                <Cell key={`${title}-${item.name}`} fill={item.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<DistributionTip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Total</p>
                          <p className="font-display text-lg font-bold">{stats.total}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {stats.items.map((item) => (
                          <div key={`${title}-legend-${item.name}`} className="space-y-1">
                            <div className="flex items-center gap-2 text-[10px]">
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                              <span className="text-muted-foreground">{item.name}</span>
                              <span className="font-semibold ml-auto tabular-nums">{item.value}</span>
                              <span className="text-muted-foreground tabular-nums w-12 text-right">{item.percent.toFixed(1)}%</span>
                            </div>
                            <div className="h-1 rounded-full bg-secondary/60 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Plan Performance Table */}
        {planPerformance.length > 0 && (
          <motion.div {...fade(0.35)} className="bg-card border border-border rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-primary" />
              <h3 className="font-display font-bold text-sm">Plan Performance</h3>
            </div>
            {/* Mobile: stacked cards (no horizontal scroll) */}
            <div className="space-y-2.5 sm:hidden">
              {planPerformance.map((p) => (
                <div key={p.name} className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <p className="text-sm font-semibold capitalize leading-tight min-w-0 truncate">{p.name}</p>
                    <span className="text-[11px] font-mono font-semibold whitespace-nowrap">{formatInr(p.price)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border/50 bg-background/40 px-2.5 py-2">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Enrolled</p>
                      <p className="text-sm font-semibold">{p.enrolled}</p>
                    </div>
                    <div className="rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-2">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Active</p>
                      <p className="text-sm font-semibold text-primary">{p.active}</p>
                    </div>
                    <div className="rounded-lg border border-glow-cyan/30 bg-glow-cyan/10 px-2.5 py-2">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Revenue</p>
                      <p className="text-sm font-semibold text-glow-cyan">{formatInr(p.revenue)}</p>
                    </div>
                    <div className="rounded-lg border border-border/50 bg-background/40 px-2.5 py-2">
                      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Renewal</p>
                      <p className="text-sm font-semibold">{p.renewalRate}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/tablet: keep table */}
            <div className="hidden sm:block overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Plan", "Price", "Enrolled", "Active", "Revenue", "Renewal"].map(h => (
                      <th key={h} className="text-left text-[9px] text-muted-foreground font-medium pb-2 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {planPerformance.map(p => (
                    <tr key={p.name} className="border-b border-border/20 hover:bg-secondary/20 transition-colors">
                      <td className="py-2.5 text-[11px] font-medium capitalize">{p.name}</td>
                      <td className="py-2.5 text-[11px] font-mono">{formatInr(p.price)}</td>
                      <td className="py-2.5 text-[11px]">{p.enrolled}</td>
                      <td className="py-2.5 text-[11px] text-primary font-semibold">{p.active}</td>
                      <td className="py-2.5 text-[11px] font-mono font-semibold">{formatInr(p.revenue)}</td>
                      <td className="py-2.5 text-[11px]">{p.renewalRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Check-ins + Overdue - side by side */}
        <div className="grid lg:grid-cols-2 gap-3">
          <motion.div {...fade(0.4)} className="bg-card border border-border rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <CalendarCheck className="w-4 h-4 text-primary" />
              <h3 className="font-display font-bold text-sm">Daily Check-ins</h3>
              <span className="text-[9px] text-muted-foreground ml-auto">14 days</span>
            </div>
            <div className="h-36 sm:h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 7, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="checkins" fill="hsl(var(--glow-cyan))" radius={[4, 4, 0, 0]} name="Check-ins" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div {...fade(0.45)} className="bg-card border border-border rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-glow-gold" />
              <h3 className="font-display font-bold text-sm">Needs Attention</h3>
              <span className="text-[9px] text-muted-foreground ml-auto">{attentionMembers.length} members</span>
            </div>
            {attentionMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="w-8 h-8 text-primary/30 mb-2" />
                <p className="text-xs text-muted-foreground">All payments collected.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto scrollbar-hide">
                {attentionMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-xl border border-border/30 hover:bg-secondary/20 transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center text-[9px] font-bold text-destructive flex-shrink-0">
                      {m.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold truncate capitalize">{m.name}</p>
                      <p className="text-[9px] text-muted-foreground truncate">{m.plan_name || "No plan"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] font-mono font-bold text-destructive">{formatInr(m.due_amount)}</p>
                      <span className={`text-[8px] font-bold uppercase ${m.payment_status === "overdue" ? "text-destructive" : "text-glow-gold"}`}>{m.payment_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Trainers - compact row */}
        {trainers.length > 0 && (
          <motion.div {...fade(0.5)} className="bg-card border border-border rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-primary" />
              <h3 className="font-display font-bold text-sm">Trainers</h3>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {trainers.map(t => (
                <div key={t.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/30 hover:bg-secondary/20 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary flex-shrink-0">
                    {t.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate capitalize">{t.name}</p>
                    <p className="text-[9px] text-muted-foreground">{t.specialty || "General"} - {t.members_count} clients</p>
                  </div>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${t.status === "active" ? "bg-primary/10 text-primary" : "bg-glow-gold/10 text-glow-gold"}`}>{t.status}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* PDF Generator */}
        <motion.div {...fade(0.55)} className="bg-card border border-border rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm">Member Statement</h3>
              <p className="text-[9px] text-muted-foreground">Generate detailed PDF for any member</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="h-9 text-[11px] bg-secondary/40 border-border rounded-xl">
                  <SelectValue placeholder="Choose member..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="capitalize">{m.name}</span>
                      <span className="text-muted-foreground ml-1.5 text-[10px]">- {m.plan_name || "No plan"}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              className="gap-2 rounded-xl text-[11px] h-9 whitespace-nowrap"
              disabled={!selectedMemberId}
              onClick={handleGeneratePDF}
            >
              <FileDown className="w-3.5 h-3.5" /> Generate PDF
            </Button>
          </div>
        </motion.div>

      </div>
    </DashboardLayout>
  );
};

export default ReportsPage;

