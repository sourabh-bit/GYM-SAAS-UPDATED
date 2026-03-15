export interface ExerciseSet {
  reps: number;
  weight: number;
  actualReps: number;
  done: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
}

export interface DayPlan {
  type: string;
  label: string;
  exercises: Exercise[];
}

export type WeekPlan = Record<string, DayPlan>;

export interface SessionLog {
  plan: string;
  date: string;
  duration: number;
  completed: number;
  total: number;
}

export interface ProgressEntry {
  date: string;
  weight?: number;
  workout: boolean;
  notes: string;
}

export interface MemberProfileSettingsPayload {
  height_cm: number | null;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  goal_weight: number | null;
  goal_months: number;
  settings: Record<string, unknown>;
  migrated_from_local?: boolean;
}
