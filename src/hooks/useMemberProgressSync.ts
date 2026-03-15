import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberData } from "./useMemberData";
import { useAuth } from "@/contexts/AuthContext";
import { isDemoMemberMode } from "@/lib/demoMode";
import type {
  MemberProfileSettingsPayload,
  ProgressEntry,
} from "./memberSyncTypes";

const PROFILE_SETTINGS_QUERY_KEY = "member-profile-settings";
const PROGRESS_ENTRIES_QUERY_KEY = "member-progress-entries";

const asNumberOrNull = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const useMemberProfileSettings = () => {
  const { member } = useMemberData();
  const isDemoMode = isDemoMemberMode();

  return useQuery({
    queryKey: [PROFILE_SETTINGS_QUERY_KEY, member?.id],
    queryFn: async () => {
      if (!member?.id) return null;
      const { data, error } = await supabase
        .from("member_profile_settings")
        .select("*")
        .eq("member_id", member.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!member?.id && !isDemoMode,
    staleTime: 60 * 1000,
  });
};

export const useSaveMemberProfileSettings = () => {
  const { member } = useMemberData();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isDemoMode = isDemoMemberMode();

  return useMutation({
    mutationFn: async (payload: MemberProfileSettingsPayload) => {
      if (isDemoMode || !member?.id || !member.gym_id || !user?.id) return;
      const { error } = await supabase.from("member_profile_settings").upsert({
        member_id: member.id,
        gym_id: member.gym_id,
        user_id: user.id,
        height_cm: asNumberOrNull(payload.height_cm),
        age: asNumberOrNull(payload.age),
        gender: payload.gender,
        goal_weight: asNumberOrNull(payload.goal_weight),
        goal_months: Math.max(1, Number(payload.goal_months || 1)),
        settings: payload.settings || {},
        migrated_from_local: payload.migrated_from_local ?? false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROFILE_SETTINGS_QUERY_KEY] });
    },
  });
};

export const useMemberProgressEntries = () => {
  const { member } = useMemberData();
  const isDemoMode = isDemoMemberMode();

  return useQuery({
    queryKey: [PROGRESS_ENTRIES_QUERY_KEY, member?.id],
    queryFn: async () => {
      if (!member?.id) return [] as ProgressEntry[];
      const { data, error } = await supabase
        .from("member_progress_entries")
        .select("entry_date, weight, workout, notes, metrics, created_at")
        .eq("member_id", member.id)
        .order("entry_date", { ascending: true })
        .limit(365);
      if (error) throw error;

      return (data || []).map((row) => ({
        date: row.created_at || `${row.entry_date}T00:00:00.000Z`,
        weight: row.weight ?? undefined,
        workout: row.workout,
        notes: row.notes || "",
      })) as ProgressEntry[];
    },
    enabled: !!member?.id && !isDemoMode,
    staleTime: 30 * 1000,
  });
};

export const useAddMemberProgressEntry = () => {
  const { member } = useMemberData();
  const { user } = useAuth();
  const qc = useQueryClient();
  const isDemoMode = isDemoMemberMode();

  return useMutation({
    mutationFn: async (entry: ProgressEntry) => {
      if (isDemoMode || !member?.id || !member.gym_id || !user?.id) return;
      const { error } = await supabase.from("member_progress_entries").insert({
        member_id: member.id,
        gym_id: member.gym_id,
        user_id: user.id,
        entry_date: entry.date.slice(0, 10),
        weight: entry.weight ?? null,
        workout: !!entry.workout,
        notes: entry.notes || "",
        metrics: {},
        created_at: entry.date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROGRESS_ENTRIES_QUERY_KEY] });
    },
  });
};
