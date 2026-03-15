import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const loadDotEnv = () => {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    if (!key || process.env[key]) continue;

    const valueRaw = trimmed.slice(eqIndex + 1).trim();
    const unquoted =
      (valueRaw.startsWith('"') && valueRaw.endsWith('"')) ||
      (valueRaw.startsWith("'") && valueRaw.endsWith("'"))
        ? valueRaw.slice(1, -1)
        : valueRaw;

    process.env[key] = unquoted;
  }
};

loadDotEnv();

const getArg = (name) => {
  const key = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(key));
  return found ? found.slice(key.length) : "";
};

const fail = (message) => {
  console.error(`ERROR: ${message}`);
  process.exit(1);
};

const emailInput = getArg("email");
const password = getArg("password");
const nameInput = getArg("name") || "FitCore Super Admin";

if (!emailInput) {
  fail("Missing --email argument");
}
if (!password || password.length < 8) {
  fail("Missing/weak --password argument (min 8 characters)");
}

const email = emailInput.trim().toLowerCase();
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  fail("Set SUPABASE_URL (or VITE_SUPABASE_URL) in env");
}
if (!serviceRoleKey) {
  fail("Set SUPABASE_SERVICE_ROLE_KEY in env");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const findUserByEmail = async (targetEmail) => {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    const match = users.find((user) => (user.email || "").toLowerCase() === targetEmail);
    if (match) return match;

    if (users.length < perPage) return null;
    page += 1;
  }
};

const ensureProfile = async (userId, userEmail, fullName) => {
  const payload = {
    id: userId,
    email: userEmail,
    full_name: fullName || "FitCore Super Admin",
  };

  const { error } = await admin.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) throw error;
};

const ensureSuperAdminRole = async (userId) => {
  const { data: existing, error: existingError } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .is("gym_id", null)
    .limit(1);

  if (existingError) throw existingError;
  if ((existing || []).length > 0) return;

  const { error: insertError } = await admin.from("user_roles").insert({
    user_id: userId,
    role: "super_admin",
    gym_id: null,
  });
  if (insertError) throw insertError;
};

const run = async () => {
  const existing = await findUserByEmail(email);
  let userId = existing?.id || null;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: nameInput },
    });
    if (error) throw error;
    userId = data.user?.id || null;
  } else {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: nameInput },
    });
    if (error) throw error;
  }

  if (!userId) {
    throw new Error("Could not resolve super admin user id");
  }

  await ensureProfile(userId, email, nameInput);
  await ensureSuperAdminRole(userId);

  console.log(`SUCCESS: Super admin is ready for ${email}`);
  console.log(`USER_ID: ${userId}`);
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  fail(message);
});
