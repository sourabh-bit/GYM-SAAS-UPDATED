import React, { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, UserCheck, Clock, Users, Timer,
  LogIn, LogOut as LogOutIcon, CalendarCheck, Activity, Target,
  ChevronLeft, ChevronRight, Zap
} from "lucide-react";
import { useMembers } from "@/hooks/useMembers";
import { useAttendance, useActiveSessions, useCheckIn, useCheckOut, getAttendanceMemberName } from "@/hooks/useAttendance";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { useGymAccess } from "@/hooks/useGymAccess";
import FeatureLock from "@/components/FeatureLock";

const fade = (delay: number) => ({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay } });
const toLocalDateKey = (iso: string) => format(new Date(iso), "yyyy-MM-dd");
const toLocalMonthKey = (iso: string) => format(new Date(iso), "yyyy-MM");
const normalizeName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

const Card = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div {...fade(delay)} className={`bg-card border border-border rounded-2xl p-4 sm:p-5 ${className}`}>
    {children}
  </motion.div>
);

const SectionTitle = ({ title, icon: Icon, sub }: { title: string; icon?: React.ElementType; sub?: string }) => (
  <div className="flex items-center gap-2 mb-3">
    {Icon && <Icon className="w-4 h-4 text-primary" />}
    <div>
      <h3 className="font-display font-bold text-sm sm:text-base">{title}</h3>
      {sub && <p className="text-[9px] sm:text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

const CustomTooltip = React.forwardRef<HTMLDivElement, any>(({ active, payload, label }, ref) => {
  if (active && payload && payload.length) {
    return (
      <div ref={ref} className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-xs font-bold" style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
});

const AttendancePage = () => {
  const { access, isLoading: accessLoading } = useGymAccess();
  const [memberSearch, setMemberSearch] = useState("");
  const [pendingCheckInId, setPendingCheckInId] = useState<string | null>(null);
  const [pendingCheckOutId, setPendingCheckOutId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [activePage, setActivePage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [todayPage, setTodayPage] = useState(1);
  const pageSize = 10;

  const { data: members = [] } = useMembers();
  const { data: attendance = [], isLoading } = useAttendance();
  const { data: activeSessions = [] } = useActiveSessions();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  if (accessLoading) {
    return (
      <DashboardLayout title="Attendance" subtitle="Session-based attendance with live inside tracking and clean check-in flow.">
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (access.isLocked) {
    return (
      <DashboardLayout title="Attendance" subtitle="Session-based attendance with live inside tracking and clean check-in flow.">
        <FeatureLock
          title="Plan Required"
          description="Your trial has ended. Choose a plan to unlock attendance and continue using the platform."
        />
      </DashboardLayout>
    );
  }

  // === Derived Data ===
  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const today = new Date(nowTs);
  const todayStr = format(today, "yyyy-MM-dd");

  const todayLogs = useMemo(
    () => attendance.filter((a) => toLocalDateKey(a.check_in) === todayStr),
    [attendance, todayStr],
  );

  const memberIdsByName = useMemo(() => {
    const map = new Map<string, string[]>();
    members.forEach((member) => {
      const key = normalizeName(member.name);
      const existing = map.get(key);
      if (existing) {
        existing.push(member.id);
      } else {
        map.set(key, [member.id]);
      }
    });
    return map;
  }, [members]);

  const todayMemberIds = useMemo(() => {
    const ids = new Set<string>();
    todayLogs.forEach((record) => {
      if (record.member_id) {
        ids.add(record.member_id);
        return;
      }
      const fallbackId = memberIdsByName.get(normalizeName(getAttendanceMemberName(record)))?.[0];
      if (fallbackId) ids.add(fallbackId);
    });
    return ids;
  }, [memberIdsByName, todayLogs]);

  const activeMemberIds = useMemo(() => {
    const ids = new Set<string>();
    activeSessions.forEach((record) => {
      if (record.member_id) {
        ids.add(record.member_id);
        return;
      }
      const fallbackId = memberIdsByName.get(normalizeName(getAttendanceMemberName(record)))?.[0];
      if (fallbackId) ids.add(fallbackId);
    });
    return ids;
  }, [activeSessions, memberIdsByName]);

  const pendingMembers = useMemo(
    () =>
      members.filter(
        (m) => m.status === "active" && !todayMemberIds.has(m.id) && !activeMemberIds.has(m.id),
      ),
    [activeMemberIds, members, todayMemberIds],
  );

  const markedMembers = useMemo(
    () => members.filter((m) => todayMemberIds.has(m.id) || activeMemberIds.has(m.id)),
    [activeMemberIds, members, todayMemberIds],
  );

  const filteredSearch = useMemo(
    () =>
      memberSearch.length >= 1
        ? pendingMembers.filter((m) =>
            m.name.toLowerCase().includes(memberSearch.toLowerCase()),
          )
        : pendingMembers,
    [memberSearch, pendingMembers],
  );

  useEffect(() => {
    setPendingPage(1);
  }, [memberSearch]);

  const handleCheckIn = (memberId: string, memberName: string) => {
    setPendingCheckInId(memberId);
    checkIn.mutate(
      { memberId, memberName },
      {
        onSettled: () => setPendingCheckInId((prev) => (prev === memberId ? null : prev)),
      },
    );
    setMemberSearch("");
  };

  const handleCheckOut = (attendanceId: string) => {
    setPendingCheckOutId(attendanceId);
    checkOut.mutate(attendanceId, {
      onSettled: () => setPendingCheckOutId((prev) => (prev === attendanceId ? null : prev)),
    });
  };

  const getDuration = (checkInTime: string, checkOutTime?: string | null) => {
    const end = checkOutTime ? new Date(checkOutTime).getTime() : nowTs;
    const diff = end - new Date(checkInTime).getTime();
    const mins = Math.max(0, Math.floor(diff / 60000));
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  // Avg stay today
  const avgStay = useMemo(() => {
    if (todayLogs.length === 0) return "0m";
    const totalMins = todayLogs.reduce((sum, a) => {
      const end = a.check_out ? new Date(a.check_out).getTime() : nowTs;
      const diff = end - new Date(a.check_in).getTime();
      return sum + Math.max(0, Math.floor(diff / 60000));
    }, 0);
    const avg = Math.round(totalMins / todayLogs.length);
    if (avg < 60) return `${avg}m`;
    return `${Math.floor(avg / 60)}h ${avg % 60}m`;
  }, [nowTs, todayLogs]);

  // Peak hour (7-day)
  const peakHourInfo = useMemo(() => {
    const sevenDaysAgo = subDays(today, 6);
    const recentLogs = attendance.filter(a => new Date(a.check_in) >= sevenDaysAgo);
    if (recentLogs.length === 0) return { label: "N/A", count: 0 };
    const hourCounts: Record<number, number> = {};
    recentLogs.forEach(a => {
      const h = new Date(a.check_in).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    const max = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (!max) return { label: "N/A", count: 0 };
    const h = Number(max[0]);
    const p = h < 12 ? "am" : "pm";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return { label: `${h12} ${p}`, count: Number(max[1]) };
  }, [attendance]);

  // 30-day trend
  const trendData = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const date = subDays(today, 29 - i);
    const dayStr = format(date, "yyyy-MM-dd");
    const count = attendance.filter((a) => toLocalDateKey(a.check_in) === dayStr).length;
    return { day: format(date, "d MMM"), checkins: count };
  }), [attendance]);

  const totalLast30 = trendData.reduce((s, d) => s + d.checkins, 0);
  const avgPerDay = totalLast30 > 0 ? (totalLast30 / 30).toFixed(1) : "0";
  const bestDay = trendData.reduce((best, d) => d.checkins > best.checkins ? d : best, trendData[0]);

  const activeTotalPages = Math.max(1, Math.ceil(activeSessions.length / pageSize));
  const activeSessionsPage = activeSessions.slice((activePage - 1) * pageSize, activePage * pageSize);

  const pendingTotalPages = Math.max(1, Math.ceil(filteredSearch.length / pageSize));
  const pendingPageItems = filteredSearch.slice((pendingPage - 1) * pageSize, pendingPage * pageSize);

  const todayTotalPages = Math.max(1, Math.ceil(todayLogs.length / pageSize));
  const todayPageItems = todayLogs.slice((todayPage - 1) * pageSize, todayPage * pageSize);

  useEffect(() => {
    if (activePage > activeTotalPages) setActivePage(activeTotalPages);
  }, [activePage, activeTotalPages]);

  useEffect(() => {
    if (pendingPage > pendingTotalPages) setPendingPage(pendingTotalPages);
  }, [pendingPage, pendingTotalPages]);

  useEffect(() => {
    if (todayPage > todayTotalPages) setTodayPage(todayTotalPages);
  }, [todayPage, todayTotalPages]);




  // Calendar heatmap
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    return days.map(date => {
      const dayStr = format(date, "yyyy-MM-dd");
      const count = attendance.filter((a) => toLocalDateKey(a.check_in) === dayStr).length;
      return { date, dayStr, count, dayOfWeek: getDay(date) };
    });
  }, [attendance, calendarMonth]);

  const getHeatColor = (count: number) => {
    if (count === 0) return "bg-secondary/30";
    if (count <= 5) return "bg-primary/20";
    if (count <= 15) return "bg-primary/40";
    if (count <= 30) return "bg-primary/60";
    if (count <= 50) return "bg-primary/80";
    return "bg-primary";
  };

  // Calendar stats
  const calMonthLogs = useMemo(() => {
    const monthStr = format(calendarMonth, "yyyy-MM");
    return attendance.filter((a) => toLocalMonthKey(a.check_in) === monthStr);
  }, [attendance, calendarMonth]);
  const calTotalCheckins = calMonthLogs.length;
  const calMostActiveDay = useMemo(() => {
    const dayCounts: Record<string, number> = {};
    calMonthLogs.forEach(a => {
      const d = a.check_in.slice(0, 10);
      dayCounts[d] = (dayCounts[d] || 0) + 1;
    });
    const max = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
    return max ? `${format(new Date(max[0]), "d MMM")} (${max[1]})` : "--";
  }, [calMonthLogs]);
  const calAvgDaily = calMonthLogs.length > 0
    ? (calMonthLogs.length / eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) }).length).toFixed(1)
    : "0";

  // Week labels for calendar
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Group calendar days by week
  const calendarWeeks = useMemo(() => {
    const weeks: typeof calendarDays[] = [];
    let currentWeek: typeof calendarDays = [];
    // Pad start
    const firstDayOfWeek = calendarDays[0]?.dayOfWeek || 0;
    const mondayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    for (let i = 0; i < mondayOffset; i++) currentWeek.push(null as any);
    calendarDays.forEach(day => {
      const dow = day.dayOfWeek === 0 ? 6 : day.dayOfWeek - 1; // Mon=0
      if (dow === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });
    // Pad end
    while (currentWeek.length < 7) currentWeek.push(null as any);
    weeks.push(currentWeek);
    return weeks;
  }, [calendarDays]);

  return (
    <DashboardLayout title="Attendance" subtitle="Session-based attendance with live inside tracking and clean check-in flow.">
      <div className="space-y-4 sm:space-y-5">

        {/* === Live Status === */}
        <Card delay={0.05}>
          <SectionTitle title="Live Status" icon={Zap} />
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-4">
            {[
              { label: "Currently Inside", value: activeSessions.length.toString() },
              { label: "Peak Hour (7d)", value: peakHourInfo.label },
              { label: "Average Stay Today", value: avgStay },
            ].map((s, i) => (
              <div key={i} className="bg-secondary/30 rounded-xl p-2.5 sm:p-3 min-h-[86px] sm:min-h-[92px] flex flex-col justify-between">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight min-h-[24px] sm:min-h-[28px]">
                  {s.label}
                </p>
                <p className="font-display text-lg sm:text-2xl font-bold leading-none">{s.value}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">Members Currently Checked-in</p>
          {activeSessions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">No members are currently inside.</p>
          ) : (
            <div className="space-y-2">
              {activeSessionsPage.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04 }}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-border/50 hover:bg-secondary/10 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                    {getAttendanceMemberName(s).split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate capitalize">{getAttendanceMemberName(s)}</p>
                    <p className="text-[9px] text-muted-foreground">In since {format(new Date(s.check_in), "h:mm a")}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/15">
                    {getDuration(s.check_in)}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] text-muted-foreground px-2 gap-1"
                    onClick={() => handleCheckOut(s.id)}
                    disabled={pendingCheckOutId === s.id}>
                    <LogOutIcon className="w-3 h-3" /> Out
                  </Button>
                </motion.div>
              ))}
              {activeSessions.length > pageSize && (
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-muted-foreground">
                    Page {activePage} of {activeTotalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 rounded-lg text-[10px]"
                      onClick={() => setActivePage((prev) => Math.max(1, prev - 1))}
                      disabled={activePage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 rounded-lg text-[10px]"
                      onClick={() => setActivePage((prev) => Math.min(activeTotalPages, prev + 1))}
                      disabled={activePage >= activeTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* === Quick Check-in === */}
        <Card delay={0.1}>
          <SectionTitle title="Quick Check-in" icon={LogIn} />
          {/* Pending / Marked counters */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-destructive/10 border border-destructive/15 rounded-xl p-3">
              <p className="text-[9px] font-semibold text-destructive uppercase tracking-wider">Pending Today</p>
              <p className="font-display text-2xl font-bold text-destructive">{pendingMembers.length}</p>
            </div>
            <div className="bg-primary/10 border border-primary/15 rounded-xl p-3">
              <p className="text-[9px] font-semibold text-primary uppercase tracking-wider">Marked Today</p>
              <p className="font-display text-2xl font-bold text-primary">{markedMembers.length}</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="pl-10 h-10 bg-secondary/50 border-border rounded-xl"
            />
          </div>

          {/* Pending members list */}
          {filteredSearch.length > 0 && (
            <>
              <p className="text-[9px] font-semibold text-destructive uppercase tracking-wider mb-2">Pending Today</p>
              <div className="space-y-2">
                {pendingPageItems.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/50 hover:bg-secondary/10 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-[10px] font-bold text-destructive flex-shrink-0">
                      {m.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate capitalize">{m.name}</p>
                      <p className="text-[9px] text-muted-foreground">Not marked today</p>
                    </div>
                    <Button
                      size="sm"
                      className="h-7 text-[10px] gap-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                      onClick={() => handleCheckIn(m.id, m.name)}
                      disabled={pendingCheckInId === m.id}
                    >
                      <LogIn className="w-3 h-3" /> {pendingCheckInId === m.id ? "Checking..." : "Check-in"}
                    </Button>
                  </div>
                ))}
              </div>
              {filteredSearch.length > pageSize && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-[10px] text-muted-foreground">
                    Page {pendingPage} of {pendingTotalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 rounded-lg text-[10px]"
                      onClick={() => setPendingPage((prev) => Math.max(1, prev - 1))}
                      disabled={pendingPage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 rounded-lg text-[10px]"
                      onClick={() => setPendingPage((prev) => Math.min(pendingTotalPages, prev + 1))}
                      disabled={pendingPage >= pendingTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
          {members.length > 0 && filteredSearch.length === 0 && memberSearch.length > 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">No pending members match "{memberSearch}"</p>
          )}
        </Card>

        {/* === Today Summary === */}
        <Card delay={0.15}>
          <SectionTitle title="Today Summary" icon={CalendarCheck} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Unique Members", value: todayMemberIds.size.toString() },
              { label: "Total Sessions", value: todayLogs.length.toString() },
              { label: "Average Stay", value: avgStay },
              { label: "Busiest Hour", value: (() => {
                if (todayLogs.length === 0) return "N/A";
                const hc: Record<number, number> = {};
                todayLogs.forEach(a => { const h = new Date(a.check_in).getHours(); hc[h] = (hc[h] || 0) + 1; });
                const max = Object.entries(hc).sort((a, b) => b[1] - a[1])[0];
                if (!max) return "N/A";
                const h = Number(max[0]);
                return `${h === 0 ? 12 : h > 12 ? h - 12 : h} ${h < 12 ? "am" : "pm"}`;
              })() },
            ].map((s, i) => (
              <div key={i} className="bg-secondary/30 rounded-xl p-3">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground">{s.label}</p>
                <p className="font-display text-base sm:text-lg font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Today's sessions table */}
          {todayLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No sessions today yet.</p>
          ) : (
            <>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {["Member", "In Time", "Out Time", "Duration"].map(h => (
                        <th key={h} className="text-left text-[10px] text-muted-foreground font-medium pb-2 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {todayPageItems.map(log => (
                      <tr key={log.id} className="border-b border-border/30">
                        <td className="py-2.5 text-xs font-medium capitalize">{getAttendanceMemberName(log)}</td>
                        <td className="py-2.5 text-xs text-muted-foreground font-mono">{format(new Date(log.check_in), "h:mm a")}</td>
                        <td className="py-2.5 text-xs text-muted-foreground font-mono">
                          {log.check_out ? format(new Date(log.check_out), "h:mm a") : (
                            <span className="text-primary font-semibold">In gym</span>
                          )}
                        </td>
                        <td className="py-2.5 text-xs font-mono">{getDuration(log.check_in, log.check_out)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile sessions */}
              <div className="sm:hidden space-y-2">
                {todayPageItems.map(log => (
                  <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/50">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                      {getAttendanceMemberName(log).split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate capitalize">{getAttendanceMemberName(log)}</p>
                      <p className="text-[9px] text-muted-foreground">
                        {format(new Date(log.check_in), "h:mm a")}
                        {log.check_out ? ` - ${format(new Date(log.check_out), "h:mm a")}` : ""}
                      </p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                      !log.check_out ? "bg-primary/10 text-primary border border-primary/15" : "bg-secondary/50 text-muted-foreground"
                    }`}>
                      {!log.check_out ? "In gym" : getDuration(log.check_in, log.check_out)}
                    </span>
                  </div>
                ))}
              </div>
              {todayLogs.length > pageSize && (
                <div className="flex items-center justify-between pt-3">
                  <p className="text-[10px] text-muted-foreground">
                    Page {todayPage} of {todayTotalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 rounded-lg text-[10px]"
                      onClick={() => setTodayPage((prev) => Math.max(1, prev - 1))}
                      disabled={todayPage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 rounded-lg text-[10px]"
                      onClick={() => setTodayPage((prev) => Math.min(todayTotalPages, prev + 1))}
                      disabled={todayPage >= todayTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* === 30-Day Attendance Trend === */}
        <Card delay={0.2}>
          <SectionTitle title="30-Day Attendance Trend" icon={TrendingUpIcon} />
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-secondary/30 rounded-lg p-2">
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Total</p>
              <p className="font-display text-sm font-bold">{totalLast30}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-2">
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Avg / Day</p>
              <p className="font-display text-sm font-bold">{avgPerDay}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-2">
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Best Day</p>
              <p className="font-display text-sm font-bold truncate">{bestDay.day} ({bestDay.checkins})</p>
            </div>
          </div>
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="attTrendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval={5} />
                <YAxis tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} width={20} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="checkins" stroke="hsl(var(--primary))" fill="url(#attTrendGrad)" strokeWidth={2} name="Check-ins" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* === Calendar Heatmap === */}
        <Card delay={0.3}>
          <div className="flex items-center justify-between mb-4">
            <SectionTitle title="Attendance Overview" />
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCalendarMonth(m => subMonths(m, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-display font-bold min-w-[100px] text-center">
                {format(calendarMonth, "MMMM yyyy")}
              </span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setCalendarMonth(m => addMonths(m, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="overflow-x-hidden">
            <div className="min-w-0">
              {/* Header */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {weekDays.map(d => (
                  <div key={d} className={`text-center text-[9px] font-medium py-1 ${
                    d === "Sat" || d === "Sun" ? "text-primary" : "text-muted-foreground"
                  }`}>{d}</div>
                ))}
              </div>
              {/* Weeks */}
              {calendarWeeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1 mb-1">
                  {week.map((day, di) => (
                    <div key={di} className={`relative rounded-lg h-8 sm:h-10 flex items-center justify-center text-[10px] sm:text-xs font-medium transition-colors ${
                      day ? `${getHeatColor(day.count)} ${day.dayStr === todayStr ? "ring-1 ring-primary" : ""}` : "bg-transparent"
                    }`}>
                      {day && (
                        <>
                          <span>{format(day.date, "d")}</span>
                          {day.count > 0 && (
                            <span className="absolute bottom-0.5 right-1 text-[7px] text-primary font-bold">{day.count}</span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Intensity legend */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-3 text-[9px] text-muted-foreground">
            <span>Intensity:</span>
            {[
              { label: "0", cls: "bg-secondary/30" },
              { label: "1-5", cls: "bg-primary/20" },
              { label: "6-15", cls: "bg-primary/40" },
              { label: "16-30", cls: "bg-primary/60" },
              { label: "31-50", cls: "bg-primary/80" },
              { label: "50+", cls: "bg-primary" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${l.cls}`} />
                <span>{l.label}</span>
              </div>
            ))}
          </div>

          {/* Calendar stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
            {[
              { label: "Total Check-ins", value: calTotalCheckins.toString() },
              { label: "Most Active Day", value: calMostActiveDay },
              { label: "Avg Daily Attendance", value: calAvgDaily },
              { label: "Active Members", value: members.filter(m => m.status === "active").length.toString() },
            ].map((s, i) => (
              <div key={i}>
                <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className="font-display text-sm font-bold">{s.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

// Small icon wrapper to avoid importing TrendingUp separately
const TrendingUpIcon = Activity;

export default AttendancePage;
