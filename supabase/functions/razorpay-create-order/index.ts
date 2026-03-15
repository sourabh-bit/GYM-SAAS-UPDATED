import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, requireEnv, razorpayFetch, toPaise } from "../_shared/razorpay.ts";

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

    const { member_id, amount } = await req.json();
    if (!member_id) {
      return new Response(JSON.stringify({ error: "member_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: member, error: memberError } = await adminClient
      .from("members")
      .select("id, gym_id, user_id, name, email, phone, plan_id, plan_name, due_amount")
      .eq("id", member_id)
      .single();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: "Member not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: canManage } = await userClient.rpc("can_manage_gym_data", {
      _gym_id: member.gym_id,
    });
    const isSelf = member.user_id === user.id;
    if (!canManage && !isSelf) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payable = Number(amount);
    if (!payable || payable <= 0) {
      payable = Number(member.due_amount || 0);
    }
    if (!payable || payable <= 0) {
      return new Response(JSON.stringify({ error: "No due amount to collect" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const receipt = `gym_${member.gym_id}_${member.id}_${Date.now()}`;
    const order = await razorpayFetch<{ id: string; amount: number; currency: string }>(
      "/orders",
      "POST",
      {
        amount: toPaise(payable),
        currency: "INR",
        receipt,
        notes: {
          gym_id: member.gym_id,
          member_id: member.id,
          plan_id: member.plan_id || "",
        },
      },
    );

    const { data: intent, error: intentError } = await adminClient
      .from("payment_intents")
      .insert({
        gym_id: member.gym_id,
        member_id: member.id,
        plan_id: member.plan_id,
        amount: payable,
        currency: order.currency,
        gateway: "razorpay",
        gateway_order_id: order.id,
        status: "created",
      })
      .select("id")
      .single();

    if (intentError) {
      return new Response(JSON.stringify({ error: "Failed to create payment intent" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        key_id: requireEnv("RAZORPAY_KEY_ID"),
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        intent_id: intent.id,
        member_name: member.name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Razorpay create order error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
