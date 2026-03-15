type UpstashClient = {
  incr: (key: string) => Promise<number>;
  expire: (key: string, ttlSeconds: number) => Promise<void>;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetSeconds: number;
  source: "upstash" | "memory";
};

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();
let cachedUpstash: UpstashClient | null | undefined;

const buildUpstashClient = (): UpstashClient => {
  const baseUrl = (Deno.env.get("UPSTASH_REDIS_REST_URL") || "").replace(/\/$/, "");
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN") || "";

  if (!baseUrl || !token) {
    throw new Error("Missing Upstash configuration");
  }

  const request = async (path: string) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Upstash error ${res.status}`);
    }
    return res.json();
  };

  return {
    async incr(key: string) {
      const data = await request(`/incr/${encodeURIComponent(key)}`);
      return Number(data?.result ?? 0);
    },
    async expire(key: string, ttlSeconds: number) {
      await request(
        `/expire/${encodeURIComponent(key)}/${encodeURIComponent(String(ttlSeconds))}`,
      );
    },
  };
};

const getUpstashClient = () => {
  if (cachedUpstash !== undefined) return cachedUpstash;
  try {
    cachedUpstash = buildUpstashClient();
  } catch {
    cachedUpstash = null;
  }
  return cachedUpstash;
};

const rateLimitMemory = (
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult => {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);
  const resetAt = now + windowSeconds * 1000;

  if (!bucket || bucket.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      limit,
      resetSeconds: windowSeconds,
      source: "memory",
    };
  }

  const nextCount = bucket.count + 1;
  memoryBuckets.set(key, { count: nextCount, resetAt: bucket.resetAt });
  return {
    allowed: nextCount <= limit,
    remaining: Math.max(limit - nextCount, 0),
    limit,
    resetSeconds: Math.max(Math.ceil((bucket.resetAt - now) / 1000), 0),
    source: "memory",
  };
};

export const rateLimit = async (
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> => {
  const upstash = getUpstashClient();
  if (!upstash) {
    return rateLimitMemory(key, limit, windowSeconds);
  }

  try {
    const count = await upstash.incr(key);
    if (count === 1) {
      await upstash.expire(key, windowSeconds);
    }
    return {
      allowed: count <= limit,
      remaining: Math.max(limit - count, 0),
      limit,
      resetSeconds: windowSeconds,
      source: "upstash",
    };
  } catch {
    return rateLimitMemory(key, limit, windowSeconds);
  }
};
