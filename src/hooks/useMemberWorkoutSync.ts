import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberData } from "./useMemberData";
import { useAuth } from "@/contexts/AuthContext";
import { isDemoMemberMode } from "@/lib/demoMode";
import type { SessionLog, WeekPlan } from "./memberSyncTypes";

const WORKOUT_PLAN_QUERY_KEY = "member-workout-plan";
const WORKOUT_HISTORY_QUERY_KEY = "member-workout-history";

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const useMemberWorkoutPlan = () => {
  const { member } = useMemberData();
  const isDemoMode = isDemoMemberMode();

  return useQuery({
    queryKey: [WORKOUT_PLAN_QUERY_KEY, member?.id],
    queryFn: async () => {
      if (!member?.id) return null;
      const { data, error } = await supabase
        .from("member_workout_plans")
        .select("week_plan")
        .eq("member_id", member.id)
        .maybeSingle();
      if (error) throw error;
      if (!data || !isObjectRecord(data.week_plan)) return null;
      return data.week_plan as unknown as WeekPlan;
    },
    enabled: !!member?.id && !isDemoMode,
    staleTime: 60 * 1000,
  });
};

export const useSaveMemberWorkoutPlan = () => {
  const { member } = useMemberData();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isDemoMode = isDemoMemberMode();

  return useMutation({
    mutationFn: async ({
      weekPlan,
      migratedFromLocal = false,
    }: {
      weekPlan: WeekPlan;
      migratedFromLocal?: boolean;
    }) => {
      if (isDemoMode || !member?.id || !member.gym_id || !user?.id) return;
      const payload = {
        member_id: member.id,
        gym_id: member.gym_id,
        user_id: user.id,
        week_plan: weekPlan as unknown as Record<string, unknown>,
        migrated_from_local: migratedFromLocal,
      };

      const { error } = await supabase
        .from("member_workout_plans")
        .upsert(payload, { onConflict: "member_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WORKOUT_PLAN_QUERY_KEY] });
    },
  });
};

export const useMemberWorkoutSessions = () => {
  const { member } = useMemberData();
  const isDemoMode = isDemoMemberMode();

  return useQuery({
    queryKey: [WORKOUT_HISTORY_QUERY_KEY, member?.id],
    queryFn: async () => {
      if (!member?.id) return [] as SessionLog[];
      const { data, error } = await supabase
        .from("member_workout_sessions")
        .select("created_at, plan_name, duration_seconds, completed_sets, total_sets")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;

      return (data || []).map((row) => ({
        plan: row.plan_name || "Workout Session",
        date: row.created_at,
        duration: row.duration_seconds || 0,
        completed: row.completed_sets || 0,
        total: row.total_sets || 0,
      })) as SessionLog[];
    },
    enabled: !!member?.id && !isDemoMode,
    staleTime: 30 * 1000,
  });
};

export const useAddMemberWorkoutSession = () => {
  const { member } = useMemberData();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isDemoMode = isDemoMemberMode();

  return useMutation({
    mutationFn: async (session: SessionLog) => {
      if (isDemoMode || !member?.id || !member.gym_id || !user?.id) return;
      const { error } = await supabase.from("member_workout_sessions").insert({
        member_id: member.id,
        gym_id: member.gym_id,
        user_id: user.id,
        session_date: session.date.slice(0, 10),
        plan_name: session.plan,
        duration_seconds: session.duration,
        completed_sets: session.completed,
        total_sets: session.total,
        metadata: {},
        created_at: session.date,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WORKOUT_HISTORY_QUERY_KEY] });
    },
  });
};

export const useClearMemberWorkoutSessions = () => {
  const { member } = useMemberData();
  const qc = useQueryClient();
  const isDemoMode = isDemoMemberMode();

  return useMutation({
    mutationFn: async () => {
      if (isDemoMode || !member?.id) return;
      const { error } = await supabase
        .from("member_workout_sessions")
        .delete()
        .eq("member_id", member.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WORKOUT_HISTORY_QUERY_KEY] });
    },
  });
};
