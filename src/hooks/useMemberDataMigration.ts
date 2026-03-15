import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemberData } from "./useMemberData";
import { isDemoMemberMode } from "@/lib/demoMode";
import type { ProgressEntry, SessionLog, WeekPlan } from "./memberSyncTypes";

const MIGRATION_FLAG_KEY = "fitcore_sync_migrated_v1";
const LEGACY_KEYS = [
  "fitcore_week_plan",
  "fitcore_workout_history",
  "fitcore_weight_log",
  "fitcore_progress_log",
  "fitcore_weight_goal",
  "fitcore_goal_weight",
  "fitcore_height",
  "fitcore_age",
  "fitcore_gender",
  "fitcore_goal_months",
];

const tryParseJson = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const readNumberKey = (...keys: string[]) => {
  for (const key of keys) {
    const parsed = tryParseJson<number>(window.localStorage.getItem(key));
    if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const readStringKey = (...keys: string[]) => {
  for (const key of keys) {
    const parsed = tryParseJson<string>(window.localStorage.getItem(key));
    if (typeof parsed === "string" && parsed.trim().length > 0) return parsed;
  }
  return null;
};

const hasLegacyData = () => LEGACY_KEYS.some((key) => !!window.localStorage.getItem(key));

export const useMemberDataMigration = () => {
  const { user } = useAuth();
  const { member } = useMemberData();
  const isDemoMode = isDemoMemberMode();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isDemoMode) return;
    if (!user?.id || !member?.id || !member.gym_id) return;
    if (window.localStorage.getItem(MIGRATION_FLAG_KEY)) return;
    if (!hasLegacyData()) {
      window.localStorage.setItem(MIGRATION_FLAG_KEY, new Date().toISOString());
      return;
    }

    const migrate = async () => {
      try {
        const legacyPlan = tryParseJson<WeekPlan>(window.localStorage.getItem("fitcore_week_plan"));
        const legacyHistory = tryParseJson<SessionLog[]>(window.localStorage.getItem("fitcore_workout_history")) || [];
        const legacyWeight = tryParseJson<Array<{ date: string; weight: number }>>(window.localStorage.getItem("fitcore_weight_log")) || [];
        const legacyProgress = tryParseJson<ProgressEntry[]>(window.localStorage.getItem("fitcore_progress_log")) || [];

        const goalWeight = Number(readNumberKey("fitcore_goal_weight", "fitcore_weight_goal") ?? 0);
        const height = Number(readNumberKey("fitcore_height") ?? 0);
        const age = Number(readNumberKey("fitcore_age") ?? 0);
        const goalMonths = Number(readNumberKey("fitcore_goal_months") ?? 2);
        const genderRaw = readStringKey("fitcore_gender");
        const gender =
          genderRaw === "male" || genderRaw === "female" || genderRaw === "other"
            ? genderRaw
            : null;

        if (legacyPlan && Object.keys(legacyPlan).length > 0) {
          const { data: existingPlan } = await supabase
            .from("member_workout_plans")
            .select("member_id")
            .eq("member_id", member.id)
            .maybeSingle();

          if (!existingPlan) {
            await supabase.from("member_workout_plans").upsert({
              member_id: member.id,
              gym_id: member.gym_id,
              user_id: user.id,
              week_plan: legacyPlan as unknown as Record<string, unknown>,
              migrated_from_local: true,
            }, { onConflict: "member_id" });
          }
        }

        if (legacyHistory.length > 0) {
          const { count: historyCount } = await supabase
            .from("member_workout_sessions")
            .select("id", { count: "exact", head: true })
            .eq("member_id", member.id);

          if (!historyCount) {
            const rows = legacyHistory
              .filter((item) => !!item.date)
              .slice(0, 100)
              .map((item) => ({
                member_id: member.id,
                gym_id: member.gym_id,
                user_id: user.id,
                session_date: item.date.slice(0, 10),
                plan_name: item.plan || "Workout Session",
                duration_seconds: Number(item.duration || 0),
                completed_sets: Number(item.completed || 0),
                total_sets: Number(item.total || 0),
                metadata: {},
                created_at: item.date,
              }));

            if (rows.length > 0) {
              await supabase.from("member_workout_sessions").insert(rows);
            }
          }
        }

        const mergedProgress = [
          ...legacyProgress,
          ...legacyWeight.map((w) => ({
            date: w.date,
            weight: w.weight,
            workout: false,
            notes: "",
          })),
        ];

        if (mergedProgress.length > 0) {
          const { count: progressCount } = await supabase
            .from("member_progress_entries")
            .select("id", { count: "exact", head: true })
            .eq("member_id", member.id);

          if (!progressCount) {
            const progressRows = mergedProgress
              .filter((item) => !!item.date)
              .slice(0, 365)
              .map((item) => ({
                member_id: member.id,
                gym_id: member.gym_id,
                user_id: user.id,
                entry_date: item.date.slice(0, 10),
                weight: typeof item.weight === "number" ? item.weight : null,
                workout: !!item.workout,
                notes: item.notes || "",
                metrics: {},
                created_at: item.date,
              }));

            if (progressRows.length > 0) {
              await supabase.from("member_progress_entries").insert(progressRows);
            }
          }
        }

        await supabase.from("member_profile_settings").upsert({
          member_id: member.id,
          gym_id: member.gym_id,
          user_id: user.id,
          goal_weight: goalWeight > 0 ? goalWeight : null,
          height_cm: height > 0 ? height : null,
          age: age > 0 ? age : null,
          gender,
          goal_months: goalMonths > 0 ? goalMonths : 2,
          settings: {},
          migrated_from_local: true,
        });

        window.localStorage.setItem(MIGRATION_FLAG_KEY, new Date().toISOString());
      } catch (error) {
        console.error("Member local data migration failed:", error);
      }
    };

    void migrate();
  }, [isDemoMode, member?.gym_id, member?.id, user?.id]);
};
