import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminGymRow {
  id: string;
  name: string;
  owner_id: string;
  address: string | null;
  phone: string | null;
  created_at: string;
  current_plan_id: string | null;
  plan_expires_at: string | null;
  is_suspended: boolean | null;
  deleted_at: string | null;
}

export interface AdminMemberRow {
  id: string;
  gym_id: string;
}

export interface AdminProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  gym_id: string | null;
  created_at: string;
}

export interface AdminRoleRow {
  user_id: string;
  role: string;
  gym_id: string | null;
}

export interface AdminPlatformPlanRow {
  id: string;
  name: string;
  price: number;
  billing_cycle: string;
  max_members: number;
  features: string[] | null;
  is_active: boolean;
}

export interface AdminPlanRequestRow {
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

export interface AdminBaseData {
  gyms: AdminGymRow[];
  members: AdminMemberRow[];
  profiles: AdminProfileRow[];
  roles: AdminRoleRow[];
  plans: AdminPlatformPlanRow[];
  planRequests: AdminPlanRequestRow[];
}

export const useAdminBaseData = () =>
  useQuery({
    queryKey: ["admin-base-data"],
    queryFn: async (): Promise<AdminBaseData> => {
      const [
        gymsRes,
        membersRes,
        profilesRes,
        rolesRes,
        plansRes,
        requestsRes,
      ] = await Promise.all([
        supabase
          .from("gyms")
          .select("id, name, owner_id, address, phone, created_at, current_plan_id, plan_expires_at, is_suspended, deleted_at")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase.from("members").select("id, gym_id"),
        supabase
          .from("profiles")
          .select("id, full_name, email, gym_id, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role, gym_id"),
        supabase
          .from("platform_plans")
          .select("id, name, price, billing_cycle, max_members, features, is_active")
          .order("price", { ascending: true }),
        supabase
          .from("gym_plan_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (gymsRes.error) throw gymsRes.error;
      if (membersRes.error) throw membersRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (plansRes.error) throw plansRes.error;
      if (requestsRes.error) throw requestsRes.error;

      return {
        gyms: (gymsRes.data || []) as AdminGymRow[],
        members: (membersRes.data || []) as AdminMemberRow[],
        profiles: (profilesRes.data || []) as AdminProfileRow[],
        roles: (rolesRes.data || []) as AdminRoleRow[],
        plans: (plansRes.data || []) as AdminPlatformPlanRow[],
        planRequests: (requestsRes.data || []) as AdminPlanRequestRow[],
      };
    },
  });
