import { createClient } from "npm:@supabase/supabase-js@2";
import { requireEnv } from "../_shared/razorpay.ts";

Deno.serve(async (req) => {
  try {
    const dunningKey = requireEnv("DUNNING_SECRET");
    const incomingKey = req.headers.get("x-dunning-key") || "";
    if (!incomingKey || incomingKey !== dunningKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: settings } = await adminClient
      .from("platform_settings")
      .select("billing_retry_schedule_days")
      .eq("id", 1)
      .maybeSingle();

    const retrySchedule = Array.isArray(settings?.billing_retry_schedule_days)
      ? settings?.billing_retry_schedule_days.filter((v: number) => v > 0)
      : [];
    const scheduleDays = retrySchedule.length > 0 ? retrySchedule : [2, 5, 9];

    const nowIso = new Date().toISOString();
    const { data: attempts = [] } = await adminClient
      .from("payment_dunning_attempts")
      .select("id, gym_id, member_id, plan_id, attempt_no")
      .eq("status", "scheduled")
      .lte("next_retry_at", nowIso);

    for (const attempt of attempts) {
      const { data: member } = await adminClient
        .from("members")
        .select("id, name, user_id, due_amount")
        .eq("id", attempt.member_id)
        .maybeSingle();

      if (!member) continue;

      await adminClient.from("notifications").insert({
        gym_id: attempt.gym_id,
        audience: "owner",
        title: "Payment Overdue",
        message: `${member.name} has an overdue payment of ₹${member.due_amount}.`,
        type: "warning",
        metadata: {
          key: "payment_overdue",
          member_id: member.id,
          attempt_no: attempt.attempt_no,
          date: new Date().toISOString().slice(0, 10),
        },
      });

      if (member.user_id) {
        await adminClient.from("notifications").insert({
          gym_id: attempt.gym_id,
          audience: "member",
          recipient_user_id: member.user_id,
          title: "Payment Due",
          message: "Your membership payment is overdue. Please pay to avoid access interruptions.",
          type: "warning",
          metadata: {
            key: "payment_due_member",
            member_id: member.id,
            attempt_no: attempt.attempt_no,
            date: new Date().toISOString().slice(0, 10),
          },
        });
      }

      await adminClient
        .from("payment_dunning_attempts")
        .update({
          status: "sent",
          updated_at: new Date().toISOString(),
        })
        .eq("id", attempt.id);

      const nextIndex = attempt.attempt_no;
      if (nextIndex < scheduleDays.length) {
        const nextRetryAt = new Date(Date.now() + scheduleDays[nextIndex] * 24 * 60 * 60 * 1000);
        await adminClient.from("payment_dunning_attempts").insert({
          gym_id: attempt.gym_id,
          member_id: attempt.member_id,
          plan_id: attempt.plan_id,
          gateway: "razorpay",
          attempt_no: attempt.attempt_no + 1,
          status: "scheduled",
          next_retry_at: nextRetryAt.toISOString(),
        });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: attempts.length }), { status: 200 });
  } catch (err) {
    console.error("Dunning function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
