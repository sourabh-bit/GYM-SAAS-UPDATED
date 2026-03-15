import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, mapPlanInterval, razorpayFetch, requireEnv, toPaise } from "../_shared/razorpay.ts";

type RazorpayPlanResponse = {
  id: string;
  period: string;
  interval: number;
  item: { amount: number; currency: string; name: string };
};

type RazorpaySubscriptionResponse = {
  id: string;
  status: string;
  short_url?: string;
  start_at?: number;
  current_start?: number;
  current_end?: number;
  next_charge_at?: number;
};

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

    const { member_id } = await req.json();
    if (!member_id) {
      return new Response(JSON.stringify({ error: "member_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: member, error: memberError } = await adminClient
      .from("members")
      .select("id, gym_id, user_id, name, email, phone, plan_id, plan_name")
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

    if (!member.plan_id) {
      return new Response(JSON.stringify({ error: "Assign a plan before enabling autopay" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: plan, error: planError } = await adminClient
      .from("plans")
      .select("id, name, price, duration_days, is_active, razorpay_plan_id, razorpay_plan_amount, razorpay_plan_currency, razorpay_plan_interval, razorpay_plan_interval_count")
      .eq("id", member.plan_id)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!plan.is_active) {
      return new Response(JSON.stringify({ error: "Plan is inactive" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { period, interval } = mapPlanInterval(plan.duration_days || 30);
    let razorpayPlanId = plan.razorpay_plan_id;

    const needsPlan =
      !razorpayPlanId ||
      plan.razorpay_plan_amount !== plan.price ||
      plan.razorpay_plan_currency !== "INR" ||
      plan.razorpay_plan_interval !== period ||
      plan.razorpay_plan_interval_count !== interval;

    if (needsPlan) {
      const createdPlan = await razorpayFetch<RazorpayPlanResponse>("/plans", "POST", {
        period,
        interval,
        item: {
          name: plan.name,
          amount: toPaise(Number(plan.price || 0)),
          currency: "INR",
        },
      });

      razorpayPlanId = createdPlan.id;

      await adminClient.from("plans").update({
        razorpay_plan_id: createdPlan.id,
        razorpay_plan_amount: plan.price,
        razorpay_plan_currency: "INR",
        razorpay_plan_interval: period,
        razorpay_plan_interval_count: interval,
      }).eq("id", plan.id);
    }

    const { data: existingCustomer } = await adminClient
      .from("payment_customers")
      .select("gateway_customer_id")
      .eq("member_id", member.id)
      .eq("gateway", "razorpay")
      .maybeSingle();

    let customerId = existingCustomer?.gateway_customer_id || null;
    if (!customerId) {
      const customer = await razorpayFetch<{ id: string }>("/customers", "POST", {
        name: member.name,
        email: member.email || undefined,
        contact: member.phone || undefined,
        notes: {
          gym_id: member.gym_id,
          member_id: member.id,
        },
      });
      customerId = customer.id;
      await adminClient.from("payment_customers").insert({
        gym_id: member.gym_id,
        member_id: member.id,
        gateway: "razorpay",
        gateway_customer_id: customerId,
      });
    }

    const totalCount = period === "yearly" ? 10 : 120;
    const subscription = await razorpayFetch<RazorpaySubscriptionResponse>("/subscriptions", "POST", {
      plan_id: razorpayPlanId,
      total_count: totalCount,
      customer_notify: 1,
      customer_id: customerId,
      notes: {
        gym_id: member.gym_id,
        member_id: member.id,
        plan_id: plan.id,
      },
    });

    await adminClient.from("payment_subscriptions").upsert({
      gym_id: member.gym_id,
      member_id: member.id,
      plan_id: plan.id,
      gateway: "razorpay",
      gateway_subscription_id: subscription.id,
      status: subscription.status || "created",
      current_start: subscription.current_start ? new Date(subscription.current_start * 1000).toISOString() : null,
      current_end: subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : null,
      next_charge_at: subscription.next_charge_at ? new Date(subscription.next_charge_at * 1000).toISOString() : null,
      autopay_enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "member_id,gateway" });

    await adminClient.from("members").update({
      autopay_enabled: true,
      gateway_customer_id: customerId,
      gateway_subscription_id: subscription.id,
    }).eq("id", member.id);

    return new Response(JSON.stringify({
      key_id: requireEnv("RAZORPAY_KEY_ID"),
      subscription_id: subscription.id,
      short_url: subscription.short_url || null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Razorpay create subscription error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
