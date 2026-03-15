const parseEnvList = (key: string) => {
  const raw = Deno.env.get(key) || "";
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
};

export const getAllowedOrigins = () => parseEnvList("ALLOWED_ORIGINS");

export const getAllowedRedirectOrigins = () => {
  const redirectOrigins = parseEnvList("ALLOWED_REDIRECT_ORIGINS");
  return redirectOrigins.length > 0 ? redirectOrigins : getAllowedOrigins();
};

export const resolveAllowedOrigin = (
  origin: string | null | undefined,
  fallback?: string,
  allowedOverride?: string[],
) => {
  const allowed = allowedOverride ?? getAllowedRedirectOrigins();
  if (allowed.length === 0) {
    return origin || fallback || "";
  }

  if (origin && allowed.includes(origin)) return origin;
  if (fallback && allowed.includes(fallback)) return fallback;
  return allowed[0];
};

const DEFAULT_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

export const buildCorsHeaders = (req?: Request) => {
  const origin = req?.headers.get("origin") || "";
  const allowed = getAllowedOrigins();
  const allowOrigin =
    allowed.length === 0
      ? "*"
      : origin && allowed.includes(origin)
        ? origin
        : "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": DEFAULT_HEADERS,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Vary": "Origin",
  };
};
