import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, Sparkles, Trash2, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMemberData } from "@/hooks/useMemberData";
import { useMemberProfileSettings, useMemberProgressEntries } from "@/hooks/useMemberProgressSync";
import { cn } from "@/lib/utils";

interface FitnessAiChatBubbleProps {
  isDemoMode?: boolean;
}

type MessageStatus = "streaming" | "final" | "error";
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: MessageStatus;
  createdAt: number;
};

type LanguagePreference = "auto" | "en" | "hi-en";

type DietPlanSections = {
  intro: string[];
  breakfast: string[];
  lunch: string[];
  snack: string[];
  dinner: string[];
  coachNote: string[];
};

type WorkoutDay = {
  title: string;
  items: string[];
};

type WorkoutPlanSections = {
  intro: string[];
  days: WorkoutDay[];
  coachNote: string[];
};

const STORAGE_KEY = "fitcore:fitness_ai:messages";
const PREF_KEY = "fitcore:fitness_ai:lang";

const readScreenshotFlags = () => {
  if (typeof window === "undefined") {
    return { isScreenshot: false, autoOpen: false, demoConversation: false };
  }
  const params = new URLSearchParams(window.location.search);
  const coachParam = params.get("coach");
  return {
    isScreenshot: params.get("screenshot") === "1",
    autoOpen: coachParam === "open" || coachParam === "demo",
    demoConversation: coachParam === "demo",
  };
};

const DEMO_RESPONSES: Record<string, string> = {
  "beginner chest workout": `Workout Level: Beginner
Goal: Muscle Gain

Day 1 - Chest + Triceps

Bench Press
3 x 8
Rest 90 seconds

Incline Dumbbell Press
3 x 10
Rest 75 seconds

Cable Fly
3 x 12
Rest 60 seconds

Triceps Pushdown
3 x 12
Rest 60 seconds

Coach Note
Focus on slow, controlled reps and full range of motion.`,
  "cheap muscle gain diet": `Goal: Muscle Gain

Breakfast
- 2 eggs
- 1 cup oats
- 1 glass milk

Lunch
- 1 cup rice
- 1.5 cup dal
- 1 cup sabzi

Snack
- 1 cup curd
- 1 handful peanuts

Dinner
- 2 roti
- 150g paneer or chicken
- Salad

Protein estimate: 90g - 120g per day

Coach Note
Add one extra protein item if your training days feel heavy.`,
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const splitIntoTypingChunks = (text: string) =>
  text
    .split(/(\s+)/)
    .filter((part) => part.length > 0);

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_PUBLIC_KEY = SUPABASE_ANON_KEY ?? SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_PUBLIC_IS_JWT = isJwtLike(SUPABASE_PUBLIC_KEY);
const USE_ANON_FOR_FITNESS = true;

function isJwtLike(value?: string | null) {
  if (!value) return false;
  const parts = value.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

const cleanLine = (line: string) => line.replace(/^[-*]+\s*/, "").trim();

const detectExplicitLanguage = (text: string): LanguagePreference | null => {
  const lower = text.toLowerCase();
  if (/(reply|answer|speak).*(hinglish|hindi)/.test(lower)) return "hi-en";
  if (/(reply|answer|speak).*(english)/.test(lower)) return "en";
  if (/hinglish\s+only|only\s+hinglish/.test(lower)) return "hi-en";
  if (/english\s+only|only\s+english/.test(lower)) return "en";
  if (/in\s+hinglish/.test(lower)) return "hi-en";
  if (/in\s+english/.test(lower)) return "en";
  return null;
};

const readLocalWeightEntry = () => {
  if (typeof window === "undefined") return null;
  const tryParse = (key: string) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed as { date?: string; weight?: number }[];
    } catch {
      return null;
    }
  };

  const weightLog = tryParse("fitcore_weight_log");
  const progressLog = tryParse("fitcore_progress_log");
  const combined = [...(weightLog || []), ...(progressLog || [])]
    .filter((entry) => typeof entry.weight === "number" && Number.isFinite(entry.weight));
  if (combined.length === 0) return null;

  const sorted = combined.sort((a, b) => {
    const da = a.date ? Date.parse(a.date) : 0;
    const db = b.date ? Date.parse(b.date) : 0;
    return da - db;
  });

  const latest = sorted[sorted.length - 1];
  return latest?.weight ? { weight: latest.weight, date: latest.date || null } : null;
};

const readLocalNumber = (key: string) => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const num = typeof parsed === "number" ? parsed : Number(parsed);
    return Number.isFinite(num) ? num : null;
  } catch {
    return null;
  }
};

const isWeightQuestion = (text: string) => {
  const lower = text.toLowerCase();
  return /(my weight|current weight|tell me my weight|what is my weight|what s my weight|whats my weight)/.test(lower);
};

  const wantsGoalInfo = (text: string) => {
    const lower = text.toLowerCase();
    return /(goal|target)/.test(lower);
  };

const isCasualSmallTalk = (text: string) => {
  const lower = text.toLowerCase().trim();
  if (!lower) return false;
  if (/^(hi+|hello+|hey+|yo|sup)$/.test(lower)) return true;
  if (/^(hi|hello|hey)\s+how\s+are\s+you/.test(lower)) return true;
  if (/^how\s+are\s+you$/.test(lower)) return true;
  if (/^(thanks|thank you|ok|okay|sure|cool|nice)$/.test(lower)) return true;
  return false;
};

const buildSmallTalkReply = (text: string, preference?: LanguagePreference) => {
  const lower = text.toLowerCase();
  const useHinglish = shouldUseHinglish(text, preference);
  if (useHinglish) {
    if (/(hi|hello|hey)/.test(lower)) {
      return "Hey! Kaise ho? Batao, aaj workout ya diet me kya help chahiye?";
    }
    if (/how are you/.test(lower)) {
      return "Main badhiya hoon. Tum batao—workout plan chahiye ya diet help?";
    }
    if (/thanks|thank you/.test(lower)) {
      return "Anytime! Aur kuch help chahiye toh bolo.";
    }
    return "Theek hai! Workout ya diet me kuch puchna ho toh batao.";
  }
  if (/(hi|hello|hey)/.test(lower)) {
    return "Hey! How are you? Want help with a workout or diet today?";
  }
  if (/how are you/.test(lower)) {
    return "Doing great. Want help with a workout plan or diet?";
  }
  if (/thanks|thank you/.test(lower)) {
    return "Anytime. Want help with anything else fitness‑related?";
  }
  return "Got it. If you want, tell me your goal and I’ll help.";
};

const formatFriendlyDate = (value?: string | null) => {
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

const shouldUseHinglish = (question: string, preference?: LanguagePreference) => {
  if (preference === "hi-en") return true;
  if (preference === "en") return false;
  if (/[\u0900-\u097f]/.test(question)) return true;
  const lower = question.toLowerCase();
  return /\b(kya|kaise|mera|meri|mere|tum|aap|hai|nahi|bhai|chahiye|batao|karo|mujhe|thoda|bahut)\b/.test(
    lower,
  );
};

const buildLocalWeightAnswer = (
  context: Record<string, unknown>,
  question: string,
  preference?: LanguagePreference,
) => {
  const weight = context.current_weight_kg as number | null | undefined;
  if (!weight) return null;
  const date = context.weight_date as string | null | undefined;
  const goal = context.goal_weight_kg as number | null | undefined;
  const friendlyDate = formatFriendlyDate(date);
  const useHinglish = shouldUseHinglish(question, preference);
  const dateText = friendlyDate ? (useHinglish ? ` (${friendlyDate})` : ` from ${friendlyDate}`) : "";

  if (useHinglish) {
    let answer = `Mere paas aapka last check-in ${weight} kg${dateText} hai.`;
    if (wantsGoalInfo(question)) {
      if (goal) {
        answer += ` Goal weight ${goal} kg hai.`;
      } else {
        answer += " Agar goal weight set nahi hai, Progress tab me set kar do.";
      }
    }
    answer += " Chaho to main isi ke hisaab se plan update kar du?";
    return answer;
  }

  let answer = `I've got your last check-in at ${weight} kg${dateText}.`;
  if (wantsGoalInfo(question)) {
    if (goal) {
      answer += ` Your target weight is ${goal} kg.`;
    } else {
      answer += " If you want goal tracking, set a target weight in Progress.";
    }
  }
  answer += " Want me to update your plan using this?";
  return answer;
};

const buildContextPayload = (context: Record<string, unknown>) => {
  const payload: Record<string, unknown> = {};
  Object.entries(context).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    payload[key] = value;
  });
  return payload;
};

const parseDietPlan = (content: string): DietPlanSections => {
  const sections: DietPlanSections = {
    intro: [],
    breakfast: [],
    lunch: [],
    snack: [],
    dinner: [],
    coachNote: [],
  };

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let current: keyof DietPlanSections = "intro";
  for (const raw of lines) {
    const lower = raw.toLowerCase();
    if (lower.startsWith("breakfast")) {
      current = "breakfast";
      continue;
    }
    if (lower.startsWith("lunch")) {
      current = "lunch";
      continue;
    }
    if (lower.startsWith("snack")) {
      current = "snack";
      continue;
    }
    if (lower.startsWith("dinner")) {
      current = "dinner";
      continue;
    }
    if (lower.startsWith("coach note") || lower.startsWith("note") || lower.startsWith("tips")) {
      current = "coachNote";
      continue;
    }

    const cleaned = cleanLine(raw);
    if (!cleaned) continue;

    const isNote =
      /(protein|calorie|maintenance|consistency|remember|tip|sleep|recovery|hydration|water|macro|goal)/.test(
        lower,
      );

    if (current !== "intro" && isNote) {
      sections.coachNote.push(cleaned);
    } else {
      sections[current].push(cleaned);
    }
  }

  return sections;
};

const parseWorkoutPlan = (content: string): WorkoutPlanSections => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const intro: string[] = [];
  const days: WorkoutDay[] = [];
  const coachNote: string[] = [];
  let currentDay: WorkoutDay | null = null;
  let inCoachNote = false;

  for (const raw of lines) {
    const lower = raw.toLowerCase();
    if (lower.startsWith("coach note") || lower.startsWith("note") || lower.startsWith("tips")) {
      if (currentDay) {
        days.push(currentDay);
        currentDay = null;
      }
      inCoachNote = true;
      const cleaned = cleanLine(raw.replace(/coach note/i, ""));
      if (cleaned) coachNote.push(cleaned);
      continue;
    }

    if (/^day\s*\d+/i.test(raw)) {
      if (currentDay) {
        days.push(currentDay);
      }
      currentDay = { title: raw.replace(/:/g, "").trim(), items: [] };
      continue;
    }

    if (/^(workout level|goal|training split)/i.test(raw)) {
      intro.push(cleanLine(raw));
      continue;
    }

    if (/^exercises?:?/i.test(raw)) {
      continue;
    }

    const cleaned = cleanLine(raw);
    if (!cleaned) continue;

    if (inCoachNote) {
      coachNote.push(cleaned);
      continue;
    }

    if (currentDay) {
      currentDay.items.push(cleaned);
    } else {
      intro.push(cleaned);
    }
  }

  if (currentDay) {
    days.push(currentDay);
  }

  return { intro, days, coachNote };
};

const parseStructuredContent = (content: string) => {
  const lower = content.toLowerCase();
  if (lower.includes("breakfast") && lower.includes("dinner")) {
    return { type: "diet" as const, data: parseDietPlan(content) };
  }
  if (lower.includes("day 1") || lower.includes("workout level")) {
    return { type: "workout" as const, data: parseWorkoutPlan(content) };
  }
  return null;
};

const isShortList = (items: string[]) =>
  items.length > 0 && items.length <= 4 && items.every((item) => item.length <= 48);

const FitnessAiChatBubble = ({ isDemoMode = false }: FitnessAiChatBubbleProps) => {
  const screenshotFlags = useMemo(() => readScreenshotFlags(), []);
  const [open, setOpen] = useState(screenshotFlags.autoOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [languagePreference, setLanguagePreference] = useState<LanguagePreference>("auto");
  const { member, profile } = useMemberData();
  const profileSettingsQuery = useMemberProfileSettings();
  const progressEntriesQuery = useMemberProgressEntries();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const requestIdRef = useRef(0);
  const typingQueuesRef = useRef<Record<string, { queue: string[]; running: boolean }>>({});
  const showTrigger = !screenshotFlags.isScreenshot;

  useEffect(() => {
    if (screenshotFlags.autoOpen) {
      setOpen(true);
    } else if (screenshotFlags.isScreenshot) {
      setOpen(false);
    }
  }, [screenshotFlags.autoOpen, screenshotFlags.isScreenshot]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!screenshotFlags.isScreenshot || !screenshotFlags.demoConversation) return;
    if (messagesRef.current.length > 0) return;
    const seededMessages: ChatMessage[] = [
      {
        id: createId(),
        role: "assistant",
        content:
          "Hey! I’m your Fitness AI Coach. Ask me about workouts, diet plans, or exercise form.",
        status: "final",
        createdAt: Date.now(),
      },
      {
        id: createId(),
        role: "user",
        content: "Give me a beginner chest workout.",
        createdAt: Date.now() + 1,
      },
      {
        id: createId(),
        role: "assistant",
        content:
          "Sure! Bench Press 3x8, Incline Dumbbell Press 3x10, Cable Fly 3x12. Rest 60-90s. Want a full week split?",
        status: "final",
        createdAt: Date.now() + 2,
      },
    ];
    setMessages(seededMessages);
  }, [screenshotFlags.isScreenshot, screenshotFlags.demoConversation]);

  useEffect(() => {
    if (typeof window === "undefined" || screenshotFlags.isScreenshot) return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[];
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
      const pref = window.localStorage.getItem(PREF_KEY) as LanguagePreference | null;
      if (pref === "en" || pref === "hi-en" || pref === "auto") {
        setLanguagePreference(pref);
      }
    } catch {
      // ignore storage errors
    }
  }, [screenshotFlags.isScreenshot]);

  useEffect(() => {
    if (typeof window === "undefined" || screenshotFlags.isScreenshot) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore storage errors
    }
  }, [messages, screenshotFlags.isScreenshot]);

  useEffect(() => {
    if (typeof window === "undefined" || screenshotFlags.isScreenshot) return;
    try {
      window.localStorage.setItem(PREF_KEY, languagePreference);
    } catch {
      // ignore storage errors
    }
  }, [languagePreference, screenshotFlags.isScreenshot]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const resizeInput = useCallback(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    const nextHeight = Math.min(node.scrollHeight, 140);
    node.style.height = `${nextHeight}px`;
  }, []);

  const memberContext = useMemo(() => {
    const entries = progressEntriesQuery.data || [];
    const latestEntry = [...entries].reverse().find((entry) => typeof entry.weight === "number");
    const localWeight = latestEntry ? null : readLocalWeightEntry();
    const effectiveWeight = latestEntry?.weight ?? localWeight?.weight ?? null;
    const effectiveDate = latestEntry?.date ?? localWeight?.date ?? null;
    const localGoalWeight =
      profileSettingsQuery.data?.goal_weight ?? readLocalNumber("fitcore_goal_weight") ?? readLocalNumber("fitcore_weight_goal");
    const localGoalMonths =
      profileSettingsQuery.data?.goal_months ?? readLocalNumber("fitcore_goal_months");
    const settings = (profileSettingsQuery.data?.settings || {}) as Record<string, unknown>;
    const goalType = typeof settings.goal_type === "string" ? settings.goal_type : null;
    const dietPreference = typeof settings.diet_preference === "string" ? settings.diet_preference : null;
    const trainingDays =
      typeof settings.training_days_per_week === "number" ? settings.training_days_per_week : null;
    const experienceLevel = typeof settings.experience_level === "string" ? settings.experience_level : null;

    return {
      name: profile?.full_name || member?.name || null,
      current_weight_kg: effectiveWeight,
      weight_date: effectiveDate,
      goal_weight_kg: localGoalWeight ?? null,
      height_cm: profileSettingsQuery.data?.height_cm ?? null,
      age: profileSettingsQuery.data?.age ?? null,
      gender: profileSettingsQuery.data?.gender ?? null,
      goal_months: localGoalMonths ?? null,
      plan_name: member?.plan_name ?? null,
      joined_at: member?.joined_at ?? null,
      goal_type: goalType,
      diet_preference: dietPreference,
      training_days_per_week: trainingDays,
      experience_level: experienceLevel,
    };
  }, [member, profile, profileSettingsQuery.data, progressEntriesQuery.data]);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
    requestAnimationFrame(resizeInput);
  };

  const appendDelta = useCallback((id: string, delta: string) => {
    if (!delta) return;
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, content: msg.content + delta } : msg)),
    );
  }, []);

  const enqueueTyping = useCallback(
    async (id: string, text: string, requestId: number) => {
      if (!text) return;
      const state = typingQueuesRef.current[id] ?? { queue: [], running: false };
      typingQueuesRef.current[id] = state;
      state.queue.push(...splitIntoTypingChunks(text));
      if (state.running) return;
      state.running = true;
      while (state.queue.length > 0) {
        if (requestIdRef.current !== requestId) {
          state.queue = [];
          state.running = false;
          return;
        }
        const next = state.queue.shift();
        if (next) {
          appendDelta(id, next);
          await sleep(12 + Math.random() * 10);
        }
      }
      state.running = false;
    },
    [appendDelta],
  );

  const finalizeMessage = useCallback((id: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== id) return msg;
        if (msg.status === "error") return msg;
        if (!msg.content.trim()) {
          return {
            ...msg,
            content: "AI service is busy right now. Please try again.",
            status: "error",
          };
        }
        return msg.status === "streaming" ? { ...msg, status: "final" } : msg;
      }),
    );
  }, []);

  const setErrorMessage = useCallback((id: string, message: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, content: message, status: "error" } : msg)),
    );
  }, []);

  const waitForTypingQueue = useCallback(async (id: string, requestId: number) => {
    const state = typingQueuesRef.current[id];
    if (!state) return;
    while (state.running || state.queue.length > 0) {
      if (requestIdRef.current !== requestId) return;
      await sleep(16);
    }
  }, []);

  const typeOutAnswer = useCallback(
    async (text: string, messageId: string, requestId: number) => {
      const chunks = splitIntoTypingChunks(text);
      for (const chunk of chunks) {
        if (requestIdRef.current !== requestId) return;
        appendDelta(messageId, chunk);
        await sleep(12 + Math.random() * 10);
      }
    },
    [appendDelta],
  );

  const readStream = useCallback(
    async (
      response: Response,
      messageId: string,
      requestId: number,
    ): Promise<{ received: boolean; errored: boolean }> => {
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Streaming not available");
      const decoder = new TextDecoder();
      let buffer = "";
      let hasDelta = false;
      let errored = false;

      while (true) {
        if (requestIdRef.current !== requestId) return { received: hasDelta, errored };
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() ?? "";

        for (const event of events) {
          const lines = event.split(/\r?\n/).filter(Boolean);
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payloadText = line.replace(/^data:\s*/, "").trim();
            if (!payloadText) continue;
            let payload: { type?: string; content?: string; message?: string } | null = null;
            try {
              payload = JSON.parse(payloadText);
            } catch {
              payload = null;
            }
            if (!payload) continue;
            if (payload.type === "delta" && payload.content) {
              enqueueTyping(messageId, payload.content, requestId);
              hasDelta = true;
            }
            if (payload.type === "error") {
              setErrorMessage(messageId, payload.message || "Sorry, I could not generate a response right now.");
              errored = true;
              return { received: true, errored };
            }
            if (payload.type === "done") {
              return { received: hasDelta, errored };
            }
          }
        }
      }

      if (buffer.trim()) {
        const lines = buffer.split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payloadText = line.replace(/^data:\s*/, "").trim();
          if (!payloadText) continue;
          try {
            const payload = JSON.parse(payloadText) as { type?: string; content?: string; message?: string };
            if (payload.type === "delta" && payload.content) {
              enqueueTyping(messageId, payload.content, requestId);
              hasDelta = true;
            }
            if (payload.type === "error") {
              setErrorMessage(messageId, payload.message || "Sorry, I could not generate a response right now.");
              errored = true;
              return { received: true, errored };
            }
          } catch {
            // ignore
          }
        }
      }
      return { received: hasDelta, errored };
    },
    [enqueueTyping, setErrorMessage],
  );

  const buildHistoryPayload = useCallback(() => {
    return messagesRef.current
      .filter((msg) => msg.status !== "streaming" && msg.status !== "error")
      .slice(-10)
      .map((msg) => ({ role: msg.role, content: msg.content }));
  }, []);

  const sendMessage = useCallback(async () => {
    const question = inputValue.trim();
    if (!question || isSending) return;

    const explicitLanguage = detectExplicitLanguage(question);
    if (explicitLanguage) {
      setLanguagePreference(explicitLanguage);
    }
    const preferenceToSend =
      explicitLanguage ?? (languagePreference !== "auto" ? languagePreference : undefined);

    const now = Date.now();
    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: question,
      status: "final",
      createdAt: now,
    };
    const assistantId = createId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      status: "streaming",
      createdAt: now + 1,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInputValue("");
    requestAnimationFrame(resizeInput);

    const requestId = ++requestIdRef.current;
    setIsSending(true);

    try {
      if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
        throw new Error("Supabase keys are missing. Please check your .env config.");
      }

      if (isCasualSmallTalk(question)) {
        const reply = buildSmallTalkReply(question, preferenceToSend ?? languagePreference);
        await typeOutAnswer(reply, assistantId, requestId);
        finalizeMessage(assistantId);
        return;
      }

      if (isWeightQuestion(question)) {
        const localWeight = readLocalWeightEntry();
        const localGoal =
          readLocalNumber("fitcore_goal_weight") ?? readLocalNumber("fitcore_weight_goal");
        const weightContext = {
          ...memberContext,
          current_weight_kg: localWeight?.weight ?? memberContext.current_weight_kg,
          weight_date: localWeight?.date ?? memberContext.weight_date,
          goal_weight_kg: localGoal ?? memberContext.goal_weight_kg,
        };
        const localAnswer = buildLocalWeightAnswer(
          weightContext,
          question,
          preferenceToSend ?? languagePreference,
        );
        if (localAnswer) {
          await typeOutAnswer(localAnswer, assistantId, requestId);
          finalizeMessage(assistantId);
          return;
        }
      }

      if (isDemoMode) {
        const fallback = "Ask me about workouts, diet, protein, or exercise form.";
        const demoAnswer = DEMO_RESPONSES[question.toLowerCase()] || fallback;
        await typeOutAnswer(demoAnswer, assistantId, requestId);
        finalizeMessage(assistantId);
        return;
      }

      const history = buildHistoryPayload();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const buildHeaders = (accessToken?: string | null) => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        };
        if (SUPABASE_PUBLIC_KEY) headers.apikey = SUPABASE_PUBLIC_KEY;
        const useAnon = USE_ANON_FOR_FITNESS && SUPABASE_PUBLIC_IS_JWT;
        if (useAnon) {
          headers.Authorization = `Bearer ${SUPABASE_PUBLIC_KEY}`;
        } else if (accessToken && isJwtLike(accessToken)) {
          headers.Authorization = `Bearer ${accessToken}`;
        } else if (SUPABASE_PUBLIC_IS_JWT) {
          headers.Authorization = `Bearer ${SUPABASE_PUBLIC_KEY}`;
        }
        return headers;
      };

      const contextPayload = buildContextPayload(memberContext);
      const payload = JSON.stringify({
        question,
        history,
        languagePreference: preferenceToSend,
        ...(Object.keys(contextPayload).length > 0 ? { memberContext: contextPayload } : {}),
      });

      const invokeFallback = async (accessToken?: string | null) => {
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/fitness-ai`, {
            method: "POST",
            headers: {
              ...buildHeaders(accessToken),
              Accept: "application/json",
            },
            body: payload,
          });
          if (!res.ok) return null;
          const data = await res.json().catch(() => null);
          const answer = (data as { answer?: string } | null)?.answer;
          return typeof answer === "string" ? answer : null;
        } catch {
          return null;
        }
      };

      const callFitnessAi = (accessToken?: string | null) =>
        fetch(`${SUPABASE_URL}/functions/v1/fitness-ai`, {
          method: "POST",
          headers: buildHeaders(accessToken),
          body: payload,
        });

      let response = await callFitnessAi(token);
      if (response.status === 401) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        const newToken = refreshed.session?.access_token;
        response = await callFitnessAi(newToken);
      }
      if (response.status === 401) {
        response = await callFitnessAi(null);
      }

      if (!response.ok) {
        let errorPayload = "";
        try {
          errorPayload = await response.text();
        } catch {
          errorPayload = "";
        }
        if (errorPayload && import.meta.env.DEV) {
          console.warn("Fitness AI error response:", response.status, errorPayload);
        }
        if (response.status === 400 || response.status === 401) {
          const fallbackAnswer = await invokeFallback(token);
          if (fallbackAnswer) {
            await typeOutAnswer(fallbackAnswer, assistantId, requestId);
            finalizeMessage(assistantId);
            return;
          }
        }
        if (response.status === 401) {
          if (!SUPABASE_PUBLIC_IS_JWT && !token) {
            throw new Error(
              "Your Supabase public key isn't a JWT. Add VITE_SUPABASE_ANON_KEY in .env and restart.",
            );
          }
          throw new Error(
            "I couldn't reach the coach service. If this keeps happening, make sure `verify_jwt = false` in the Edge Function config and redeploy.",
          );
        }
        if (response.status === 429) {
          throw new Error("Too many requests. Please wait a minute and try again.");
        }
        if (response.status === 400) {
          throw new Error("Please add a little more detail so I can help.");
        }
        throw new Error("Sorry, something went wrong. Please try again.");
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        const streamResult = await readStream(response, assistantId, requestId);
        if (!streamResult.received && !streamResult.errored) {
          const fallbackAnswer = await invokeFallback(token);
          if (fallbackAnswer) {
            await typeOutAnswer(fallbackAnswer, assistantId, requestId);
          } else {
            setErrorMessage(assistantId, "AI service is busy right now. Please try again.");
          }
        }
      } else {
        const data = await response.json().catch(() => null);
        const answer = data?.answer || "Sorry, I could not generate a response right now.";
        await typeOutAnswer(answer, assistantId, requestId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sorry, something went wrong. Please try again.";
      setErrorMessage(assistantId, message);
    } finally {
      await waitForTypingQueue(assistantId, requestId);
      finalizeMessage(assistantId);
      setIsSending(false);
    }
  }, [
    inputValue,
    isSending,
    isDemoMode,
    languagePreference,
    buildHistoryPayload,
    resizeInput,
    typeOutAnswer,
    waitForTypingQueue,
    finalizeMessage,
    readStream,
    setErrorMessage,
  ]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  };

  const renderPlainAssistant = (text: string, status?: MessageStatus) => (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-elevated",
        status === "error"
          ? "border-destructive/40 bg-destructive/10 text-destructive-foreground"
          : "border-border/60 bg-card/70",
      )}
    >
      {text}
    </div>
  );

  const renderStructuredAssistant = (content: string) => {
    const structured = parseStructuredContent(content);
    if (!structured) {
      return renderPlainAssistant(content);
    }

    if (structured.type === "diet") {
      const { intro, breakfast, lunch, snack, dinner, coachNote } = structured.data;
      const mealCards = [
        { title: "Breakfast", items: breakfast },
        { title: "Lunch", items: lunch },
        { title: "Snack", items: snack },
        { title: "Dinner", items: dinner },
      ].filter((meal) => meal.items.length > 0);

      const twoColMeals = mealCards.length > 1 && mealCards.every((meal) => isShortList(meal.items));
      return (
        <div className="space-y-4">
          {intro.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3 shadow-elevated">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Diet Plan</p>
              {intro.length > 0 && (
                <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap">{intro.join("\n")}</p>
              )}
            </div>
          )}

          {mealCards.length > 0 && (
            <div className={cn("grid gap-4", twoColMeals && "sm:grid-cols-2")}>
              {mealCards.map((meal) => (
                <div
                  key={meal.title}
                  className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3 shadow-elevated"
                >
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{meal.title}</p>
                  <ul className="mt-2 space-y-1.5 text-sm leading-relaxed break-words">
                    {meal.items.map((item, index) => (
                      <li key={`${meal.title}-${index}`} className="flex gap-2">
                        <span className="text-primary/70">-</span>
                        <span className="flex-1">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {coachNote.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-gradient-card px-4 py-3 shadow-elevated">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Coach Note</p>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed break-words">
                {coachNote.map((note, index) => (
                  <li key={`coach-${index}`} className="flex gap-2">
                    <span className="text-primary/70">-</span>
                    <span className="flex-1">{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (structured.type === "workout") {
      const { intro, days, coachNote } = structured.data;
      const twoColDays =
        days.length > 1 && days.every((day) => day.items.length <= 5 && day.items.every((item) => item.length <= 48));
      return (
        <div className="space-y-4">
          {intro.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3 shadow-elevated">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Workout Plan</p>
              <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap">{intro.join("\n")}</p>
            </div>
          )}

          {days.length > 0 && (
            <div className={cn("grid gap-4", twoColDays && "sm:grid-cols-2")}>
              {days.map((day) => (
                <div
                  key={day.title}
                  className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3 shadow-elevated"
                >
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{day.title}</p>
                  <ul className="mt-2 space-y-1.5 text-sm leading-relaxed break-words">
                    {day.items.map((item, index) => (
                      <li key={`${day.title}-${index}`} className="flex gap-2">
                        <span className="text-primary/70">-</span>
                        <span className="flex-1">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {coachNote.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-gradient-card px-4 py-3 shadow-elevated">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Coach Note</p>
              <ul className="mt-2 space-y-1.5 text-sm leading-relaxed break-words">
                {coachNote.map((note, index) => (
                  <li key={`workout-note-${index}`} className="flex gap-2">
                    <span className="text-primary/70">-</span>
                    <span className="flex-1">{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    return renderPlainAssistant(content);
  };

  const TypingIndicator = () => (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-pulse" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-pulse" style={{ animationDelay: "120ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-pulse" style={{ animationDelay: "240ms" }} />
      </div>
      Coach is typing...
    </div>
  );

  const messageNodes = useMemo(() => {
    return messages.map((message) => {
      const isUser = message.role === "user";
      return (
        <div key={message.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
          {isUser ? (
            <div className="max-w-[96%] rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-luxury break-words whitespace-pre-wrap">
              {message.content}
            </div>
          ) : (
            <div className="max-w-[96%]">
              {message.status === "streaming" && message.content
                ? renderPlainAssistant(message.content)
                : null}
              {message.status === "error" ? renderPlainAssistant(message.content, "error") : null}
              {message.status === "final" ? renderStructuredAssistant(message.content) : null}
              {message.status === "streaming" && !message.content && (
                <div className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3 shadow-elevated">
                  <TypingIndicator />
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  }, [messages]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <SheetTrigger asChild>
          <button
            type="button"
            className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-luxury transition-transform hover:scale-[1.02] active:scale-[0.98] sm:bottom-8"
            aria-label="Open Fitness AI Coach"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/15">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline">Fitness AI Coach</span>
          </button>
        </SheetTrigger>
      )}

      <SheetContent
        side="right"
        showClose={false}
        className="w-full sm:w-[460px] md:w-[520px] lg:w-[680px] xl:w-[740px] sm:max-w-none p-0 border-border bg-glass-strong shadow-luxury overflow-hidden sm:rounded-l-3xl"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="relative border-b border-border/60 bg-gradient-subtle px-5 pb-4 pt-5 text-left sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary shadow-elevated">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <SheetTitle className="text-lg font-semibold">Fitness AI Coach</SheetTitle>
                  <SheetDescription className="sr-only">
                    Chat with the Fitness AI Coach for workouts, diet plans, and guidance.
                  </SheetDescription>
                  <p className="text-xs text-muted-foreground">Premium guidance</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearChat}
                  className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Chat
                </Button>
                <SheetClose asChild>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-card/70 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </SheetClose>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Online now
              </span>
              <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1">
                Workouts / Diet / Protein
              </span>
              <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1">
                Language: {languagePreference === "auto" ? "Auto" : languagePreference === "en" ? "English" : "Hinglish"}
              </span>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 space-y-5">
            {messages.length === 0 && (
              <div className="rounded-2xl border border-border/60 bg-card/70 px-4 py-3 text-sm text-muted-foreground shadow-elevated">
                Ask about workouts, diet plans, protein, or exercise form. I will keep it practical and easy.
              </div>
            )}
            {messageNodes}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border/60 bg-card/70 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
            <div className="rounded-2xl border border-border/70 bg-secondary/40 px-4 py-3 shadow-elevated">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Ask a fitness question..."
                    className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
                <Button
                  type="button"
                  variant="glow"
                  size="sm"
                  onClick={sendMessage}
                  disabled={isSending || !inputValue.trim()}
                  className="h-10 rounded-xl px-4"
                >
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FitnessAiChatBubble;
