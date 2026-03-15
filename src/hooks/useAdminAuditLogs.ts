import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminAuditLogRow {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_name: string | null;
  action: string;
  category: string;
  target_id: string | null;
  target_label: string | null;
  detail: string | null;
  severity: string;
  metadata: Record<string, unknown>;
}

export const useAdminAuditLogs = () =>
  useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async (): Promise<AdminAuditLogRow[]> => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as AdminAuditLogRow[];
    },
  });
