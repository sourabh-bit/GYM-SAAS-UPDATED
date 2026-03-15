import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, hmacSha256Hex, requireEnv } from "../_shared/razorpay.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");
    const razorpaySecret = requireEnv("RAZORPAY_KEY_SECRET");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_subscription_id,
      razorpay_signature,
      intent_id,
      context,
    } = await req.json();

    if (!razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: "Invalid payment payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let message = "";
    if (razorpay_order_id) {
      message = `${razorpay_order_id}|${razorpay_payment_id}`;
    } else if (razorpay_subscription_id) {
      message = `${razorpay_payment_id}|${razorpay_subscription_id}`;
    } else {
      return new Response(JSON.stringify({ error: "Missing order/subscription id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const expected = await hmacSha256Hex(razorpaySecret, message);
    if (expected !== razorpay_signature) {
      return new Response(JSON.stringify({ error: "Signature verification failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (razorpay_order_id) {
      const { data: intent, error: intentError } = await adminClient
        .from("payment_intents")
        .select("id, member_id, amount, status")
        .eq("gateway_order_id", razorpay_order_id)
        .maybeSingle();

      if (intentError || !intent) {
        return new Response(JSON.stringify({ error: "Payment intent not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (intent.status !== "captured") {
        await adminClient.from("payment_intents").update({
          status: "captured",
          updated_at: new Date().toISOString(),
        }).eq("id", intent.id);
      }

      const { error: recordError } = await adminClient.rpc("record_gateway_payment", {
        p_member_id: intent.member_id,
        p_amount: intent.amount,
        p_gateway: "razorpay",
        p_gateway_payment_id: razorpay_payment_id,
        p_gateway_order_id: razorpay_order_id,
        p_gateway_subscription_id: null,
        p_extend_membership: false,
      });
      if (recordError) {
        return new Response(JSON.stringify({ error: recordError.message || "Failed to record payment" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (razorpay_subscription_id) {
      await adminClient.from("payment_subscriptions").update({
        status: "active",
        updated_at: new Date().toISOString(),
      }).eq("gateway_subscription_id", razorpay_subscription_id);

      await adminClient.from("members").update({
        autopay_enabled: true,
        gateway_subscription_id: razorpay_subscription_id,
      }).eq("gateway_subscription_id", razorpay_subscription_id);
    }

    return new Response(JSON.stringify({ success: true, context: context || "payment" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Razorpay verify error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
