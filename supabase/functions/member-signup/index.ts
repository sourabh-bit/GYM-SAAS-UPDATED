import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCorsHeaders, resolveAllowedOrigin } from "../_shared/cors.ts";
import { rateLimit } from "../_shared/rate-limit.ts";

const buildHeaders = (req?: Request) => ({
  ...buildCorsHeaders(req),
});

const getClientIp = (req: Request) => {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
};

Deno.serve(async (req) => {
  const corsHeaders = buildHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, full_name, check_only } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedFullName = String(full_name || "").trim();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    const clientIp = getClientIp(req);

    const checkOnlyKey = `check_only:${clientIp}`;
    const signupKey = `signup:${clientIp}:${normalizedEmail || "missing-email"}`;
    if (check_only) {
      const rl = await rateLimit(checkOnlyKey, 25, 5 * 60);
      if (!rl.allowed) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const rl = await rateLimit(signupKey, 8, 10 * 60);
      if (!rl.allowed) {
        return new Response(
          JSON.stringify({ error: "Too many signup attempts. Please wait before trying again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const authClient = createClient(supabaseUrl, anonKey);

    if (check_only) {
      if (!normalizedEmail || !isValidEmail) {
        return new Response(JSON.stringify({ exists: false, already_registered: false }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: memberRecord } = await adminClient
        .from("members")
        .select("id, name, gym_id, user_id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (memberRecord && !memberRecord.user_id) {
        return new Response(
          JSON.stringify({
            exists: true,
            already_registered: false,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (memberRecord && memberRecord.user_id) {
        return new Response(
          JSON.stringify({ exists: false, already_registered: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ exists: false, already_registered: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!normalizedEmail || !password || !normalizedFullName) {
      return new Response(
        JSON.stringify({ error: "Email, password, and full name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!isValidEmail) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (normalizedFullName.length < 2 || normalizedFullName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Full name must be between 2 and 100 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!/^[a-zA-Z0-9 .,'-]+$/.test(normalizedFullName)) {
      return new Response(
        JSON.stringify({ error: "Full name contains unsupported characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: memberRecord, error: memberError } = await adminClient
      .from("members")
      .select("id, gym_id, user_id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (memberError) {
      return new Response(
        JSON.stringify({ error: "Failed to verify membership" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!memberRecord || memberRecord.user_id) {
      return new Response(
        JSON.stringify({ error: "This account cannot be created with the provided email. Please contact your gym owner." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = resolveAllowedOrigin(req.headers.get("origin"), Deno.env.get("PUBLIC_SITE_URL") || supabaseUrl);

    const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${origin}/member-login`,
        data: { full_name: normalizedFullName, is_member: true },
      },
    });

    if (signUpError) {
      if (signUpError.message?.toLowerCase().includes("already") || signUpError.message?.toLowerCase().includes("registered")) {
        return new Response(
          JSON.stringify({ error: "An account with this email already exists. Please log in." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: signUpError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Could not create account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: profileUpsertError } = await adminClient.from("profiles").upsert(
      {
        id: userId,
        full_name: normalizedFullName,
        email: normalizedEmail,
        gym_id: memberRecord.gym_id,
      },
      { onConflict: "id" }
    );
    if (profileUpsertError) {
      return new Response(
        JSON.stringify({ error: "Account created but profile setup failed. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: memberRoleUpsertError } = await adminClient.from("user_roles").upsert(
      {
        user_id: userId,
        role: "member",
        gym_id: memberRecord.gym_id,
      },
      { onConflict: "user_id,role,gym_id" }
    );
    if (memberRoleUpsertError) {
      return new Response(
        JSON.stringify({ error: "Account created but role assignment failed. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: memberLinkError } = await adminClient
      .from("members")
      .update({ user_id: userId })
      .eq("id", memberRecord.id)
      .is("user_id", null);
    if (memberLinkError) {
      return new Response(
        JSON.stringify({ error: "Account created but member linking failed. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account created! Verification email sent. Please verify your email before login.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (_err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
