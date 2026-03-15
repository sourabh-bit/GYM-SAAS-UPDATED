import { supabase } from "@/integrations/supabase/client";

export const metadataToKey = (meta: Record<string, unknown> | null | undefined) => {
  const key = meta?.key ?? "";
  const eventId = meta?.event_id ?? "";
  if (key && eventId) return `${key}::${eventId}`;
  const memberId = meta?.member_id ?? "";
  const date = meta?.date ?? "";
  if (!key || !memberId || !date) return "";
  return `${key}::${memberId}::${date}`;
};

interface CreateNotificationInput {
  gym_id: string;
  title: string;
  message: string;
  type?: string;
  metadata?: Record<string, unknown>;
  audience?: "owner" | "member";
  recipient_user_id?: string | null;
}

/**
 * Idempotent notification insert using deterministic dedupe fields + DB upsert.
 * Returns true when the write succeeds.
 */
export const createNotificationIfMissing = async (
  input: CreateNotificationInput,
): Promise<boolean> => {
  try {
    if (!input.gym_id) return false;
    if (input.audience === "member") {
      // Member clients don't have insert rights on notifications under current RLS.
      return false;
    }

    const metadata = input.metadata ?? {};
    const dedupeKey = metadataToKey(metadata) || null;
    const audience = input.audience ?? "owner";
    const dedupeRecipient = audience === "member"
      ? (input.recipient_user_id || "unknown-member")
      : "gym";

    if (dedupeKey && dedupeRecipient) {
      const { data: existing, error: findError } = await supabase
        .from("notifications")
        .select("id")
        .eq("gym_id", input.gym_id)
        .eq("audience", audience)
        .eq("dedupe_recipient", dedupeRecipient)
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();

      if (existing) return true;
      if (findError) {
        console.warn("Notification dedupe check failed:", findError);
      }
    }

    const { error } = await supabase.from("notifications").insert({
      gym_id: input.gym_id,
      title: input.title,
      message: input.message,
      type: input.type ?? "info",
      metadata,
      audience,
      recipient_user_id: audience === "member" ? input.recipient_user_id ?? null : null,
      dedupe_key: dedupeKey,
      dedupe_recipient: dedupeRecipient,
      is_read: false,
    });

    if (error) {
      console.error("Failed to insert notification:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Unexpected notification insert error:", err);
    return false;
  }
};
