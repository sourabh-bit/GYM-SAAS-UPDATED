import MemberLayout from "@/components/dashboard/MemberLayout";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dumbbell, Clock, Check, Plus, Play, Pause, RotateCcw,
  ChevronDown, ChevronUp, Trash2, Zap, Calendar, History, X, Settings2, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useMemberData } from "@/hooks/useMemberData";
import MemberHeroCard from "@/components/member/MemberHeroCard";
import {
  useAddMemberWorkoutSession,
  useClearMemberWorkoutSessions,
  useMemberWorkoutPlan,
  useMemberWorkoutSessions,
  useSaveMemberWorkoutPlan,
} from "@/hooks/useMemberWorkoutSync";
import { useGymAccess } from "@/hooks/useGymAccess";
import FeatureLock from "@/components/FeatureLock";

// --- Types ---
interface ExerciseSet {
  reps: number;
  weight: number;
  actualReps: number;
  done: boolean;
}

interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
}

interface DayPlan {
  type: string; // "Push" | "Pull" | "Legs" | "Upper" | "Lower" | "Full Body" | "Cardio" | "Rest" | "Custom"
  label: string;
  exercises: Exercise[];
}

type WeekPlan = Record<string, DayPlan>;

interface SessionLog {
  plan: string;
  date: string;
  duration: number;
  completed: number;
  total: number;
}

// --- Constants ---
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SPLIT_OPTIONS = ["Push", "Pull", "Legs", "Upper", "Lower", "Full Body", "Cardio", "Rest"];
const STORAGE_KEY = "fitcore_week_plan";
const HISTORY_KEY = "fitcore_workout_history";

const LABEL_MAP: Record<string, string> = {
  Push: "Push Day", Pull: "Pull Day", Legs: "Leg Day",
  Upper: "Upper Body", Lower: "Lower Body", "Full Body": "Full Body",
  Cardio: "Cardio", Rest: "Rest Day",
};

const DEFAULT_EXERCISES: Record<string, Exercise[]> = {
  Push: [
    { id: "bp", name: "Bench Press", sets: Array(4).fill(null).map(() => ({ reps: 10, weight: 0, actualReps: 0, done: false })) },
    { id: "ohp", name: "Overhead Press", sets: Array(4).fill(null).map(() => ({ reps: 8, weight: 0, actualReps: 0, done: false })) },
    { id: "lr", name: "Lateral Raises", sets: Array(3).fill(null).map(() => ({ reps: 15, weight: 0, actualReps: 0, done: false })) },
    { id: "tp", name: "Tricep Pushdowns", sets: Array(3).fill(null).map(() => ({ reps: 12, weight: 0, actualReps: 0, done: false })) },
  ],
  Pull: [
    { id: "dl", name: "Deadlift", sets: Array(4).fill(null).map(() => ({ reps: 6, weight: 0, actualReps: 0, done: false })) },
    { id: "pu", name: "Pull-ups", sets: Array(4).fill(null).map(() => ({ reps: 8, weight: 0, actualReps: 0, done: false })) },
    { id: "br", name: "Barbell Row", sets: Array(4).fill(null).map(() => ({ reps: 10, weight: 0, actualReps: 0, done: false })) },
    { id: "bc", name: "Barbell Curl", sets: Array(3).fill(null).map(() => ({ reps: 12, weight: 0, actualReps: 0, done: false })) },
  ],
  Legs: [
    { id: "sq", name: "Squat", sets: Array(4).fill(null).map(() => ({ reps: 8, weight: 0, actualReps: 0, done: false })) },
    { id: "rdl", name: "Romanian Deadlift", sets: Array(3).fill(null).map(() => ({ reps: 10, weight: 0, actualReps: 0, done: false })) },
    { id: "lp", name: "Leg Press", sets: Array(4).fill(null).map(() => ({ reps: 12, weight: 0, actualReps: 0, done: false })) },
    { id: "cr", name: "Calf Raises", sets: Array(4).fill(null).map(() => ({ reps: 15, weight: 0, actualReps: 0, done: false })) },
  ],
};

// --- Helpers ---
const genId = () => Math.random().toString(36).slice(2, 8);
const getTodayDayKey = () => DAYS[((new Date().getDay() + 6) % 7)]; // Mon=0

const getDefaultWeek = (): WeekPlan => {
  const split = ["Push", "Pull", "Legs", "Push", "Pull", "Legs", "Rest"];
  const plan: WeekPlan = {};
  DAYS.forEach((d, i) => {
    const type = split[i];
    plan[d] = {
      type,
      label: LABEL_MAP[type] || type,
      exercises: DEFAULT_EXERCISES[type]
        ? DEFAULT_EXERCISES[type].map(e => ({ ...e, id: genId(), sets: e.sets.map(s => ({ ...s })) }))
        : [],
    };
  });
  return plan;
};

const loadPlan = (): WeekPlan => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
        // Anti-cheat: Sanitize loaded data - clamp values to valid ranges
        Object.values(parsed).forEach((day: any) => {
          if (day.exercises && Array.isArray(day.exercises)) {
            // Limit exercises per day
            if (day.exercises.length > 20) day.exercises = day.exercises.slice(0, 20);
            day.exercises.forEach((ex: any) => {
              if (ex.sets && Array.isArray(ex.sets)) {
                if (ex.sets.length > 12) ex.sets = ex.sets.slice(0, 12);
                ex.sets.forEach((s: any) => {
                  s.weight = Math.min(Math.max(0, Number(s.weight) || 0), 500);
                  s.reps = Math.min(Math.max(0, Math.floor(Number(s.reps) || 0)), 100);
                  s.actualReps = Math.min(Math.max(0, Math.floor(Number(s.actualReps) || 0)), 100);
                  s.done = !!s.done;
                });
              }
            });
          }
        });
        return parsed;
      }
    }
    return getDefaultWeek();
  } catch { return getDefaultWeek(); }
};

const savePlan = (p: WeekPlan) => localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
const loadHistory = (): SessionLog[] => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") || []; } catch { return []; } };
const saveHistory = (h: SessionLog[]) => localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 30)));

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

// ===== Component =====
const MemberWorkouts = () => {
  const { access, isLoading: accessLoading } = useGymAccess();
  const { member, gym } = useMemberData();
  const { data: remotePlan, isLoading: loadingRemotePlan } = useMemberWorkoutPlan();
  const { data: remoteHistory = [] } = useMemberWorkoutSessions();
  const saveWorkoutPlan = useSaveMemberWorkoutPlan();
  const addWorkoutSession = useAddMemberWorkoutSession();
  const clearWorkoutSessions = useClearMemberWorkoutSessions();
  const [mode, setMode] = useState<"today" | "planner">("today");
  const [weekPlan, setWeekPlan] = useState<WeekPlan>(getDefaultWeek);
  const [selectedDay, setSelectedDay] = useState(getTodayDayKey());
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newExName, setNewExName] = useState("");
  const [newExSets, setNewExSets] = useState("4");
  const [newExReps, setNewExReps] = useState("8");
  const [hydratedPlan, setHydratedPlan] = useState(false);
  const [hydratedHistory, setHydratedHistory] = useState(false);

  // Session state
  const [activeSession, setActiveSession] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<SessionLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  if (accessLoading) {
    return (
      <MemberLayout title="Workouts" subtitle="Plan sessions and log your daily training">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MemberLayout>
    );
  }

  if (!access.features.member_app_premium) {
    return (
      <MemberLayout title="Workouts" subtitle="Plan sessions and log your daily training">
        <FeatureLock
          title="Workouts Locked"
          description="Your gym is not on the Pro plan. Ask your gym owner to upgrade to unlock workouts and training features."
          showCta={false}
        />
      </MemberLayout>
    );
  }

  const todayKey = getTodayDayKey();
  const currentDay = mode === "today" ? todayKey : selectedDay;
  const dayPlan = weekPlan[currentDay];
  const dayIndex = DAYS.indexOf(currentDay);

  useEffect(() => {
    if (hydratedPlan) return;
    if (loadingRemotePlan) return;
    setWeekPlan(remotePlan || loadPlan());
    setHydratedPlan(true);
  }, [hydratedPlan, loadingRemotePlan, remotePlan]);

  useEffect(() => {
    if (!hydratedHistory) {
      if (remoteHistory.length > 0) {
        setHistory(remoteHistory);
      } else {
        setHistory(loadHistory());
      }
      setHydratedHistory(true);
      return;
    }

    if (remoteHistory.length > 0) {
      setHistory(remoteHistory);
    }
  }, [hydratedHistory, remoteHistory]);

  // Persist plan locally + remotely after hydration
  useEffect(() => {
    if (!hydratedPlan) return;
    savePlan(weekPlan);
    const timeout = window.setTimeout(() => {
      saveWorkoutPlan.mutate({ weekPlan });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [hydratedPlan, saveWorkoutPlan, weekPlan]);

  useEffect(() => {
    if (!hydratedHistory) return;
    saveHistory(history);
  }, [history, hydratedHistory]);

  // Timer
  useEffect(() => {
    if (activeSession && !paused) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else if (timerRef.current) clearInterval(timerRef.current);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeSession, paused]);

  // Progress
  const totalSets = useMemo(() => dayPlan.exercises.reduce((a, e) => a + e.sets.length, 0), [dayPlan]);
  const doneSets = useMemo(() => dayPlan.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0), [dayPlan]);
  const progress = totalSets > 0 ? (doneSets / totalSets) * 100 : 0;

  // --- Handlers ---
  const updateWeekPlan = (fn: (prev: WeekPlan) => WeekPlan) => setWeekPlan(prev => {
    const copy = JSON.parse(JSON.stringify(prev)) as WeekPlan;
    return fn(copy);
  });

  const changeSplit = (day: string, type: string) => {
    updateWeekPlan(wp => {
      wp[day] = {
        type,
        label: LABEL_MAP[type] || type,
        exercises: DEFAULT_EXERCISES[type]
          ? DEFAULT_EXERCISES[type].map(e => ({ ...e, id: genId(), sets: e.sets.map(s => ({ ...s })) }))
          : [],
      };
      return wp;
    });
  };

  const addExercise = () => {
    if (!newExName.trim()) return;
    const sets = parseInt(newExSets) || 4;
    const reps = parseInt(newExReps) || 8;
    const exercise: Exercise = {
      id: genId(),
      name: newExName.trim(),
      sets: Array(sets).fill(null).map(() => ({ reps, weight: 0, actualReps: reps, done: false })),
    };
    updateWeekPlan(wp => {
      wp[currentDay].exercises.push(exercise);
      return wp;
    });
    setNewExName(""); setNewExSets("4"); setNewExReps("8");
    setAddDialogOpen(false);
    toast.success(`Added ${exercise.name}`);
  };

  const removeExercise = (exId: string) => {
    updateWeekPlan(wp => {
      wp[currentDay].exercises = wp[currentDay].exercises.filter(e => e.id !== exId);
      return wp;
    });
  };

  // Anti-cheat: Validate weight/rep ranges before saving
  const MAX_WEIGHT = 500; // kg - reasonable max for any exercise
  const MAX_REPS = 100;   // reasonable max reps per set
  const MAX_SETS_PER_EXERCISE = 12;

  const updateSet = (exId: string, setIdx: number, field: keyof ExerciseSet, value: number | boolean) => {
    // Validate numeric inputs
    if (typeof value === "number") {
      if (field === "weight" && (value < 0 || value > MAX_WEIGHT)) {
        toast.error(`Weight must be between 0 and ${MAX_WEIGHT}kg`);
        return;
      }
      if ((field === "reps" || field === "actualReps") && (value < 0 || value > MAX_REPS)) {
        toast.error(`Reps must be between 0 and ${MAX_REPS}`);
        return;
      }
      // Ensure integer values
      value = Math.floor(value);
    }

    setWeekPlan(prev => {
      const copy = JSON.parse(JSON.stringify(prev)) as WeekPlan;
      const ex = copy[currentDay].exercises.find(e => e.id === exId);
      if (ex) (ex.sets[setIdx] as any)[field] = value;
      savePlan(copy);
      return copy;
    });
  };

  const addSet = (exId: string) => {
    updateWeekPlan(wp => {
      const ex = wp[currentDay].exercises.find(e => e.id === exId);
      if (ex) {
        if (ex.sets.length >= MAX_SETS_PER_EXERCISE) {
          toast.error(`Maximum ${MAX_SETS_PER_EXERCISE} sets per exercise`);
          return wp;
        }
        const last = ex.sets[ex.sets.length - 1];
        ex.sets.push({ reps: last?.reps || 8, weight: last?.weight || 0, actualReps: last?.reps || 8, done: false });
      }
      return wp;
    });
  };

  const removeSet = (exId: string) => {
    updateWeekPlan(wp => {
      const ex = wp[currentDay].exercises.find(e => e.id === exId);
      if (ex && ex.sets.length > 1) ex.sets.pop();
      return wp;
    });
  };

  const startSession = () => {
    setMode("today");
    setActiveSession(true); setPaused(false); setElapsed(0);
    // Don't reset already-done sets — only reset actualReps for undone sets
    updateWeekPlan(wp => {
      wp[todayKey].exercises.forEach(ex => ex.sets.forEach(s => {
        if (!s.done) { s.actualReps = s.reps; }
      }));
      return wp;
    });
    toast.success("Session started! Let's go 💪");
  };

  const completeSession = () => {
    setActiveSession(false); setPaused(false);
    const log: SessionLog = {
      plan: `${DAY_FULL[DAYS.indexOf(todayKey)]} – ${dayPlan.label}`,
      date: new Date().toISOString(),
      duration: elapsed,
      completed: doneSets,
      total: totalSets,
    };
    const updated = [log, ...history];
    setHistory(updated);
    addWorkoutSession.mutate(log);
    toast.success(`Workout complete! ${doneSets}/${totalSets} sets in ${formatTime(elapsed)}`);
    setElapsed(0);
  };

  const isRest = dayPlan.type === "Rest";

  return (
    <MemberLayout title="Workouts" subtitle="Plan sessions and log your daily training">
      <div className="max-w-6xl mx-auto">
        <MemberHeroCard
          eyebrow="Workout Zone"
          title={`${DAY_FULL[dayIndex]} - ${dayPlan.label}`}
          subtitle={mode === "today" ? "Train smart and log each set with control." : "Build your split and keep each day intentional."}
          gymName={gym?.name}
          chips={[
            {
              label: member?.status === "active" ? "Active Member" : member?.status ? `${member.status} member` : "Membership status",
              tone: member?.status === "active" ? "success" : "warning",
            },
            { label: `${doneSets}/${totalSets} sets tracked`, icon: <Clock className="w-3.5 h-3.5" />, tone: "muted" },
            { label: mode === "today" ? "Today Mode" : "Planner Mode", icon: <Dumbbell className="w-3.5 h-3.5" />, tone: "primary" },
          ]}
          className="mb-6"
        />

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-5 lg:p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Switch between quick training and weekly planning.
            </div>
            <div className="flex gap-2">
              <Button
                variant={mode === "today" ? "default" : "outline"}
                className="rounded-xl gap-2"
                onClick={() => { setMode("today"); setSelectedDay(todayKey); }}
              >
                <Calendar className="w-4 h-4" /> Today
              </Button>
              <Button
                variant={mode === "planner" ? "default" : "outline"}
                className="rounded-xl gap-2"
                onClick={() => setMode("planner")}
              >
                <Settings2 className="w-4 h-4" /> Plan Builder
              </Button>
            </div>
          </div>
        </motion.div>

        {/* ==== PLANNER MODE ==== */}
        {mode === "planner" && (
          <>
            {/* Step 1: Weekly Split */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-card border border-border rounded-2xl p-5 lg:p-6 mb-6">
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-primary mb-1">Step 1</p>
              <h3 className="font-display font-bold text-base lg:text-lg mb-4">Custom Weekly Split</h3>
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-bold mb-3">Choose Each Day</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-3">
                {DAYS.map((d) => (
                  <div key={d} className="space-y-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{d}</span>
                    <Select value={weekPlan[d].type} onValueChange={(v) => changeSplit(d, v)}>
                      <SelectTrigger className="h-9 rounded-xl bg-secondary/30 border-border text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPLIT_OPTIONS.map(o => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Step 2: Weekly Overview */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-2xl p-5 lg:p-6 mb-6">
              <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-primary mb-1">Step 2</p>
              <h3 className="font-display font-bold text-base lg:text-lg mb-4">Weekly Planner</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-3">
                {DAYS.map((d) => {
                  const dp = weekPlan[d];
                  const isSelected = d === selectedDay;
                  const exNames = dp.exercises.slice(0, 2).map(e => e.name).join(", ") || "No exercises";
                  return (
                    <button
                      key={d}
                      onClick={() => setSelectedDay(d)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-primary/10 border-primary/30"
                          : "bg-secondary/20 border-border hover:border-primary/20"
                      }`}
                    >
                      <span className={`text-[10px] font-bold uppercase ${isSelected ? "text-primary" : "text-muted-foreground"}`}>{d}</span>
                      <p className="text-sm font-semibold mt-0.5">{dp.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Exercises: {dp.exercises.length}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{exNames}</p>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Step 3: Day Detail Editor */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-card border border-border rounded-2xl p-5 lg:p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-primary mb-1">Step 3</p>
                  <h3 className="font-display font-bold text-base lg:text-lg">
                    {DAY_FULL[dayIndex]} – {dayPlan.label}
                  </h3>
                </div>
                {!isRest && (
                  <Button variant="outline" className="rounded-xl gap-2" onClick={() => { setNewExName(""); setAddDialogOpen(true); }}>
                    <Plus className="w-4 h-4" /> Add Exercise
                  </Button>
                )}
              </div>

              {isRest ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">🧘 Rest day — recovery is part of the process.</p>
                </div>
              ) : dayPlan.exercises.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No exercises yet. Add your first exercise above.</p>
              ) : (
                <div className="space-y-3">
                  {dayPlan.exercises.map((ex) => {
                    const isOpen = expandedExercise === ex.id;
                    return (
                      <div key={ex.id} className="border border-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedExercise(isOpen ? null : ex.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors"
                        >
                          <div className="text-left">
                            <p className="text-sm font-semibold">{ex.name}</p>
                            <p className="text-[11px] text-muted-foreground">{ex.sets.length} sets · {ex.sets[0]?.reps} reps</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={(e) => { e.stopPropagation(); removeExercise(ex.id); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </button>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 space-y-2">
                                <div className="grid grid-cols-[40px_1fr_1fr] gap-2 text-[10px] font-bold uppercase text-muted-foreground">
                                  <span>Set</span><span>Reps</span><span>Weight (kg)</span>
                                </div>
                                {ex.sets.map((s, si) => (
                                  <div key={si} className="grid grid-cols-[40px_1fr_1fr] gap-2">
                                    <span className="text-xs text-muted-foreground flex items-center">Set {si + 1}</span>
                                    <NumericInput
                                      value={s.reps}
                                      onChange={e => updateSet(ex.id, si, "reps", parseInt(e.target.value) || 0)}
                                      className="h-9 rounded-lg bg-secondary/30 border-border text-sm"
                                    />
                                    <NumericInput
                                      value={s.weight}
                                      onChange={e => updateSet(ex.id, si, "weight", parseInt(e.target.value) || 0)}
                                      className="h-9 rounded-lg bg-secondary/30 border-border text-sm"
                                    />
                                  </div>
                                ))}
                                <div className="flex gap-2 pt-2">
                                  <Button variant="outline" size="sm" className="rounded-lg gap-1 text-xs" onClick={() => addSet(ex.id)}>
                                    <Plus className="w-3 h-3" /> Add Set
                                  </Button>
                                  {ex.sets.length > 1 && (
                                    <Button variant="ghost" size="sm" className="rounded-lg text-xs text-muted-foreground" onClick={() => removeSet(ex.id)}>
                                      Remove Set
                                    </Button>
                                  )}
                                  <Button variant="glow" size="sm" className="rounded-lg gap-1 text-xs ml-auto" onClick={() => { savePlan(weekPlan); toast.success(`${ex.name} sets saved!`); }}>
                                    <Check className="w-3 h-3" /> Save Set
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}

        {/* ==== TODAY MODE ==== */}
        {mode === "today" && (
          <>
            {/* Session Banner */}
            {!activeSession ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                className="bg-card border border-border rounded-2xl p-5 lg:p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, MMM d")}</p>
                    <h3 className="font-display font-bold text-lg lg:text-xl mt-0.5">
                      {isRest ? "Rest Day 🧘" : `${dayPlan.label} — ${dayPlan.exercises.length} exercises`}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl gap-2" onClick={() => setShowHistory(!showHistory)}>
                      <History className="w-4 h-4" /> History
                    </Button>
                    {!isRest && dayPlan.exercises.length > 0 && (
                      <Button variant="glow" className="rounded-xl gap-2" onClick={startSession}>
                        <Play className="w-4 h-4" /> Start Workout
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-primary rounded-2xl p-5 lg:p-6 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] font-bold text-primary-foreground/70">
                      {paused ? "Paused" : "Workout Active"}
                    </p>
                    <h3 className="font-display text-xl font-bold text-primary-foreground">{dayPlan.label}</h3>
                    <p className="text-sm text-primary-foreground/70">{doneSets}/{totalSets} sets done</p>
                  </div>
                  <div className="w-14 h-14 rounded-full border-2 border-primary-foreground/30 flex items-center justify-center">
                    <span className="font-display text-lg font-bold text-primary-foreground font-mono">{formatTime(elapsed)}</span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-primary-foreground/10 mb-3">
                  <div className="h-full rounded-full bg-primary-foreground/50 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="rounded-xl text-primary-foreground hover:bg-primary-foreground/10 gap-1.5"
                    onClick={() => { setPaused(p => !p); toast(paused ? "Resumed ▶️" : "Paused ⏸️"); }}>
                    {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    {paused ? "Resume" : "Pause"}
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-xl text-primary-foreground/60 hover:bg-primary-foreground/10 gap-1.5"
                    onClick={() => { setActiveSession(false); setPaused(false); setElapsed(0); toast("Cancelled"); }}>
                    <RotateCcw className="w-3.5 h-3.5" /> Cancel
                  </Button>
                </div>
              </motion.div>
            )}

            {/* History */}
            <AnimatePresence>
              {showHistory && !activeSession && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-6">
                  <div className="bg-card border border-border rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display font-bold text-base">Session History</h3>
                      {history.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-destructive gap-1"
                          disabled={clearWorkoutSessions.isPending}
                          onClick={() => {
                            clearWorkoutSessions.mutate(undefined, {
                              onSuccess: () => {
                                setHistory([]);
                                saveHistory([]);
                                toast.success("Workout history cleared");
                              },
                            });
                          }}
                        >
                          <X className="w-3 h-3" /> Clear
                        </Button>
                      )}
                    </div>
                    {history.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No sessions yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {history.slice(0, 8).map((log, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-glass">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Dumbbell className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{log.plan}</p>
                              <span className="text-[11px] text-muted-foreground">{format(new Date(log.date), "MMM d, h:mm a")} · {log.completed}/{log.total} sets</span>
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">{formatTime(log.duration)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Exercise Cards for Today */}
            {isRest ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-card border border-border rounded-2xl p-8 text-center">
                <p className="text-4xl mb-3">🧘</p>
                <h3 className="font-display font-bold text-lg mb-1">Recovery Day</h3>
                <p className="text-sm text-muted-foreground">Rest, stretch, and come back stronger tomorrow.</p>
              </motion.div>
            ) : dayPlan.exercises.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-card border border-border rounded-2xl p-8 text-center">
                <Dumbbell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <h3 className="font-display font-bold text-base mb-1">No exercises planned</h3>
                <p className="text-sm text-muted-foreground mb-4">Go to Plan Builder to add exercises for today.</p>
                <Button variant="outline" className="rounded-xl gap-2" onClick={() => { setMode("planner"); setSelectedDay(todayKey); }}>
                  <Settings2 className="w-4 h-4" /> Open Plan Builder
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {dayPlan.exercises.map((ex, ei) => {
                  const isOpen = expandedExercise === ex.id;
                  const exDone = ex.sets.filter(s => s.done).length;
                  const allDone = exDone === ex.sets.length;
                  return (
                    <motion.div
                      key={ex.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + ei * 0.04 }}
                      className="bg-card border border-border rounded-2xl overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedExercise(isOpen ? null : ex.id)}
                        className="w-full flex items-center justify-between p-4 lg:p-5 hover:bg-secondary/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${allDone ? "bg-primary/20" : "bg-secondary/30"}`}>
                            {allDone ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Dumbbell className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <div className="text-left">
                            <p className={`text-sm font-semibold ${allDone ? "text-muted-foreground line-through" : ""}`}>{ex.name}</p>
                            <p className="text-[11px] text-muted-foreground">{exDone}/{ex.sets.length} sets done</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {activeSession && (
                            <Button variant="outline" size="sm" className="h-7 rounded-lg text-[10px] gap-1" onClick={(e) => { e.stopPropagation(); addSet(ex.id); }}>
                              <Plus className="w-3 h-3" /> Set
                            </Button>
                          )}
                          {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-4 lg:px-5 pb-4 lg:pb-5">
                              {/* Table header */}
                              <div className="grid grid-cols-[32px_1fr_1fr_1fr_40px] gap-2 text-[10px] font-bold uppercase text-muted-foreground mb-2">
                                <span>Set</span><span>Reps</span><span>Weight</span><span>Actual</span><span>Done</span>
                              </div>
                              {ex.sets.map((s, si) => (
                                <div key={si} className={`grid grid-cols-[32px_1fr_1fr_1fr_40px] gap-2 mb-1.5 items-center ${s.done ? "opacity-60" : ""}`}>
                                  <span className="text-xs text-muted-foreground font-mono">{si + 1}</span>
                                  <NumericInput value={s.reps} disabled={!activeSession}
                                    onChange={e => updateSet(ex.id, si, "reps", parseInt(e.target.value) || 0)}
                                    className="h-8 rounded-lg bg-secondary/30 border-border text-sm" />
                                  <NumericInput value={s.weight} disabled={!activeSession}
                                    onChange={e => updateSet(ex.id, si, "weight", parseInt(e.target.value) || 0)}
                                    className="h-8 rounded-lg bg-secondary/30 border-border text-sm" />
                                  <NumericInput value={s.actualReps} disabled={!activeSession}
                                    onChange={e => updateSet(ex.id, si, "actualReps", parseInt(e.target.value) || 0)}
                                    className="h-8 rounded-lg bg-secondary/30 border-border text-sm" />
                                  <button
                                    disabled={!activeSession}
                                    onClick={() => updateSet(ex.id, si, "done", !s.done)}
                                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mx-auto transition-colors ${
                                      s.done ? "bg-primary/20 border-primary" : "border-border hover:border-primary/30"
                                    } ${!activeSession ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                                  >
                                    {s.done && <Check className="w-3 h-3 text-primary" />}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {/* Finish button */}
                {activeSession && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end pt-2">
                    <Button variant="glow" className="rounded-xl gap-2 px-6" onClick={completeSession}>
                      <Zap className="w-4 h-4" /> Finish Workout
                    </Button>
                  </motion.div>
                )}
              </div>
            )}
          </>
        )}

        {/* Add Exercise Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-lg">Add Exercise</DialogTitle>
              <p className="text-sm text-muted-foreground">Enter exercise name, then set default sets and reps.</p>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Exercise Name</Label>
                <Input value={newExName} onChange={e => setNewExName(e.target.value)}
                  placeholder="Example: Bench Press"
                  className="h-10 rounded-xl bg-secondary/30 border-border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Sets</Label>
                  <NumericInput value={newExSets} onChange={e => setNewExSets(e.target.value)}
                    className="h-10 rounded-xl bg-secondary/30 border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Reps</Label>
                  <NumericInput value={newExReps} onChange={e => setNewExReps(e.target.value)}
                    className="h-10 rounded-xl bg-secondary/30 border-border" />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button variant="glow" className="rounded-xl" onClick={addExercise} disabled={!newExName.trim()}>Save Exercise</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MemberLayout>
  );
};

export default MemberWorkouts;
