import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { isDemoGymMode } from "@/lib/demoMode";
import {
  addDemoPlan,
  deleteDemoPlan,
  getDemoPlans,
  updateDemoPlan,
} from "@/lib/demoGymData";

export interface Plan {
  id: string;
  gym_id: string;
  name: string;
  price: number;
  duration_days: number;
  description: string;
  is_active: boolean;
  created_at: string;
}

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong";

export const usePlans = () => {
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode();

  return useQuery({
    queryKey: ["plans", isDemoMode ? "demo-gym" : gymId],
    queryFn: async () => {
      if (isDemoMode) return getDemoPlans() as Plan[];
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Plan[];
    },
    enabled: isDemoMode || !!gymId,
  });
};

export const useAddPlan = () => {
  const queryClient = useQueryClient();
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode();

  return useMutation({
    mutationFn: async (plan: Omit<Plan, "id" | "gym_id" | "created_at">) => {
      if (isDemoMode) return addDemoPlan(plan as any);
      if (!gymId) throw new Error("No gym");
      const { data, error } = await supabase
        .from("plans")
        .insert({ ...plan, gym_id: gymId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan created");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
};

export const useUpdatePlan = () => {
  const queryClient = useQueryClient();
  const isDemoMode = isDemoGymMode();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Plan> & { id: string }) => {
      if (isDemoMode) {
        const updated = updateDemoPlan(id, updates as any);
        if (!updated) throw new Error("Plan not found");
        return updated;
      }
      const shouldSyncPlanName = typeof updates.name === "string" && updates.name.trim().length > 0;

      const { data, error } = await supabase
        .from("plans")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Keep denormalized labels in sync for UI/history while preserving paid amounts.
      if (shouldSyncPlanName) {
        const nextPlanName = updates.name!.trim();
        const { error: memberNameSyncError } = await supabase
          .from("members")
          .update({ plan_name: nextPlanName })
          .eq("plan_id", id);
        if (memberNameSyncError) throw memberNameSyncError;

        const { error: subscriptionNameSyncError } = await supabase
          .from("subscriptions")
          .update({ plan_name: nextPlanName })
          .eq("plan_id", id);
        if (subscriptionNameSyncError) throw subscriptionNameSyncError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["members-page"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Plan updated");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
};

export const useDeletePlan = () => {
  const queryClient = useQueryClient();
  const isDemoMode = isDemoGymMode();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        deleteDemoPlan(id);
        return;
      }
      const { error } = await supabase.from("plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      toast.success("Plan deleted");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
};
