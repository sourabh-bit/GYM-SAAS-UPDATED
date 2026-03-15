import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberData } from "./useMemberData";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, format, subDays } from "date-fns";
import { toast } from "sonner";

const isDemoMemberMode = () =>
  typeof window !== "undefined" &&
  window.location.pathname === "/demo" &&
  new URLSearchParams(window.location.search).get("mode") === "member";

const getInvokeErrorMessage = async (error: unknown) => {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { message?: string; context?: unknown };

  const context = candidate.context;
  if (context instanceof Response) {
    try {
      const json = await context.clone().json() as { error?: string; message?: string };
      if (json?.error) return json.error;
      if (json?.message) return json.message;
    } catch {
      // Ignore JSON parse failures and fallback below.
    }

    try {
      const text = await context.clone().text();
      if (text && text.trim()) return text.trim();
    } catch {
      // Ignore text parse failures and fallback below.
    }
  }

  return candidate.message || null;
};

// Rank definitions based on level with XP thresholds
export const RANKS = [
  { name: "Rookie",      minLevel: 1,  maxLevel: 5,   minXP: 0,     maxXP: 300,   color: "text-slate-400",    bg: "bg-slate-400/10",    border: "border-slate-400/20",   gradient: "from-slate-500 to-slate-400",   emoji: "🛡️" },
  { name: "Beginner",    minLevel: 6,  maxLevel: 10,  minXP: 300,   maxXP: 800,   color: "text-blue-400",     bg: "bg-blue-400/10",     border: "border-blue-400/20",    gradient: "from-blue-500 to-blue-400",     emoji: "🎯" },
  { name: "Apprentice",  minLevel: 11, maxLevel: 20,  minXP: 800,   maxXP: 2000,  color: "text-emerald-400",  bg: "bg-emerald-400/10",  border: "border-emerald-400/20", gradient: "from-emerald-500 to-emerald-400", emoji: "⚡" },
  { name: "Warrior",     minLevel: 21, maxLevel: 30,  minXP: 2000,  maxXP: 4500,  color: "text-orange-400",   bg: "bg-orange-400/10",   border: "border-orange-400/20",  gradient: "from-orange-500 to-orange-400",  emoji: "⚔️" },
  { name: "Elite",       minLevel: 31, maxLevel: 40,  minXP: 4500,  maxXP: 9000,  color: "text-purple-400",   bg: "bg-purple-400/10",   border: "border-purple-400/20",  gradient: "from-purple-500 to-purple-400",  emoji: "💎" },
  { name: "Champion",    minLevel: 41, maxLevel: 50,  minXP: 9000,  maxXP: 16000, color: "text-glow-gold",    bg: "bg-glow-gold/10",    border: "border-glow-gold/20",   gradient: "from-yellow-500 to-amber-400",   emoji: "🏆" },
  { name: "Legend",      minLevel: 51, maxLevel: 60,  minXP: 16000, maxXP: 26000, color: "text-red-400",      bg: "bg-red-400/10",      border: "border-red-400/20",     gradient: "from-red-500 to-red-400",        emoji: "🔥" },
  { name: "Titan",       minLevel: 61, maxLevel: 70,  minXP: 26000, maxXP: 40000, color: "text-rose-600",     bg: "bg-rose-600/10",     border: "border-rose-600/20",    gradient: "from-rose-700 to-rose-500",      emoji: "🌟" },
  { name: "Iron Beast",  minLevel: 71, maxLevel: 85,  minXP: 40000, maxXP: 65000, color: "text-red-600",      bg: "bg-red-600/10",      border: "border-red-600/20",     gradient: "from-red-700 to-red-500",        emoji: "🦁" },
  { name: "Gym Master",  minLevel: 86, maxLevel: 100, minXP: 65000, maxXP: 999999, color: "text-glow-cyan",   bg: "bg-glow-cyan/10",    border: "border-glow-cyan/20",   gradient: "from-cyan-400 to-teal-300",      emoji: "👑" },
] as const;

// Keep TIERS as alias for backward compat
export const TIERS = RANKS;

export type TierName = typeof RANKS[number]["name"];

export const getTier = (level: number) => {
  return RANKS.find(t => level >= t.minLevel && level <= t.maxLevel) || RANKS[0];
};

export const getRankByXP = (xp: number) => {
  return RANKS.find(r => xp >= r.minXP && xp < r.maxXP) || RANKS[RANKS.length - 1];
};

// Progressive XP: each level requires 1.15x more XP than previous
// Level 1 = 0 XP, Level 2 = 60 XP, Level 3 = 129 XP, etc.
export const getXPForLevel = (level: number): number => {
  if (level <= 1) return 0;
  let total = 0;
  let required = 60; // Base XP for level 2
  for (let i = 2; i <= level; i++) {
    total += Math.floor(required);
    required *= 1.15;
  }
  return total;
};

export const getXPRequiredForNextLevel = (level: number): number => {
  return getXPForLevel(level + 1) - getXPForLevel(level);
};

export const calculateLevel = (xp: number): number => {
  let level = 1;
  while (getXPForLevel(level + 1) <= xp && level < 100) {
    level++;
  }
  return level;
};

export const getXPProgress = (xp: number) => {
  const level = calculateLevel(xp);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const xpInLevel = xp - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const progress = level >= 100 ? 100 : (xpInLevel / xpNeeded) * 100;
  return { level, xpInLevel, xpNeeded, progress, currentLevelXP, nextLevelXP };
};

// XP reward values
export const XP_REWARDS = {
  WORKOUT_COMPLETED: 20,
  PR_ACHIEVED: 50,
  STREAK_7_DAY: 80,
  CHALLENGE_COMPLETED: 100,
  LEADERBOARD_TOP3: 150,
  EARLY_CHECKIN: 5,
  MONTH_ACTIVE: 30,
} as const;

interface ChallengeTemplate {
  key: string;
  name: string;
  description: string;
  type: "checkin" | "streak" | "pr" | "consistency" | "early" | "weight";
  baseTarget: number;
  baseXP: number;
  levelMultiplier: number;
  xpMultiplier: number;
  category: "fitness" | "consistency" | "strength";
  maxDifficulty: number;
  difficulty: "easy" | "hard" | "weekly"; // Controls distribution
}

// EASY (4-6): Simple daily tasks members can do in a single session
const EASY_CHALLENGES: ChallengeTemplate[] = [
  { key: "daily_checkin", name: "Show Up", description: "Check in to the gym today", type: "checkin", baseTarget: 1, baseXP: 25, levelMultiplier: 0, xpMultiplier: 1.05, category: "consistency", maxDifficulty: 1, difficulty: "easy" },
  { key: "complete_workout", name: "Finish Strong", description: "Complete your full workout today", type: "checkin", baseTarget: 1, baseXP: 30, levelMultiplier: 0, xpMultiplier: 1.05, category: "fitness", maxDifficulty: 1, difficulty: "easy" },
  { key: "log_sets", name: "Track It", description: "Log all sets for today's workout", type: "checkin", baseTarget: 1, baseXP: 20, levelMultiplier: 0, xpMultiplier: 1.05, category: "fitness", maxDifficulty: 1, difficulty: "easy" },
  { key: "two_day_streak", name: "Back to Back", description: "Check in 2 days in a row", type: "streak", baseTarget: 2, baseXP: 35, levelMultiplier: 0, xpMultiplier: 1.05, category: "consistency", maxDifficulty: 2, difficulty: "easy" },
  { key: "warm_up", name: "Warm Up Right", description: "Complete at least {target} sets today", type: "checkin", baseTarget: 3, baseXP: 25, levelMultiplier: 0.1, xpMultiplier: 1.05, category: "fitness", maxDifficulty: 5, difficulty: "easy" },
  { key: "extra_set", name: "One More Set", description: "Complete {target} total sets today", type: "checkin", baseTarget: 8, baseXP: 30, levelMultiplier: 0.2, xpMultiplier: 1.05, category: "fitness", maxDifficulty: 15, difficulty: "easy" },
  { key: "stay_active", name: "Stay Active", description: "Check in at least once today", type: "checkin", baseTarget: 1, baseXP: 20, levelMultiplier: 0, xpMultiplier: 1.0, category: "consistency", maxDifficulty: 1, difficulty: "easy" },
  { key: "push_yourself", name: "Push Yourself", description: "Complete all exercises in today's plan", type: "checkin", baseTarget: 1, baseXP: 35, levelMultiplier: 0, xpMultiplier: 1.05, category: "fitness", maxDifficulty: 1, difficulty: "easy" },
  { key: "early_checkin", name: "Early Bird", description: "Check in before 8 AM today", type: "early", baseTarget: 1, baseXP: 20, levelMultiplier: 0, xpMultiplier: 1.0, category: "consistency", maxDifficulty: 1, difficulty: "easy" },
  { key: "evening_grind", name: "Evening Grind", description: "Check in after 6 PM today", type: "early", baseTarget: 1, baseXP: 20, levelMultiplier: 0, xpMultiplier: 1.0, category: "consistency", maxDifficulty: 1, difficulty: "easy" },
  { key: "weekend_warrior", name: "Weekend Warrior", description: "Check in on the weekend", type: "checkin", baseTarget: 1, baseXP: 25, levelMultiplier: 0, xpMultiplier: 1.0, category: "consistency", maxDifficulty: 1, difficulty: "easy" },
  { key: "log_progress", name: "Log Progress", description: "Log your weight update today", type: "weight", baseTarget: 1, baseXP: 25, levelMultiplier: 0, xpMultiplier: 1.0, category: "consistency", maxDifficulty: 1, difficulty: "easy" },
];

// HARD (1-3): Challenging tasks that require effort
const HARD_CHALLENGES: ChallengeTemplate[] = [
  { key: "pr_hunter", name: "PR Hunter", description: "Set {target} personal record", type: "pr", baseTarget: 1, baseXP: 100, levelMultiplier: 0.15, xpMultiplier: 1.25, category: "strength", maxDifficulty: 3, difficulty: "hard" },
  { key: "big_three", name: "Big Three", description: "Log PRs in all 3 big lifts (Bench, Squat, Deadlift)", type: "pr", baseTarget: 3, baseXP: 200, levelMultiplier: 0, xpMultiplier: 1.3, category: "strength", maxDifficulty: 3, difficulty: "hard" },
  { key: "five_day_streak", name: "5-Day Grind", description: "Work out {target} days in a row", type: "streak", baseTarget: 5, baseXP: 120, levelMultiplier: 0.3, xpMultiplier: 1.2, category: "fitness", maxDifficulty: 7, difficulty: "hard" },
  { key: "strength_surge", name: "Strength Surge", description: "Set {target} new PRs this week", type: "pr", baseTarget: 2, baseXP: 150, levelMultiplier: 0.1, xpMultiplier: 1.2, category: "strength", maxDifficulty: 5, difficulty: "hard" },
  { key: "volume_beast", name: "Volume Beast", description: "Complete {target} total sets in one session", type: "checkin", baseTarget: 15, baseXP: 100, levelMultiplier: 0.3, xpMultiplier: 1.15, category: "fitness", maxDifficulty: 25, difficulty: "hard" },
];

// WEEKLY (2-3): Longer-term goals spanning a week or more
const WEEKLY_CHALLENGES: ChallengeTemplate[] = [
  { key: "weekly_warrior", name: "Weekly Warrior", description: "Complete {target} check-ins this week", type: "checkin", baseTarget: 4, baseXP: 80, levelMultiplier: 0.2, xpMultiplier: 1.1, category: "consistency", maxDifficulty: 7, difficulty: "weekly" },
  { key: "streak_builder", name: "Streak Builder", description: "Build a {target}-day streak", type: "streak", baseTarget: 7, baseXP: 120, levelMultiplier: 0.4, xpMultiplier: 1.2, category: "consistency", maxDifficulty: 14, difficulty: "weekly" },
  { key: "monthly_grinder", name: "Monthly Grinder", description: "Complete {target} check-ins this month", type: "checkin", baseTarget: 12, baseXP: 200, levelMultiplier: 0.5, xpMultiplier: 1.15, category: "consistency", maxDifficulty: 25, difficulty: "weekly" },
  { key: "iron_marathon", name: "Iron Marathon", description: "Complete {target} workouts in 2 weeks", type: "checkin", baseTarget: 8, baseXP: 150, levelMultiplier: 0.3, xpMultiplier: 1.15, category: "fitness", maxDifficulty: 14, difficulty: "weekly" },
  { key: "consistency_champ", name: "Consistency Champ", description: "Check in at least {target} times this week", type: "checkin", baseTarget: 5, baseXP: 90, levelMultiplier: 0.2, xpMultiplier: 1.1, category: "consistency", maxDifficulty: 7, difficulty: "weekly" },
];

const ALL_TEMPLATES = [...EASY_CHALLENGES, ...HARD_CHALLENGES, ...WEEKLY_CHALLENGES];
const ALWAYS_CHALLENGE_COUNT = 10;

// Deterministic shuffle helper
const deterministicShuffle = <T,>(arr: T[], seed: number): T[] => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (seed * (i + 1) + 37) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Generate challenges: 4-6 easy, 1-3 hard, 2-3 weekly = always 10
export const generateChallenges = (
  level: number,
  tier: TierName,
  memberId: string,
  completedKeys: string[],
  memberWeight?: number,
  options?: { excludeKeys?: string[]; preferredCategories?: ChallengeTemplate["category"][] }
) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const seed = `${memberId}-${today}`.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const excludeSet = new Set(options?.excludeKeys ?? []);
  
  // Determine distribution based on seed for variety
  const easyCount = 4 + (seed % 3);   // 4, 5, or 6
  const hardCount = 1 + ((seed >> 2) % 3); // 1, 2, or 3
  const weeklyCount = ALWAYS_CHALLENGE_COUNT - easyCount - hardCount; // fills to 10
  
  const filterCompleted = (templates: ChallengeTemplate[]) =>
    templates.filter(t => !completedKeys.includes(`${t.key}-${today}`) && !excludeSet.has(t.key));

  const preferCategories = options?.preferredCategories && options.preferredCategories.length > 0
    ? options.preferredCategories
    : null;
  
  const pickFromPool = (pool: ChallengeTemplate[], count: number): ChallengeTemplate[] => {
    const available = filterCompleted(pool);
    if (available.length === 0) return [];

    const ordered = preferCategories
      ? [
          ...deterministicShuffle(available.filter(t => preferCategories.includes(t.category)), seed + 11),
          ...deterministicShuffle(available.filter(t => !preferCategories.includes(t.category)), seed + 23),
        ]
      : deterministicShuffle(available, seed);

    const picked = ordered.slice(0, count);
    
    // If not enough, create variants
    let variant = 1;
    while (picked.length < count && variant <= 3) {
      const remaining = count - picked.length;
      const recycled = available.slice(0, remaining).map(t => ({
        ...t,
        key: `${t.key}_v${variant}`,
        baseTarget: Math.min(t.maxDifficulty, Math.ceil(t.baseTarget * (1 + variant * 0.3))),
        baseXP: Math.ceil(t.baseXP * (1 + variant * 0.2)),
      }));
      picked.push(...recycled);
      variant++;
    }
    return picked.slice(0, count);
  };
  
  const easyPicks = pickFromPool(EASY_CHALLENGES, easyCount);
  const hardPicks = pickFromPool(HARD_CHALLENGES, hardCount);
  const weeklyPicks = pickFromPool(WEEKLY_CHALLENGES, weeklyCount);
  
  const selected = [...easyPicks, ...hardPicks, ...weeklyPicks];
  
  return selected.slice(0, ALWAYS_CHALLENGE_COUNT).map(template => {
    const scaledTarget = Math.min(
      template.maxDifficulty,
      Math.ceil(template.baseTarget + (level - 1) * template.levelMultiplier)
    );
    
    const scaledXP = Math.ceil(template.baseXP * Math.pow(template.xpMultiplier, Math.floor((level - 1) / 5)));
    
    const daysLeft = template.difficulty === "weekly" 
      ? (template.key.includes("monthly") ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate() : 7 - new Date().getDay() || 7)
      : template.difficulty === "hard" ? (template.type === "streak" ? scaledTarget + 1 : 3)
      : 1; // easy = today only
    
    return {
      key: `${template.key}-${today}`,
      templateKey: template.key,
      name: template.name,
      description: template.description.replace("{target}", String(scaledTarget)),
      target: scaledTarget,
      xpReward: scaledXP,
      category: template.category,
      type: template.type,
      difficulty: template.difficulty,
      daysLeft,
      progress: 0,
    };
  });
};

export const useMemberXP = () => {
  const { member } = useMemberData();
  const { user } = useAuth();
  const isDemoMode = isDemoMemberMode();

  const xpQuery = useQuery({
    queryKey: ["member-xp", member?.id],
    queryFn: async () => {
      if (!member?.id) return null;
      const { data, error } = await supabase
        .from("member_xp")
        .select("*")
        .eq("member_id", member.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;
      return null;
    },
    enabled: !!member?.id && !isDemoMode,
    staleTime: 60 * 1000,
  });

  const effectiveXP = isDemoMode ? 4510 : (xpQuery.data?.xp || 0);

  return {
    xp: effectiveXP,
    level: calculateLevel(effectiveXP),
    tier: getTier(calculateLevel(effectiveXP)),
    xpData: xpQuery.data,
    isLoading: isDemoMode ? false : xpQuery.isLoading,
  };
};

export const useChallengeCompletions = () => {
  const { member } = useMemberData();
  const isDemoMode = isDemoMemberMode();
  
  return useQuery({
    queryKey: ["challenge-completions", member?.id],
    queryFn: async () => {
      if (isDemoMode) {
        return [
          { id: "demo-c1", challenge_key: "daily_checkin-2026-03-08", completed_at: "2026-03-08T08:15:00Z" },
          { id: "demo-c2", challenge_key: "complete_workout-2026-03-07", completed_at: "2026-03-07T18:05:00Z" },
          { id: "demo-c3", challenge_key: "two_day_streak-2026-03-06", completed_at: "2026-03-06T07:45:00Z" },
        ] as any[];
      }

      if (!member?.id) return [];
      const { data, error } = await supabase
        .from("challenge_completions")
        .select("*")
        .eq("member_id", member.id)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!member?.id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCompleteChallenge = () => {
  const { user } = useAuth();
  const { member } = useMemberData();
  const queryClient = useQueryClient();
  const isDemoMode = isDemoMemberMode();
  
  return useMutation({
    mutationFn: async ({ challengeKey, challengeName, xpEarned }: { 
      challengeKey: string; 
      challengeName: string; 
      xpEarned: number;
    }) => {
      if (isDemoMode) {
        const nextXP = 4510 + Math.ceil(xpEarned);
        const nextLevel = calculateLevel(nextXP);
        return {
          newXP: nextXP,
          newLevel: nextLevel,
          newTier: getTier(nextLevel).name.toLowerCase(),
          xpAwarded: Math.ceil(xpEarned),
          dailyXPRemaining: 420,
          dailyChallengesRemaining: 7,
        };
      }

      if (!member?.id || !user?.id) throw new Error("Not authenticated");

      // Call server-side validation edge function
      const resolveSession = async (forceRefresh = false) => {
        if (forceRefresh) {
          const { data, error } = await supabase.auth.refreshSession();
          if (error || !data.session?.access_token) return null;
          return data.session;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) return null;
        const session = data.session;
        if (!session?.access_token) return null;

        const expiresAtMs = session.expires_at ? session.expires_at * 1000 : 0;
        if (!expiresAtMs || expiresAtMs - Date.now() < 60_000) {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshed.session?.access_token) return null;
          return refreshed.session;
        }

        return session;
      };

      const invokeChallenge = (token: string) =>
        supabase.functions.invoke("validate-challenge", {
          body: {
            challengeKey,
            challengeName,
            xpEarned: Math.ceil(xpEarned),
            clientDate: format(new Date(), "yyyy-MM-dd"),
            clientTimezoneOffsetMinutes: new Date().getTimezoneOffset(),
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

      const isAuthError = (err: any) =>
        err?.context?.status === 401 ||
        (typeof err?.message === "string" && err.message.toLowerCase().includes("jwt"));

      let session = await resolveSession();
      if (!session?.access_token) {
        throw new Error("Session expired. Please sign in again.");
      }

      let { data, error } = await invokeChallenge(session.access_token);

      if (error && isAuthError(error)) {
        const refreshedSession = await resolveSession(true);
        if (!refreshedSession?.access_token) {
          throw new Error("Session expired. Please sign in again.");
        }
        ({ data, error } = await invokeChallenge(refreshedSession.access_token));
      }      
      if (error) {
        if (isAuthError(error)) {
          throw new Error("Session expired. Please sign in again.");
        }
        const detailedMessage = await getInvokeErrorMessage(error);
        throw new Error(detailedMessage || error.message || "Failed to complete challenge");
      }
      if (data?.error) throw new Error(data.error);
      
      return { 
        newXP: data.newXP, 
        newLevel: data.newLevel,
        newTier: data.newTier,
        xpAwarded: data.xpAwarded,
        dailyXPRemaining: data.dailyXPRemaining,
        dailyChallengesRemaining: data.dailyChallengesRemaining,
      };
    },
    onSuccess: (data, variables) => {
      if (member?.id) {
        queryClient.setQueryData(["member-xp", member.id], (prev: any) => {
          const nextLevel = data.newLevel ?? calculateLevel(data.newXP ?? 0);
          const nextTier = (data.newTier || getTier(nextLevel).name.toLowerCase());
          if (!prev) {
            return {
              member_id: member.id,
              gym_id: member.gym_id,
              user_id: member.user_id,
              xp: data.newXP ?? 0,
              level: nextLevel,
              tier: nextTier,
              streak_days: 0,
              total_challenges_completed: 1,
              updated_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            };
          }
          return {
            ...prev,
            xp: data.newXP ?? prev.xp,
            level: nextLevel ?? prev.level,
            tier: nextTier ?? prev.tier,
            total_challenges_completed: (prev.total_challenges_completed || 0) + 1,
            updated_at: new Date().toISOString(),
          };
        });
      }

      if (member?.id && variables?.challengeKey) {
        queryClient.setQueryData(["challenge-completions", member.id], (prev: any) => {
          if (!Array.isArray(prev)) return prev;
          if (prev.some((c) => c.challenge_key === variables.challengeKey)) return prev;
          return [
            {
              id: `optimistic-${Date.now()}`,
              challenge_key: variables.challengeKey,
              challenge_name: variables.challengeName,
              xp_earned: variables.xpEarned,
              completed_at: new Date().toISOString(),
            },
            ...prev,
          ];
        });
      }

      queryClient.setQueriesData({ queryKey: ["leaderboard"] }, (old: any) => {
        if (!Array.isArray(old) || !member?.id) return old;
        return old.map((row) => {
          if (row.memberId !== member.id) return row;
          const xpDelta = data.xpAwarded ?? 0;
          return {
            ...row,
            xp: (row.xp ?? 0) + xpDelta,
            level: data.newLevel ?? row.level,
            tier: data.newTier ?? row.tier,
            challengesCompleted: (row.challengesCompleted || 0) + 1,
          };
        });
      });

      queryClient.invalidateQueries({ queryKey: ["member-xp"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-completions"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      
      let message = `Challenge completed! +${data.xpAwarded} XP`;
      if (data.dailyXPRemaining !== undefined && data.dailyXPRemaining <= 100) {
        message += ` (${data.dailyXPRemaining} XP remaining today)`;
      }
      toast.success(message);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to complete challenge");
    },
  });
};

// Leaderboard hook
export const useLeaderboard = (
  scope: "gym" | "global",
  period: "weekly" | "monthly",
  tier?: TierName,
) => {
  const { member } = useMemberData();
  const isDemoMode = isDemoMemberMode();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isDemoMode) return;
    if (scope === "gym" && !member?.gym_id) return;

    const filter = scope === "gym" && member?.gym_id ? `gym_id=eq.${member.gym_id}` : undefined;
    const channel = supabase
      .channel(`leaderboard-${scope}-${tier ?? "all"}-${member?.gym_id ?? "global"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "member_xp", filter },
        () => {
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDemoMode, scope, period, tier, member?.gym_id, queryClient]);
  
  return useQuery({
    queryKey: ["leaderboard", scope, period, tier, member?.gym_id],
    queryFn: async () => {
      if (isDemoMode) {
        const demoRows = [
          { memberId: "demo-member-2", name: "Ananya Gupta", xp: 4980, level: 34, tier: "elite", streak: 11, challengesCompleted: 58, gymId: "demo-gym-1" },
          { memberId: "demo-member-3", name: "Divya Nair", xp: 4720, level: 33, tier: "elite", streak: 10, challengesCompleted: 54, gymId: "demo-gym-1" },
          { memberId: "demo-member-1", name: "Rohan Mehta", xp: 4510, level: 32, tier: "elite", streak: 7, challengesCompleted: 49, gymId: "demo-gym-1" },
          { memberId: "demo-member-4", name: "Arun Verma", xp: 4390, level: 31, tier: "elite", streak: 6, challengesCompleted: 45, gymId: "demo-gym-1" },
          { memberId: "demo-member-5", name: "Meera Joshi", xp: 4200, level: 30, tier: "warrior", streak: 5, challengesCompleted: 42, gymId: "demo-gym-1" },
          { memberId: "global-member-1", name: "Kabir Roy", xp: 5320, level: 36, tier: "elite", streak: 13, challengesCompleted: 61, gymId: "global-gym-2" },
          { memberId: "global-member-2", name: "Nisha Menon", xp: 5150, level: 35, tier: "elite", streak: 12, challengesCompleted: 59, gymId: "global-gym-3" },
        ];

        let filtered = demoRows;
        if (scope === "gym" && member?.gym_id) {
          filtered = filtered.filter((row) => row.gymId === member.gym_id);
        }
        if (tier) {
          filtered = filtered.filter((row) => row.tier === tier.toLowerCase());
        }

        return filtered
          .sort((a, b) => b.xp - a.xp)
          .map((row, index) => ({
            rank: index + 1,
            ...row,
            isCurrentUser: row.memberId === member?.id,
          }));
      }

      if (scope === "global") {
        const { data, error } = await supabase.rpc("get_global_leaderboard_period_anonymized", {
          p_limit: 100,
          p_tier: tier ? tier.toLowerCase() : null,
          p_period: period,
        });
        if (error) throw error;

        return (data || []).map((row: any, index: number) => ({
          rank: row.rank ?? index + 1,
          memberId: row.is_current_user ? (member?.id || `self-${index + 1}`) : `global-${index + 1}`,
          name: row.display_name || "Member",
          xp: row.xp,
          level: row.level,
          tier: row.tier,
          streak: row.streak_days,
          challengesCompleted: row.challenges_completed,
          isCurrentUser: !!row.is_current_user,
          gymId: "global",
        }));
      }

      if (!member?.gym_id) return [];

      const { data, error } = await supabase.rpc("get_gym_leaderboard_period", {
        p_gym_id: member.gym_id,
        p_limit: 100,
        p_tier: tier ? tier.toLowerCase() : null,
        p_period: period,
      });
      if (error) throw error;

      return (data || []).map((row: any, index: number) => {
        const isCurrentUser = !!row.is_current_user;
        return {
          rank: row.rank ?? index + 1,
          memberId: row.member_id,
          name: isCurrentUser ? (member?.name || "You") : `Member ${row.rank ?? index + 1}`,
          xp: row.xp,
          level: row.level,
          tier: row.tier,
          streak: row.streak_days,
          challengesCompleted: row.challenges_completed,
          isCurrentUser,
          gymId: member.gym_id,
        };
      });
    },
    enabled: !!member?.id,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });
};
