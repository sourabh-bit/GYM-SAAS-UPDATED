import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useEffect, useMemo } from "react";
import { useMembers } from "./useMembers";
import { differenceInDays, format } from "date-fns";
import { isDemoGymMode } from "@/lib/demoMode";
import { createNotificationIfMissing, metadataToKey } from "./notification-utils";
import { formatCurrencyINR } from "@/lib/currency";
import {
  clearDemoNotifications,
  getDemoNotifications,
  markAllDemoNotificationsRead,
  markDemoNotificationRead,
} from "@/lib/demoGymData";

export interface Notification {
  id: string;
  gym_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  audience: "owner" | "member";
  recipient_user_id: string | null;
  dedupe_key: string | null;
  dedupe_recipient: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

type OwnerNotificationPrefs = {
  payment_reminders: boolean;
  new_member_alerts: boolean;
  subscription_expiry: boolean;
};

const DEFAULT_OWNER_PREFS: OwnerNotificationPrefs = {
  payment_reminders: true,
  new_member_alerts: true,
  subscription_expiry: true,
};

const parseOwnerNotificationPrefs = (value: unknown): OwnerNotificationPrefs => {
  if (!value || typeof value !== "object") return DEFAULT_OWNER_PREFS;
  const root = value as Record<string, unknown>;
  const notifications = root.notifications;
  if (!notifications || typeof notifications !== "object") return DEFAULT_OWNER_PREFS;
  const src = notifications as Record<string, unknown>;
  return {
    payment_reminders:
      typeof src.payment_reminders === "boolean"
        ? src.payment_reminders
        : DEFAULT_OWNER_PREFS.payment_reminders,
    new_member_alerts:
      typeof src.new_member_alerts === "boolean"
        ? src.new_member_alerts
        : DEFAULT_OWNER_PREFS.new_member_alerts,
    subscription_expiry:
      typeof src.subscription_expiry === "boolean"
        ? src.subscription_expiry
        : DEFAULT_OWNER_PREFS.subscription_expiry,
  };
};

const getSuppressedStorageKey = (gymId: string, date: string) =>
  `notifications:suppressed:${gymId}:${date}`;

const getSuppressedKeys = (gymId: string, date: string) => {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const raw = window.localStorage.getItem(getSuppressedStorageKey(gymId, date));
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(parsed);
  } catch {
    return new Set<string>();
  }
};

const saveSuppressedKeys = (gymId: string, date: string, keys: Set<string>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getSuppressedStorageKey(gymId, date), JSON.stringify([...keys]));
};

const notificationDedupeKey = (n: Notification) => {
  if (n.dedupe_key) return n.dedupe_key;
  const metaKey = metadataToKey(n.metadata ?? undefined);
  if (metaKey) return metaKey;
  return `${n.type}::${n.title}::${n.message}::${(n.created_at || "").slice(0, 10)}`;
};

const dedupeNotifications = (rows: Notification[]) => {
  const seen = new Set<string>();
  return rows.filter((n) => {
    const key = notificationDedupeKey(n);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const useNotifications = () => {
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", isDemoMode ? "demo-gym" : gymId, "owner"],
    queryFn: async () => {
      if (isDemoMode) {
        return dedupeNotifications(
          (getDemoNotifications() as Notification[]).filter((n) => (n.audience || "owner") === "owner"),
        );
      }
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("gym_id", gymId)
        .eq("audience", "owner")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return dedupeNotifications((data || []) as Notification[]);
    },
    enabled: isDemoMode || !!gymId,
    refetchOnWindowFocus: true,
    refetchInterval: isDemoMode ? false : 60000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (isDemoMode || !gymId) return;

    const channel = supabase
      .channel(`owner-notifications-${gymId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `gym_id=eq.${gymId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", gymId, "owner"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gymId, isDemoMode, queryClient]);

  return query;
};

export const useUnreadCount = () => {
  const { data: notifications } = useNotifications();
  return (notifications || []).filter((n) => !n.is_read).length;
};

export const useMarkRead = () => {
  const qc = useQueryClient();
  const isDemoMode = isDemoGymMode();
  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        markDemoNotificationRead(id);
        return;
      }
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("audience", "owner");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
};

export const useMarkAllRead = () => {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  const isDemoMode = isDemoGymMode();
  return useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        markAllDemoNotificationsRead();
        return;
      }
      if (!gymId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("gym_id", gymId)
        .eq("audience", "owner")
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
};

export const useClearAllNotifications = () => {
  const { gymId } = useAuth();
  const qc = useQueryClient();
  const isDemoMode = isDemoGymMode();
  return useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        clearDemoNotifications();
        return;
      }
      if (!gymId) return;

      const todayStr = format(new Date(), "yyyy-MM-dd");

      const { data: existing, error: existingError } = await supabase
        .from("notifications")
        .select("dedupe_key, metadata")
        .eq("gym_id", gymId)
        .eq("audience", "owner");

      if (existingError) throw existingError;

      const suppressed = getSuppressedKeys(gymId, todayStr);
      (existing || []).forEach((row) => {
        const dedupeKey = row.dedupe_key || metadataToKey((row.metadata as Record<string, unknown> | null) ?? undefined);
        if (dedupeKey) suppressed.add(dedupeKey);
      });
      saveSuppressedKeys(gymId, todayStr, suppressed);

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("gym_id", gymId)
        .eq("audience", "owner");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
};

let generationInProgress = false;

export const useGenerateNotifications = () => {
  const { gymId } = useAuth();
  const { data: members } = useMembers();
  const qc = useQueryClient();
  const isDemoMode = isDemoGymMode();

  const generate = useCallback(async () => {
    if (isDemoMode) return;
    if (!gymId || !members || members.length === 0) return;
    if (generationInProgress) return;

    generationInProgress = true;

    try {
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");

      const { data: gymData } = await supabase
        .from("gyms")
        .select("owner_preferences")
        .eq("id", gymId)
        .single();

      const prefs = parseOwnerNotificationPrefs(gymData?.owner_preferences);

      const { data: existing } = await supabase
        .from("notifications")
        .select("dedupe_key, metadata")
        .eq("gym_id", gymId)
        .eq("audience", "owner")
        .order("created_at", { ascending: false })
        .limit(500);

      const suppressedKeys = getSuppressedKeys(gymId, todayStr);

      const existingKeys = new Set<string>([
        ...(existing || [])
          .map((n) => n.dedupe_key || metadataToKey((n.metadata as Record<string, unknown> | null) ?? undefined))
          .filter((key): key is string => !!key),
        ...suppressedKeys,
      ]);
      const queuedKeys = new Set<string>();

      const toInsert: Array<{
        title: string;
        message: string;
        type: string;
        metadata: Record<string, unknown>;
      }> = [];

      const queueNotification = (item: {
        title: string;
        message: string;
        type: string;
        metadata: Record<string, unknown>;
      }) => {
        const dedupeKey = metadataToKey(item.metadata);
        if (!dedupeKey) return;
        if (existingKeys.has(dedupeKey) || queuedKeys.has(dedupeKey)) return;
        queuedKeys.add(dedupeKey);
        toInsert.push(item);
      };

      if (prefs.subscription_expiry) {
        members.forEach((m) => {
          if (m.expiry_at && m.status === "active") {
            const daysLeft = differenceInDays(new Date(m.expiry_at), today);
            if (daysLeft >= 0 && daysLeft <= 3) {
              queueNotification({
                title: "Subscription Expiring",
                message: `${m.name}'s subscription expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Contact them for renewal.`,
                type: "warning",
                metadata: { key: "expiry_soon", member_id: m.id, date: todayStr },
              });
            }
          }
        });

        members.forEach((m) => {
          if (m.status === "expired") {
            queueNotification({
              title: "Membership Expired",
              message: `${m.name}'s membership has expired. Reach out to re-engage.`,
              type: "alert",
              metadata: { key: "expired", member_id: m.id, date: todayStr },
            });
          }
        });
      }

      if (prefs.payment_reminders) {
        members.forEach((m) => {
          if (m.payment_status === "overdue") {
            queueNotification({
              title: "Payment Overdue",
              message: `${m.name} has ${formatCurrencyINR(m.due_amount)} overdue. Follow up immediately.`,
              type: "alert",
              metadata: { key: "overdue", member_id: m.id, date: todayStr },
            });
          }
        });

        members.forEach((m) => {
          if (m.payment_status === "pending" && m.due_amount > 0) {
            queueNotification({
              title: "Payment Pending",
              message: `${m.name} has ${formatCurrencyINR(m.due_amount)} pending payment.`,
              type: "info",
              metadata: { key: "pending_payment", member_id: m.id, date: todayStr },
            });
          }
        });
      }

      if (prefs.new_member_alerts) {
        members.forEach((m) => {
          const joinDate = format(new Date(m.joined_at), "yyyy-MM-dd");
          if (joinDate === todayStr) {
            queueNotification({
              title: "New Member Joined",
              message: `${m.name} just joined your gym. Welcome them!`,
              type: "success",
              metadata: { key: "new_member", member_id: m.id, date: todayStr },
            });
          }
        });
      }

      if (toInsert.length > 0) {
        await Promise.all(
          toInsert.map((item) =>
            createNotificationIfMissing({
              gym_id: gymId,
              title: item.title,
              message: item.message,
              type: item.type,
              metadata: item.metadata,
              audience: "owner",
              recipient_user_id: null,
            }),
          ),
        );
        qc.invalidateQueries({ queryKey: ["notifications"] });
      }
    } catch (err) {
      console.error("Failed to generate notifications:", err);
    } finally {
      generationInProgress = false;
    }
  }, [gymId, isDemoMode, members, qc]);

  return generate;
};

export const useAutoGenerateNotifications = () => {
  const generate = useGenerateNotifications();
  const { data: members } = useMembers();
  const membersSignature = useMemo(
    () =>
      (members || [])
        .map(
          (m) =>
            `${m.id}:${m.status}:${m.payment_status}:${m.due_amount}:${m.expiry_at || ""}:${m.joined_at?.slice(0, 10) || ""}`,
        )
        .sort()
        .join("|"),
    [members],
  );

  useEffect(() => {
    if (!members) return;
    void generate();
  }, [generate, members, membersSignature]);

  return generate;
};
