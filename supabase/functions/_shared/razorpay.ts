export const requireEnv = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing ${key}`);
  return value;
};

export const buildRazorpayAuth = () => {
  const keyId = requireEnv("RAZORPAY_KEY_ID");
  const keySecret = requireEnv("RAZORPAY_KEY_SECRET");
  const auth = btoa(`${keyId}:${keySecret}`);
  return { keyId, authHeader: `Basic ${auth}` };
};

export const razorpayFetch = async <T>(
  path: string,
  method: "GET" | "POST" | "PATCH" | "PUT" = "POST",
  body?: Record<string, unknown>,
): Promise<T> => {
  const { authHeader } = buildRazorpayAuth();
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Razorpay API error (${res.status}): ${errorText}`);
  }

  return (await res.json()) as T;
};

export const hmacSha256Hex = async (secret: string, message: string) => {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const toPaise = (amount: number) => Math.round(amount * 100);

export const fromPaise = (amount: number) => amount / 100;

export const mapPlanInterval = (durationDays: number) => {
  if (durationDays % 365 === 0) {
    return { period: "yearly", interval: Math.max(1, Math.floor(durationDays / 365)) };
  }
  if (durationDays % 30 === 0) {
    return { period: "monthly", interval: Math.max(1, Math.floor(durationDays / 30)) };
  }
  if (durationDays % 7 === 0) {
    return { period: "weekly", interval: Math.max(1, Math.floor(durationDays / 7)) };
  }
  return { period: "daily", interval: Math.max(1, durationDays) };
};
