import { useMemo, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInDays, format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemberData } from "./useMemberData";
import { useMemberXP } from "./useChallenges";
import { createNotificationIfMissing } from "./notification-utils";

const isDemoMemberMode = () =>
  typeof window !== "undefined" &&
  window.location.pathname === "/demo" &&
  new URLSearchParams(window.location.search).get("mode") === "member";

export interface MemberNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  type: "info" | "warning" | "success" | "urgent";
  icon?: string;
  is_read?: boolean;
}

const mapType = (type: string): MemberNotification["type"] => {
  if (type === "alert") return "urgent";
  if (type === "warning") return "warning";
  if (type === "success") return "success";
  return "info";
};

export const useMemberNotifications = () => {
  const { user } = useAuth();
  const { member, gym, attendance } = useMemberData();
  const { xp, level, tier } = useMemberXP();
  const isDemoMode = isDemoMemberMode();
  const queryClient = useQueryClient();
  const generatedSignatureRef = useRef("");

  const query = useQuery({
    queryKey: ["member-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as MemberNotification[];
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, type, created_at, is_read")
        .eq("audience", "member")
        .eq("recipient_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        body: row.message,
        time: formatDistanceToNow(new Date(row.created_at), { addSuffix: true }),
        type: mapType(row.type),
        is_read: row.is_read,
      })) as MemberNotification[];
    },
    enabled: !!user?.id && !isDemoMode,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (isDemoMode || !user?.id) return;

    const channel = supabase
      .channel(`member-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["member-notifications", user.id] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isDemoMode, queryClient, user?.id]);

  useEffect(() => {
    if (isDemoMode || !member?.id || !gym?.id || !user?.id) return;

    const now = new Date();
    const today = format(now, "yyyy-MM-dd");

    const candidates: Array<{
      title: string;
      message: string;
      type: "info" | "warning" | "success" | "alert";
      metadata: Record<string, unknown>;
    }> = [];

    candidates.push({
      title: "Welcome to FitCore",
      message: "Your member account is active. Start tracking your workouts and earn XP.",
      type: "info",
      metadata: { key: "member_welcome", member_id: member.id, date: "always" },
    });

    if (member.expiry_at) {
      const expiryDate = new Date(member.expiry_at);
      const daysUntilExpiry = differenceInDays(expiryDate, now);

      if (daysUntilExpiry < 0) {
        candidates.push({
          title: "Membership Expired",
          message: `Your membership expired on ${format(expiryDate, "MMM d, yyyy")}. Please renew to continue.`,
          type: "alert",
          metadata: { key: "member_expired", member_id: member.id, date: format(expiryDate, "yyyy-MM-dd") },
        });
      } else if (daysUntilExpiry <= 3) {
        candidates.push({
          title: "Membership Expiring Soon",
          message: `Your membership expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}.`,
          type: "warning",
          metadata: { key: "member_expiry_soon", member_id: member.id, date: today },
        });
      }
    }

    if ((member.due_amount || 0) > 0) {
      candidates.push({
        title: member.payment_status === "overdue" ? "Payment Overdue" : "Payment Due",
        message:
          member.payment_status === "overdue"
            ? "Your payment is overdue. Please settle dues to avoid service interruption."
            : `You have an outstanding balance of Rs ${Number(member.due_amount).toLocaleString()}.`,
        type: member.payment_status === "overdue" ? "alert" : "warning",
        metadata: {
          key: member.payment_status === "overdue" ? "member_payment_overdue" : "member_payment_due",
          member_id: member.id,
          date: today,
        },
      });
    }

    const uniqueDates = [...new Set((attendance || []).map((a) => format(new Date(a.check_in), "yyyy-MM-dd")))].sort().reverse();
    let streakDays = 0;
    for (let i = 0; i < uniqueDates.length; i += 1) {
      const expected = format(new Date(now.getTime() - i * 86400000), "yyyy-MM-dd");
      if (uniqueDates[i] === expected) streakDays += 1;
      else break;
    }

    if (streakDays >= 7) {
      candidates.push({
        title: `${streakDays}-Day Streak`,
        message: "Great consistency. Keep showing up and protect your streak.",
        type: "success",
        metadata: { key: "member_streak", member_id: member.id, date: format(now, "yyyy-ww") },
      });
    }

    if (level > 1) {
      candidates.push({
        title: `Level ${level} Reached`,
        message: `You are now ${tier.name} with ${xp} XP. Keep pushing.`,
        type: "success",
        metadata: { key: "member_level", member_id: member.id, date: String(level) },
      });
    }

    const generationSignature = [
      member.id,
      today,
      member.payment_status,
      Number(member.due_amount || 0).toFixed(2),
      member.expiry_at || "",
      streakDays,
      level,
      xp,
      tier.name,
    ].join("|");

    if (generatedSignatureRef.current === generationSignature) return;
    generatedSignatureRef.current = generationSignature;

    void Promise.all(
      candidates.map((item) =>
        createNotificationIfMissing({
          gym_id: gym.id,
          title: item.title,
          message: item.message,
          type: item.type,
          metadata: item.metadata,
          audience: "member",
          recipient_user_id: user.id,
        }),
      ),
    ).then(() => {
      queryClient.invalidateQueries({ queryKey: ["member-notifications", user.id] });
    });
  }, [attendance, gym?.id, isDemoMode, level, member, queryClient, tier.name, user?.id, xp]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode || !user?.id) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("audience", "member")
        .eq("recipient_user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-notifications", user?.id] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (isDemoMode || !user?.id) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("audience", "member")
        .eq("recipient_user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-notifications", user?.id] });
    },
  });

  const notifications = useMemo(() => {
    if (isDemoMode) {
      return [
        {
          id: "demo-member-welcome",
          title: "Welcome to FitCore",
          body: "Demo mode is active. Live member notifications appear in production accounts.",
          time: "now",
          type: "info" as const,
          is_read: false,
        },
      ];
    }

    return query.data || [];
  }, [isDemoMode, query.data]);

  return {
    notifications,
    isLoading: query.isLoading,
    markRead,
    markAllRead,
  };
};
