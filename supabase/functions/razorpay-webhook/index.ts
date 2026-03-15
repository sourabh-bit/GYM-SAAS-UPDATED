import { createClient } from "npm:@supabase/supabase-js@2";
import { hmacSha256Hex, requireEnv, fromPaise } from "../_shared/razorpay.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const webhookSecret = requireEnv("RAZORPAY_WEBHOOK_SECRET");
    const expected = await hmacSha256Hex(webhookSecret, rawBody);

    if (expected !== signature) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload?.id || payload?.event_id || payload?.payload?.payment?.entity?.id || crypto.randomUUID();
    const eventType = payload?.event || "unknown";

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

    const { error: webhookInsertError } = await adminClient
      .from("payment_webhook_events")
      .upsert({
        gateway: "razorpay",
        event_id: eventId,
        event_type: eventType,
        payload,
        received_at: new Date().toISOString(),
      }, { onConflict: "gateway,event_id" });

    if (webhookInsertError) {
      return new Response(JSON.stringify({ error: "Failed to log webhook" }), { status: 500 });
    }

    const payment = payload?.payload?.payment?.entity || null;
    const subscription = payload?.payload?.subscription?.entity || null;

    const markOverdue = async (memberId: string, planId: string | null) => {
      const { data: member } = await adminClient
        .from("members")
        .select("id, gym_id, due_amount, plan_id")
        .eq("id", memberId)
        .single();

      if (!member) return;
      let dueAmount = Number(member.due_amount || 0);
      if (dueAmount <= 0) {
        const { data: plan } = await adminClient
          .from("plans")
          .select("price")
          .eq("id", planId || member.plan_id)
          .maybeSingle();
        dueAmount = Number(plan?.price || 0);
      }

      await adminClient.from("members").update({
        due_amount: dueAmount,
        payment_status: "overdue",
      }).eq("id", memberId);

      const firstRetryIn = scheduleDays[0] ?? 2;
      await adminClient.from("payment_dunning_attempts").insert({
        gym_id: member.gym_id,
        member_id: memberId,
        plan_id: planId || member.plan_id,
        gateway: "razorpay",
        attempt_no: 1,
        status: "scheduled",
        next_retry_at: new Date(Date.now() + firstRetryIn * DAY_MS).toISOString(),
      });
    };

    if (eventType === "payment.captured" || eventType === "order.paid") {
      if (payment) {
        const orderId = payment.order_id;
        const subscriptionId = payment.subscription_id;
        const amount = fromPaise(Number(payment.amount || 0));

        if (orderId) {
          const { data: intent } = await adminClient
            .from("payment_intents")
            .select("id, member_id, amount")
            .eq("gateway_order_id", orderId)
            .maybeSingle();

          if (intent) {
            await adminClient.from("payment_intents").update({
              status: "captured",
              updated_at: new Date().toISOString(),
            }).eq("id", intent.id);

            const { error: recordError } = await adminClient.rpc("record_gateway_payment", {
              p_member_id: intent.member_id,
              p_amount: amount || intent.amount,
              p_gateway: "razorpay",
              p_gateway_payment_id: payment.id,
              p_gateway_order_id: orderId,
              p_gateway_subscription_id: subscriptionId || null,
              p_extend_membership: !!subscriptionId,
            });
            if (recordError) {
              console.warn("record_gateway_payment failed", recordError);
            }
          }
        } else if (subscriptionId) {
          const { data: sub } = await adminClient
            .from("payment_subscriptions")
            .select("member_id, plan_id")
            .eq("gateway_subscription_id", subscriptionId)
            .maybeSingle();

          if (sub) {
            const { error: recordError } = await adminClient.rpc("record_gateway_payment", {
              p_member_id: sub.member_id,
              p_amount: amount,
              p_gateway: "razorpay",
              p_gateway_payment_id: payment.id,
              p_gateway_order_id: null,
              p_gateway_subscription_id: subscriptionId,
              p_extend_membership: true,
            });
            if (recordError) {
              console.warn("record_gateway_payment failed", recordError);
            }
          }
        }
      }
    }

    if (eventType === "payment.failed") {
      if (payment) {
        const orderId = payment.order_id;
        const subscriptionId = payment.subscription_id;
        if (orderId) {
          const { data: intent } = await adminClient
            .from("payment_intents")
            .select("id, member_id, plan_id")
            .eq("gateway_order_id", orderId)
            .maybeSingle();
          if (intent) {
            await adminClient.from("payment_intents").update({
              status: "failed",
              updated_at: new Date().toISOString(),
            }).eq("id", intent.id);
            await markOverdue(intent.member_id, intent.plan_id);
          }
        } else if (subscriptionId) {
          const { data: sub } = await adminClient
            .from("payment_subscriptions")
            .select("member_id, plan_id")
            .eq("gateway_subscription_id", subscriptionId)
            .maybeSingle();
          if (sub) {
            await markOverdue(sub.member_id, sub.plan_id);
          }
        }
      }
    }

    if (eventType === "payment_link.paid") {
      const paymentLink = payload?.payload?.payment_link?.entity || null;
      if (paymentLink) {
        const paymentId = payment?.id || paymentLink?.payment_id || null;
        const paymentLinkId = paymentLink.id;
        const amount = fromPaise(Number(paymentLink.amount || payment?.amount || 0));

        const { data: intent } = await adminClient
          .from("payment_intents")
          .select("id, member_id, amount")
          .eq("gateway_payment_link_id", paymentLinkId)
          .maybeSingle();

        if (intent && paymentId) {
          await adminClient.from("payment_intents").update({
            status: "captured",
            updated_at: new Date().toISOString(),
          }).eq("id", intent.id);

          const { error: recordError } = await adminClient.rpc("record_gateway_payment", {
            p_member_id: intent.member_id,
            p_amount: amount || intent.amount,
            p_gateway: "razorpay",
            p_gateway_payment_id: paymentId,
            p_gateway_order_id: null,
            p_gateway_subscription_id: null,
            p_extend_membership: false,
          });
          if (recordError) {
            console.warn("record_gateway_payment failed", recordError);
          }
        } else if (paymentLink?.notes?.member_id && paymentId) {
          const memberId = paymentLink.notes.member_id as string;
          const { error: recordError } = await adminClient.rpc("record_gateway_payment", {
            p_member_id: memberId,
            p_amount: amount,
            p_gateway: "razorpay",
            p_gateway_payment_id: paymentId,
            p_gateway_order_id: null,
            p_gateway_subscription_id: null,
            p_extend_membership: false,
          });
          if (recordError) {
            console.warn("record_gateway_payment failed", recordError);
          }
        }
      }
    }

    if (subscription && eventType.startsWith("subscription.")) {
      await adminClient.from("payment_subscriptions").update({
        status: subscription.status || "active",
        current_start: subscription.current_start ? new Date(subscription.current_start * 1000).toISOString() : null,
        current_end: subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : null,
        next_charge_at: subscription.next_charge_at ? new Date(subscription.next_charge_at * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("gateway_subscription_id", subscription.id);
    }

    await adminClient.from("payment_webhook_events").update({
      processed_at: new Date().toISOString(),
    }).eq("gateway", "razorpay").eq("event_id", eventId);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("Razorpay webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
