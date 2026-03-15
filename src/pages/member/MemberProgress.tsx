import MemberLayout from "@/components/dashboard/MemberLayout";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import {
  Target, TrendingUp, Scale, Zap, Plus, ArrowUpRight, ArrowDownRight,
  Flame, Sparkles, Dumbbell, Calendar, Trophy,
  CheckCircle2, Activity, Brain, Heart, Droplets, Beef, Timer, Ruler
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  LineChart, Line
} from "recharts";
import { toast } from "sonner";
import { format, subDays, differenceInDays, parseISO } from "date-fns";
import { useMemberData } from "@/hooks/useMemberData";
import MemberHeroCard from "@/components/member/MemberHeroCard";
import { useMemberWorkoutPlan } from "@/hooks/useMemberWorkoutSync";
import {
  useAddMemberProgressEntry,
  useMemberProfileSettings,
  useMemberProgressEntries,
  useSaveMemberProfileSettings,
} from "@/hooks/useMemberProgressSync";
import { useGymAccess } from "@/hooks/useGymAccess";
import FeatureLock from "@/components/FeatureLock";

// --- Storage ---
const WEIGHT_KEY = "fitcore_weight_log";
const GOAL_KEY = "fitcore_goal_weight";
const GOAL_KEY_LEGACY = "fitcore_weight_goal";
const HEIGHT_KEY = "fitcore_height";
const AGE_KEY = "fitcore_age";
const GENDER_KEY = "fitcore_gender";
const GOAL_MONTHS_KEY = "fitcore_goal_months";
const WORKOUT_HISTORY_KEY = "fitcore_workout_history";
const PROGRESS_LOG_KEY = "fitcore_progress_log";

interface WeightEntry { date: string; weight: number; }
interface ProgressEntry { date: string; weight?: number; workout: boolean; notes: string; }

const load = <T,>(key: string, fallback: T): T => {
  try { const v = JSON.parse(localStorage.getItem(key)!); return v ?? fallback; } catch { return fallback; }
};
const loadWithFallback = <T,>(primaryKey: string, legacyKey: string, fallback: T): T => {
  const primaryValue = load(primaryKey, fallback);
  if (primaryValue !== fallback) return primaryValue;
  return load(legacyKey, fallback);
};
const save = (key: string, value: any) => localStorage.setItem(key, JSON.stringify(value));

const tooltipStyle = {
  background: "hsl(222, 40%, 7%)",
  border: "1px solid hsl(222, 20%, 14%)",
  borderRadius: "12px",
  fontSize: 12,
};

// SVG ring component
const Ring = ({ value, max, size = 80, strokeWidth = 6, color = "hsl(152, 70%, 50%)" }: { value: number; max: number; size?: number; strokeWidth?: number; color?: string }) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(220, 15%, 12%)" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
        className="drop-shadow-[0_0_6px_rgba(74,222,128,0.3)] transition-all duration-700" />
    </svg>
  );
};

// Custom dot for weight chart — highlights "You are here" with status
const WeightDot = (props: any & { currentIdx: number; goalStatus: string }) => {
  const { cx, cy, index, currentIdx, payload, goalStatus } = props;
  if (!cx || !cy) return null;
  const isCurrentPoint = index === currentIdx;
  const isProjected = !payload?.isReal;

  if (isCurrentPoint) {
    const statusColor = goalStatus === "completed" ? "hsl(152, 70%, 50%)" 
      : goalStatus === "ahead" ? "hsl(178, 65%, 48%)" 
      : goalStatus === "on_track" ? "hsl(152, 70%, 50%)"
      : "hsl(42, 90%, 60%)";
    const statusText = goalStatus === "completed" ? "🎉 Goal Done!" 
      : goalStatus === "ahead" ? "⚡ Ahead!" 
      : goalStatus === "on_track" ? "✓ On track"
      : "⚠ Behind";
    return (
      <g>
        <circle cx={cx} cy={cy} r={10} fill={statusColor} opacity={0.1} />
        <circle cx={cx} cy={cy} r={5} fill="hsl(222, 40%, 7%)" stroke={statusColor} strokeWidth={2} />
        <circle cx={cx} cy={cy} r={2} fill={statusColor} />
        <text x={cx + 12} y={cy - 42} textAnchor="start" fill={statusColor} fontSize={9} fontWeight={700}>{statusText}</text>
        <text x={cx + 12} y={cy - 30} textAnchor="start" fill="hsl(220, 15%, 65%)" fontSize={8} fontWeight={600}>{payload?.weight}kg</text>
      </g>
    );
  }
  if (isProjected) {
    return <circle cx={cx} cy={cy} r={2} fill="hsl(220, 15%, 30%)" />;
  }
  return <circle cx={cx} cy={cy} r={3} fill="hsl(152, 70%, 50%)" />;
};

// Weight chart component
const WeightChart = ({ data, currentIdx, gradientId, height = 220, goalStatus }: { data: any[]; currentIdx: number; gradientId: string; height?: number; goalStatus: string }) => (
  <div style={{ height: `${height}px` }}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 55, right: 15, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(152, 70%, 50%)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="hsl(152, 70%, 50%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 10 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 15%, 45%)", fontSize: 10 }} width={36} domain={["dataMin - 1", "dataMax + 1"]} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} kg`, "Weight"]} />
        <Area
          type="monotone"
          dataKey="weight"
          stroke="hsl(152, 70%, 50%)"
          fill={`url(#${gradientId})`}
          strokeWidth={2.5}
          dot={(dotProps: any) => {
            const { key: _key, ...rest } = dotProps || {};
            return <WeightDot key={dotProps?.index} {...rest} currentIdx={currentIdx} goalStatus={goalStatus} />;
          }}
          activeDot={{ r: 5, stroke: "hsl(152, 70%, 50%)", strokeWidth: 2, fill: "hsl(222, 40%, 7%)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const GlassCard = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
    className={`bg-card/80 backdrop-blur-md border border-border/50 rounded-2xl p-5 lg:p-6 relative overflow-hidden ${className}`}>
    {children}
  </motion.div>
);

const MemberProgress = () => {
  const { access, isLoading: accessLoading } = useGymAccess();
  const { member, attendance, subscription, gym, trainer } = useMemberData();
  const { data: workoutPlan } = useMemberWorkoutPlan();
  const profileSettingsQuery = useMemberProfileSettings();
  const progressEntriesQuery = useMemberProgressEntries();
  const saveProfileSettings = useSaveMemberProfileSettings();
  const addProgressEntry = useAddMemberProgressEntry();
  const [viewMode, setViewMode] = useState<"focus" | "analytics">("focus");
  const [tab, setTab] = useState<"overview" | "lab">("overview");
  const [motivationMode, setMotivationMode] = useState(false);

  // Body data
  const [weightLog, setWeightLog] = useState<WeightEntry[]>(() => load(WEIGHT_KEY, []));
  const [goalWeight, setGoalWeight] = useState(() => loadWithFallback(GOAL_KEY, GOAL_KEY_LEGACY, 70));
  const [goalInput, setGoalInput] = useState(String(loadWithFallback(GOAL_KEY, GOAL_KEY_LEGACY, 70)));
  const [height, setHeight] = useState(() => load(HEIGHT_KEY, 170));
  const [heightInput, setHeightInput] = useState(String(load(HEIGHT_KEY, 170)));
  const [age, setAge] = useState(() => load(AGE_KEY, 25));
  const [ageInput, setAgeInput] = useState(String(load(AGE_KEY, 25)));
  const [gender, setGender] = useState<"male" | "female">(() => load(GENDER_KEY, "male"));
  const [goalMonths, setGoalMonths] = useState(() => load(GOAL_MONTHS_KEY, 2));
  const [goalMonthsInput, setGoalMonthsInput] = useState(String(load(GOAL_MONTHS_KEY, 2)));
  const [entryWeight, setEntryWeight] = useState("");
  const [progressLog, setProgressLog] = useState<ProgressEntry[]>(() => load(PROGRESS_LOG_KEY, []));
  const [hydratedFromRemote, setHydratedFromRemote] = useState(false);

  const today = new Date();

  useEffect(() => {
    if (hydratedFromRemote) return;
    if (profileSettingsQuery.isLoading || progressEntriesQuery.isLoading) return;

    const profileSettings = profileSettingsQuery.data;
    if (profileSettings) {
      if (typeof profileSettings.height_cm === "number" && profileSettings.height_cm > 0) {
        setHeight(profileSettings.height_cm);
        setHeightInput(String(profileSettings.height_cm));
      }
      if (typeof profileSettings.age === "number" && profileSettings.age > 0) {
        setAge(profileSettings.age);
        setAgeInput(String(profileSettings.age));
      }
      if (typeof profileSettings.goal_weight === "number" && profileSettings.goal_weight > 0) {
        setGoalWeight(profileSettings.goal_weight);
        setGoalInput(String(profileSettings.goal_weight));
      }
      if (typeof profileSettings.goal_months === "number" && profileSettings.goal_months > 0) {
        setGoalMonths(profileSettings.goal_months);
        setGoalMonthsInput(String(profileSettings.goal_months));
      }
      if (profileSettings.gender === "male" || profileSettings.gender === "female") {
        setGender(profileSettings.gender);
      }
    }

    const progressEntries = progressEntriesQuery.data || [];
    if (progressEntries.length > 0) {
      const weights = progressEntries
        .filter((entry) => typeof entry.weight === "number" && Number.isFinite(entry.weight))
        .map((entry) => ({ date: entry.date, weight: entry.weight as number }));
        setWeightLog(weights);
        setProgressLog(progressEntries);
        if (!entryWeight && weights.length > 0) {
          setEntryWeight(String(weights[weights.length - 1].weight));
        }
      }

    setHydratedFromRemote(true);
    }, [hydratedFromRemote, profileSettingsQuery.data, profileSettingsQuery.isLoading, progressEntriesQuery.data, progressEntriesQuery.isLoading, entryWeight]);

  // Real data
  const totalCheckIns = attendance?.length || 0;
  const checkInsThisMonth = useMemo(() => attendance?.filter((a: any) => {
    const d = new Date(a.check_in);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length || 0, [attendance]);

  const workoutStreak = useMemo(() => {
    if (!attendance || attendance.length === 0) return 0;
    const dates = [...new Set(attendance.map((a: any) => format(new Date(a.check_in), "yyyy-MM-dd")))].sort().reverse();
    let s = 0;
    for (let i = 0; i < dates.length; i++) {
      if (dates[i] === format(subDays(today, i), "yyyy-MM-dd")) s++; else break;
    }
    return s;
  }, [attendance]);

  const membershipDaysLeft = useMemo(() => {
    if (!subscription?.end_date) return null;
    return Math.max(0, differenceInDays(parseISO(subscription.end_date), today));
  }, [subscription]);

  const memberSince = useMemo(() => member?.joined_at ? format(new Date(member.joined_at), "MMM yyyy") : "—", [member]);

  // Weight computations
  const currentWeight = weightLog.length > 0 ? weightLog[weightLog.length - 1].weight : 60;
  const startWeight = weightLog.length > 0 ? weightLog[0].weight : 59;
  const totalChange = currentWeight - startWeight;
  const goalRemaining = Math.abs(goalWeight - currentWeight);
  const isGaining = goalWeight > currentWeight;
  const goalProgress = goalWeight !== startWeight
    ? Math.min(100, Math.round(Math.abs(currentWeight - startWeight) / Math.abs(goalWeight - startWeight) * 100)) : 0;

  // BMI
  const heightM = height / 100;
  const bmi = heightM > 0 ? +(currentWeight / (heightM * heightM)).toFixed(1) : 0;
  const bmiCategory = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
  const bmiColor = bmi < 18.5 ? "hsl(42, 90%, 60%)" : bmi < 25 ? "hsl(152, 70%, 50%)" : bmi < 30 ? "hsl(42, 90%, 60%)" : "hsl(0, 70%, 50%)";

  // Advanced calorie calculations (Mifflin-St Jeor)
  const bmr = gender === "male"
    ? 10 * currentWeight + 6.25 * height - 5 * age + 5
    : 10 * currentWeight + 6.25 * height - 5 * age - 161;
  const activityMultiplier = checkInsThisMonth > 16 ? 1.725 : checkInsThisMonth > 12 ? 1.55 : checkInsThisMonth > 8 ? 1.375 : 1.2;
  const tdee = Math.round(bmr * activityMultiplier);

  // Goal-based calorie calculations
  const totalGoalDays = goalMonths * 30;
  const weightChangeNeeded = goalWeight - currentWeight;
  const dailyWeightChange = weightChangeNeeded / totalGoalDays;
  const dailyCalorieAdjustment = Math.round(dailyWeightChange * 7700); // 1kg ≈ 7700 kcal
  const targetCalories = tdee + dailyCalorieAdjustment;
  const proteinPerDay = Math.round(currentWeight * (isGaining ? 2.2 : 1.8)); // g/day
  const waterPerDay = +(currentWeight * 0.035).toFixed(1); // liters
  const carbsPerDay = Math.round((targetCalories * 0.45) / 4);
  const fatsPerDay = Math.round((targetCalories * 0.25) / 9);
  const weeklyChange = +(dailyWeightChange * 7).toFixed(2);
  const daysToGoal = goalRemaining > 0 ? Math.round(goalRemaining / Math.abs(dailyWeightChange || 0.01)) : 0;

  // Goal status: completed / ahead / on_track / behind
  const goalStatus = useMemo(() => {
    if (goalRemaining <= 0.1) return "completed";
    if (weightLog.length < 2) return "on_track";
    const daysSinceStart = Math.max(1, differenceInDays(today, new Date(weightLog[0].date)));
    const expectedProgress = (daysSinceStart / totalGoalDays) * Math.abs(goalWeight - startWeight);
    const actualProgress = Math.abs(currentWeight - startWeight);
    if (actualProgress >= expectedProgress * 1.05) return "ahead";
    if (actualProgress >= expectedProgress * 0.9) return "on_track";
    return "behind";
  }, [weightLog, currentWeight, startWeight, goalWeight, totalGoalDays, goalRemaining]);

  // Weight chart: real entries + projected future
  const { chartData: weightChartData, currentIndex: weightCurrentIdx } = useMemo(() => {
    const realEntries = weightLog.slice(-12).map(e => ({
      date: format(new Date(e.date), "MMM d"),
      weight: e.weight,
      isReal: true,
    }));

    // Generate projected future points toward goal
    const lastWeight = realEntries.length > 0 ? realEntries[realEntries.length - 1].weight : currentWeight;
    const remaining = goalWeight - lastWeight;
    const projSteps = 6;
    const stepChange = remaining / projSteps;
    const projected = Array.from({ length: projSteps }, (_, i) => ({
      date: `+${i + 1}w`,
      weight: +(lastWeight + stepChange * (i + 1)).toFixed(1),
      isReal: false,
    }));

    if (realEntries.length === 0) {
      // No real data — show full projected path
      const steps = 10;
      const sc = (goalWeight - currentWeight) / steps;
      return {
        chartData: Array.from({ length: steps }, (_, i) => ({
          date: `W${i + 1}`,
          weight: +(currentWeight + sc * i).toFixed(1),
          isReal: i === 0,
        })),
        currentIndex: 0,
      };
    }

    return {
      chartData: [...realEntries, ...projected],
      currentIndex: realEntries.length - 1,
    };
  }, [weightLog, currentWeight, goalWeight]);

  // Strength
  const strengthBests = useMemo(() => {
    const lifts = ["Bench Press", "Squat", "Deadlift"];
    return lifts.map(name => {
      if (!workoutPlan) return { name, best: 0, previous: 0 };
      let max = 0;
      Object.values(workoutPlan).forEach((day) => {
        day.exercises?.forEach((ex) => {
          if (ex.name === name) ex.sets?.forEach((s) => { if (s.weight > max) max = s.weight; });
        });
      });
      return { name, best: max, previous: 0 };
    });
  }, [workoutPlan]);

  // Line chart data for strength — show current PRs as a progression
  const strengthLineData = useMemo(() => {
    const b = strengthBests[0].best;
    const s = strengthBests[1].best;
    const d = strengthBests[2].best;
    // Create a 3-point progression: starting estimate, mid, current PR
    return [
      { label: "Start", bench: Math.round(b * 0.6) || 0, squat: Math.round(s * 0.6) || 0, deadlift: Math.round(d * 0.6) || 0 },
      { label: "Mid", bench: Math.round(b * 0.8) || 0, squat: Math.round(s * 0.8) || 0, deadlift: Math.round(d * 0.8) || 0 },
      { label: "Current", bench: b, squat: s, deadlift: d },
    ];
  }, [strengthBests]);

  const todayPlan = useMemo(() => {
    const DAYS_KEYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    return workoutPlan?.[DAYS_KEYS[((today.getDay() + 6) % 7)]] || null;
  }, [today, workoutPlan]);

  // Handlers
  const handleSaveProfile = () => {
    const h = parseFloat(heightInput);
    const a = parseFloat(ageInput);
    const g = parseFloat(goalInput);
    const m = parseFloat(goalMonthsInput);
    const w = parseFloat(entryWeight);
    const hasWeightInput = entryWeight.trim().length > 0;
    if (h > 0) { setHeight(h); save(HEIGHT_KEY, h); }
    if (a > 0) { setAge(a); save(AGE_KEY, a); }
    if (g > 0) { setGoalWeight(g); save(GOAL_KEY, g); }
    if (m > 0) { setGoalMonths(m); save(GOAL_MONTHS_KEY, m); }
    save(GENDER_KEY, gender);
    if (hasWeightInput) {
      if (!Number.isFinite(w) || w <= 0) {
        toast.error("Enter a valid weight before saving.");
        return;
      }
      const nowIso = new Date().toISOString();
      const newLog = [...weightLog, { date: nowIso, weight: w }];
      setWeightLog(newLog);
      save(WEIGHT_KEY, newLog);

      const entry: ProgressEntry = { date: nowIso, weight: w, workout: false, notes: "" };
      const newPL = [...progressLog, entry];
      setProgressLog(newPL);
      save(PROGRESS_LOG_KEY, newPL);
      addProgressEntry.mutate(entry);
    }
    saveProfileSettings.mutate({
      height_cm: h > 0 ? h : null,
      age: a > 0 ? a : null,
      goal_weight: g > 0 ? g : null,
      goal_months: m > 0 ? m : goalMonths,
      gender,
      settings: {},
    });
    toast.success(hasWeightInput ? "Profile and weight saved!" : "Profile updated! All calculations refreshed.");
  };

  // Milestones — dynamic based on actual member data
  const benchBest = strengthBests[0].best;
  const squatBest = strengthBests[1].best;
  const milestones = [
    { label: "First gym check-in", done: totalCheckIns >= 1, progress: Math.min(totalCheckIns, 1), total: 1 },
    { label: "10 gym visits", done: totalCheckIns >= 10, progress: Math.min(totalCheckIns, 10), total: 10 },
    { label: "25 gym visits", done: totalCheckIns >= 25, progress: Math.min(totalCheckIns, 25), total: 25 },
    { label: "7-day streak", done: workoutStreak >= 7, progress: Math.min(workoutStreak, 7), total: 7 },
    { label: benchBest >= 20 ? `Bench ${benchBest}kg PR` : "First 20kg bench", done: benchBest >= 20, progress: Math.min(benchBest, 20), total: 20 },
    { label: squatBest > 0 ? `Squat ${squatBest}kg PR` : "Squat PR", done: squatBest > 0, progress: squatBest > 0 ? 1 : 0, total: 1 },
  ];
  const milestonesUnlocked = milestones.filter(m => m.done).length;

  const insights = [
    { icon: Activity, text: totalCheckIns > 0 ? `${totalCheckIns} total gym visits recorded.` : "No check-ins yet." },
    { icon: TrendingUp, text: strengthBests[1].best > 0 ? "Your squat improved." : "Log your first squat to track progress." },
    { icon: Flame, text: workoutStreak > 0 ? `${workoutStreak}-day attendance streak!` : "Start a streak by checking in today." },
    { icon: Heart, text: trainer ? `Training with ${trainer.name}` : "No trainer assigned yet." },
  ];

  const motivationMsg = [
    checkInsThisMonth < 5 ? "Train 2 more days to hit your weekly goal." : "Great momentum!",
    workoutStreak > 0 ? `You're on a ${workoutStreak}-day streak!` : "Start a streak today.",
    totalChange !== 0 ? `${Math.abs(totalChange).toFixed(1)}kg change so far!` : "Log your first weight.",
  ];

  if (accessLoading) {
    return (
      <MemberLayout title="Progress" subtitle="Track your body stats and performance">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MemberLayout>
    );
  }

  if (!access.features.member_app_premium) {
    return (
      <MemberLayout title="Progress" subtitle="Track your body stats and performance">
        <FeatureLock
          title="Progress Tracker Locked"
          description="Your gym is not on the Pro plan. Ask your gym owner to upgrade to unlock progress tracking."
          showCta={false}
        />
      </MemberLayout>
    );
  }

  return (
    <MemberLayout title="Progress" subtitle="Track body change, strength gains, and goal trajectory">
      <div className="max-w-6xl mx-auto">
        <MemberHeroCard
          eyebrow="Progress Lab"
          title="Transformation Dashboard"
          subtitle="Track body change, strength gains, and goal trajectory in one place."
          gymName={gym?.name}
          chips={[
            { label: `${currentWeight}kg current`, icon: <Scale className="w-3.5 h-3.5" />, tone: "primary" },
            { label: `${goalWeight}kg target`, icon: <Target className="w-3.5 h-3.5" />, tone: "muted" },
            { label: `${workoutStreak} day streak`, icon: <Flame className="w-3.5 h-3.5" />, tone: "success" },
          ]}
          className="mb-6"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/80 p-3 backdrop-blur-md"
        >
          <div className="flex rounded-xl border border-border/40 bg-secondary/30 p-1">
            {(["focus", "analytics"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                  viewMode === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "focus" ? "Focus Mode" : "Analytics Mode"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setMotivationMode(!motivationMode)}
            className={`ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              motivationMode
                ? "border border-glow-gold/30 bg-glow-gold/20 text-glow-gold"
                : "border border-border/50 bg-secondary/30 text-muted-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Motivation
          </button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-card/80 backdrop-blur-md border border-border/50 rounded-xl p-1 w-fit">
          {(["overview", "lab"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "overview" ? "Overview" : "Progress Lab"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "overview" ? (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>

              {/* FOCUS MODE */}
              {viewMode === "focus" && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: "Workout Streak", value: String(workoutStreak), sub: "days consecutive", icon: Flame },
                      { label: "Today's Workout", value: todayPlan?.type === "Rest" ? "Rest Day" : todayPlan?.label || "No Plan", sub: todayPlan?.type || "—", icon: Dumbbell, action: todayPlan?.type !== "Rest" },
                      { label: "Current Weight", value: `${currentWeight} kg`, sub: `BMI: ${bmi} (${bmiCategory})`, icon: Scale },
                      { label: "Goal Progress", value: goalStatus === "completed" ? "Done!" : `${goalProgress}%`, sub: goalStatus === "completed" ? "🎉 Goal reached!" : goalStatus === "behind" ? `⚠ Behind · ${goalRemaining.toFixed(1)}kg left` : goalStatus === "ahead" ? `⚡ Ahead · ${goalRemaining.toFixed(1)}kg left` : `${goalRemaining.toFixed(1)}kg to go`, icon: Target, showBar: true },
                    ].map((s, i) => (
                      <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.06 }}
                        className={`bg-card/80 backdrop-blur-md border rounded-2xl p-4 lg:p-5 ${i === 1 ? "border-primary/30 bg-primary/5" : "border-border/50"}`}>
                        <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-bold mb-2">{s.label}</p>
                        <p className="font-display text-xl lg:text-2xl font-bold mb-1">{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.sub}</p>
                        {s.showBar && (
                          <div className="mt-2 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-primary rounded-full transition-all" style={{ width: `${goalProgress}%` }} />
                          </div>
                        )}
                        {s.action && <a href="/member/workouts"><Button variant="glow" size="sm" className="mt-3 rounded-xl text-xs gap-1 w-full">Start Workout</Button></a>}
                      </motion.div>
                    ))}
                  </div>

                  {/* Weight + Strength charts */}
                  <div className="grid lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
                    <GlassCard delay={0.3}>
                      <div className="flex items-center justify-between mb-4">
                        <div><h3 className="font-display font-bold text-base lg:text-lg">Weight Trend</h3><p className="text-xs text-muted-foreground">Your journey</p></div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">{totalChange > 0 ? "+" : ""}{totalChange.toFixed(1)} kg</p>
                          <p className="text-[10px] text-muted-foreground">{startWeight} → {currentWeight} kg</p>
                        </div>
                      </div>
                      <WeightChart data={weightChartData} currentIdx={weightCurrentIdx} gradientId="wg1" goalStatus={goalStatus} />
                    </GlassCard>
                    <GlassCard delay={0.4}>
                      <div className="flex items-center justify-between mb-4">
                        <div><h3 className="font-display font-bold text-base lg:text-lg">Strength Progress</h3><p className="text-xs text-muted-foreground">Big 3 lifts</p></div>
                      </div>
                      {strengthBests.some(s => s.best > 0) ? (
                        <>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={strengthLineData}>
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 10 }} />
                                <YAxis hide />
                                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} kg`, ""]} />
                                <Line type="monotone" dataKey="bench" stroke="hsl(152, 70%, 50%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(152, 70%, 50%)" }} name="Bench" />
                                <Line type="monotone" dataKey="squat" stroke="hsl(178, 65%, 48%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(178, 65%, 48%)" }} name="Squat" />
                                <Line type="monotone" dataKey="deadlift" stroke="hsl(42, 90%, 60%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(42, 90%, 60%)" }} name="Deadlift" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex justify-center gap-4 mt-3">
                            {[{ l: "Bench", c: "hsl(152, 70%, 50%)" }, { l: "Squat", c: "hsl(178, 65%, 48%)" }, { l: "Deadlift", c: "hsl(42, 90%, 60%)" }].map(x => (
                              <div key={x.l} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: x.c }} /><span className="text-[10px] text-muted-foreground">{x.l}</span></div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-center">
                          <Dumbbell className="w-10 h-10 text-muted-foreground/20 mb-3" />
                          <p className="text-sm font-medium text-muted-foreground">No strength data yet</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Log your workouts to track Bench, Squat & Deadlift PRs</p>
                        </div>
                      )}
                    </GlassCard>
                  </div>

                  {motivationMode && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-glow-gold/10 to-glow-gold/5 backdrop-blur-sm border border-glow-gold/20 rounded-2xl p-5 mb-6">
                      <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-glow-gold" /><p className="text-[10px] uppercase tracking-[0.12em] text-glow-gold font-bold">Motivation</p></div>
                      <p className="text-sm font-medium">{motivationMsg[Math.floor(Date.now() / 86400000) % motivationMsg.length]}</p>
                    </motion.div>
                  )}
                </>
              )}

              {/* ANALYTICS MODE */}
              {viewMode === "analytics" && (
                <>
                  {/* Top Stats */}
                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: "Total Visits", value: String(totalCheckIns), icon: Activity, accent: "from-primary/20 to-primary/5 border-primary/20" },
                      { label: "Streak", value: `${workoutStreak}d`, icon: Flame, accent: "from-glow-gold/20 to-glow-gold/5 border-glow-gold/20" },
                      { label: "BMI", value: `${bmi}`, icon: Scale, accent: "from-primary/20 to-primary/5 border-primary/20" },
                      { label: "Goal", value: `${goalProgress}%`, icon: Target, accent: "from-glow-gold/20 to-glow-gold/5 border-glow-gold/20" },
                    ].map((s, i) => (
                      <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className={`relative bg-gradient-to-br ${s.accent} backdrop-blur-sm border rounded-2xl p-4 overflow-hidden`}>
                        <div className="absolute top-2 right-2 opacity-10"><s.icon className="w-10 h-10" /></div>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-bold mb-1">{s.label}</p>
                        <p className="font-display text-2xl font-bold">{s.value}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Body Composition & Nutrition Panel */}
                  <GlassCard delay={0.08} className="mb-6">
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/5 rounded-full blur-3xl" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-5">
                        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center"><Scale className="w-4 h-4 text-primary" /></div>
                        <div>
                          <h3 className="font-display font-bold text-base lg:text-lg">Body & Nutrition Intelligence</h3>
                          <p className="text-[11px] text-muted-foreground">Smart calculations based on your profile</p>
                        </div>
                      </div>

                      {/* BMI + Body Stats Row */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                        {/* BMI Ring */}
                        <div className="bg-background/40 backdrop-blur-sm rounded-xl p-4 border border-border/30 flex flex-col items-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-3">BMI Score</p>
                          <div className="relative">
                            <Ring value={bmi} max={40} size={88} color={bmiColor} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="font-display text-xl font-bold">{bmi}</span>
                              <span className="text-[9px] text-muted-foreground">{bmiCategory}</span>
                            </div>
                          </div>
                        </div>

                        {/* Body Stats */}
                        <div className="bg-background/40 backdrop-blur-sm rounded-xl p-4 border border-border/30 space-y-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Body Stats</p>
                          {[
                            { l: "Height", v: `${height} cm`, icon: Ruler },
                            { l: "Weight", v: `${currentWeight} kg`, icon: Scale },
                            { l: "Age", v: `${age} yrs`, icon: Timer },
                          ].map(s => (
                            <div key={s.l} className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5"><s.icon className="w-3 h-3 text-muted-foreground" /><span className="text-[11px] text-muted-foreground">{s.l}</span></div>
                              <span className="text-sm font-bold">{s.v}</span>
                            </div>
                          ))}
                        </div>

                        {/* Daily Calories */}
                        <div className="bg-background/40 backdrop-blur-sm rounded-xl p-4 border border-border/30 flex flex-col items-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-3">Daily Target</p>
                          <div className="relative">
                            <Ring value={targetCalories} max={3500} size={88} color="hsl(178, 65%, 48%)" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="font-display text-lg font-bold">{targetCalories}</span>
                              <span className="text-[9px] text-muted-foreground">kcal</span>
                            </div>
                          </div>
                        </div>

                        {/* Goal Ring */}
                        <div className="bg-background/40 backdrop-blur-sm rounded-xl p-4 border border-border/30 flex flex-col items-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-3">Goal Progress</p>
                          <div className="relative">
                            <Ring value={goalProgress} max={100} size={88} color="hsl(42, 90%, 60%)" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="font-display text-xl font-bold">{goalProgress}%</span>
                              <span className="text-[9px] text-muted-foreground">{goalRemaining.toFixed(1)}kg left</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Nutrition Breakdown */}
                      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
                        {[
                          { label: "BMR", value: `${Math.round(bmr)}`, unit: "kcal", icon: Flame, color: "text-glow-gold" },
                          { label: "TDEE", value: `${tdee}`, unit: "kcal", icon: Zap, color: "text-primary" },
                          { label: "Target", value: `${targetCalories}`, unit: "kcal", icon: Target, color: "text-glow-cyan" },
                          { label: "Protein", value: `${proteinPerDay}`, unit: "g/day", icon: Beef, color: "text-primary" },
                          { label: "Water", value: `${waterPerDay}`, unit: "L/day", icon: Droplets, color: "text-glow-cyan" },
                          { label: "ETA", value: `${daysToGoal}`, unit: "days", icon: Timer, color: "text-glow-gold" },
                        ].map(s => (
                          <div key={s.label} className="bg-background/40 backdrop-blur-sm rounded-xl p-3 border border-border/30">
                            <div className="flex items-center gap-1 mb-1"><s.icon className={`w-3 h-3 ${s.color}`} /><p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{s.label}</p></div>
                            <p className="font-display text-lg font-bold">{s.value}<span className="text-[10px] text-muted-foreground font-normal ml-0.5">{s.unit}</span></p>
                          </div>
                        ))}
                      </div>

                      {/* Macro Split Visual */}
                      <div className="bg-background/40 backdrop-blur-sm rounded-xl p-4 border border-border/30">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold mb-3">Daily Macro Split</p>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Protein", value: proteinPerDay, unit: "g", pct: 30, color: "hsl(152, 70%, 50%)" },
                            { label: "Carbs", value: carbsPerDay, unit: "g", pct: 45, color: "hsl(178, 65%, 48%)" },
                            { label: "Fats", value: fatsPerDay, unit: "g", pct: 25, color: "hsl(42, 90%, 60%)" },
                          ].map(m => (
                            <div key={m.label} className="text-center">
                              <div className="relative w-16 h-16 mx-auto mb-2">
                                <Ring value={m.pct} max={100} size={64} strokeWidth={5} color={m.color} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <span className="font-display text-sm font-bold">{m.pct}%</span>
                                </div>
                              </div>
                              <p className="text-sm font-bold">{m.value}{m.unit}</p>
                              <p className="text-[10px] text-muted-foreground">{m.label}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 h-2 rounded-full overflow-hidden flex">
                          <div className="h-full" style={{ width: "30%", background: "hsl(152, 70%, 50%)" }} />
                          <div className="h-full" style={{ width: "45%", background: "hsl(178, 65%, 48%)" }} />
                          <div className="h-full" style={{ width: "25%", background: "hsl(42, 90%, 60%)" }} />
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Weight Analytics Chart */}
                  <GlassCard delay={0.15} className="mb-6">
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-glow-cyan/5 rounded-full blur-3xl" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-glow-cyan/15 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-glow-cyan" /></div>
                          <div><h3 className="font-display font-bold text-base lg:text-lg">Weight Journey</h3><p className="text-[11px] text-muted-foreground">{startWeight}kg → {currentWeight}kg → {goalWeight}kg</p></div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color: totalChange > 0 ? "hsl(42, 90%, 60%)" : "hsl(152, 70%, 50%)" }}>{totalChange > 0 ? "+" : ""}{totalChange.toFixed(1)} kg</p>
                          <p className="text-[10px] text-muted-foreground">Weekly: {weeklyChange > 0 ? "+" : ""}{weeklyChange}kg</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                        {[
                          { l: "Start", v: `${startWeight}`, u: "kg" },
                          { l: "Current", v: `${currentWeight}`, u: "kg", h: true },
                          { l: "Goal", v: `${goalWeight}`, u: "kg" },
                          { l: "Adjust", v: `${dailyCalorieAdjustment > 0 ? "+" : ""}${dailyCalorieAdjustment}`, u: "kcal/day" },
                        ].map(s => (
                          <div key={s.l} className={`bg-background/40 backdrop-blur-sm rounded-xl p-3 border ${s.h ? "border-primary/25" : "border-border/30"}`}>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{s.l}</p>
                            <p className="font-display text-lg font-bold">{s.v}<span className="text-[10px] text-muted-foreground font-normal ml-0.5">{s.u}</span></p>
                          </div>
                        ))}
                      </div>
                      <div className="bg-background/40 backdrop-blur-sm rounded-xl p-4 border border-border/30">
                        <WeightChart data={weightChartData} currentIdx={weightCurrentIdx} gradientId="wg2" goalStatus={goalStatus} />
                      </div>
                    </div>
                  </GlassCard>

                  {/* Strength + Membership side by side */}
                  <div className="grid lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
                    {/* Strength */}
                    <GlassCard delay={0.2}>
                      <div className="absolute -top-12 -left-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-glow-cyan/10 flex items-center justify-center border border-primary/15"><Dumbbell className="w-4 h-4 text-primary" /></div>
                          <div>
                            <h3 className="font-display font-bold text-base lg:text-lg">Strength</h3>
                            <p className="text-[10px] text-muted-foreground">Personal records</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mb-5">
                          {strengthBests.map((s, idx) => {
                            const colors = ["hsl(152, 70%, 50%)", "hsl(178, 65%, 48%)", "hsl(42, 90%, 60%)"];
                            const bgColors = ["from-primary/8 to-primary/3", "from-glow-cyan/8 to-glow-cyan/3", "from-glow-gold/8 to-glow-gold/3"];
                            const borderColors = ["border-primary/15", "border-glow-cyan/15", "border-glow-gold/15"];
                            return (
                              <div key={s.name} className={`bg-gradient-to-br ${bgColors[idx]} backdrop-blur-sm rounded-xl p-3 border ${borderColors[idx]} text-center relative overflow-hidden`}>
                                <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full opacity-10" style={{ background: colors[idx] }} />
                                <div className="relative w-16 h-16 mx-auto mb-2">
                                  <Ring value={s.best} max={Math.max(...strengthBests.map(b => b.best), 100)} size={64} strokeWidth={5} color={colors[idx]} />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="font-display text-base font-bold">{s.best || "—"}</span>
                                  </div>
                                </div>
                                <p className="text-xs font-bold">{s.name.split(" ")[0]}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{s.best > 0 ? `${s.best}kg PR` : "No data yet"}</p>
                              </div>
                            );
                          })}
                        </div>
                        <div className="bg-background/30 rounded-xl p-3 border border-border/20">
                          <div className="h-36">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={strengthLineData}>
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "hsl(220, 15%, 55%)", fontSize: 10 }} />
                                <YAxis hide />
                                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} kg`, ""]} />
                                <Line type="monotone" dataKey="bench" stroke="hsl(152, 70%, 50%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(152, 70%, 50%)" }} name="Bench" />
                                <Line type="monotone" dataKey="squat" stroke="hsl(178, 65%, 48%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(178, 65%, 48%)" }} name="Squat" />
                                <Line type="monotone" dataKey="deadlift" stroke="hsl(42, 90%, 60%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(42, 90%, 60%)" }} name="Deadlift" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </GlassCard>

                    {/* Membership */}
                    <GlassCard delay={0.25}>
                      <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-glow-gold/5 rounded-full blur-3xl" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-glow-gold/20 to-glow-gold/5 flex items-center justify-center border border-glow-gold/15"><Calendar className="w-4 h-4 text-glow-gold" /></div>
                          <div>
                            <h3 className="font-display font-bold text-base lg:text-lg">Membership</h3>
                            <p className="text-[10px] text-muted-foreground">Your gym journey</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {[
                            { l: "Member Since", v: memberSince, icon: Calendar, accent: "text-glow-gold" },
                            { l: "Total Check-ins", v: String(totalCheckIns), icon: Activity, accent: "text-primary" },
                            { l: "This Month", v: `${checkInsThisMonth} visits`, icon: Flame, accent: "text-glow-cyan" },
                            { l: "Streak", v: `${workoutStreak} days`, icon: Zap, accent: "text-glow-gold" },
                          ].map(s => (
                            <div key={s.l} className="bg-background/30 backdrop-blur-sm rounded-xl p-3 border border-border/20 group hover:border-border/40 transition-all">
                              <div className="flex items-center gap-1.5 mb-1">
                                <s.icon className={`w-3 h-3 ${s.accent} opacity-60`} />
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{s.l}</p>
                              </div>
                              <p className="font-display text-lg font-bold">{s.v}</p>
                            </div>
                          ))}
                        </div>
                        {subscription && (
                          <div className="p-4 bg-gradient-to-br from-primary/5 to-glow-cyan/3 backdrop-blur-sm rounded-xl border border-primary/15 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-6 translate-x-6" />
                            <div className="relative z-10">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-bold mb-2">Active Plan</p>
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-display text-lg font-bold">{subscription.plan_name || "—"}</span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${subscription.payment_status === "paid" ? "bg-primary/15 text-primary border border-primary/20" : "bg-glow-gold/15 text-glow-gold border border-glow-gold/20"}`}>{subscription.payment_status}</span>
                              </div>
                              <div className="flex justify-between text-xs mb-2.5">
                                <span className="text-muted-foreground">₹{subscription.amount}</span>
                                <span className={`font-semibold ${membershipDaysLeft !== null && membershipDaysLeft <= 5 ? "text-destructive" : membershipDaysLeft !== null && membershipDaysLeft <= 15 ? "text-glow-gold" : "text-primary"}`}>
                                  {membershipDaysLeft !== null ? `${membershipDaysLeft} days left` : "—"}
                                </span>
                              </div>
                              {membershipDaysLeft !== null && (
                                <div className="h-2 bg-secondary/20 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all duration-700 ${membershipDaysLeft > 15 ? "bg-gradient-to-r from-primary to-glow-cyan" : membershipDaysLeft > 5 ? "bg-gradient-to-r from-glow-gold to-glow-gold" : "bg-gradient-to-r from-destructive to-destructive"}`}
                                    style={{ width: `${Math.min(100, (membershipDaysLeft / 30) * 100)}%` }} />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {trainer && (
                          <div className="mt-3 flex items-center gap-3 p-3.5 bg-gradient-to-r from-primary/5 to-transparent backdrop-blur-sm rounded-xl border border-primary/10">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/25 to-glow-cyan/25 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
                              <span className="font-display text-lg font-bold text-primary">{trainer.name?.charAt(0)}</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Your Trainer</p>
                              <p className="text-sm font-bold">{trainer.name}</p>
                              <p className="text-[11px] text-muted-foreground">{trainer.specialty || "Personal Trainer"}{trainer.phone ? ` · ${trainer.phone}` : ""}</p>
                            </div>
                            <Heart className="w-4 h-4 text-destructive/50" />
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  </div>

                  {/* Insights + Milestones */}
                  <div className="grid lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
                    <GlassCard delay={0.3}>
                      <div className="absolute -top-10 -right-10 w-28 h-28 bg-primary/5 rounded-full blur-3xl" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-5">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-glow-cyan/10 flex items-center justify-center border border-primary/15"><Brain className="w-4 h-4 text-primary" /></div>
                          <div>
                            <h3 className="font-display font-bold">Insights</h3>
                            <p className="text-[10px] text-muted-foreground">AI-powered analysis</p>
                          </div>
                        </div>
                        <div className="space-y-2.5">
                          {insights.map((ins, i) => {
                            const accentColors = ["from-primary/10 to-primary/3 border-primary/12", "from-glow-cyan/10 to-glow-cyan/3 border-glow-cyan/12", "from-glow-gold/10 to-glow-gold/3 border-glow-gold/12", "from-destructive/8 to-destructive/3 border-destructive/12"];
                            const iconColors = ["text-primary", "text-glow-cyan", "text-glow-gold", "text-destructive"];
                            return (
                              <div key={i} className={`flex items-center gap-3 p-3.5 bg-gradient-to-r ${accentColors[i % 4]} backdrop-blur-sm rounded-xl border transition-all hover:scale-[1.01]`}>
                                <div className={`w-9 h-9 rounded-xl bg-background/40 flex items-center justify-center flex-shrink-0 border border-border/20`}>
                                  <ins.icon className={`w-4 h-4 ${iconColors[i % 4]}`} />
                                </div>
                                <p className="text-sm font-medium">{ins.text}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </GlassCard>
                    <GlassCard delay={0.35}>
                      <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-glow-gold/5 rounded-full blur-3xl" />
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-glow-gold/20 to-glow-gold/5 flex items-center justify-center border border-glow-gold/15"><Trophy className="w-4 h-4 text-glow-gold" /></div>
                            <div>
                              <h3 className="font-display font-bold">Milestones</h3>
                              <p className="text-[10px] text-muted-foreground">Achievement tracker</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-glow-gold/10 border border-glow-gold/20">
                            <Trophy className="w-3 h-3 text-glow-gold" />
                            <span className="text-xs font-bold text-glow-gold">{milestonesUnlocked}/{milestones.length}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {milestones.map((m, i) => (
                            <div key={i} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${m.done ? "bg-gradient-to-r from-primary/8 to-primary/3 border-primary/15" : "bg-background/30 border-border/20 hover:border-border/30"}`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${m.done ? "bg-primary/20 shadow-sm shadow-primary/10" : "bg-secondary/20"}`}>
                                  {m.done ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <div className="w-2 h-2 rounded-full bg-muted-foreground/25" />}
                                </div>
                                <div>
                                  <span className={`text-sm font-semibold block ${m.done ? "" : "text-muted-foreground"}`}>{m.label}</span>
                                  {!m.done && <span className="text-[10px] text-muted-foreground">{Math.round((m.progress / m.total) * 100)}% complete</span>}
                                </div>
                              </div>
                              {m.done ? (
                                <span className="text-base">🏆</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <div className="w-12 h-1.5 bg-secondary/20 rounded-full overflow-hidden">
                                    <div className="h-full bg-muted-foreground/30 rounded-full" style={{ width: `${(m.progress / m.total) * 100}%` }} />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground font-mono">{m.progress}/{m.total}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </GlassCard>
                  </div>

                  {motivationMode && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-glow-gold/10 to-glow-gold/5 backdrop-blur-sm border border-glow-gold/20 rounded-2xl p-5 mb-6">
                      <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-glow-gold" /><p className="text-[10px] uppercase tracking-[0.12em] text-glow-gold font-bold">Motivation</p></div>
                      <p className="text-sm font-medium">{motivationMsg[Math.floor(Date.now() / 86400000) % motivationMsg.length]}</p>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            /* === PROGRESS LAB === */
            <motion.div key="lab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* Lab Header */}
              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-bold mb-1">Progress Lab</p>
                <h3 className="font-display text-lg font-bold">Your complete body analytics & tracking center.</h3>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    { icon: Scale, text: `${currentWeight}kg current` },
                    { icon: Ruler, text: `${height}cm · BMI ${bmi}` },
                    { icon: Flame, text: `${targetCalories} kcal/day target` },
                    { icon: Activity, text: `${checkInsThisMonth} workouts this month` },
                  ].map((b, i) => (
                    <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
                      <b.icon className="w-3 h-3" /> {b.text}
                    </span>
                  ))}
                </div>
              </div>

              {/* Body Profile Setup */}
                <GlassCard delay={0.05} className="mb-6">
                  <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                  <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center"><Ruler className="w-4 h-4 text-primary" /></div>
                    <div><h3 className="font-display font-bold text-base lg:text-lg">Body Profile</h3><p className="text-[11px] text-muted-foreground">Configure for accurate calculations</p></div>
                  </div>

                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Height (cm)</Label>
                        <NumericInput value={heightInput} onChange={e => setHeightInput(e.target.value)} className="h-10 rounded-xl bg-background/40 border-border/30" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Weight (kg)</Label>
                        <NumericInput
                          value={entryWeight}
                          onChange={e => setEntryWeight(e.target.value)}
                          placeholder={currentWeight ? String(currentWeight) : "e.g. 60"}
                          className="h-10 rounded-xl bg-background/40 border-border/30"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Age</Label>
                        <NumericInput value={ageInput} onChange={e => setAgeInput(e.target.value)} className="h-10 rounded-xl bg-background/40 border-border/30" />
                      </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Gender</Label>
                      <div className="flex bg-background/40 rounded-xl border border-border/30 p-0.5 h-10">
                        {(["male", "female"] as const).map(g => (
                          <button key={g} onClick={() => setGender(g)}
                            className={`flex-1 rounded-lg text-xs font-semibold transition-all capitalize ${gender === g ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{g}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Target (kg)</Label>
                      <NumericInput value={goalInput} onChange={e => setGoalInput(e.target.value)} className="h-10 rounded-xl bg-background/40 border-border/30" />
                    </div>
                    <div className="space-y-1.5 col-span-2 lg:col-span-1">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Timeline (months)</Label>
                      <NumericInput value={goalMonthsInput} onChange={e => setGoalMonthsInput(e.target.value)} placeholder="months" className="h-10 rounded-xl bg-background/40 border-border/30" />
                    </div>
                  </div>
                    <Button variant="glow" className="rounded-xl gap-2" onClick={handleSaveProfile}><CheckCircle2 className="w-4 h-4" /> Save & Recalculate</Button>
                  </div>
                </GlassCard>

                {/* Smart Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-6">
                {/* BMI Card */}
                <GlassCard delay={0.1}>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-bold mb-4 text-center">Body Mass Index</p>
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                      <Ring value={bmi} max={40} size={120} strokeWidth={8} color={bmiColor} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-display text-3xl font-bold">{bmi}</span>
                        <span className="text-xs font-semibold" style={{ color: bmiColor }}>{bmiCategory}</span>
                      </div>
                    </div>
                    <div className="w-full space-y-1.5">
                      {[
                        { range: "< 18.5", label: "Underweight", active: bmi < 18.5 },
                        { range: "18.5 - 24.9", label: "Normal", active: bmi >= 18.5 && bmi < 25 },
                        { range: "25 - 29.9", label: "Overweight", active: bmi >= 25 && bmi < 30 },
                        { range: "≥ 30", label: "Obese", active: bmi >= 30 },
                      ].map(b => (
                        <div key={b.label} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${b.active ? "bg-primary/10 border border-primary/20 font-bold" : "text-muted-foreground"}`}>
                          <span>{b.label}</span><span className="font-mono">{b.range}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>

                {/* Calorie Plan */}
                <GlassCard delay={0.15}>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-bold mb-4">Your Daily Plan</p>
                  <div className="space-y-3">
                    {[
                      { label: "Base Metabolism (BMR)", value: Math.round(bmr), unit: "kcal", icon: Flame, desc: "Calories burned at rest", highlight: false },
                      { label: "Active Burn (TDEE)", value: tdee, unit: "kcal", icon: Zap, desc: `Based on ${checkInsThisMonth} workouts/mo`, highlight: false },
                      { label: "Target Intake", value: targetCalories, unit: "kcal", icon: Target, desc: isGaining ? "Calorie surplus for muscle gain" : "Calorie deficit for fat loss", highlight: true },
                      { label: "Daily Adjustment", value: `${dailyCalorieAdjustment > 0 ? "+" : ""}${dailyCalorieAdjustment}`, unit: "kcal", icon: ArrowUpRight, desc: `To ${isGaining ? "gain" : "lose"} ${Math.abs(weightChangeNeeded).toFixed(1)}kg in ${goalMonths}mo`, highlight: false },
                    ].map(s => (
                      <div key={s.label} className={`p-3.5 rounded-xl border ${s.highlight ? "bg-primary/8 border-primary/25" : "bg-background/40 border-border/30"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <s.icon className={`w-3.5 h-3.5 ${s.highlight ? "text-primary" : "text-muted-foreground/60"}`} />
                          <span className="text-xs font-semibold flex-1">{s.label}</span>
                        </div>
                        <div className="flex items-baseline gap-1 ml-5">
                          <span className={`font-display text-xl font-bold ${s.highlight ? "text-primary" : ""}`}>{s.value}</span>
                          <span className="text-xs text-muted-foreground">{s.unit}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 ml-5">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                {/* Macro & Hydration */}
                <GlassCard delay={0.2}>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-bold mb-4">Nutrition Targets</p>
                  <div className="space-y-3">
                    {[
                      { label: "Protein", value: `${proteinPerDay}g`, pct: 30, color: "hsl(152, 70%, 50%)", desc: `${(proteinPerDay / currentWeight).toFixed(1)}g per kg body weight` },
                      { label: "Carbs", value: `${carbsPerDay}g`, pct: 45, color: "hsl(178, 65%, 48%)", desc: "Primary energy source" },
                      { label: "Fats", value: `${fatsPerDay}g`, pct: 25, color: "hsl(42, 90%, 60%)", desc: "Hormones & cell health" },
                    ].map(m => (
                      <div key={m.label} className="bg-background/40 rounded-xl p-3.5 border border-border/30">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold">{m.label} ({m.pct}%)</span>
                          <span className="font-display text-lg font-bold">{m.value}</span>
                        </div>
                        <div className="h-1.5 bg-secondary/30 rounded-full overflow-hidden mb-1.5">
                          <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.color }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                      </div>
                    ))}
                    <div className="bg-background/40 rounded-xl p-3.5 border border-glow-cyan/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><Droplets className="w-4 h-4 text-glow-cyan" /><span className="text-xs font-bold">Water Intake</span></div>
                        <span className="font-display text-lg font-bold text-glow-cyan">{waterPerDay} L/day</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 ml-6">~{Math.round(waterPerDay * 4)} glasses per day</p>
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Weight Trend + Goal Tracking */}
              <div className="grid lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
                <GlassCard delay={0.25}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold">Weight Trend</h3>
                    <span className="text-xs text-muted-foreground">Latest: {weightLog.length > 0 ? format(new Date(weightLog[weightLog.length - 1].date), "MMM d") : "–"}</span>
                  </div>
                  <WeightChart data={weightChartData} currentIdx={weightCurrentIdx} gradientId="wg3" height={200} goalStatus={goalStatus} />
                </GlassCard>

                <GlassCard delay={0.3}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2"><Target className="w-4 h-4 text-primary" /><h3 className="font-display font-bold">Goal Tracker</h3></div>
                    {goalStatus !== "completed" && (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        goalStatus === "ahead" ? "bg-glow-cyan/10 text-glow-cyan border-glow-cyan/20" 
                        : goalStatus === "on_track" ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-glow-gold/10 text-glow-gold border-glow-gold/20"
                      }`}>
                        {goalStatus === "ahead" ? "⚡ Ahead of schedule" : goalStatus === "on_track" ? "✓ On track" : "⚠ Behind schedule"}
                      </span>
                    )}
                  </div>

                  {goalStatus === "completed" ? (
                    <div className="text-center py-4">
                      <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3">
                        <Trophy className="w-8 h-8 text-primary" />
                      </div>
                      <h4 className="font-display text-xl font-bold mb-1">🎉 Goal Completed!</h4>
                      <p className="text-sm text-muted-foreground mb-4">You reached {goalWeight}kg — incredible work!</p>
                      <Button variant="glow" className="rounded-xl gap-2" onClick={() => { setTab("lab"); }}>
                        <Plus className="w-4 h-4" /> Set New Goal
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div><p className="text-[10px] uppercase text-muted-foreground font-bold">Current</p><p className="font-display text-2xl font-bold">{currentWeight}kg</p></div>
                        <div className="flex flex-col items-center"><ArrowUpRight className="w-5 h-5 text-primary" /><span className="text-[10px] text-muted-foreground">{daysToGoal}d</span></div>
                        <div className="text-right"><p className="text-[10px] uppercase text-muted-foreground font-bold">Target</p><p className="font-display text-2xl font-bold text-primary">{goalWeight}kg</p></div>
                      </div>
                      <div className="relative h-3 bg-secondary/30 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-gradient-to-r from-primary to-glow-cyan rounded-full transition-all" style={{ width: `${goalProgress}%` }} />
                        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary-foreground rounded-full border-2 border-primary shadow-lg transition-all" style={{ left: `calc(${Math.max(2, Math.min(96, goalProgress))}% - 6px)` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-4">
                        <span>{startWeight}kg start</span>
                        <span className="font-semibold text-primary">{goalProgress}% complete</span>
                        <span>{goalWeight}kg goal</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-background/40 rounded-xl p-2.5 border border-border/30 text-center">
                          <p className="text-[10px] text-muted-foreground">Remaining</p>
                          <p className="font-display text-sm font-bold">{goalRemaining.toFixed(1)} kg</p>
                        </div>
                        <div className="bg-background/40 rounded-xl p-2.5 border border-border/30 text-center">
                          <p className="text-[10px] text-muted-foreground">Weekly Rate</p>
                          <p className="font-display text-sm font-bold">{weeklyChange > 0 ? "+" : ""}{weeklyChange} kg</p>
                        </div>
                      </div>
                    </>
                  )}
                </GlassCard>
              </div>


              {/* Milestones */}
              <GlassCard delay={0.4}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-bold">Milestones</h3>
                  <span className="text-xs text-muted-foreground">{milestonesUnlocked}/{milestones.length}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {milestones.map((m, i) => (
                    <span key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${m.done ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/20 border-border text-muted-foreground"}`}>
                      {m.done ? <CheckCircle2 className="w-3 h-3" /> : <Trophy className="w-3 h-3" />} {m.label}
                    </span>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MemberLayout>
  );
};

export default MemberProgress;

