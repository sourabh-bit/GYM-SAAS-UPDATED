import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isDemoGymMode } from "@/lib/demoMode";
import { getDemoSubscriptions } from "@/lib/demoGymData";

export interface Subscription {
  id: string;
  gym_id: string;
  member_id: string | null;
  member_name?: string | null;
  plan_id: string | null;
  plan_name: string | null;
  start_date: string;
  end_date: string | null;
  amount: number;
  amount_paid: number;
  payment_method: string | null;
  payment_status: "paid" | "pending" | "overdue" | "partial";
  gateway?: string | null;
  gateway_payment_id?: string | null;
  gateway_order_id?: string | null;
  gateway_subscription_id?: string | null;
  created_at: string;
}

export const useSubscriptions = () => {
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode();

  return useQuery({
    queryKey: ["subscriptions", isDemoMode ? "demo-gym" : gymId],
    queryFn: async () => {
      if (isDemoMode) return getDemoSubscriptions() as Subscription[];
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Subscription[];
    },
    enabled: isDemoMode || !!gymId,
  });
};
