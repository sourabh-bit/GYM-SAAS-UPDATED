import MemberLayout from "@/components/dashboard/MemberLayout";
import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Star, Flame, Zap, Target, Award, Shield, Dumbbell,
  Clock, Calendar, Sun, TrendingUp, CheckCircle2, Activity, Sparkles, Crown,
  ChevronRight, Lock
} from "lucide-react";
import { useMemberData } from "@/hooks/useMemberData";
import {
  useMemberXP,
  useChallengeCompletions,
  useCompleteChallenge,
  generateChallenges,
  getTier,
  RANKS,
  getXPProgress,
  XP_REWARDS,
} from "@/hooks/useChallenges";
import { format, subDays, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import MemberHeroCard from "@/components/member/MemberHeroCard";
import { useMemberWorkoutPlan, useMemberWorkoutSessions } from "@/hooks/useMemberWorkoutSync";
import { useMemberProgressEntries, useMemberProfileSettings } from "@/hooks/useMemberProgressSync";
import { useGymAccess } from "@/hooks/useGymAccess";
import FeatureLock from "@/components/FeatureLock";

const categoryIcons: Record<string, React.ComponentType<any>> = {
  consistency: Target,
  fitness: Activity,
  strength: Dumbbell,
};

const difficultyConfig = {
  easy: { label: "Easy", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  hard: { label: "Hard", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  weekly: { label: "Weekly", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
};

const MemberAchievements = () => {
  const { access, isLoading: accessLoading } = useGymAccess();
  const { member, attendance, gym } = useMemberData();
  const { data: workoutPlan } = useMemberWorkoutPlan();
  const { data: workoutSessions = [] } = useMemberWorkoutSessions();
  const progressEntriesQuery = useMemberProgressEntries();
  const profileSettingsQuery = useMemberProfileSettings();
  const { xp, level, tier, isLoading: xpLoading } = useMemberXP();
  const { data: completions = [] } = useChallengeCompletions();
  const completeChallenge = useCompleteChallenge();

  if (accessLoading) {
    return (
      <MemberLayout title="Achievements" subtitle="Rank up & earn rewards">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MemberLayout>
    );
  }

  if (!access.features.member_app_premium) {
    return (
      <MemberLayout title="Achievements" subtitle="Rank up & earn rewards">
        <FeatureLock
          title="Achievements Locked"
          description="Your gym is not on the Pro plan. Ask your gym owner to upgrade to unlock challenges and rewards."
          showCta={false}
        />
      </MemberLayout>
    );
  }

  const [tab, setTab] = useState<"challenges" | "badges" | "milestones">("challenges");
  const [claimingKeys, setClaimingKeys] = useState<Set<string>>(new Set());
  const [levelUpPopup, setLevelUpPopup] = useState<{ show: boolean; newLevel: number; newTier: typeof tier } | null>(null);
  const prevLevelRef = useRef(level);

  const today = new Date();
  const todayDateKey = format(today, "yyyy-MM-dd");
  const todayDayKey = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][((today.getDay() + 6) % 7)];
  const isWeekendToday = today.getDay() === 0 || today.getDay() === 6;

  // Level-up detection (persisted to avoid re-showing on refresh)
  useEffect(() => {
    if (!member?.id || xpLoading) return;
    const storageKey = `member-level-seen:${member.id}`;
    const stored = localStorage.getItem(storageKey);

    if (stored === null) {
      localStorage.setItem(storageKey, String(level));
      prevLevelRef.current = level;
      return;
    }

    const storedLevel = Number(stored);
    const lastSeen = Number.isFinite(storedLevel) ? storedLevel : 0;

    if (level > lastSeen) {
      const newTier = getTier(level);
      setLevelUpPopup({ show: true, newLevel: level, newTier: newTier });
      localStorage.setItem(storageKey, String(level));
    }

    prevLevelRef.current = level;
  }, [level, member?.id]);

  // XP sync removed - server is now source of truth

  const totalCheckIns = attendance?.length || 0;
  const todayAttendance = useMemo(
    () => attendance?.filter((a: any) => format(new Date(a.check_in), "yyyy-MM-dd") === todayDateKey) || [],
    [attendance, todayDateKey],
  );
  const todayCheckIns = todayAttendance.length;
  const hasEarlyCheckinToday = useMemo(
    () => todayAttendance.some((a: any) => new Date(a.check_in).getHours() < 8),
    [todayAttendance],
  );

  const hasEveningCheckinToday = useMemo(
    () => todayAttendance.some((a: any) => new Date(a.check_in).getHours() >= 18),
    [todayAttendance],
  );

  const checkInsLast14Days = useMemo(
    () =>
      attendance?.filter((a: any) => differenceInDays(today, new Date(a.check_in)) <= 13).length || 0,
    [attendance],
  );

  const checkInsThisMonth = useMemo(() =>
    attendance?.filter((a: any) => {
      const d = new Date(a.check_in);
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }).length || 0
  , [attendance]);

  const checkInsThisWeek = useMemo(() => {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    return attendance?.filter((a: any) => new Date(a.check_in) >= weekStart).length || 0;
  }, [attendance]);

  const workoutStreak = useMemo(() => {
    if (!attendance || attendance.length === 0) return 0;
    const dates = [...new Set(attendance.map((a: any) => format(new Date(a.check_in), "yyyy-MM-dd")))].sort().reverse();
    let s = 0;
    for (let i = 0; i < dates.length; i++) {
      if (dates[i] === format(subDays(today, i), "yyyy-MM-dd")) s++; else break;
    }
    return s;
  }, [attendance]);

  const memberDays = useMemo(() => {
    if (!member?.joined_at) return 0;
    return differenceInDays(today, new Date(member.joined_at));
  }, [member]);
  const memberMonths = Math.floor(memberDays / 30);

  const strengthBests = useMemo(() => {
    const lifts = ["Bench Press", "Squat", "Deadlift"];
    return lifts.map(name => {
      if (!workoutPlan) return { name, best: 0 };
      let max = 0;
      Object.values(workoutPlan).forEach((day) => {
        day.exercises?.forEach((ex) => {
          if (ex.name === name) ex.sets?.forEach((s) => { if (s.weight > max) max = s.weight; });
        });
      });
      return { name, best: max };
    });
  }, [workoutPlan]);
  const totalPRs = strengthBests.filter(s => s.best > 0).length;

  const todayPlan = useMemo(() => workoutPlan?.[todayDayKey] || null, [todayDayKey, workoutPlan]);
  const todayExercises = todayPlan?.exercises || [];
  const todayWorkoutSessions = useMemo(
    () => workoutSessions.filter((s) => format(new Date(s.date), "yyyy-MM-dd") === todayDateKey),
    [todayDateKey, workoutSessions],
  );

  const todayCompletedSets = useMemo(
    () => todayWorkoutSessions.reduce((sum, s) => sum + (s.completed || 0), 0),
    [todayWorkoutSessions],
  );

  const todayMaxCompletedSets = useMemo(
    () => todayWorkoutSessions.reduce((max, s) => Math.max(max, s.completed || 0), 0),
    [todayWorkoutSessions],
  );

  const hasFullWorkoutToday = useMemo(
    () => todayWorkoutSessions.some((s) => (s.total || 0) > 0 && (s.completed || 0) >= (s.total || 0)),
    [todayWorkoutSessions],
  );

  const hasWorkoutLoggedThisWeek = useMemo(() => {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    return workoutSessions.some((s) => new Date(s.date) >= weekStart);
  }, [today, workoutSessions]);

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

  const earlyCheckins = useMemo(() =>
    attendance?.filter((a: any) => new Date(a.check_in).getHours() < 8).length || 0
  , [attendance]);

  const xpProgress = getXPProgress(xp);
  const isGymMaster = tier.name === "Gym Master";

  const completedKeys = completions.map((c: any) => c.challenge_key);
  const workoutChallengeKeys = ["complete_workout", "log_sets", "push_yourself", "warm_up", "extra_set", "volume_beast"];
  const prChallengeKeys = ["pr_hunter", "big_three", "strength_surge"];
  const progressChallengeKeys = ["log_progress", ...prChallengeKeys];
  const isWorkoutDay = todayPlan?.type !== "Rest" && todayExercises.length > 0;
  const activeChallenges = useMemo(() => {
    if (!member?.id) return [];
    const excludeKeys = [
      ...(!isWorkoutDay ? workoutChallengeKeys : []),
      ...(!isWeekendToday ? ["weekend_warrior"] : []),
      ...(!hasProgressLogs ? progressChallengeKeys : []),
      ...(goalWeight ? [] : ["log_progress"]),
    ];
    const preferredCategories =
      goalType === "loss" ? ["consistency", "fitness"] :
      goalType === "gain" ? ["strength", "fitness"] :
      goalType === "maintain" ? ["consistency", "fitness", "strength"] :
      undefined;
    const challenges = generateChallenges(
      level,
      tier.name,
      member.id,
      completedKeys,
      undefined,
      { excludeKeys, preferredCategories },
    );
    return challenges
      .filter(c => !completedKeys.includes(c.key)) // Remove already completed
      .map(c => {
        let progress = 0;
        const templateKey = c.templateKey.replace(/_v\d+$/, "");

        switch (templateKey) {
          case "daily_checkin":
          case "stay_active":
            progress = todayCheckIns > 0 ? 1 : 0;
            break;
          case "early_checkin":
            progress = hasEarlyCheckinToday ? 1 : 0;
            break;
          case "evening_grind":
            progress = hasEveningCheckinToday ? 1 : 0;
            break;
          case "weekend_warrior":
            progress = isWeekendToday && todayCheckIns > 0 ? 1 : 0;
            break;
          case "log_progress":
            progress = progressEntries.some((entry) => format(new Date(entry.date), "yyyy-MM-dd") === todayDateKey) ? 1 : 0;
            break;
          case "complete_workout":
          case "log_sets":
          case "push_yourself":
            progress = hasFullWorkoutToday ? 1 : 0;
            break;
          case "warm_up":
            progress = todayCompletedSets;
            break;
          case "extra_set":
            progress = todayCompletedSets;
            break;
          case "weekly_warrior":
          case "consistency_champ":
            progress = checkInsThisWeek;
            break;
          case "monthly_grinder":
            progress = checkInsThisMonth;
            break;
          case "iron_marathon":
            progress = checkInsLast14Days;
            break;
          case "two_day_streak":
          case "five_day_streak":
          case "streak_builder":
            progress = workoutStreak;
            break;
          case "pr_hunter":
          case "big_three":
          case "strength_surge":
            progress = hasWorkoutLoggedThisWeek && hasProgressLogs ? totalPRs : 0;
            break;
          case "volume_beast":
            progress = todayMaxCompletedSets;
            break;
          default:
            switch (c.type) {
              case "checkin":
                progress = checkInsThisMonth;
                break;
              case "streak":
                progress = workoutStreak;
                break;
              case "pr":
                progress = totalPRs;
                break;
              default:
                progress = 0;
            }
        }
        return { ...c, progress: Math.min(progress, c.target) };
      });
  }, [
    member?.id,
    level,
    tier.name,
    completedKeys,
    todayCheckIns,
    todayCompletedSets,
    todayMaxCompletedSets,
    hasFullWorkoutToday,
    hasWorkoutLoggedThisWeek,
    checkInsThisWeek,
    checkInsThisMonth,
    checkInsLast14Days,
    workoutStreak,
    totalPRs,
    hasEarlyCheckinToday,
    hasEveningCheckinToday,
    isWeekendToday,
    hasFullWorkoutToday,
    hasWorkoutLoggedThisWeek,
    hasProgressLogs,
    goalWeight,
    goalType,
    progressEntries,
    todayDateKey,
  ]);

  const handleCompleteChallenge = (challenge: typeof activeChallenges[0]) => {
    // Prevent double-claim
    if (claimingKeys.has(challenge.key)) return;
    setClaimingKeys(prev => new Set(prev).add(challenge.key));
    
    completeChallenge.mutate({
      challengeKey: challenge.key,
      challengeName: challenge.name,
      xpEarned: challenge.xpReward,
    }, {
      onSettled: () => {
        setClaimingKeys(prev => {
          const next = new Set(prev);
          next.delete(challenge.key);
          return next;
        });
      }
    });
  };

  const badges = useMemo(() => [
    { name: "First Step", desc: "Complete your first check-in", icon: Dumbbell, earned: totalCheckIns >= 1, progress: Math.min(totalCheckIns, 1), target: 1, rarity: "Common" },
    { name: "Regular", desc: "Complete 10 check-ins", icon: Activity, earned: totalCheckIns >= 10, progress: Math.min(totalCheckIns, 10), target: 10, rarity: "Common" },
    { name: "Iron Will", desc: "50 check-ins", icon: Dumbbell, earned: totalCheckIns >= 50, progress: Math.min(totalCheckIns, 50), target: 50, rarity: "Rare" },
    { name: "Centurion", desc: "100 check-ins", icon: Shield, earned: totalCheckIns >= 100, progress: Math.min(totalCheckIns, 100), target: 100, rarity: "Epic" },
    { name: "Early Bird", desc: "10 early check-ins", icon: Sun, earned: earlyCheckins >= 10, progress: Math.min(earlyCheckins, 10), target: 10, rarity: "Common" },
    { name: "On Fire", desc: "7-day streak", icon: Flame, earned: workoutStreak >= 7, progress: Math.min(workoutStreak, 7), target: 7, rarity: "Rare" },
    { name: "Streak Master", desc: "30-day streak", icon: Flame, earned: workoutStreak >= 30, progress: Math.min(workoutStreak, 30), target: 30, rarity: "Epic" },
    { name: "PR Hunter", desc: "Set a personal record", icon: Trophy, earned: totalPRs >= 1, progress: Math.min(totalPRs, 1), target: 1, rarity: "Rare" },
    { name: "Veteran", desc: "6 months member", icon: Calendar, earned: memberMonths >= 6, progress: Math.min(memberMonths, 6), target: 6, rarity: "Epic" },
    { name: "Legend", desc: "1 year member", icon: Star, earned: memberMonths >= 12, progress: Math.min(memberMonths, 12), target: 12, rarity: "Legendary" },
    { name: "Dedicated", desc: "15+ monthly check-ins", icon: Target, earned: checkInsThisMonth >= 15, progress: Math.min(checkInsThisMonth, 15), target: 15, rarity: "Rare" },
    { name: "Machine", desc: "25+ monthly check-ins", icon: Zap, earned: checkInsThisMonth >= 25, progress: Math.min(checkInsThisMonth, 25), target: 25, rarity: "Legendary" },
  ], [totalCheckIns, earlyCheckins, workoutStreak, totalPRs, memberMonths, checkInsThisMonth]);

  const earnedCount = badges.filter(b => b.earned).length;

  const milestones = useMemo(() => [
    { title: "First Check-in", achieved: totalCheckIns >= 1, current: totalCheckIns, target: 1 },
    { title: "10 Check-ins", achieved: totalCheckIns >= 10, current: totalCheckIns, target: 10 },
    { title: "50 Check-ins", achieved: totalCheckIns >= 50, current: totalCheckIns, target: 50 },
    { title: "100 Check-ins", achieved: totalCheckIns >= 100, current: totalCheckIns, target: 100 },
    { title: "7-Day Streak", achieved: workoutStreak >= 7, current: workoutStreak, target: 7 },
    { title: "30-Day Streak", achieved: workoutStreak >= 30, current: workoutStreak, target: 30 },
    { title: "Reach Warrior", achieved: level >= 21, current: level, target: 21 },
    { title: "Reach Elite", achieved: level >= 31, current: level, target: 31 },
    { title: "Reach Champion", achieved: level >= 41, current: level, target: 41 },
    { title: "1 Year Member", achieved: memberMonths >= 12, current: memberMonths, target: 12 },
  ], [totalCheckIns, workoutStreak, level, memberMonths]);

  const milestonesAchieved = milestones.filter(m => m.achieved).length;

  // Group challenges by difficulty
  const easyChallenges = activeChallenges.filter(c => c.difficulty === "easy");
  const hardChallenges = activeChallenges.filter(c => c.difficulty === "hard");
  const weeklyChallenges = activeChallenges.filter(c => c.difficulty === "weekly");

  const rankIndex = RANKS.findIndex(r => r.name === tier.name);
  const rankProgress = Math.max(5, (rankIndex / (RANKS.length - 1)) * 100);

  return (
    <MemberLayout title="Achievements" subtitle="Rank up & earn rewards">
      <MemberHeroCard
        eyebrow="Achievements"
        title={`${tier.emoji} ${tier.name} Rank`}
        subtitle="Complete challenges, claim XP, and keep your streak alive."
        gymName={gym?.name}
        chips={[
          { label: `Level ${level}`, tone: "primary" },
          { label: `${xp.toLocaleString()} XP`, tone: "muted" },
          { label: `${workoutStreak} day streak`, icon: <Flame className="w-3.5 h-3.5" />, tone: "success" },
        ]}
        className="mb-5"
      />

      {/* ── HERO RANK CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden mb-5"
      >
        {/* ── Rank-specific banner backgrounds ── */}
        {/* Base gradient - all ranks */}
        <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-[0.08]`} />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />

        {/* Rookie: subtle shield glow */}
        {rankIndex === 0 && (
          <>
            <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-slate-400/8 -translate-y-8 translate-x-8 blur-2xl" />
            <div className="absolute bottom-0 left-4 w-16 h-16 rounded-full bg-slate-500/6 translate-y-4 blur-xl" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-400/15 to-transparent" />
          </>
        )}

        {/* Beginner: soft orb */}
        {rankIndex === 1 && (
          <>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-blue-500/8 -translate-y-8 translate-x-8 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-blue-400/5 translate-y-6 -translate-x-4 blur-xl" />
          </>
        )}

        {/* Apprentice: dual orbs + line accent */}
        {rankIndex === 2 && (
          <>
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-emerald-500/10 -translate-y-12 translate-x-12 blur-2xl" />
            <div className="absolute bottom-0 left-4 w-24 h-24 rounded-full bg-emerald-400/8 translate-y-8 blur-xl" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent" />
          </>
        )}

        {/* Warrior: crossed energy lines */}
        {rankIndex === 3 && (
          <>
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-orange-500/10 -translate-y-16 translate-x-16 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-amber-500/8 translate-y-10 -translate-x-6 blur-2xl" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-400/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-400/20 to-transparent" />
          </>
        )}

        {/* Elite: triple glow + shimmer */}
        {rankIndex === 4 && (
          <>
            <div className="absolute top-0 right-0 w-52 h-52 rounded-full bg-purple-500/12 -translate-y-20 translate-x-16 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full bg-purple-400/10 translate-y-12 -translate-x-8 blur-2xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-purple-300/5 blur-xl" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />
            <motion.div animate={{ opacity: [0.03, 0.08, 0.03] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-300/10 to-transparent" />
          </>
        )}

        {/* Champion: golden aurora */}
        {rankIndex === 5 && (
          <>
            <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-yellow-500/12 -translate-y-20 translate-x-12 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-amber-400/10 translate-y-14 -translate-x-8 blur-3xl" />
            <div className="absolute top-1/3 right-1/4 w-20 h-20 rounded-full bg-yellow-300/8 blur-2xl" />
            <motion.div animate={{ opacity: [0.05, 0.12, 0.05] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-amber-400/5" />
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />
          </>
        )}

        {/* Legend: fire aura */}
        {rankIndex === 6 && (
          <>
            <div className="absolute top-0 right-0 w-60 h-60 rounded-full bg-red-500/15 -translate-y-24 translate-x-12 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-44 h-44 rounded-full bg-orange-500/12 translate-y-16 -translate-x-10 blur-3xl" />
            <motion.div animate={{ opacity: [0.05, 0.15, 0.05], scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute top-1/4 left-1/3 w-28 h-28 rounded-full bg-red-400/8 blur-2xl" />
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-400/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-400/30 to-transparent" />
          </>
        )}

        {/* Titan: cosmic pulse */}
        {rankIndex === 7 && (
          <>
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-rose-600/15 -translate-y-28 translate-x-14 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-rose-500/12 translate-y-20 -translate-x-12 blur-3xl" />
            <motion.div animate={{ opacity: [0.03, 0.12, 0.03], rotate: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 5 }} className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-pink-400/8" />
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.15, 0.05] }} transition={{ repeat: Infinity, duration: 2.5 }} className="absolute top-1/3 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full bg-rose-400/10 blur-2xl" />
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500/30 via-rose-400/60 to-rose-500/30" />
          </>
        )}

        {/* Iron Beast: volcanic energy */}
        {rankIndex === 8 && (
          <>
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-red-700/15 -translate-y-32 translate-x-16 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full bg-red-600/12 translate-y-24 -translate-x-16 blur-3xl" />
            <motion.div animate={{ opacity: [0.05, 0.2, 0.05] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute top-0 left-1/4 w-40 h-40 rounded-full bg-red-500/10 blur-3xl" />
            <motion.div animate={{ opacity: [0.08, 0.18, 0.08], x: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 4 }} className="absolute inset-0 bg-gradient-to-r from-red-600/5 via-transparent to-red-500/8" />
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-700/40 via-red-500/70 to-red-700/40" />
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
          </>
        )}

        {/* Gym Master: supreme holo aura */}
        {rankIndex === 9 && (
          <>
            <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-cyan-400/15 -translate-y-36 translate-x-20 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-teal-400/12 translate-y-28 -translate-x-18 blur-3xl" />
            <motion.div animate={{ opacity: [0.05, 0.2, 0.05], rotate: [0, 3, -3, 0] }} transition={{ repeat: Infinity, duration: 6 }} className="absolute inset-0 bg-gradient-to-br from-cyan-400/8 via-transparent to-teal-400/10" />
            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.2, 0.05] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute top-1/4 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-cyan-300/10 blur-3xl" />
            <motion.div animate={{ opacity: [0.1, 0.25, 0.1] }} transition={{ repeat: Infinity, duration: 2 }} className="absolute bottom-1/4 right-1/4 w-24 h-24 rounded-full bg-teal-300/10 blur-2xl" />
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-500/30 via-teal-300/80 to-cyan-500/30" />
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
            <motion.div className="absolute -top-1 left-1/2 -translate-x-1/2" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
              <Crown className="w-6 h-6 text-glow-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" />
            </motion.div>
          </>
        )}

        <div className={`relative border ${tier.border} rounded-2xl p-4 sm:p-5 backdrop-blur-sm`}>
          {/* Rank info row */}
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl border ${tier.border} flex items-center justify-center ${tier.bg} shadow-lg`}>
              <span className="text-xl sm:text-2xl">{tier.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`font-display text-lg sm:text-xl font-black ${tier.color} leading-tight`}>{tier.name}</h2>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${tier.bg} ${tier.color} border ${tier.border}`}>
                  LV {level}
                </span>
              </div>
              {/* XP bar */}
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-2 rounded-full bg-background/60 overflow-hidden border border-border/20">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress.progress}%` }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className={`h-full rounded-full bg-gradient-to-r ${tier.gradient} shadow-[0_0_8px_rgba(var(--primary),0.3)]`}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-muted-foreground whitespace-nowrap">
                  {xpProgress.xpInLevel}/{xpProgress.xpNeeded}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {xp.toLocaleString()} XP total · {xpProgress.xpNeeded - xpProgress.xpInLevel} to next
              </p>
            </div>
          </div>

          {/* Stats row – compact */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { val: earnedCount, label: "Badges" },
              { val: `${workoutStreak}d`, label: "Streak" },
              { val: totalCheckIns, label: "Workouts" },
              { val: completions.length, label: "Challenges Done" },
            ].map(s => (
              <div key={s.label} className="text-center py-1.5 rounded-lg bg-background/40 border border-border/20">
                <p className="font-display text-sm sm:text-base font-black leading-tight">{s.val}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── RANK LADDER - Compact ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-card/50 border border-border/50 rounded-xl p-3 mb-5 backdrop-blur-sm"
      >
        <div className="flex items-center gap-2 mb-2.5">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold">Rank Ladder</span>
        </div>
        <div className="relative h-2 rounded-full bg-secondary/50 overflow-hidden mb-2.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${rankProgress}%` }}
            transition={{ delay: 0.2, duration: 1 }}
            className="h-full rounded-full bg-gradient-to-r from-primary via-glow-cyan to-glow-gold"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
          {RANKS.map((r, i) => {
            const isActive = tier.name === r.name;
            const isPassed = level > r.maxLevel;
            return (
              <div
                key={r.name}
                className={`flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[9px] sm:text-[10px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                  isActive ? `${r.bg} ${r.color} border ${r.border} ring-1 ring-offset-1 ring-offset-background ${r.border}` :
                  isPassed ? `${r.color} opacity-70` : "text-muted-foreground/40"
                }`}
              >
                <span>{r.emoji}</span>
                {/* Always show name for current rank, desktop shows all */}
                <span className={isActive ? "inline" : "hidden sm:inline"}>{r.name}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── TABS ── */}
      <div className="flex rounded-xl bg-card/50 border border-border/50 p-0.5 mb-5 backdrop-blur-sm">
        {[
          { id: "challenges" as const, label: "Challenges", count: activeChallenges.length },
          { id: "badges" as const, label: "Badges", count: `${earnedCount}/${badges.length}` },
          { id: "milestones" as const, label: "Goals", count: `${milestonesAchieved}/${milestones.length}` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              tab === t.id
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === t.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-lg bg-primary shadow-lg shadow-primary/20"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
            <span className={`relative z-10 ml-1 text-[10px] ${tab === t.id ? "opacity-80" : "opacity-50"}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <AnimatePresence mode="wait">
        {/* ─── CHALLENGES TAB ─── */}
        {tab === "challenges" && (
          <motion.div
            key="challenges"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeChallenges.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No active challenges</p>
                <p className="text-xs mt-1">Check back tomorrow!</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Easy */}
                {easyChallenges.length > 0 && (
                  <ChallengeGroup
                    title="Daily"
                    subtitle="Complete today"
                    config={difficultyConfig.easy}
                    challenges={easyChallenges}
                    onComplete={handleCompleteChallenge}
                    claimingKeys={claimingKeys}
                  />
                )}
                {/* Hard */}
                {hardChallenges.length > 0 && (
                  <ChallengeGroup
                    title="Hard"
                    subtitle="Push your limits"
                    config={difficultyConfig.hard}
                    challenges={hardChallenges}
                    onComplete={handleCompleteChallenge}
                    claimingKeys={claimingKeys}
                  />
                )}
                {/* Weekly */}
                {weeklyChallenges.length > 0 && (
                  <ChallengeGroup
                    title="Weekly"
                    subtitle="Long-term goals"
                    config={difficultyConfig.weekly}
                    challenges={weeklyChallenges}
                    onComplete={handleCompleteChallenge}
                    claimingKeys={claimingKeys}
                  />
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ─── BADGES TAB ─── */}
        {tab === "badges" && (
          <motion.div
            key="badges"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {badges.map((b, i) => (
              <motion.div
                key={b.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  b.earned
                    ? "bg-primary/5 border-primary/20"
                    : "bg-card/50 border-border/50 opacity-70"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  b.earned ? "bg-primary/15" : "bg-secondary/50"
                }`}>
                  {b.earned ? (
                    <b.icon className="w-5 h-5 text-primary" />
                  ) : (
                    <Lock className="w-4 h-4 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold truncate">{b.name}</h4>
                    {b.earned && <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{b.desc}</p>
                </div>
                {!b.earned && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-12 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-muted-foreground/30" style={{ width: `${(b.progress / b.target) * 100}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{b.progress}/{b.target}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ─── MILESTONES TAB ─── */}
        {tab === "milestones" && (
          <motion.div
            key="milestones"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            {milestones.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  m.achieved ? "bg-primary/5 border-primary/20" : "bg-card/50 border-border/50"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  m.achieved ? "bg-primary/15" : "bg-secondary/50"
                }`}>
                  {m.achieved ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Star className="w-4 h-4 text-muted-foreground/50" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold">{m.title}</h4>
                  {m.achieved ? (
                    <p className="text-[11px] text-primary font-medium">Achieved ✓</p>
                  ) : (
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-muted-foreground/30" style={{ width: `${Math.min(100, (m.current / m.target) * 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">{m.current}/{m.target}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── LEVEL UP POPUP ── */}
      <AnimatePresence>
        {levelUpPopup?.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setLevelUpPopup(null)}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xs rounded-2xl border border-primary/30 bg-card overflow-hidden shadow-2xl shadow-primary/20"
            >
              {/* Glow effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${levelUpPopup.newTier.gradient} opacity-[0.08]`} />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full bg-primary/20 blur-3xl" />

              <div className="relative p-6 text-center">
                {/* Animated emoji */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
                  className="text-5xl mb-3"
                >
                  {levelUpPopup.newTier.emoji}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Level Up!</p>
                  <h3 className="text-2xl font-black mb-1">Level {levelUpPopup.newLevel}</h3>
                  <p className={`text-sm font-bold ${levelUpPopup.newTier.color}`}>
                    {levelUpPopup.newTier.name}
                  </p>
                </motion.div>

                {/* Sparkle particles */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0.5],
                      x: [0, (i % 2 === 0 ? 1 : -1) * (30 + i * 15)],
                      y: [0, -(20 + i * 10)],
                    }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 1.2, ease: "easeOut" }}
                    className="absolute top-1/3 left-1/2 w-1.5 h-1.5 rounded-full bg-primary"
                  />
                ))}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-5"
                >
                  <Button
                    onClick={() => setLevelUpPopup(null)}
                    className="w-full font-bold shadow-lg shadow-primary/20"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" /> Awesome!
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MemberLayout>
  );
};

/* ── Challenge Group Component ── */
interface ChallengeGroupProps {
  title: string;
  subtitle: string;
  config: { label: string; color: string; bg: string; border: string };
  challenges: any[];
  onComplete: (c: any) => void;
  claimingKeys: Set<string>;
}

const ChallengeGroup = ({ title, subtitle, config, challenges, onComplete, claimingKeys }: ChallengeGroupProps) => (
  <div>
    <div className="flex items-center gap-2 mb-2">
      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${config.bg} ${config.color} border ${config.border}`}>
        {title}
      </span>
      <span className="text-[10px] text-muted-foreground">{subtitle}</span>
    </div>
    <div className="space-y-1.5">
      {challenges.map((c: any, i: number) => {
        const CategoryIcon = categoryIcons[c.category] || Target;
        const isComplete = c.progress >= c.target;
        const pct = Math.min(100, (c.progress / c.target) * 100);

        return (
          <motion.div
            key={c.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`relative rounded-xl border overflow-hidden transition-all ${
              isComplete
                ? "border-primary/30 bg-primary/5"
                : "border-border/50 bg-card/50"
            }`}
          >
            {/* Progress background fill */}
            <div
              className={`absolute inset-y-0 left-0 ${isComplete ? "bg-primary/8" : "bg-primary/[0.03]"} transition-all duration-500`}
              style={{ width: `${pct}%` }}
            />

            <div className="relative p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isComplete ? "bg-primary/20" : "bg-secondary/60"
              }`}>
                {isComplete ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-primary" />
                ) : (
                  <CategoryIcon className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[13px] font-bold truncate">{c.name}</h4>
                </div>
                <p className="text-[10px] text-muted-foreground truncate leading-relaxed">{c.description}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {isComplete ? (
                  <Button
                    size="sm"
                    onClick={() => onComplete(c)}
                    disabled={claimingKeys.has(c.key)}
                    className="h-7 text-[10px] font-bold px-2.5 rounded-lg shadow-lg shadow-primary/20"
                  >
                    {claimingKeys.has(c.key) ? (
                      <span className="animate-pulse">Claiming...</span>
                    ) : (
                      <><Sparkles className="w-3 h-3 mr-0.5" /> +{c.xpReward}</>
                    )}
                  </Button>
                ) : (
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-primary">+{c.xpReward}</p>
                    <p className="text-[9px] font-mono text-muted-foreground">{c.progress}/{c.target}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  </div>
);

export default MemberAchievements;
