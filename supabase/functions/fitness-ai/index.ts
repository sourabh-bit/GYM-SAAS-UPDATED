import { createClient } from "npm:@supabase/supabase-js@2";

const FUNCTION_VERSION = "2026-03-15.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "X-Fitness-AI-Version": FUNCTION_VERSION,
};

const REFUSAL_MESSAGE =
  "I only answer gym and fitness related questions. Ask me about workouts, diet, or training.";

const SYSTEM_PROMPT = `
You are an expert AI fitness coach and certified gym trainer.

Your job is to answer questions only related to:
- Gym workouts
- Exercise techniques
- Muscle building
- Fat loss
- Fitness diet and nutrition
- Supplements
- Recovery
- Workout routines
- Gym beginner guidance
- Injury prevention during training

If the user asks anything unrelated to gym or fitness, reply politely that you only answer gym and fitness related questions.

LANGUAGE STYLE
- Speak in natural Hinglish (Hindi + English mix).
- Sound like a real gym trainer giving practical advice.
- Keep explanations simple, clear, and helpful.

FORMATTING RULES (VERY IMPORTANT)
1. Never use asterisks (*).
2. Never use markdown formatting like bold or italic.
3. Never use symbols like ###, ===, or **.
4. Use plain text headings followed by a colon.
5. Always leave one blank line between sections.
6. Use bullet points with the dot symbol: •
7. Keep the structure clean and easy to read.

RESPONSE FORMAT TEMPLATE

Exercise Name:
Name of the exercise

Muscles Targeted:
Primary muscles worked

Difficulty Level:
Beginner / Intermediate / Advanced

How To Perform:

• Step explanation
• Step explanation
• Step explanation
• Step explanation

Common Mistakes:

• Mistake example
• Mistake example
• Mistake example

Pro Tips:

• Helpful tip
• Helpful tip
• Helpful tip

Coach Advice:
Short helpful trainer advice.

SMART RESPONSE RULES
- If the question is unclear, ask a short clarification before answering.
- Always keep responses between 120 and 250 words unless the user asks for detail.
- Focus on practical gym advice instead of overly technical explanations.
- Always keep the formatting clean and readable.
`.trim();

const FITNESS_KEYWORDS = [
  "workout",
  "workouts",
  "gym",
  "fitness",
  "training",
  "train",
  "exercise",
  "routine",
  "program",
  "plan",
  "workout plan",
  "training plan",
  "split",
  "push pull legs",
  "ppl",
  "upper lower",
  "full body",
  "bro split",
  "beginner",
  "intermediate",
  "advanced",
  "novice",
  "strength",
  "strength training",
  "weight training",
  "bodybuilding",
  "hypertrophy",
  "muscle",
  "muscle gain",
  "gain muscle",
  "build muscle",
  "muscle building",
  "lean",
  "lean bulk",
  "bulk",
  "bulking",
  "cut",
  "cutting",
  "fat loss",
  "weight loss",
  "lose fat",
  "lose weight",
  "weight gain",
  "gain weight",
  "recomp",
  "body recomposition",
  "calorie deficit",
  "deficit",
  "surplus",
  "maintenance",
  "maintenance calories",
  "calorie intake",
  "protein intake",
  "macros",
  "macro",
  "carb",
  "carbs",
  "fat",
  "fats",
  "protein",
  "calorie",
  "calories",
  "tdee",
  "bmr",
  "bmi",
  "body fat",
  "fat %",
  "bf",
  "kg",
  "kgs",
  "weight",
  "height",
  "age",
  "goal",
  "target",
  "motivation",
  "discipline",
  "consistency",
  "habit",
  "habits",
  "progress",
  "progressive overload",
  "pr",
  "1rm",
  "one rep max",
  "rpe",
  "rir",
  "rep",
  "reps",
  "set",
  "sets",
  "rest",
  "rest time",
  "tempo",
  "time under tension",
  "form",
  "technique",
  "posture",
  "range of motion",
  "warm up",
  "warmup",
  "cool down",
  "cooldown",
  "mobility",
  "stretch",
  "stretching",
  "flexibility",
  "recovery",
  "rest day",
  "rest days",
  "sleep",
  "hydration",
  "water",
  "injury",
  "pain",
  "rehab",
  "prehab",
  "soreness",
  "doms",
  "overtraining",
  "plateau",
  "steps",
  "step count",
  "step goal",
  "cardio",
  "cardio plan",
  "hiit",
  "liss",
  "running",
  "run",
  "jog",
  "jogging",
  "walk",
  "walking",
  "cycling",
  "bike",
  "treadmill",
  "elliptical",
  "stairmaster",
  "stepper",
  "jump rope",
  "skipping",
  "sprint",
  "intervals",
  "yoga",
  "calisthenics",
  "bodyweight",
  "body weight",
  "home workout",
  "home workouts",
  "no equipment",
  "resistance band",
  "band workout",
  "equipment",
  "gear",
  "shoes",
  "sneakers",
  "gym bag",
  "dumbbell",
  "dumbbells",
  "barbell",
  "barbells",
  "kettlebell",
  "kettlebells",
  "cable",
  "machine",
  "smith machine",
  "bench",
  "bench press",
  "incline",
  "decline",
  "squat",
  "squats",
  "deadlift",
  "deadlifts",
  "rdl",
  "romanian deadlift",
  "row",
  "rows",
  "seated row",
  "pull up",
  "pullup",
  "chin up",
  "chinup",
  "lat pulldown",
  "pulldown",
  "pull down",
  "chest press",
  "shoulder press",
  "overhead press",
  "military press",
  "lateral raise",
  "lateral raises",
  "front raise",
  "rear delt",
  "rear delt fly",
  "bicep",
  "biceps",
  "bicep curl",
  "biceps curl",
  "curl",
  "curls",
  "hammer curl",
  "preacher curl",
  "tricep",
  "triceps",
  "tricep extension",
  "triceps extension",
  "pushdown",
  "tricep pushdown",
  "skull crusher",
  "dip",
  "dips",
  "shrug",
  "shrugs",
  "leg press",
  "leg extension",
  "leg curl",
  "lunge",
  "lunges",
  "hip thrust",
  "glute bridge",
  "calf raise",
  "calf raises",
  "plank",
  "crunch",
  "crunches",
  "sit up",
  "situp",
  "mountain climber",
  "burpee",
  "burpees",
  "arms",
  "arm",
  "chest",
  "pec",
  "pecs",
  "back",
  "upper back",
  "lower back",
  "lats",
  "lat",
  "shoulders",
  "shoulder",
  "delts",
  "delt",
  "legs",
  "leg",
  "quads",
  "quad",
  "hamstring",
  "hamstrings",
  "glutes",
  "glute",
  "calf",
  "calves",
  "core",
  "abs",
  "ab",
  "waist",
  "belly",
  "belly fat",
  "love handles",
  "arm fat",
  "thigh fat",
  "hip fat",
  "neck",
  "wrist",
  "elbow",
  "knee",
  "ankle",
  "shoulder pain",
  "knee pain",
  "back pain",
  "lower back pain",
  "upper back pain",
  "diet",
  "nutrition",
  "meal",
  "meals",
  "meal plan",
  "diet plan",
  "diet chart",
  "food",
  "foods",
  "veg",
  "vegetarian",
  "non veg",
  "non-veg",
  "nonveg",
  "veg diet",
  "non veg diet",
  "indian diet",
  "indian diet plan",
  "gym diet",
  "gym diet plan",
  "bulking diet",
  "cutting diet",
  "fat loss diet",
  "pre workout",
  "post workout",
  "preworkout",
  "postworkout",
  "supplement",
  "supplements",
  "whey",
  "whey protein",
  "whey isolate",
  "whey concentrate",
  "creatine",
  "creatine monohydrate",
  "bcaa",
  "mass gainer",
  "casein",
  "plant protein",
  "soy protein",
  "intra workout",
  "electrolyte",
  "electrolytes",
  "fiber",
  "fibre",
  "vitamin",
  "vitamins",
  "iron",
  "calcium",
  "protein shake",
  "shake",
  "smoothie",
  "eggs",
  "egg",
  "paneer",
  "dal",
  "chana",
  "chickpeas",
  "rajma",
  "soy",
  "soy chunks",
  "curd",
  "dahi",
  "milk",
  "lassi",
  "buttermilk",
  "roti",
  "chapati",
  "rice",
  "oats",
  "poha",
  "upma",
  "idli",
  "dosa",
  "paratha",
  "chicken",
  "mutton",
  "fish",
  "hinglish",
  "wazan",
  "vajan",
  "pet",
  "pet kam",
  "motapa",
  "six pack",
  "six pack abs",
  "abs visible",
];

const CASUAL_ALLOWLIST = new Set([
  "yes",
  "yep",
  "yup",
  "ok",
  "okay",
  "sure",
  "thanks",
  "thank you",
  "cool",
  "nice",
  "great",
  "awesome",
  "got it",
  "sounds good",
  "done",
  "hi",
  "hii",
  "hiii",
  "hello",
  "hey",
  "how are you",
  "what do you do",
  "who are you",
  "what can you do",
  "good morning",
  "good afternoon",
  "good evening",
  "good night",
  "whats up",
  "what s up",
  "sup",
  "yo",
  "how s it going",
  "how are you doing",
  "how r u",
  "how r you",
  "how is it going",
  "tell me a joke",
  "tell me about you",
  "what is your name",
  "what s your name",
  "who made you",
  "help",
  "can you help",
  "help me",
  "i need help",
  "i am tired",
  "im tired",
  "i m tired",
  "i am stressed",
  "im stressed",
  "i m stressed",
]);

const CASUAL_PATTERNS = [
  /^h+i+$/,
  /^h+e+y+$/,
  /^hello+$/,
  /^good\s+(morning|afternoon|evening|night)$/,
  /^(hi+|hello+|hey+)\s+how\s+are\s+you$/,
  /^(hi+|hello+|hey+)\s+how\s+are\s+you\s+doing$/,
  /^(hi+|hello+|hey+)\s+how\s+s\s+it\s+going$/,
  /^(hi+|hello+|hey+)\s+how\s+is\s+it\s+going$/,
  /^how\s+are\s+you$/,
  /^how\s+are\s+you\s+doing$/,
  /^how\s+s\s+it\s+going$/,
  /^how\s+is\s+it\s+going$/,
  /^how\s+r\s+u$/,
  /^how\s+r\s+you$/,
  /^what\s+s\s+up$/,
  /^whats\s+up$/,
  /^sup$/,
  /^yo$/,
  /^what\s+do\s+you\s+do$/,
  /^who\s+are\s+you$/,
  /^what\s+can\s+you\s+do$/,
];

const CASUAL_TOPIC_KEYWORDS = [
  "joke",
  "funny",
  "bored",
  "tired",
  "stress",
  "stressed",
  "sleepy",
  "busy",
  "sad",
  "happy",
  "excited",
  "help",
  "support",
  "motivate",
  "motivation",
  "discipline",
  "consistency",
  "routine",
];

const PROFILE_PATTERNS = [
  /^my weight is \d{2,3}\s*(kg|kgs|kilograms)?$/,
  /^weight is \d{2,3}\s*(kg|kgs|kilograms)?$/,
  /^i (am|m)\s*\d{2,3}\s*(kg|kgs|kilograms)?$/,
  /^i want to (lose fat|lose weight|gain muscle|build muscle|get stronger|get bigger|get lean|bulk|cut)/,
  /^i want bigger (arms|chest|legs|shoulders|back|glutes|abs)/,
];

const COMMON_QUESTION_KEYS = new Set([
  "beginner workout",
  "beginner workout plan",
  "beginner chest workout",
  "cheap muscle gain diet",
  "fat loss diet",
  "fat loss program",
  "muscle gain program",
  "muscle gain diet",
  "protein intake",
  "protein requirement",
  "protein calculation",
  "how much protein do i need",
  "indian diet plan",
]);

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };
type GroqRole = "system" | ChatRole;
type GroqMessage = { role: GroqRole; content: string };
type LanguagePreference = "en" | "hi-en";

type MemberContext = {
  name?: string;
  age?: number;
  height_cm?: number;
  gender?: string;
  current_weight_kg?: number;
  weight_date?: string;
  goal_weight_kg?: number;
  goal_months?: number;
  plan_name?: string;
  joined_at?: string;
  diet_preference?: string;
  training_days_per_week?: number;
  experience_level?: string;
  goal_type?: string;
};

const MAX_HISTORY_MESSAGES = 10;

const normalizeQuestion = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isFitnessQuestion = (normalized: string) =>
  FITNESS_KEYWORDS.some((keyword) => normalized.includes(keyword));

const isCasualOrProfileMessage = (normalized: string) => {
  if (!normalized) return false;
  if (CASUAL_ALLOWLIST.has(normalized)) return true;
  if (CASUAL_PATTERNS.some((pattern) => pattern.test(normalized))) return true;
  if (PROFILE_PATTERNS.some((pattern) => pattern.test(normalized))) return true;
  if (/^\d{2,3}\s*(kg|kgs|kilograms)?$/.test(normalized)) return true;
  if (CASUAL_TOPIC_KEYWORDS.some((keyword) => normalized.includes(keyword))) return true;
  return false;
};

const sanitizeHistory = (value: unknown): ChatMessage[] => {
  if (!Array.isArray(value)) return [];
  const cleaned = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const role = (item as { role?: string }).role;
      const content = (item as { content?: string }).content;
      if (role !== "user" && role !== "assistant") return null;
      if (typeof content !== "string") return null;
      const trimmed = content.trim();
      if (!trimmed) return null;
      return { role, content: trimmed } as ChatMessage;
    })
    .filter((item): item is ChatMessage => !!item);

  return cleaned.slice(-MAX_HISTORY_MESSAGES);
};

const resolveLanguagePreference = (value: unknown): LanguagePreference | null => {
  if (value === "en" || value === "hi-en") return value;
  return null;
};

const sanitizeMemberContext = (value: unknown): MemberContext => {
  if (!value || typeof value !== "object") return {};
  const data = value as Record<string, unknown>;
  const out: MemberContext = {};

  const assignString = (key: keyof MemberContext, sourceKey: string) => {
    const v = data[sourceKey];
    if (typeof v === "string" && v.trim()) {
      out[key] = v.trim();
    }
  };

  const assignNumber = (key: keyof MemberContext, sourceKey: string) => {
    const v = data[sourceKey];
    const num = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(num)) {
      out[key] = num;
    }
  };

  assignString("name", "name");
  assignString("gender", "gender");
  assignString("weight_date", "weight_date");
  assignString("plan_name", "plan_name");
  assignString("joined_at", "joined_at");
  assignString("diet_preference", "diet_preference");
  assignString("experience_level", "experience_level");
  assignString("goal_type", "goal_type");

  assignNumber("age", "age");
  assignNumber("height_cm", "height_cm");
  assignNumber("current_weight_kg", "current_weight_kg");
  assignNumber("goal_weight_kg", "goal_weight_kg");
  assignNumber("goal_months", "goal_months");
  assignNumber("training_days_per_week", "training_days_per_week");

  return out;
};

const mergeMemberContext = (base: MemberContext, override: MemberContext): MemberContext => {
  const merged: MemberContext = { ...base };
  (Object.keys(override) as (keyof MemberContext)[]).forEach((key) => {
    const value = override[key];
    if (value !== undefined && value !== null && value !== "") {
      merged[key] = value;
    }
  });
  return merged;
};

const buildMemberContextSummary = (context: MemberContext): string => {
  const parts: string[] = [];
  if (context.name) parts.push(`Name: ${context.name}`);
  if (context.current_weight_kg) parts.push(`Latest weight: ${context.current_weight_kg} kg`);
  if (context.weight_date) parts.push(`Weight date: ${context.weight_date}`);
  if (context.goal_weight_kg) parts.push(`Goal weight: ${context.goal_weight_kg} kg`);
  if (context.height_cm) parts.push(`Height: ${context.height_cm} cm`);
  if (context.age) parts.push(`Age: ${context.age}`);
  if (context.gender) parts.push(`Gender: ${context.gender}`);
  if (context.training_days_per_week) parts.push(`Training days per week: ${context.training_days_per_week}`);
  if (context.experience_level) parts.push(`Experience level: ${context.experience_level}`);
  if (context.goal_type) parts.push(`Goal type: ${context.goal_type}`);
  if (context.diet_preference) parts.push(`Diet preference: ${context.diet_preference}`);
  if (context.plan_name) parts.push(`Plan: ${context.plan_name}`);
  if (context.joined_at) parts.push(`Joined: ${context.joined_at}`);
  return parts.join("; ");
};

const formatFriendlyDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
};

const shouldUseHinglish = (
  question: string,
  languagePreference: LanguagePreference | null,
) => {
  if (languagePreference === "hi-en") return true;
  return true;
};

const requireEnv = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`${key} is required`);
  return value;
};

const buildUpstashClient = () => {
  const baseUrl = requireEnv("UPSTASH_REDIS_REST_URL").replace(/\/$/, "");
  const token = requireEnv("UPSTASH_REDIS_REST_TOKEN");

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
    async get(key: string) {
      const data = await request(`/get/${encodeURIComponent(key)}`);
      return data?.result ?? null;
    },
    async set(key: string, value: string, ttlSeconds: number) {
      const encodedValue = encodeURIComponent(value);
      await request(
        `/set/${encodeURIComponent(key)}/${encodedValue}?ex=${ttlSeconds}`,
      );
    },
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
  const url = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) return null;
  try {
    return buildUpstashClient();
  } catch (err) {
    console.warn("Upstash client init failed:", err);
    return null;
  }
};

const PRIMARY_MODEL = "llama-3.3-70b-versatile";
const FALLBACK_MODEL = "llama-3.1-8b-instant";

const requestGroqCompletion = async (
  apiKey: string,
  messages: GroqMessage[],
  model: string = PRIMARY_MODEL,
) => {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 450,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errorText}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || "";
};

const streamGroqCompletion = async (
  apiKey: string,
  messages: GroqMessage[],
  onDelta: (delta: string) => void,
  model: string = PRIMARY_MODEL,
): Promise<string> => {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 450,
      stream: true,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errorText}`);
  }

  if (!res.body) return "";

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const payload = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const delta = payload?.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          fullText += delta;
          onDelta(delta);
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }

  return fullText.trim();
};

const buildMessages = (
  question: string,
  history: ChatMessage[],
  languagePreference: LanguagePreference | null,
  memberContextSummary?: string,
): GroqMessage[] => {
  const messages: GroqMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
  if (languagePreference === "hi-en") {
    messages.push({ role: "system", content: "Language preference: Reply in Hinglish (Hindi + English mix)." });
  }
  if (memberContextSummary) {
    messages.push({
      role: "system",
      content: `Member context (use if relevant): ${memberContextSummary}`,
    });
  }
  messages.push(...history);
  messages.push({ role: "user", content: question });
  return messages;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const groqApiKey = requireEnv("GROQ_API_KEY");
    let userId = "anon";

    if (authHeader) {
      try {
        const supabaseUrl = requireEnv("SUPABASE_URL");
        const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const {
          data: { user },
          error: userError,
        } = await userClient.auth.getUser();
        if (!userError && user?.id) {
          userId = user.id;
        }
      } catch (err) {
        console.warn("Auth check failed, continuing as anonymous:", err);
      }
    }

    let payload: {
      question?: string;
      history?: ChatMessage[];
      languagePreference?: LanguagePreference;
      memberContext?: MemberContext;
    } | null = null;
    try {
      payload = await req.json();
    } catch {
      payload = null;
    }

    const question = typeof payload?.question === "string"
      ? payload.question.trim()
      : "";

    if (!question) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (question.length > 1200) {
      return new Response(JSON.stringify({ error: "Question is too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = normalizeQuestion(question);
    const isCasual = isCasualOrProfileMessage(normalized);
    const isFitness = isFitnessQuestion(normalized);

    if (question.length < 2) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (question.length < 3 && !isCasual && !isFitness) {
      return new Response(
        JSON.stringify({
          answer: "Give me a little more detail so I can help you better.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const history = sanitizeHistory(payload?.history);
    const languagePreference = resolveLanguagePreference(payload?.languagePreference);
    const clientContext = sanitizeMemberContext(payload?.memberContext);
    let memberContext: MemberContext = clientContext;
    let memberContextSummary = "";

    if (userId !== "anon") {
      try {
        const supabaseUrl = requireEnv("SUPABASE_URL");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (serviceRoleKey) {
          const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false },
          });

          const { data: memberData } = await adminClient
            .from("members")
            .select("id, name, plan_name, joined_at")
            .eq("user_id", userId)
            .maybeSingle();

          if (memberData?.id) {
            const { data: profileSettings } = await adminClient
              .from("member_profile_settings")
              .select("age, height_cm, gender, goal_weight, goal_months, settings")
              .eq("member_id", memberData.id)
              .maybeSingle();

            const { data: latestProgress } = await adminClient
              .from("member_progress_entries")
              .select("weight, entry_date, created_at")
              .eq("member_id", memberData.id)
              .order("entry_date", { ascending: false })
              .limit(1)
              .maybeSingle();

            const settings = (profileSettings?.settings || {}) as Record<string, unknown>;
            const serverContext: MemberContext = {
              name: memberData.name || undefined,
              plan_name: memberData.plan_name || undefined,
              joined_at: memberData.joined_at || undefined,
              age: profileSettings?.age ?? undefined,
              height_cm: profileSettings?.height_cm ?? undefined,
              gender: profileSettings?.gender ?? undefined,
              goal_weight_kg: profileSettings?.goal_weight ?? undefined,
              goal_months: profileSettings?.goal_months ?? undefined,
              current_weight_kg: latestProgress?.weight ?? undefined,
              weight_date: latestProgress?.entry_date || latestProgress?.created_at || undefined,
              goal_type: typeof settings.goal_type === "string" ? settings.goal_type : undefined,
              diet_preference: typeof settings.diet_preference === "string" ? settings.diet_preference : undefined,
              training_days_per_week:
                typeof settings.training_days_per_week === "number"
                  ? settings.training_days_per_week
                  : undefined,
              experience_level: typeof settings.experience_level === "string" ? settings.experience_level : undefined,
            };

            memberContext = mergeMemberContext(clientContext, serverContext);
          }
        }
      } catch (err) {
        console.warn("Member context lookup failed:", err);
      }
    }

    memberContextSummary = buildMemberContextSummary(memberContext);
    const messages = buildMessages(question, history, languagePreference, memberContextSummary || undefined);

    const isUnrelated =
      !isFitness &&
      !isCasual &&
      history.length === 0;
    if (isUnrelated) {
      return new Response(JSON.stringify({ answer: REFUSAL_MESSAGE }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isWeightQuery =
      /\b(my weight|current weight|tell me my weight|what is my weight|what s my weight|whats my weight)\b/.test(
        normalized,
      );
    if (isWeightQuery) {
      const useHinglish = shouldUseHinglish(question, languagePreference);
      const wantsGoal = /\b(goal|target)\b/.test(normalized);
      if (memberContext.current_weight_kg) {
        const friendlyDate = formatFriendlyDate(memberContext.weight_date);
        const dateText = friendlyDate ? (useHinglish ? ` (${friendlyDate})` : ` from ${friendlyDate}`) : "";
        const goalText = memberContext.goal_weight_kg && wantsGoal
          ? useHinglish
            ? ` Goal weight ${memberContext.goal_weight_kg} kg hai.`
            : ` Your target weight is ${memberContext.goal_weight_kg} kg.`
          : "";
        return new Response(
          JSON.stringify({
            answer: useHinglish
              ? `Mere paas aapka last check-in ${memberContext.current_weight_kg} kg${dateText} hai.${goalText} Chaho to isi ke hisaab se plan update kar du?`
              : `I've got your last check-in at ${memberContext.current_weight_kg} kg${dateText}.${goalText} Want me to update your plan using this?`,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          answer: useHinglish
            ? "Mujhe abhi aapka recent weight nahi mil raha. Agar aapne abhi save kiya hai, thoda wait karke fir pooch lo."
            : "I can't see your recent weight yet. If you just saved it, give it a moment and ask again.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const upstash = getUpstashClient();
    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const cfConnectingIp = req.headers.get("cf-connecting-ip");
    const ip = cfConnectingIp || forwardedFor || "anon";
    const rateKey = userId !== "anon"
      ? `fitness_ai:rl:user:${userId}`
      : `fitness_ai:rl:ip:${ip}`;
    if (upstash) {
      try {
        const currentCount = await upstash.incr(rateKey);
        if (currentCount === 1) {
          await upstash.expire(rateKey, 60);
        }
        if (currentCount > 10) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (err) {
        console.warn("Rate limit check failed:", err);
      }
    }

    const shouldCache = COMMON_QUESTION_KEYS.has(normalized);
    const hasContext = !!memberContextSummary;
    const canUseCache = shouldCache && history.length === 0 && !languagePreference && !hasContext;
    const cacheKey = `fitness_ai:cache:${normalized}`;

    const wantsStream = (req.headers.get("accept") || "")
      .toLowerCase()
      .includes("text/event-stream");

    if (canUseCache && upstash) {
      try {
        const cached = await upstash.get(cacheKey);
        if (cached) {
          if (wantsStream) {
            const stream = new ReadableStream({
              async start(controller) {
                const chunkSize = 18;
                for (let i = 0; i < cached.length; i += chunkSize) {
                  const chunk = cached.slice(i, i + chunkSize);
                  controller.enqueue(
                    `data: ${JSON.stringify({ type: "delta", content: chunk })}\n\n`,
                  );
                  await new Promise((resolve) => setTimeout(resolve, 22));
                }
                controller.enqueue(`data: ${JSON.stringify({ type: "done" })}\n\n`);
                controller.close();
              },
            });
            return new Response(stream, {
              status: 200,
              headers: {
                ...corsHeaders,
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
              },
            });
          }
          return new Response(JSON.stringify({ answer: cached }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (err) {
        console.warn("Upstash cache read failed:", err);
      }
    }

    if (wantsStream) {
      const stream = new ReadableStream({
        async start(controller) {
          let fullText = "";
          let hasDelta = false;
          try {
            fullText = await streamGroqCompletion(groqApiKey, messages, (delta) => {
              hasDelta = true;
              controller.enqueue(
                `data: ${JSON.stringify({ type: "delta", content: delta })}\n\n`,
              );
            }, PRIMARY_MODEL);
          } catch (err) {
            console.error("Groq stream failed:", err);
            if (!hasDelta) {
              try {
                fullText = await streamGroqCompletion(groqApiKey, messages, (delta) => {
                  hasDelta = true;
                  controller.enqueue(
                    `data: ${JSON.stringify({ type: "delta", content: delta })}\n\n`,
                  );
                }, FALLBACK_MODEL);
              } catch (fallbackErr) {
                console.error("Groq fallback stream failed:", fallbackErr);
                if (!hasDelta) {
                  try {
                    fullText = await requestGroqCompletion(groqApiKey, messages, FALLBACK_MODEL);
                    if (fullText) {
                      controller.enqueue(
                        `data: ${JSON.stringify({ type: "delta", content: fullText })}\n\n`,
                      );
                    }
                  } catch (finalErr) {
                    console.error("Groq fallback request failed:", finalErr);
                    controller.enqueue(
                      `data: ${JSON.stringify({
                        type: "error",
                        message: "AI service is busy right now. Please try again.",
                      })}\n\n`,
                    );
                  }
                }
              }
            } else {
              controller.enqueue(
                `data: ${JSON.stringify({
                  type: "error",
                  message: "AI service is busy right now. Please try again.",
                })}\n\n`,
              );
            }
          } finally {
            controller.enqueue(`data: ${JSON.stringify({ type: "done" })}\n\n`);
            controller.close();
          }

          if (canUseCache && upstash && fullText) {
            try {
              await upstash.set(cacheKey, fullText, 60 * 60 * 24);
            } catch (err) {
              console.warn("Upstash cache write failed:", err);
            }
          }
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    let answer = "";
    try {
      answer = await requestGroqCompletion(groqApiKey, messages, PRIMARY_MODEL);
      if (!answer) {
        answer = await requestGroqCompletion(groqApiKey, messages, FALLBACK_MODEL);
      }
    } catch (err) {
      console.error("Groq request failed:", err);
    }
    if (!answer) {
      answer = "AI service is busy right now. Please try again.";
    }

    if (canUseCache && upstash) {
      try {
        await upstash.set(cacheKey, answer, 60 * 60 * 24);
      } catch (err) {
        console.warn("Upstash cache write failed:", err);
      }
    }

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Fitness AI error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
