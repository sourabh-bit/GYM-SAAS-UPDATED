import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { isDemoGymMode } from "@/lib/demoMode";
import { createNotificationIfMissing } from "./notification-utils";
import {
  addDemoMember,
  deleteDemoMember,
  getDemoMembers,
  updateDemoMember,
} from "@/lib/demoGymData";

export interface Member {
  id: string;
  gym_id: string;
  name: string;
  email: string;
  phone: string;
  plan_id: string | null;
  plan_name: string;
  trainer_id: string | null;
  status: "active" | "expired" | "frozen" | "trial";
  joined_at: string;
  expiry_at: string | null;
  due_amount: number;
  last_payment: number;
  payment_status: "paid" | "pending" | "overdue" | "partial";
  payment_method: string;
  payment_date: string | null;
  autopay_enabled?: boolean;
  gateway_customer_id?: string | null;
  gateway_subscription_id?: string | null;
  last_checkin: string | null;
  created_at: string;
}

interface UseMembersPageOptions {
  search?: string;
  status?: Member["status"] | "all";
  page?: number;
  pageSize?: number;
}

interface MembersPageResult {
  rows: Member[];
  total: number;
  page: number;
  pageSize: number;
}

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong";

export const useMembers = () => {
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode();

  return useQuery({
    queryKey: ["members", isDemoMode ? "demo-gym" : gymId],
    queryFn: async () => {
      if (isDemoMode) return getDemoMembers() as Member[];
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Member[];
    },
    enabled: isDemoMode || !!gymId,
  });
};

export const useMembersPage = ({
  search = "",
  status = "all",
  page = 1,
  pageSize = 20,
}: UseMembersPageOptions = {}) => {
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode();
  const normalizedSearch = search.trim();
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  return useQuery({
    queryKey: [
      "members-page",
      isDemoMode ? "demo-gym" : gymId,
      normalizedSearch.toLowerCase(),
      status,
      safePage,
      safePageSize,
    ],
    queryFn: async (): Promise<MembersPageResult> => {
      if (isDemoMode) {
        const all = getDemoMembers() as Member[];
        const filtered = all.filter((m) => {
          const matchesSearch =
            !normalizedSearch ||
            m.name.toLowerCase().includes(normalizedSearch.toLowerCase()) ||
            (m.email || "").toLowerCase().includes(normalizedSearch.toLowerCase());
          const matchesStatus = status === "all" || m.status === status;
          return matchesSearch && matchesStatus;
        });
        return {
          rows: filtered.slice(from, to + 1),
          total: filtered.length,
          page: safePage,
          pageSize: safePageSize,
        };
      }

      if (!gymId) {
        return { rows: [], total: 0, page: safePage, pageSize: safePageSize };
      }

      let query = supabase
        .from("members")
        .select("*", { count: "exact" })
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (normalizedSearch) {
        query = query.or(
          `name.ilike.%${normalizedSearch}%,email.ilike.%${normalizedSearch}%`,
        );
      }

      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      return {
        rows: (data || []) as Member[],
        total: count || 0,
        page: safePage,
        pageSize: safePageSize,
      };
    },
    enabled: isDemoMode || !!gymId,
  });
};

export const useAddMember = () => {
  const queryClient = useQueryClient();
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode();

  return useMutation({
    mutationFn: async (member: Omit<Member, "id" | "gym_id" | "created_at">) => {
      if (isDemoMode) {
        return addDemoMember(member as any);
      }
      if (!gymId) throw new Error("No gym");
      const { data, error } = await supabase
        .from("members")
        .insert({ ...member, gym_id: gymId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["members-page"] });
      toast.success("Member added successfully");

      if (isDemoMode) return;

      void createNotificationIfMissing({
        gym_id: data.gym_id,
        title: "New Member Joined",
        message: `${data.name} just joined your gym. Welcome them!`,
        type: "success",
        metadata: {
          key: "new_member",
          member_id: data.id,
          date: (data.created_at || new Date().toISOString()).slice(0, 10),
        },
      });

      // Send invite in background so "Adding..." does not block on email delivery latency.
      if (!data.email) return;
      void (async () => {
        try {
          const { data: gymData } = await supabase
            .from("gyms")
            .select("name")
            .eq("id", data.gym_id)
            .single();

          const { error: inviteError } = await supabase.functions.invoke("send-member-invite", {
            body: {
              member_email: data.email,
              member_name: data.name,
              gym_name: gymData?.name || "your gym",
            },
          });

          if (inviteError) {
            console.error("Invite error:", inviteError);
            toast.info("Member added, invite email could not be sent");
          } else {
            toast.success(`Invite sent to ${data.email}`);
          }
        } catch (err) {
          console.error("Failed to send invite:", err);
          toast.info("Member added, invite email could not be sent");
        }
      })();
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
};

export const useUpdateMember = () => {
  const queryClient = useQueryClient();
  const isDemoMode = isDemoGymMode();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Member> & { id: string }) => {
      if (isDemoMode) {
        const updated = updateDemoMember(id, updates as any);
        if (!updated) throw new Error("Member not found");
        return updated;
      }
      const { data, error } = await supabase
        .from("members")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["members-page"] });
      toast.success("Member updated");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
};

export const useDeleteMember = () => {
  const queryClient = useQueryClient();
  const isDemoMode = isDemoGymMode();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        deleteDemoMember(id);
        return;
      }

      // Get full member snapshot before delete so we can preserve history
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("id, gym_id, name, trainer_id, plan_id, plan_name, expiry_at, due_amount, last_payment, payment_date, payment_method")
        .eq("id", id)
        .single();

      if (memberError) throw memberError;

      const memberName = memberData?.name || "Deleted Member";

      // Preserve attendance name after member_id becomes NULL
      const { error: attendanceNameError } = await supabase
        .from("attendance")
        .update({ member_name: memberName })
        .eq("member_id", id);

      if (attendanceNameError) throw attendanceNameError;

      // Preserve existing subscription member names after member_id becomes NULL
      const { error: subscriptionNameError } = await supabase
        .from("subscriptions")
        .update({ member_name: memberName } as any)
        .eq("member_id", id);

      if (subscriptionNameError) throw subscriptionNameError;

      // If payments were only tracked on member profile, archive one payment row before delete
      if ((memberData?.last_payment ?? 0) > 0 && memberData?.payment_date) {
        const paymentDate = new Date(memberData.payment_date);
        const dayStart = new Date(paymentDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(paymentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const { data: existingPaymentRows, error: existingPaymentError } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("member_id", id)
          .eq("amount_paid", memberData.last_payment)
          .gte("created_at", dayStart.toISOString())
          .lte("created_at", dayEnd.toISOString())
          .limit(1);

        if (existingPaymentError) throw existingPaymentError;

        if (!existingPaymentRows || existingPaymentRows.length === 0) {
          const { error: archivePaymentError } = await supabase
            .from("subscriptions")
            .insert({
              gym_id: memberData.gym_id,
              member_id: memberData.id,
              member_name: memberName,
              plan_id: memberData.plan_id,
              plan_name: memberData.plan_name,
              amount: memberData.last_payment,
              amount_paid: memberData.last_payment,
              payment_method: memberData.payment_method || "cash",
              payment_status: memberData.due_amount > 0 ? "partial" : "paid",
              start_date: memberData.payment_date,
              end_date: memberData.expiry_at,
              created_at: memberData.payment_date,
            } as any);

          if (archivePaymentError) throw archivePaymentError;
        }
      }

      // Decrement trainer members_count if assigned
      if (memberData?.trainer_id) {
        const { data: trainer } = await supabase
          .from("trainers")
          .select("members_count")
          .eq("id", memberData.trainer_id)
          .single();

        if (trainer) {
          await supabase
            .from("trainers")
            .update({ members_count: Math.max(0, trainer.members_count - 1) })
            .eq("id", memberData.trainer_id);
        }
      }

      // Delete member row (history remains via SET NULL constraints)
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["members-page"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["trainers"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Member deleted - historical data preserved");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
};
