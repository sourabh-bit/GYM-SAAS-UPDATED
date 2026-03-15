import { createClient } from "npm:@supabase/supabase-js@2";
import { requireEnv, razorpayFetch, toPaise } from "../_shared/razorpay.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { rateLimit } from "../_shared/rate-limit.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
};

type RazorpayPaymentLinkResponse = {
  id: string;
  short_url: string;
  status: string;
};

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
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
    if (!member_id || !UUID_RE.test(String(member_id))) {
      return new Response(JSON.stringify({ error: "member_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: member, error: memberError } = await adminClient
      .from("members")
      .select("id, gym_id, name, email, phone, plan_id, plan_name, due_amount")
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

    if (!canManage) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rlKey = user?.id ? `pay:link:user:${user.id}` : `pay:link:ip:${getClientIp(req)}`;
    const rl = await rateLimit(rlKey, 5, 60);
    if (!rl.allowed) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsedAmount = amount === undefined || amount === null ? null : Number(amount);
    if (parsedAmount !== null && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payable = parsedAmount ?? Number(member.due_amount || 0);
    if (!payable || payable <= 0) {
      return new Response(JSON.stringify({ error: "No due amount to collect" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (member.due_amount && payable > Number(member.due_amount || 0)) {
      return new Response(JSON.stringify({ error: "Amount exceeds due balance" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentLink = await razorpayFetch<RazorpayPaymentLinkResponse>("/payment_links", "POST", {
      amount: toPaise(payable),
      currency: "INR",
      accept_partial: false,
      description: `${member.name} - ${member.plan_name || "Membership"}`,
      customer: {
        name: member.name,
        email: member.email || undefined,
        contact: member.phone || undefined,
      },
      notify: {
        sms: false,
        email: false,
      },
      reminder_enable: false,
      notes: {
        gym_id: member.gym_id,
        member_id: member.id,
        plan_id: member.plan_id || "",
      },
    });

    await adminClient.from("payment_intents").insert({
      gym_id: member.gym_id,
      member_id: member.id,
      plan_id: member.plan_id,
      amount: payable,
      currency: "INR",
      gateway: "razorpay",
      gateway_payment_link_id: paymentLink.id,
      payment_link_url: paymentLink.short_url,
      status: paymentLink.status || "created",
    });

    return new Response(JSON.stringify({
      payment_link_id: paymentLink.id,
      short_url: paymentLink.short_url,
      status: paymentLink.status,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Razorpay create payment link error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
