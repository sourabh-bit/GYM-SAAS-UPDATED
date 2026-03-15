import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, CreditCard, CalendarCheck, UserPlus, Wallet, Activity,
  CheckCircle2, AlertTriangle, Flame, ChevronRight, Percent, Clock, Trophy, Timer, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useMembers } from "@/hooks/useMembers";
import { useAttendance, getAttendanceMemberName } from "@/hooks/useAttendance";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { usePlans } from "@/hooks/usePlans";
import { useLocation, useNavigate } from "react-router-dom";
import { format, subDays } from "date-fns";
import { getOwnerPathForCurrentMode } from "@/lib/demoMode";
import { formatCurrencyINR, formatCurrencyINRCompact } from "@/lib/currency";
import { useGymAccess } from "@/hooks/useGymAccess";
import FeatureLock from "@/components/FeatureLock";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";

const DashboardHome = () => {
  const { access, isLoading: accessLoading } = useGymAccess();
  const canCollectPayments = access.features.payments_collect;
  const { user } = useAuth();
  const { data: members = [] } = useMembers();
  const { data: attendanceRecords = [] } = useAttendance();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: plans = [] } = usePlans();
  const navigate = useNavigate();
  const location = useLocation();
  const toOwnerPath = (path: string) =>
    getOwnerPathForCurrentMode(path, location.pathname, location.search);

  const today = new Date().toISOString().slice(0, 10);
  const todayCheckins = attendanceRecords.filter(r => r.check_in.slice(0, 10) === today).length;

  const fullName = user?.user_metadata?.full_name || "Owner";
  const firstName = fullName.split(" ")[0] || fullName;
  const gymLabel = user?.user_metadata?.gym_name || "Your Gym";
  const activeMembers = members.filter(m => m.status === "active").length;
  // Use subscriptions as source of truth and keep revenue available after member deletion.
  const totalRevenue = subscriptions
    .filter(s => s.created_at.slice(0, 7) === format(new Date(), "yyyy-MM"))
    .reduce((sum, s) => sum + (s.amount_paid || 0), 0);

  // Retention: members who checked in last 30 days / active
  const retention = (() => {
    if (activeMembers === 0) return "0%";
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
    const checkedIn = new Set(attendanceRecords.filter(a => a.check_in >= thirtyDaysAgo).map(a => a.member_id));
    return `${Math.round((checkedIn.size / activeMembers) * 100)}%`;
  })();

  // Peak hour (last 7 days)
  const peakHour = (() => {
    const sevenDaysAgo = subDays(new Date(), 6);
    const recentLogs = attendanceRecords.filter(r => new Date(r.check_in) >= sevenDaysAgo);
    if (recentLogs.length === 0) return "--";
    const hourCounts: Record<number, number> = {};
    recentLogs.forEach(a => { const h = new Date(a.check_in).getHours(); hourCounts[h] = (hourCounts[h] || 0) + 1; });
    const max = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (!max) return "--";
    const h = Number(max[0]);
    const p = h < 12 ? "AM" : "PM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}-${h12 + 2 > 12 ? h12 + 2 - 12 : h12 + 2} ${p}`;
  })();

  // Revenue and growth chart data for the last 12 months.
  // Combine subscription amounts + member payment records
  const revenueGrowthData = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    const monthStr = format(date, "yyyy-MM");
    const monthLabel = format(date, "MMM");
    // Revenue from subscriptions
    const subRev = subscriptions
      .filter(s => s.created_at.slice(0, 7) === monthStr)
      .reduce((sum, s) => sum + (s.amount_paid || 0), 0);
    // Revenue from member payments (payment_date)
    const memRev = members
      .filter(m => m.payment_date && m.payment_date.slice(0, 7) === monthStr)
      .reduce((sum, m) => sum + (m.last_payment || 0), 0);
    const rev = Math.max(subRev, memRev); // Use whichever is higher to avoid double-counting
    const memCount = members.filter(m => m.created_at.slice(0, 7) <= monthStr).length;
    return { month: monthLabel, revenue: rev, members: memCount };
  });

  // Plan distribution (active members by plan_id)
  const planNameById = new Map(plans.map((plan) => [plan.id, plan.name]));
  const planMap: Record<string, number> = {};
  members
    .filter((m) => m.plan_id && m.status === "active")
    .forEach((m) => {
      const name = planNameById.get(m.plan_id!) || m.plan_name || "Unknown Plan";
      planMap[name] = (planMap[name] || 0) + 1;
    });
  const planColors = [
    "hsl(170 70% 45%)",
    "hsl(40 90% 55%)",
    "hsl(270 70% 60%)",
    "hsl(0 70% 55%)",
    "hsl(120 50% 45%)",
    "hsl(200 70% 45%)",
  ];
  const planDistribution = Object.entries(planMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count], i) => ({
      name,
      value: count,
      count,
      color: planColors[i % planColors.length],
    }));

  // Weekly attendance chart
  const weeklyAttendance = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStr = format(date, "yyyy-MM-dd");
    const count = attendanceRecords.filter(a => a.check_in.slice(0, 10) === dayStr).length;
    return { day: format(date, "EEE"), checkins: count };
  });

  // Recent activity feed.
  const recentActivity = (() => {
    const activities: { icon: any; text: string; time: string; color: string; timestamp: number; path: string }[] = [];

    // Recent member joins
    members.slice(0, 3).forEach(m => {
      activities.push({
        icon: UserPlus,
        text: `${m.name} joined ${m.plan_name || "the gym"}`,
        time: format(new Date(m.created_at), "dd MMM, h:mm a"),
        color: "bg-primary/8 text-primary border-primary/10",
        timestamp: new Date(m.created_at).getTime(),
        path: toOwnerPath("/dashboard/members"),
      });
    });

    // Recent check-ins
    attendanceRecords.slice(0, 3).forEach(a => {
      activities.push({
        icon: CheckCircle2,
        text: `${getAttendanceMemberName(a)} checked in`,
        time: format(new Date(a.check_in), "dd MMM, h:mm a"),
        color: "bg-glow-cyan/8 text-glow-cyan border-glow-cyan/10",
        timestamp: new Date(a.check_in).getTime(),
        path: toOwnerPath("/dashboard/attendance"),
      });
    });

    // Recent payments.
    subscriptions.slice(0, 3).forEach(s => {
      const member = members.find(m => m.id === s.member_id);
      const name = member?.name || s.member_name || "Deleted member";
      const isPaid = s.amount_paid > 0;
      const text = isPaid
        ? `${formatCurrencyINR(s.amount_paid)} received from ${name}`
        : `Payment pending from ${name} - ${formatCurrencyINR(s.amount)}`;
      activities.push({
        icon: Wallet,
        text,
        time: format(new Date(s.created_at), "dd MMM, h:mm a"),
        color: isPaid ? "bg-glow-gold/8 text-glow-gold border-glow-gold/10" : "bg-destructive/8 text-destructive border-destructive/10",
        timestamp: new Date(s.created_at).getTime(),
        path: toOwnerPath("/dashboard/subscriptions"),
      });
    });

    // Overdue members
    members.filter(m => m.payment_status === "overdue").slice(0, 2).forEach(m => {
      activities.push({
        icon: AlertTriangle,
        text: `${formatCurrencyINR(m.due_amount)} overdue from ${m.name}`,
        time: m.payment_date ? format(new Date(m.payment_date), "dd MMM, h:mm a") : "",
        color: "bg-destructive/8 text-destructive border-destructive/10",
        timestamp: m.payment_date ? new Date(m.payment_date).getTime() : new Date(m.created_at).getTime() - 1,
        path: toOwnerPath("/dashboard/members"),
      });
    });

    // Pending payment members
    members.filter(m => m.payment_status === "pending" && m.due_amount > 0).slice(0, 2).forEach(m => {
      activities.push({
        icon: Clock,
        text: `${formatCurrencyINR(m.due_amount)} pending from ${m.name}`,
        time: m.expiry_at ? `Due by ${format(new Date(m.expiry_at), "dd MMM yyyy")}` : "",
        color: "bg-glow-gold/8 text-glow-gold border-glow-gold/10",
        timestamp: new Date(m.created_at).getTime() - 2,
        path: toOwnerPath("/dashboard/members"),
      });
    });

    return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 6);
  })();

  const kpis = [
    { label: "Active Members", value: activeMembers.toString(), icon: Users, color: "text-primary", glow: "bg-primary/30", sub: "vs last month" },
    { label: "Monthly Revenue", value: formatCurrencyINRCompact(totalRevenue), icon: CreditCard, color: "text-glow-gold", glow: "bg-glow-gold/30" },
    { label: "Today's Check-ins", value: todayCheckins.toString(), icon: CalendarCheck, color: "text-glow-cyan", glow: "bg-glow-cyan/30", sub: peakHour !== "--" ? `Peak (7d): ${peakHour}` : "" },
    { label: "Retention Rate", value: retention, icon: Percent, color: "text-glow-green", glow: "bg-glow-green/30", sub: "30-day active" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-[10px] text-muted-foreground">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-xs font-bold" style={{ color: p.color }}>
              {p.name === "revenue" ? formatCurrencyINRCompact(p.value) : p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (accessLoading) {
    return (
      <DashboardLayout title="Dashboard" subtitle={`${gymLabel} overview`} hideHero>
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (access.isLocked) {
    return (
      <DashboardLayout title="Dashboard" subtitle={`${gymLabel} overview`} hideHero>
        <FeatureLock
          title="Plan Required"
          description="Your trial has ended. Choose a plan to unlock your dashboard and continue using the platform."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard" subtitle={`${gymLabel} overview`} hideHero>
      {/* Owner Hero */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-card border border-border rounded-2xl p-5 lg:p-8 mb-6 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-card via-card/95 to-primary/10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-glow-cyan/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[10px] lg:text-xs uppercase tracking-[0.3em] text-primary/70">Owner Home</p>
              <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold mt-2">
                Welcome back, {firstName} <span className="inline-block animate-wave">👋</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {gymLabel} overview for today.
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 text-primary px-4 py-1.5 text-xs lg:text-sm font-semibold">
              {gymLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary">
              {activeMembers} Active Members
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-glow-gold/25 bg-glow-gold/10 px-3 py-1.5 text-[11px] font-semibold text-glow-gold">
              {formatCurrencyINRCompact(totalRevenue)} This Month
            </span>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-4 mb-5">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileTap={{ scale: 0.97 }}
            className="relative bg-card border border-border rounded-2xl p-3.5 lg:p-5 hover:border-primary/20 transition-all group overflow-hidden"
          >
            <div className={`absolute -top-6 -right-6 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity ${kpi.glow}`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-9 h-9 rounded-xl bg-secondary/80 border border-border flex items-center justify-center">
                  <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </div>
              <p className={`font-display text-lg sm:text-xl lg:text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
              {kpi.sub && <p className="text-[9px] text-primary/60 font-medium mt-0.5">{kpi.sub}</p>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick actions - mobile */}
      <div className="lg:hidden mb-5">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {[
            { icon: UserPlus, label: "Add Member", color: "bg-primary/10 text-primary border-primary/15", path: toOwnerPath("/dashboard/members") },
            { icon: CalendarCheck, label: "Check-in", color: "bg-glow-cyan/10 text-glow-cyan border-glow-cyan/15", path: toOwnerPath("/dashboard/attendance") },
            ...(canCollectPayments ? [{ icon: Wallet, label: "Collect", color: "bg-glow-gold/10 text-glow-gold border-glow-gold/15", path: toOwnerPath("/dashboard/subscriptions") }] : []),
            { icon: Activity, label: "Report", color: "bg-glow-green/10 text-glow-green border-glow-green/15", path: toOwnerPath("/dashboard/reports") },
          ].map((a) => (
            <motion.button
              key={a.label}
              whileTap={{ scale: 0.93 }}
              onClick={() => navigate(a.path)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium whitespace-nowrap flex-shrink-0 ${a.color}`}
            >
              <a.icon className="w-3.5 h-3.5" />
              {a.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Revenue and growth - side by side on desktop */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4 mb-5">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative bg-card border border-border rounded-2xl p-4 sm:p-5 overflow-hidden group"
        >
          {/* Glow orb */}
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-primary/8 blur-3xl group-hover:bg-primary/15 transition-all duration-700 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold">Revenue</h3>
                  <p className="text-[9px] text-muted-foreground font-mono tracking-wide uppercase">Last 6 months</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-black text-primary tracking-tight">
                  {formatCurrencyINR(
                    revenueGrowthData.slice(-6).reduce((s, d) => s + d.revenue, 0),
                  )}
                </p>
                <p className="text-[9px] text-muted-foreground">total earned</p>
              </div>
            </div>
            <div className="h-48 sm:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueGrowthData.slice(-6)} barSize={24} barGap={8}>
                  <defs>
                    <linearGradient id="dashRevBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(195 85% 55%)" stopOpacity={1} />
                      <stop offset="50%" stopColor="hsl(195 85% 50%)" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="hsl(195 85% 40%)" stopOpacity={0.2} />
                    </linearGradient>
                    <filter id="barGlow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) =>
                      value >= 1000
                        ? formatCurrencyINR(value / 1000, { maximumFractionDigits: 0 }) + "k"
                        : formatCurrencyINR(value)
                    }
                    width={45}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--primary) / 0.05)", radius: 8 }} />
                  <Bar dataKey="revenue" fill="url(#dashRevBarGrad)" radius={[8, 8, 2, 2]} filter="url(#barGlow)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Member Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="relative bg-card border border-border rounded-2xl p-4 sm:p-5 overflow-hidden group"
        >
          {/* Glow orb */}
          <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-glow-gold/8 blur-3xl group-hover:bg-glow-gold/15 transition-all duration-700 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-glow-gold/10 border border-glow-gold/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-glow-gold" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold">Members</h3>
                  <p className="text-[9px] text-muted-foreground font-mono tracking-wide uppercase">Growth trend</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-xl font-black text-glow-gold tracking-tight">
                  {members.length}
                </p>
                <p className="text-[9px] text-muted-foreground">total members</p>
              </div>
            </div>
            <div className="h-48 sm:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueGrowthData.slice(-6)}>
                  <defs>
                    <linearGradient id="dashMemGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(42 85% 60%)" stopOpacity={0.35} />
                      <stop offset="60%" stopColor="hsl(42 85% 55%)" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="hsl(42 85% 50%)" stopOpacity={0} />
                    </linearGradient>
                    <filter id="lineGlow">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={25} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="members"
                    stroke="hsl(42 85% 60%)"
                    strokeWidth={2.5}
                    fill="url(#dashMemGrad2)"
                    filter="url(#lineGlow)"
                    dot={{ r: 4, fill: "hsl(var(--card))", stroke: "hsl(42 85% 60%)", strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: "hsl(42 85% 60%)", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Plan Distribution + Weekly Attendance */}
      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card border border-border rounded-2xl p-4 sm:p-5"
        >
          <h3 className="font-display text-sm font-semibold mb-3">Plan Distribution</h3>
          {planDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No members yet</p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={3} dataKey="value">
                      {planDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 flex-1">
                {planDistribution.map((p) => (
                  <div key={p.name} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      <span className="text-muted-foreground truncate">{p.name}</span>
                    </div>
                    <span className="font-bold font-display ml-2">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border border-border rounded-2xl p-4 sm:p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold">Weekly Attendance</h3>
            <span className="text-[9px] text-muted-foreground font-mono bg-secondary/50 px-2 py-0.5 rounded-full">This week</span>
          </div>
          <div className="h-28 sm:h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyAttendance}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="checkins" fill="hsl(195 85% 50%)" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-card border border-border rounded-2xl p-4 sm:p-5 mb-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-semibold">Recent Activity</h3>
          <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground h-7 px-2" onClick={() => navigate(toOwnerPath("/dashboard/reports"))}>
            View all <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.06 }}
                onClick={() => navigate(a.path)}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer"
              >
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${a.color}`}>
                  <a.icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate">{a.text}</p>
                  {a.time && <p className="text-[10px] text-muted-foreground">{a.time}</p>}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0" />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Members + Due Payments */}
      <div className="grid lg:grid-cols-2 gap-3 lg:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card border border-border rounded-2xl p-4 sm:p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm sm:text-base">Recent Members</h3>
            <Button variant="ghost" size="sm" className="text-[10px] text-primary gap-1 h-7 px-2" onClick={() => navigate(toOwnerPath("/dashboard/members"))}>
              <UserPlus className="w-3 h-3" /> View All
            </Button>
          </div>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No members yet. Add your first member!</p>
          ) : (
            <div className="space-y-2.5">
              {[...members]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5)
                .map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/20 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground flex-shrink-0">
                    {m.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate capitalize">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">{m.plan_name || "No plan"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      m.status === "active" ? "bg-primary/10 text-primary" : "bg-glow-gold/10 text-glow-gold"
                    }`}>{m.status}</span>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{format(new Date(m.created_at), "dd MMM")}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="bg-card border border-border rounded-2xl p-4 sm:p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm sm:text-base">Due Members</h3>
            {members.filter(m => m.due_amount > 0).length > 0 && (
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-glow-gold" />
                <span className="text-[10px] text-glow-gold font-bold">
                  {members.filter(m => m.due_amount > 0).length} pending
                </span>
              </div>
            )}
          </div>
          {members.filter(m => m.due_amount > 0).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No pending dues. All clear.</p>
          ) : (
            <div className="space-y-2.5">
              {members
                .filter(m => m.due_amount > 0)
                .sort((a, b) => b.due_amount - a.due_amount)
                .slice(0, 4)
                .map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + i * 0.05 }}
                  onClick={() => navigate(toOwnerPath("/dashboard/members"))}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate capitalize">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {m.email || m.phone || "No contact"} | Due by {m.expiry_at ? format(new Date(m.expiry_at), "MMM d, yyyy") : "--"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold font-display text-glow-gold">
                      {formatCurrencyINR(m.due_amount)}
                    </p>
                    <span className={`text-[9px] font-medium capitalize ${
                      m.payment_status === "overdue" ? "text-destructive" : "text-glow-gold"
                    }`}>{m.payment_status}</span>
                  </div>
                  {canCollectPayments && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] rounded-lg border-border ml-1 flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); navigate(toOwnerPath("/dashboard/members")); }}
                    >
                      Collect
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </DashboardLayout>
  );
};

export default DashboardHome;
