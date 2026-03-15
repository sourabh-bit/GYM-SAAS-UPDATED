import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { rateLimit } from "../_shared/rate-limit.ts";

const buildHeaders = (req?: Request) => ({
  ...buildCorsHeaders(req),
});

// Anti-cheat constants
const DAILY_XP_CAP = 500; // Max XP earnable per day
const MAX_DAILY_COMPLETIONS = 12; // Max challenges completable per day
const COMPLETION_COOLDOWN_SECONDS = 0; // Min seconds between completions
const MAX_XP_PER_CHALLENGE = 250; // Sanity cap per single challenge
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_CHALLENGE_KEYS = [
  "daily_checkin", "complete_workout", "log_sets", "two_day_streak",
  "warm_up", "extra_set", "stay_active", "push_yourself",
  "pr_hunter", "big_three", "five_day_streak", "strength_surge", "volume_beast",
  "weekly_warrior", "streak_builder", "monthly_grinder", "iron_marathon", "consistency_champ",
  "early_checkin", "evening_grind", "weekend_warrior", "log_progress",
];

const CHALLENGE_TARGETS: Record<string, { baseTarget: number; levelMultiplier: number; maxDifficulty: number }> = {
  daily_checkin: { baseTarget: 1, levelMultiplier: 0, maxDifficulty: 1 },
  complete_workout: { baseTarget: 1, levelMultiplier: 0, maxDifficulty: 1 },
  log_sets: { baseTarget: 1, levelMultiplier: 0, maxDifficulty: 1 },
  stay_active: { baseTarget: 1, levelMultiplier: 0, maxDifficulty: 1 },
  push_yourself: { baseTarget: 1, levelMultiplier: 0, maxDifficulty: 1 },
  two_day_streak: { baseTarget: 2, levelMultiplier: 0, maxDifficulty: 2 },
  five_day_streak: { baseTarget: 5, levelMultiplier: 0.3, maxDifficulty: 7 },
  streak_builder: { baseTarget: 7, levelMultiplier: 0.4, maxDifficulty: 14 },
  warm_up: { baseTarget: 3, levelMultiplier: 0.1, maxDifficulty: 5 },
  extra_set: { baseTarget: 8, levelMultiplier: 0.2, maxDifficulty: 15 },
  volume_beast: { baseTarget: 15, levelMultiplier: 0.3, maxDifficulty: 25 },
  pr_hunter: { baseTarget: 1, levelMultiplier: 0.15, maxDifficulty: 3 },
  big_three: { baseTarget: 3, levelMultiplier: 0, maxDifficulty: 3 },
  strength_surge: { baseTarget: 2, levelMultiplier: 0.1, maxDifficulty: 5 },
  weekly_warrior: { baseTarget: 4, levelMultiplier: 0.2, maxDifficulty: 7 },
  consistency_champ: { baseTarget: 5, levelMultiplier: 0.2, maxDifficulty: 7 },
  monthly_grinder: { baseTarget: 12, levelMultiplier: 0.5, maxDifficulty: 25 },
  iron_marathon: { baseTarget: 8, levelMultiplier: 0.3, maxDifficulty: 14 },
  early_checkin: { baseTarget: 1, levelMultiplier: 0, maxDifficulty: 1 },
  evening_grind: { baseTarget: 1, levelMultiplier: 0, maxDifficulty: 1 },
  weekend_warrior: { baseTarget: 1, levelMultiplier: 0, maxDifficulty: 1 },
  log_progress: { baseTarget: 1, levelMultiplier: 0, maxDifficulty: 1 },
};

const CHALLENGE_XP: Record<string, { baseXP: number; xpMultiplier: number }> = {
  daily_checkin: { baseXP: 25, xpMultiplier: 1.05 },
  complete_workout: { baseXP: 30, xpMultiplier: 1.05 },
  log_sets: { baseXP: 20, xpMultiplier: 1.05 },
  stay_active: { baseXP: 20, xpMultiplier: 1.0 },
  push_yourself: { baseXP: 35, xpMultiplier: 1.05 },
  two_day_streak: { baseXP: 35, xpMultiplier: 1.05 },
  five_day_streak: { baseXP: 120, xpMultiplier: 1.2 },
  streak_builder: { baseXP: 120, xpMultiplier: 1.2 },
  warm_up: { baseXP: 25, xpMultiplier: 1.05 },
  extra_set: { baseXP: 30, xpMultiplier: 1.05 },
  volume_beast: { baseXP: 100, xpMultiplier: 1.15 },
  pr_hunter: { baseXP: 100, xpMultiplier: 1.25 },
  big_three: { baseXP: 200, xpMultiplier: 1.3 },
  strength_surge: { baseXP: 150, xpMultiplier: 1.2 },
  weekly_warrior: { baseXP: 80, xpMultiplier: 1.1 },
  consistency_champ: { baseXP: 90, xpMultiplier: 1.1 },   
  monthly_grinder: { baseXP: 200, xpMultiplier: 1.15 },
  iron_marathon: { baseXP: 150, xpMultiplier: 1.15 },
  early_checkin: { baseXP: 20, xpMultiplier: 1.0 },
  evening_grind: { baseXP: 20, xpMultiplier: 1.0 },
  weekend_warrior: { baseXP: 25, xpMultiplier: 1.0 },
  log_progress: { baseXP: 25, xpMultiplier: 1.0 },
};

const calculateLevel = (xp: number): number => {
  let level = 1;
  let totalNeeded = 0;
  let required = 60;
  while (level < 100) {
    totalNeeded += Math.floor(required);
    if (totalNeeded > xp) break;
    level++;
    required *= 1.15;
  }
  return level;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatUTCDateKey = (utcMs: number) => {
  const date = new Date(utcMs);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
};

const toClientDateKey = (iso: string, timezoneOffsetMinutes: number) => {
  const utcMs = new Date(iso).getTime();
  const clientMs = utcMs - timezoneOffsetMinutes * 60 * 1000;
  return formatUTCDateKey(clientMs);
};

const parseClientDayWindow = (clientDateRaw: unknown, timezoneOffsetRaw: unknown) => {
  let timezoneOffsetMinutes = Number.isFinite(Number(timezoneOffsetRaw))
    ? Number(timezoneOffsetRaw)
    : new Date().getTimezoneOffset();

  if (
    !Number.isInteger(timezoneOffsetMinutes) ||
    timezoneOffsetMinutes < -840 ||
    timezoneOffsetMinutes > 840
  ) {
    timezoneOffsetMinutes = new Date().getTimezoneOffset();
  }

  let localDateKey =
    typeof clientDateRaw === "string" && DATE_KEY_RE.test(clientDateRaw)
      ? clientDateRaw
      : "";

  if (!localDateKey) {
    const nowClientMs = Date.now() - timezoneOffsetMinutes * 60 * 1000;
    localDateKey = formatUTCDateKey(nowClientMs);
  }

  const [year, month, day] = localDateKey.split("-").map((v) => Number(v));
  const dayStartUtcMs = Date.UTC(year, month - 1, day) + timezoneOffsetMinutes * 60 * 1000;
  const dayEndUtcMs = dayStartUtcMs + DAY_MS;

  return {
    localDateKey,
    timezoneOffsetMinutes,
    dayStartUtcIso: new Date(dayStartUtcMs).toISOString(),
    dayEndUtcIso: new Date(dayEndUtcMs).toISOString(),
  };
};

const computeScaledTarget = (templateKey: string, level: number, variant: number) => {
  const meta = CHALLENGE_TARGETS[templateKey];
  if (!meta) return null;
  const baseTarget = variant > 0
    ? Math.min(meta.maxDifficulty, Math.ceil(meta.baseTarget * (1 + variant * 0.3)))
    : meta.baseTarget;
  return Math.min(
    meta.maxDifficulty,
    Math.ceil(baseTarget + (level - 1) * meta.levelMultiplier),
  );
};

const computeScaledXP = (templateKey: string, level: number, variant: number) => {
  const meta = CHALLENGE_XP[templateKey];
  if (!meta) return null;
  const baseXP = variant > 0
    ? Math.ceil(meta.baseXP * (1 + variant * 0.2))
    : meta.baseXP;
  const scaledXP = Math.ceil(
    baseXP * Math.pow(meta.xpMultiplier, Math.floor((level - 1) / 5)),
  );
  return scaledXP;
};

const getDayStartUtcMsForLocalDate = (
  localDateKey: string,
  timezoneOffsetMinutes: number,
) => {
  const [year, month, day] = localDateKey.split("-").map((v) => Number(v));
  return Date.UTC(year, month - 1, day) + timezoneOffsetMinutes * 60 * 1000;
};

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
};

Deno.serve(async (req) => {
  const corsHeaders = buildHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client for admin operations and JWT verification
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await adminClient.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rlKey = user?.id
      ? `challenge:rl:user:${user.id}`
      : `challenge:rl:ip:${getClientIp(req)}`;
    const rl = await rateLimit(rlKey, 30, 60);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      challengeKey,
      challengeName,
      xpEarned,
      clientDate,
      clientTimezoneOffsetMinutes,
    } = await req.json();
    const clientDay = parseClientDayWindow(clientDate, clientTimezoneOffsetMinutes);

    // ── VALIDATION 1: Input sanity ──
    if (!challengeKey || typeof challengeKey !== "string" || challengeKey.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid challenge key" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!challengeName || typeof challengeName !== "string" || challengeName.length > 200) {
      return new Response(JSON.stringify({ error: "Invalid challenge name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof xpEarned !== "number" || xpEarned <= 0 || xpEarned > MAX_XP_PER_CHALLENGE || !Number.isInteger(xpEarned)) {
      return new Response(JSON.stringify({ error: "Invalid XP amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── VALIDATION 2: Verify challenge template key is legitimate ──
    const rawTemplateKey = challengeKey.split("-")[0];
    const variantMatch = rawTemplateKey.match(/_v(\d+)$/);
    const variant = variantMatch ? Number(variantMatch[1]) : 0;
    const templateKey = rawTemplateKey.replace(/_v\d+$/, "");
    if (!ALLOWED_CHALLENGE_KEYS.includes(templateKey)) {
      return new Response(JSON.stringify({ error: "Unknown challenge type" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!challengeKey.endsWith(`-${clientDay.localDateKey}`)) {
      return new Response(JSON.stringify({ error: "Challenge expired for today" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── VALIDATION 3: Get member record ──
    const { data: member, error: memberErr } = await adminClient
      .from("members")
      .select("id, gym_id, user_id, status")
      .eq("user_id", user.id)
      .single();

    if (memberErr || !member) {
      return new Response(JSON.stringify({ error: "Member not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (member.status !== "active" && member.status !== "trial") {
      return new Response(JSON.stringify({ error: "Membership not active" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: currentXP } = await adminClient
      .from("member_xp")
      .select("xp, total_challenges_completed, streak_days")
      .eq("member_id", member.id)
      .maybeSingle();

    const currentLevel = calculateLevel(currentXP?.xp || 0);
    const expectedTarget = computeScaledTarget(templateKey, currentLevel, variant);
    const expectedXP = computeScaledXP(templateKey, currentLevel, variant);

    if (expectedXP !== null && xpEarned !== expectedXP) {
      return new Response(JSON.stringify({ error: "Invalid XP amount for challenge" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── VALIDATION 4: Check duplicate completion ──
    const { data: existing } = await adminClient
      .from("challenge_completions")
      .select("id")
      .eq("member_id", member.id)
      .eq("challenge_key", challengeKey)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Challenge already completed" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── VALIDATION 5: Rate limiting - cooldown between completions ──
    if (COMPLETION_COOLDOWN_SECONDS > 0) {
      const cooldownTime = new Date(Date.now() - COMPLETION_COOLDOWN_SECONDS * 1000).toISOString();
      const { data: recentCompletions } = await adminClient
        .from("challenge_completions")
        .select("id, completed_at")
        .eq("member_id", member.id)
        .gte("completed_at", cooldownTime)
        .order("completed_at", { ascending: false })
        .limit(1);

      if (recentCompletions && recentCompletions.length > 0) {
        return new Response(JSON.stringify({ error: "Too fast! Wait before completing another challenge." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── VALIDATION 6: Daily completion limit ──
    const { data: todayCompletions, error: countErr } = await adminClient
      .from("challenge_completions")
      .select("id, xp_earned")
      .eq("member_id", member.id)
      .gte("completed_at", clientDay.dayStartUtcIso)
      .lt("completed_at", clientDay.dayEndUtcIso);

    if (countErr) {
      return new Response(JSON.stringify({ error: "Validation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((todayCompletions?.length || 0) >= MAX_DAILY_COMPLETIONS) {
      return new Response(JSON.stringify({ error: "Daily challenge limit reached" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── VALIDATION 7: Daily XP cap ──
    const todayXP = (todayCompletions || []).reduce((sum, c) => sum + (c.xp_earned || 0), 0);
    const cappedXP = Math.min(xpEarned, DAILY_XP_CAP - todayXP);

    if (cappedXP <= 0) {
      return new Response(JSON.stringify({ error: "Daily XP cap reached. Come back tomorrow!" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── VALIDATION 8: For checkin-based challenges, verify actual attendance ──
    const checkinRequiredKeys = [
      "daily_checkin",
      "stay_active",
      "complete_workout",
      "early_checkin",
      "evening_grind",
      "weekend_warrior",
    ];

    let todayAttendance: Array<{ check_in: string }> = [];
    if (checkinRequiredKeys.includes(templateKey)) {
      const { data: attendanceRows } = await adminClient
        .from("attendance")
        .select("check_in")
        .eq("member_id", member.id)
        .gte("check_in", clientDay.dayStartUtcIso)
        .lt("check_in", clientDay.dayEndUtcIso);

      todayAttendance = (attendanceRows || []) as Array<{ check_in: string }>;
      if (todayAttendance.length === 0) {
        return new Response(JSON.stringify({ error: "Must check in at the gym first" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (templateKey === "early_checkin") {
      const hasEarly = todayAttendance.some((a) => {
        const localMs = new Date(a.check_in).getTime() - clientDay.timezoneOffsetMinutes * 60 * 1000;
        return new Date(localMs).getUTCHours() < 8;
      });
      if (!hasEarly) {
        return new Response(JSON.stringify({ error: "Check in before 8 AM to claim this." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (templateKey === "evening_grind") {
      const hasEvening = todayAttendance.some((a) => {
        const localMs = new Date(a.check_in).getTime() - clientDay.timezoneOffsetMinutes * 60 * 1000;
        return new Date(localMs).getUTCHours() >= 18;
      });
      if (!hasEvening) {
        return new Response(JSON.stringify({ error: "Check in after 6 PM to claim this." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (templateKey === "weekend_warrior") {
      const [localYear, localMonth, localDay] = clientDay.localDateKey.split("-").map((v) => Number(v));
      const localDow = new Date(Date.UTC(localYear, localMonth - 1, localDay)).getUTCDay();
      const isWeekend = localDow === 0 || localDow === 6;
      if (!isWeekend) {
        return new Response(JSON.stringify({ error: "Weekend check-in required." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── VALIDATION 9: For streak challenges, verify actual streak from attendance ──
    if (templateKey === "two_day_streak" || templateKey === "five_day_streak" || templateKey === "streak_builder") {
      const { data: recentAttendance } = await adminClient
        .from("attendance")
        .select("check_in")
        .eq("member_id", member.id)
        .order("check_in", { ascending: false })
        .limit(30);

      const uniqueDateSet = new Set(
        (recentAttendance || []).map((entry) =>
          toClientDateKey(entry.check_in, clientDay.timezoneOffsetMinutes)
        )
      );

      const [anchorYear, anchorMonth, anchorDay] = clientDay.localDateKey.split("-").map((v) => Number(v));
      const anchorUtcMs = Date.UTC(anchorYear, anchorMonth - 1, anchorDay);
      let streak = 0;
      for (let i = 0; i < 30; i++) {
        const expectedKey = formatUTCDateKey(anchorUtcMs - i * DAY_MS);
        if (!uniqueDateSet.has(expectedKey)) break;
        streak++;
      }

      // Extract required streak from challenge key
      const requiredStreak = templateKey === "two_day_streak" ? 2 : templateKey === "five_day_streak" ? 5 : 7;
      if (streak < requiredStreak) {
        return new Response(JSON.stringify({ error: `Need ${requiredStreak}-day streak. Current: ${streak} days.` }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── VALIDATION 10: Workout-based challenges ──
    const workoutChallengeKeys = [
      "complete_workout",
      "log_sets",
      "push_yourself",
      "warm_up",
      "extra_set",
      "volume_beast",
      "pr_hunter",
      "big_three",
      "strength_surge",
    ];

    let todayWorkoutSessions: Array<{ completed_sets: number; total_sets: number }> = [];
    if (workoutChallengeKeys.includes(templateKey)) {
      const { data: workoutRows, error: workoutErr } = await adminClient
        .from("member_workout_sessions")
        .select("completed_sets, total_sets, created_at")
        .eq("member_id", member.id)
        .gte("created_at", clientDay.dayStartUtcIso)
        .lt("created_at", clientDay.dayEndUtcIso);

      if (workoutErr) {
        return new Response(JSON.stringify({ error: "Workout validation failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      todayWorkoutSessions = (workoutRows || []) as Array<{ completed_sets: number; total_sets: number }>;
      const completedSets = todayWorkoutSessions.reduce((sum, s) => sum + (s.completed_sets || 0), 0);
      const maxCompletedSets = todayWorkoutSessions.reduce((max, s) => Math.max(max, s.completed_sets || 0), 0);
      const hasFullWorkout = todayWorkoutSessions.some(
        (s) => (s.total_sets || 0) > 0 && (s.completed_sets || 0) >= (s.total_sets || 0),
      );

      if (["complete_workout", "log_sets", "push_yourself"].includes(templateKey)) {
        if (!hasFullWorkout) {
          return new Response(JSON.stringify({ error: "Complete and log your workout first." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (["warm_up", "extra_set"].includes(templateKey)) {
        if (!expectedTarget || completedSets < expectedTarget) {
          return new Response(JSON.stringify({ error: `Complete at least ${expectedTarget ?? 0} sets today.` }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (templateKey === "volume_beast") {
        if (!expectedTarget || maxCompletedSets < expectedTarget) {
          return new Response(JSON.stringify({ error: `Complete ${expectedTarget ?? 0} sets in one session.` }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      if (["pr_hunter", "big_three", "strength_surge"].includes(templateKey)) {
        if (todayWorkoutSessions.length === 0) {
          const recentStart = new Date(
            getDayStartUtcMsForLocalDate(clientDay.localDateKey, clientDay.timezoneOffsetMinutes) - 6 * DAY_MS,
          ).toISOString();
          const { data: recentSessions } = await adminClient
            .from("member_workout_sessions")
            .select("id")
            .eq("member_id", member.id)
            .gte("created_at", recentStart)
            .limit(1);

          if (!recentSessions || recentSessions.length === 0) {
            return new Response(JSON.stringify({ error: "Log a workout session to claim this challenge." }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        const progressStart = new Date(
          getDayStartUtcMsForLocalDate(clientDay.localDateKey, clientDay.timezoneOffsetMinutes) - 30 * DAY_MS,
        ).toISOString();
        const { data: recentProgress } = await adminClient
          .from("member_progress_entries")
          .select("id")
          .eq("member_id", member.id)
          .gte("created_at", progressStart)
          .limit(1);

        if (!recentProgress || recentProgress.length === 0) {
          return new Response(JSON.stringify({ error: "Log progress entries to claim PR challenges." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    if (templateKey === "log_progress") {
      const { data: progressToday } = await adminClient
        .from("member_progress_entries")
        .select("id, entry_date, created_at")
        .eq("member_id", member.id)
        .or(`and(created_at.gte.${clientDay.dayStartUtcIso},created_at.lt.${clientDay.dayEndUtcIso}),entry_date.eq.${clientDay.localDateKey}`)
        .limit(1);

      if (!progressToday || progressToday.length === 0) {
        return new Response(JSON.stringify({ error: "Log your progress today to claim this." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── VALIDATION 11: Weekly/monthly/rolling check-in targets ──
    const [localYear, localMonth, localDay] = clientDay.localDateKey.split("-").map((v) => Number(v));
    const dayStartUtcMs = getDayStartUtcMsForLocalDate(clientDay.localDateKey, clientDay.timezoneOffsetMinutes);
    const localDow = new Date(Date.UTC(localYear, localMonth - 1, localDay)).getUTCDay(); // 0=Sun
    const weekStartUtcMs = dayStartUtcMs - localDow * DAY_MS;
    const weekEndUtcMs = weekStartUtcMs + 7 * DAY_MS;
    const monthStartUtcMs = Date.UTC(localYear, localMonth - 1, 1) + clientDay.timezoneOffsetMinutes * 60 * 1000;
    const nextMonthYear = localMonth === 12 ? localYear + 1 : localYear;
    const nextMonth = localMonth === 12 ? 1 : localMonth + 1;
    const monthEndUtcMs = Date.UTC(nextMonthYear, nextMonth - 1, 1) + clientDay.timezoneOffsetMinutes * 60 * 1000;
    const twoWeekStartUtcMs = dayStartUtcMs - 13 * DAY_MS;

    const countAttendanceBetween = async (startIso: string, endIso: string) => {
      const { data, error } = await adminClient
        .from("attendance")
        .select("id")
        .eq("member_id", member.id)
        .gte("check_in", startIso)
        .lt("check_in", endIso);
      if (error) {
        throw error;
      }
      return data?.length || 0;
    };

    if (["weekly_warrior", "consistency_champ"].includes(templateKey)) {
      const weekCount = await countAttendanceBetween(
        new Date(weekStartUtcMs).toISOString(),
        new Date(weekEndUtcMs).toISOString(),
      );
      if (!expectedTarget || weekCount < expectedTarget) {
        return new Response(JSON.stringify({ error: `Need ${expectedTarget ?? 0} check-ins this week.` }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (templateKey === "monthly_grinder") {
      const monthCount = await countAttendanceBetween(
        new Date(monthStartUtcMs).toISOString(),
        new Date(monthEndUtcMs).toISOString(),
      );
      if (!expectedTarget || monthCount < expectedTarget) {
        return new Response(JSON.stringify({ error: `Need ${expectedTarget ?? 0} check-ins this month.` }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (templateKey === "iron_marathon") {
      const rollingCount = await countAttendanceBetween(
        new Date(twoWeekStartUtcMs).toISOString(),
        clientDay.dayEndUtcIso,
      );
      if (!expectedTarget || rollingCount < expectedTarget) {
        return new Response(JSON.stringify({ error: `Need ${expectedTarget ?? 0} check-ins in 2 weeks.` }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── ALL CHECKS PASSED - Insert completion ──
    const { error: insertErr } = await adminClient
      .from("challenge_completions")
      .insert({
        member_id: member.id,
        gym_id: member.gym_id,
        user_id: user.id,
        challenge_key: challengeKey,
        challenge_name: challengeName,
        xp_earned: cappedXP,
      });

    if (insertErr) {
      return new Response(JSON.stringify({ error: "Failed to save completion" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Update XP with server-calculated values ──
    const newXP = (currentXP?.xp || 0) + cappedXP;

    const RANKS = [
      { name: "rookie", minLevel: 1, maxLevel: 5 },
      { name: "beginner", minLevel: 6, maxLevel: 10 },
      { name: "apprentice", minLevel: 11, maxLevel: 20 },
      { name: "warrior", minLevel: 21, maxLevel: 30 },
      { name: "elite", minLevel: 31, maxLevel: 40 },
      { name: "champion", minLevel: 41, maxLevel: 50 },
      { name: "legend", minLevel: 51, maxLevel: 60 },
      { name: "titan", minLevel: 61, maxLevel: 70 },
      { name: "iron beast", minLevel: 71, maxLevel: 85 },
      { name: "gym master", minLevel: 86, maxLevel: 100 },
    ];

    const newLevel = calculateLevel(newXP);
    const newTier = (RANKS.find(r => newLevel >= r.minLevel && newLevel <= r.maxLevel) || RANKS[0]).name;

    // Calculate streak server-side
    const { data: streakAttendance } = await adminClient
      .from("attendance")
      .select("check_in")
      .eq("member_id", member.id)
      .order("check_in", { ascending: false })
      .limit(60);

    let serverStreak = 0;
    if (streakAttendance) {
      const dateSet = new Set(
        streakAttendance.map((entry) =>
          toClientDateKey(entry.check_in, clientDay.timezoneOffsetMinutes)
        )
      );
      const [anchorYear, anchorMonth, anchorDay] = clientDay.localDateKey.split("-").map((v) => Number(v));
      const anchorUtcMs = Date.UTC(anchorYear, anchorMonth - 1, anchorDay);
      for (let i = 0; i < 60; i++) {
        const expectedKey = formatUTCDateKey(anchorUtcMs - i * DAY_MS);
        if (!dateSet.has(expectedKey)) break;
        serverStreak++;
      }
    }

    const { error: xpErr } = await adminClient
      .from("member_xp")
      .upsert({
        member_id: member.id,
        gym_id: member.gym_id,
        user_id: user.id,
        xp: newXP,
        level: newLevel,
        tier: newTier,
        streak_days: serverStreak,
        total_challenges_completed: (currentXP?.total_challenges_completed || 0) + 1,
        updated_at: new Date().toISOString(),
      }, { onConflict: "member_id" });

    if (xpErr) {
      console.error("XP update error:", xpErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        xpAwarded: cappedXP,
        newXP,
        newLevel,
        newTier,
        dailyXPRemaining: DAILY_XP_CAP - todayXP - cappedXP,
        dailyChallengesRemaining: MAX_DAILY_COMPLETIONS - (todayCompletions?.length || 0) - 1,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Anti-cheat error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
