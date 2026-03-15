import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCorsHeaders, resolveAllowedOrigin } from "../_shared/cors.ts";
import { rateLimit } from "../_shared/rate-limit.ts";

const buildHeaders = (req?: Request) => ({
  ...buildCorsHeaders(req),
});

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
};

Deno.serve(async (req) => {
  const corsHeaders = buildHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { member_email, member_name } = await req.json();

    const normalizedEmail = String(member_email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return new Response(
        JSON.stringify({ error: "Member email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rlKey = user?.id ? `invite:rl:user:${user.id}` : `invite:rl:ip:${getClientIp(req)}`;
    const rl = await rateLimit(rlKey, 10, 60);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [
      { data: isOwner, error: ownerRoleError },
      { data: isAdmin, error: adminRoleError },
    ] = await Promise.all([
      userClient.rpc("has_role", { _user_id: user.id, _role: "owner" }),
      userClient.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
    ]);

    if (ownerRoleError || adminRoleError || (!isOwner && !isAdmin)) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: memberRecord, error: memberError } = await userClient
      .from("members")
      .select("id, name, gym_id, user_id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (memberError) {
      return new Response(
        JSON.stringify({ error: "Unable to verify member record" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!memberRecord) {
      return new Response(
        JSON.stringify({ error: "Member record not found for this gym" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (memberRecord.user_id) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Member already has an account",
          already_registered: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: gymData } = await userClient
      .from("gyms")
      .select("name")
      .eq("id", memberRecord.gym_id)
      .single();

    const origin = resolveAllowedOrigin(req.headers.get("origin"), Deno.env.get("PUBLIC_SITE_URL") || supabaseUrl);
    const signupUrl = `${origin}/member-signup?email=${encodeURIComponent(normalizedEmail)}`;

    // Send invite email using Supabase's built-in email via admin API
    // We generate a "magic link" style invite by using the inviteUserByEmail method
    // But since the member doesn't have an account yet, we'll use a different approach:
    // Send an email using the admin generateLink for signup type
    const { error } = await adminClient.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: { 
        full_name: String(member_name || memberRecord.name || "").trim(), 
        is_member: true,
        invited: true,
      },
      redirectTo: signupUrl,
    });

    // If user already exists (already invited or signed up), that's fine
    if (error) {
      // If already registered, just return success - they already have access
      if (error.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Member already has an account",
            already_registered: true,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.error("Invite error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invite sent to ${normalizedEmail}`,
        gym_name: gymData?.name || "Your gym",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
