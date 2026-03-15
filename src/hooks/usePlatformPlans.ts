import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isDemoGymMode, isDemoMemberMode } from "@/lib/demoMode";
import {
  addDemoPlanRequest,
  getDemoCurrentGymPlan,
  getDemoPlanRequests,
  getDemoPlatformPlans,
  resolveDemoPlanRequest,
} from "@/lib/demoGymData";

export interface PlatformPlan {
  id: string;
  name: string;
  price: number;
  billing_cycle: string;
  max_members: number;
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface GymPlanRequest {
  id: string;
  gym_id: string;
  requested_plan_id: string;
  request_type: string;
  status: string;
  gym_name: string | null;
  owner_name: string | null;
  message: string | null;
  created_at: string;
  resolved_at: string | null;
}

export const usePlatformPlans = () => {
  const isDemoMode = isDemoGymMode() || isDemoMemberMode();
  return useQuery({
    queryKey: ["platform_plans", isDemoMode ? "demo-gym" : "live"],
    queryFn: async () => {
      if (isDemoMode) return getDemoPlatformPlans() as PlatformPlan[];
      const { data, error } = await supabase
        .from("platform_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });
      if (error) throw error;
      return (data || []) as PlatformPlan[];
    },
  });
};

export const useCurrentGymPlan = () => {
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode() || isDemoMemberMode();
  return useQuery({
    queryKey: ["gym_plan", isDemoMode ? "demo-gym" : gymId],
    queryFn: async () => {
      if (isDemoMode) {
        return getDemoCurrentGymPlan() as {
          current_plan_id: string | null;
          plan_expires_at: string | null;
          created_at?: string | null;
        };
      }
      if (!gymId) return null;
      const { data, error } = await supabase
        .from("gyms")
        .select("current_plan_id, plan_expires_at, created_at")
        .eq("id", gymId)
        .single();
      if (error) throw error;
      return data as { current_plan_id: string | null; plan_expires_at: string | null; created_at: string | null };
    },
    enabled: isDemoMode || !!gymId,
  });
};

export const useGymPlanRequests = () => {
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode();
  return useQuery({
    queryKey: ["gym_plan_requests", isDemoMode ? "demo-gym" : gymId],
    queryFn: async () => {
      if (isDemoMode) return getDemoPlanRequests() as GymPlanRequest[];
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("gym_plan_requests")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as GymPlanRequest[];
    },
    enabled: isDemoMode || !!gymId,
  });
};

export const useSubmitPlanRequest = () => {
  const qc = useQueryClient();
  const isDemoMode = isDemoGymMode();
  return useMutation({
    mutationFn: async (payload: {
      gym_id: string;
      requested_plan_id: string;
      request_type: string;
      gym_name?: string;
      owner_name?: string;
      message?: string;
    }) => {
      if (isDemoMode) {
        addDemoPlanRequest(payload);
        return;
      }
      const { error } = await supabase.from("gym_plan_requests").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gym_plan_requests"] });
    },
  });
};

// Admin hooks
export const useAllPlanRequests = () => {
  const isDemoMode = isDemoGymMode();
  return useQuery({
    queryKey: ["all_plan_requests", isDemoMode ? "demo-gym" : "live"],
    queryFn: async () => {
      if (isDemoMode) return getDemoPlanRequests() as GymPlanRequest[];
      const { data, error } = await supabase
        .from("gym_plan_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as GymPlanRequest[];
    },
  });
};

export const useResolvePlanRequest = () => {
  const qc = useQueryClient();
  const isDemoMode = isDemoGymMode();
  return useMutation({
    mutationFn: async ({ requestId, status, gymId, planId }: { requestId: string; status: string; gymId: string; planId: string }) => {
      if (isDemoMode) {
        resolveDemoPlanRequest({ requestId, status, planId });
        return;
      }
      // Update request status
      const { error: reqErr } = await supabase
        .from("gym_plan_requests")
        .update({ status, resolved_at: new Date().toISOString() })
        .eq("id", requestId);
      if (reqErr) throw reqErr;

      // If approved, update the gym's plan
      if (status === "approved") {
        const { error: gymErr } = await supabase
          .from("gyms")
          .update({
            current_plan_id: planId,
            plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", gymId);
        if (gymErr) throw gymErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all_plan_requests"] });
      qc.invalidateQueries({ queryKey: ["gym_plan"] });
    },
  });
};
