import MemberLayout from "@/components/dashboard/MemberLayout";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Dumbbell, Flame, Trophy, Target, Zap, Calendar,
  ArrowRight, TrendingUp, Clock, ChevronRight, CheckCircle2, Circle, Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemberData } from "@/hooks/useMemberData";
import { useMemberXP, useChallengeCompletions, generateChallenges } from "@/hooks/useChallenges";
import { format, subWeeks, startOfWeek, eachDayOfInterval, isSameDay, isAfter, startOfDay } from "date-fns";
import { useMemo } from "react";
import { useMemberWorkoutPlan } from "@/hooks/useMemberWorkoutSync";
import { useMemberProgressEntries, useMemberProfileSettings } from "@/hooks/useMemberProgressSync";

const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
const heatColors = {
  future: "bg-secondary/20 border border-border/30",
  absent: "bg-amber-400/20 border border-amber-400/30 shadow-[0_0_6px_rgba(251,191,36,0.15)]",
  present: "bg-emerald-400/30 border border-emerald-400/40 shadow-[0_0_8px_rgba(52,211,153,0.2)]",
};

const MemberHome = () => {
  const { member, profile, gym, attendance, subscription, isLoading } = useMemberData();
  const { data: workoutPlan } = useMemberWorkoutPlan();
  const progressEntriesQuery = useMemberProgressEntries();
  const profileSettingsQuery = useMemberProfileSettings();
  const { xp, level, tier } = useMemberXP();
  const { data: completions = [] } = useChallengeCompletions();

  // Today's workout from plan
  const DAYS_KEYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const DAY_FULL_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const todayDayKey = DAYS_KEYS[((new Date().getDay() + 6) % 7)];
  const todayFullName = DAY_FULL_NAMES[DAYS_KEYS.indexOf(todayDayKey)];

  const completedKeys = completions.map((c: any) => c.challenge_key);
  const todayPlan = useMemo(() => workoutPlan?.[todayDayKey] || null, [todayDayKey, workoutPlan]);
  const todayExercises = todayPlan?.exercises || [];
  const isRestDay = todayPlan?.type === "Rest";
  const todayTotalSets = todayExercises.reduce((a: number, e: any) => a + (e.sets?.length || 0), 0);
  const todayDoneSets = todayExercises.reduce((a: number, e: any) => a + (e.sets?.filter((s: any) => s.done)?.length || 0), 0);
  const todayProgress = todayTotalSets > 0 ? Math.round((todayDoneSets / todayTotalSets) * 100) : 0;
  const isWorkoutDay = todayPlan?.type !== "Rest" && todayExercises.length > 0;
  const workoutChallengeKeys = ["complete_workout", "log_sets", "push_yourself", "warm_up", "extra_set", "volume_beast"];
  const prChallengeKeys = ["pr_hunter", "big_three", "strength_surge"];
  const progressChallengeKeys = ["log_progress", ...prChallengeKeys];
  const progressEntries = progressEntriesQuery.data || [];
  const hasProgressLogs = progressEntries.length > 0;
  const latestWeight = progressEntries.length > 0
    ? progressEntries[progressEntries.length - 1].weight ?? null
    : null;
  const goalWeight = profileSettingsQuery.data?.goal_weight ?? null;
  const goalType: "loss" | "gain" | "maintain" | null = (() => {
    if (goalWeight === null || latestWeight === null) return null;
    if (goalWeight < latestWeight - 0.5) return "loss";
    if (goalWeight > latestWeight + 0.5) return "gain";
    return "maintain";
  })();
  const isWeekendToday = new Date().getDay() === 0 || new Date().getDay() === 6;
  const activeChallenges = useMemo(() => 
    member?.id
      ? generateChallenges(
          level,
          tier.name,
          member.id,
          completedKeys,
          undefined,
          { 
            excludeKeys: [
              ...(!isWorkoutDay ? workoutChallengeKeys : []),
              ...(!isWeekendToday ? ["weekend_warrior"] : []),
              ...(!hasProgressLogs ? progressChallengeKeys : []),
              ...(goalWeight ? [] : ["log_progress"]),
            ],
            preferredCategories:
              goalType === "loss" ? ["consistency", "fitness"] :
              goalType === "gain" ? ["strength", "fitness"] :
              goalType === "maintain" ? ["consistency", "fitness", "strength"] :
              undefined,
          },
        )
      : [],
    [member?.id, level, tier.name, completedKeys, isWorkoutDay, isWeekendToday, hasProgressLogs, goalWeight, goalType]
  );

  const displayName = profile?.full_name || member?.name || "Member";
  const firstName = displayName.split(" ")[0];

  const now = new Date();
  const fourWeeksAgo = subWeeks(startOfWeek(now, { weekStartsOn: 1 }), 3);
  const allDays = eachDayOfInterval({ start: fourWeeksAgo, end: now });

  const todayDate = startOfDay(now);
  const attendanceGrid: number[][] = [];
  for (let w = 0; w < 4; w++) {
    const week: number[] = [];
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      const day = allDays[idx];
      if (!day) { week.push(-1); continue; }
      if (isAfter(startOfDay(day), todayDate)) { week.push(-1); continue; }
      const count = attendance.filter(a => isSameDay(new Date(a.check_in), day)).length;
      week.push(count > 0 ? 1 : 0);
    }
    attendanceGrid.push(week);
  }

  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekSessions = new Set(
    attendance
      .filter(a => new Date(a.check_in) >= thisWeekStart)
      .map(a => format(new Date(a.check_in), "yyyy-MM-dd"))
  ).size;
  const totalCheckins = attendanceGrid.flat().filter((val) => val > 0).length;

  let streak = 0;
  const sortedDates = [...new Set(attendance.map(a => format(new Date(a.check_in), "yyyy-MM-dd")))].sort().reverse();
  for (let i = 0; i < sortedDates.length; i++) {
    const expected = format(new Date(now.getTime() - i * 86400000), "yyyy-MM-dd");
    if (sortedDates[i] === expected) streak++;
    else break;
  }

  const planName = member?.plan_name || "No Plan";
  const expiryDate = member?.expiry_at ? format(new Date(member.expiry_at), "MMM d, yyyy") : "—";
  const status = member?.status || "active";

  const quickStats = [
    { label: "Current Streak", value: String(streak), unit: "days", icon: Flame, color: "text-glow-gold" },
    { label: "Attendance Days", value: String(totalCheckins), unit: "days", icon: Zap, color: "text-primary" },
    { label: "This Week", value: `${weekSessions}`, unit: "days", icon: Calendar, color: "text-glow-cyan" },
    { label: "Status", value: status.charAt(0).toUpperCase() + status.slice(1), unit: "", icon: Trophy, color: "text-glow-blue" },
  ];

  if (isLoading) {
    return (
      <MemberLayout title="Loading..." subtitle="">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MemberLayout>
    );
  }

  return (
    <MemberLayout title={`Welcome back, ${firstName}!`} subtitle="Progress is personal. Keep showing up.">
      <div className="max-w-6xl mx-auto">
        {/* Hero Welcome Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden mb-6"
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-card via-card/95 to-primary/10 border border-border/50 rounded-2xl" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-glow-cyan/5 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />

          <div className="relative z-10 p-5 lg:p-8">
            {/* Top row: Label + Gym name */}
            <div className="flex items-start justify-between mb-3 gap-2 min-w-0">
              <span className="text-[10px] lg:text-xs uppercase tracking-[0.2em] font-bold text-primary/80 shrink-0">
                Member Home
              </span>
              {gym?.name && (
                <span className="px-4 py-1.5 rounded-full bg-primary/15 border border-primary/25 text-xs lg:text-sm font-bold text-primary backdrop-blur-sm min-w-0 max-w-[60vw] sm:max-w-none truncate">
                  {gym.name}
                </span>
              )}
            </div>

            {/* Welcome heading */}
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-1 capitalize">
              Welcome back, {firstName} <span className="inline-block animate-wave">👋</span>
            </h2>
            <p className="text-sm lg:text-base text-muted-foreground mb-5">
              Progress is personal. Keep showing up.
            </p>

            {/* Status pills row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-sm ${
                status === "active" 
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" 
                  : status === "expired" 
                  ? "bg-destructive/10 border-destructive/25 text-destructive" 
                  : "bg-amber-500/10 border-amber-500/25 text-amber-400"
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${status === "active" ? "bg-emerald-400 animate-pulse" : status === "expired" ? "bg-destructive" : "bg-amber-400"}`} />
                {status === "active" ? "Active Member" : status.charAt(0).toUpperCase() + status.slice(1)}
              </div>

              {/* Plan badge */}
              {planName !== "No Plan" && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 border border-primary/20 text-primary backdrop-blur-sm">
                  <Calendar className="w-3 h-3" />
                  {planName}
                </div>
              )}

              {/* Valid upto badge */}
              {expiryDate !== "—" && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-secondary/50 border border-border/40 text-muted-foreground backdrop-blur-sm">
                  <Clock className="w-3 h-3" />
                  Valid upto {expiryDate}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          {quickStats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="bg-card border border-border rounded-2xl p-4 lg:p-5 hover:border-primary/20 transition-colors"
            >
              <s.icon className={`w-5 h-5 lg:w-6 lg:h-6 ${s.color} mb-2`} />
              <div className="flex items-baseline gap-1.5">
                <span className={`font-display text-2xl lg:text-3xl font-bold ${s.color}`}>{s.value}</span>
                {s.unit && <span className="text-[10px] lg:text-xs text-muted-foreground">{s.unit}</span>}
              </div>
              <p className="text-xs lg:text-sm text-muted-foreground mt-0.5">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Middle Row: Heatmap + Membership Details */}
        <div className="grid lg:grid-cols-5 gap-4 lg:gap-6 mb-6">
          {/* Attendance Heatmap - wider on desktop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-3 bg-card border border-border rounded-2xl p-5 lg:p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display font-bold text-base lg:text-lg">Attendance</h3>
                <p className="text-xs text-muted-foreground">Last 4 weeks</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm ${heatColors.absent}`} />
                  <span className="text-[10px] lg:text-xs text-muted-foreground">Absent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm ${heatColors.present}`} />
                  <span className="text-[10px] lg:text-xs text-muted-foreground">Present</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 lg:space-y-2">
              <div className="flex gap-1.5 lg:gap-2 mb-1">
                <div className="w-7 lg:w-8" />
                {weekDays.map((d, i) => (
                  <div key={i} className="flex-1 text-center text-[10px] lg:text-xs text-muted-foreground font-medium">{d}</div>
                ))}
              </div>
              {attendanceGrid.map((week, wi) => (
                <div key={wi} className="flex gap-1.5 lg:gap-2 items-center">
                  <span className="w-7 lg:w-8 text-[10px] lg:text-xs text-muted-foreground font-medium">W{wi + 1}</span>
                  {week.map((val, di) => (
                    <div
                      key={di}
                      className={`flex-1 aspect-square rounded-md lg:rounded-lg transition-all ${
                        val === -1 ? heatColors.future : val > 0 ? heatColors.present : heatColors.absent
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Membership Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 lg:p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-base lg:text-lg">Membership</h3>
              <Link to="/member/profile">
                <Button variant="ghost" size="sm" className="text-xs text-primary gap-1">
                  Profile <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>

            <div className="space-y-3 lg:space-y-4">
              {[
                { label: "Plan", value: planName },
                { label: "Gym", value: gym?.name || "—" },
                { label: "Expires", value: expiryDate },
                { label: "Payment", value: (member?.payment_status || "—").charAt(0).toUpperCase() + (member?.payment_status || "").slice(1) },
                { label: "Due Amount", value: member?.due_amount ? `₹${member.due_amount.toLocaleString()}` : "₹0" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Today's Workout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-card border border-border rounded-2xl p-5 lg:p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-primary mb-0.5">{todayFullName}</p>
              <h3 className="font-display font-bold text-base lg:text-lg">
                {isRestDay ? "Rest Day 😴" : `${todayPlan?.label || "No Plan"} — ${todayExercises.length} exercises`}
              </h3>
            </div>
            {!isRestDay && todayExercises.length > 0 && (
              <Link to="/member/workouts">
                <Button variant="glow" size="sm" className="rounded-xl gap-1.5 text-xs">
                  <Dumbbell className="w-3.5 h-3.5" /> Go to Workout <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            )}
          </div>
          {isRestDay ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm">Take it easy today. Recovery is part of the process.</p>
            </div>
          ) : todayExercises.length === 0 ? (
            <div className="text-center py-6">
              <Dumbbell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No workout planned for today.</p>
              <Link to="/member/workouts">
                <Button variant="outline" size="sm" className="mt-3 rounded-xl text-xs">Set up your plan</Button>
              </Link>
            </div>
          ) : (
            <>
              {todayDoneSets > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-muted-foreground">{todayDoneSets}/{todayTotalSets} sets completed</span>
                    <span className="text-xs font-bold text-primary">{todayProgress}%</span>
                  </div>
                  <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-primary rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${todayProgress}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-2 lg:gap-3">
                {todayExercises.map((ex: any, i: number) => {
                  const exDone = ex.sets?.filter((s: any) => s.done)?.length || 0;
                  const exTotal = ex.sets?.length || 0;
                  const allDone = exDone === exTotal && exTotal > 0;
                  return (
                    <motion.div
                      key={ex.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                      className={`flex items-center gap-3 p-3 lg:p-4 rounded-xl border transition-colors ${
                        allDone ? "bg-primary/5 border-primary/20" : "bg-secondary/20 border-border hover:border-primary/20"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        allDone ? "bg-primary/20" : "bg-secondary/50"
                      }`}>
                        {allDone ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Dumbbell className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${allDone ? "line-through text-muted-foreground" : ""}`}>{ex.name}</p>
                        <p className="text-[11px] text-muted-foreground">{exDone}/{exTotal} sets {allDone ? "✓" : ""}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>


        {/* Active Challenges */}
        {activeChallenges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48 }}
            className="bg-card border border-border rounded-2xl p-5 lg:p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4 gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Target className="w-5 h-5 text-primary" />
                <h3 className="font-display font-bold text-base lg:text-lg truncate">Active Challenges</h3>
              </div>
              <Link to="/member/achievements">
                <Button variant="ghost" size="sm" className="text-xs gap-1">
                  View All <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {activeChallenges.slice(0, 4).map((c: any, i: number) => {
                const categoryIcons: Record<string, React.ReactNode> = {
                  consistency: <Flame className="w-4 h-4 text-orange-400" />,
                  fitness: <Dumbbell className="w-4 h-4 text-emerald-400" />,
                  strength: <Zap className="w-4 h-4 text-purple-400" />,
                };
                const categoryBg: Record<string, string> = {
                  consistency: "bg-orange-400/10",
                  fitness: "bg-emerald-400/10",
                  strength: "bg-purple-400/10",
                };
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border/50 hover:border-primary/20 transition-colors overflow-hidden"
                  >
                    <div className={`w-9 h-9 rounded-lg ${categoryBg[c.category] || "bg-muted"} flex items-center justify-center flex-shrink-0`}>
                      {categoryIcons[c.category] || <Target className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                    </div>
                    <div className="text-right flex-shrink-0 min-w-[62px]">
                      <p className="text-sm font-bold text-primary">+{c.xpReward} XP</p>
                      <p className="text-[10px] text-muted-foreground">{c.daysLeft}d left</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {attendance.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-card border border-border rounded-2xl p-5 lg:p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-base lg:text-lg">Recent Check-ins</h3>
              <span className="text-xs text-muted-foreground">Last {Math.min(attendance.length, 5)} sessions</span>
            </div>
            <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-2 lg:gap-3">
              {attendance.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 lg:p-4 rounded-xl bg-secondary/20 border border-glass hover:border-primary/20 transition-colors">
                  <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{format(new Date(a.check_in), "MMM d, yyyy")}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-emerald-400">In: {format(new Date(a.check_in), "h:mm a")}</span>
                      {a.check_out && (
                        <>
                          <span className="text-[10px] text-muted-foreground">→</span>
                          <span className="text-[11px] text-amber-400">Out: {format(new Date(a.check_out), "h:mm a")}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </MemberLayout>
  );
};

export default MemberHome;

