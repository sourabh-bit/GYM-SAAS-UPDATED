import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sendTelemetryEvent } from "@/lib/telemetry";

export interface AdminHealthMetrics {
  totalGyms: number;
  totalMembers: number;
  checkins24h: number;
  pendingPlanRequests: number;
  highSeverityLogs24h: number;
}

export const useAdminHealthMetrics = () =>
  useQuery({
    queryKey: ["admin-health"],
    queryFn: async (): Promise<AdminHealthMetrics> => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [
        gymsRes,
        membersRes,
        checkinsRes,
        requestsRes,
        logsRes,
      ] = await Promise.all([
        supabase.from("gyms").select("*", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("members").select("*", { count: "exact", head: true }),
        supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .gte("check_in", since),
        supabase
          .from("gym_plan_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("admin_audit_logs")
          .select("*", { count: "exact", head: true })
          .eq("severity", "high")
          .gte("created_at", since),
      ]);

      if (gymsRes.error) throw gymsRes.error;
      if (membersRes.error) throw membersRes.error;
      if (checkinsRes.error) throw checkinsRes.error;
      if (requestsRes.error) throw requestsRes.error;
      if (logsRes.error) throw logsRes.error;

      return {
        totalGyms: gymsRes.count ?? 0,
        totalMembers: membersRes.count ?? 0,
        checkins24h: checkinsRes.count ?? 0,
        pendingPlanRequests: requestsRes.count ?? 0,
        highSeverityLogs24h: logsRes.count ?? 0,
      };
    },
    onSuccess: (data) => {
      void sendTelemetryEvent({ type: "admin_health_snapshot", payload: data });
    },
  });
