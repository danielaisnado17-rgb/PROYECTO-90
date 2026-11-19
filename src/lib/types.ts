// Tipos de dominio. Los nombres de campos coinciden 1:1 con las columnas de Supabase
// (ver supabase/migrations/0001_init.sql) para que la sincronización sea directa.

export type ISODate = string; // "YYYY-MM-DD"

export type Slot = "desayuno" | "almuerzo" | "merienda" | "cena";
export const SLOTS: Slot[] = ["desayuno", "almuerzo", "merienda", "cena"];
export const SLOT_LABEL: Record<Slot, string> = {
  desayuno: "Desayuno",
  almuerzo: "Almuerzo",
  merienda: "Merienda",
  cena: "Cena",
};

/** 0 = domingo … 6 = sábado (igual que Date.getDay()) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type DayPlan =
  | { type: "workout"; routine_id: string }
  | { type: "swim" }
  | { type: "rest" };

export interface NotificationSettings {
  enabled: boolean;
  close_day_time: string; // "21:00"
  workout_time: string; // "07:30"
  water_reminders: boolean;
  log_reminder: boolean;
}

export interface Profile {
  id: string; // = user id
  name: string;
  age: number;
  sex: "female" | "male";
  height_cm: number;
  start_weight_kg: number;
  start_date: ISODate;
  sleep_hours_usual: string;
  gym_experience_months: number;
  session_minutes: number;
  activity_factor: number;
  schedule: Record<string, DayPlan>; // clave "0".."6"
  habits: string[];
  notifications: NotificationSettings;
  onboarded: boolean;
  updated_at?: string;
}

export interface Measurement {
  id: string;
  date: ISODate;
  weight_kg: number | null;
  waist_cm: number | null;
  hip_cm: number | null; // cadera/glúteos (perímetro mayor)
  glutes_cm: number | null;
  abdomen_cm: number | null;
  thigh_cm: number | null;
  arm_cm: number | null;
  is_baseline: boolean;
  notes: string;
}

export interface Exercise {
  id: string;
  name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string;
  start_position: string;
  instructions: string[];
  technique: string[];
  common_mistakes: string[];
  safety: string;
  images: string[]; // rutas públicas verificadas
  media_source: string; // atribución
  video_url: string | null; // sólo si la usuaria la agrega
  increment_kg: number; // incremento sugerido mínimo
  is_custom: boolean;
}

export interface RoutineItem {
  exercise_id: string;
  sets: number;
  rep_min: number;
  rep_max: number;
  rest_s: number;
  target_weight_kg: number | null;
  per_side?: boolean;
  note?: string;
}

export interface Routine {
  id: string;
  name: string;
  focus: string;
  color: "rose" | "sand" | "stone" | "ink";
  items: RoutineItem[];
}

export interface Workout {
  id: string;
  date: ISODate;
  routine_id: string;
  routine_name: string;
  started_at: string;
  finished_at: string | null;
  session_rpe: number | null;
  feeling: number | null; // 1-5
  pain: boolean;
  notes: string;
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  date: ISODate;
  exercise_id: string;
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  completed: boolean;
  created_at: string;
}

export type LoadType = "total" | "discos" | "por_lado" | "maquina" | "mancuerna_c_u";
export interface LoadReference {
  id: string;
  exercise_id: string;
  weight_kg: number;
  load_type: LoadType | null;
  equipment: string;
  bar_weight_kg: number | null;
  validated: boolean;
  notes: string;
  date: ISODate;
}

export type FoodState = "crudo" | "cocido" | "listo";
export interface Food {
  id: string;
  name: string;
  category: string;
  state: FoodState;
  kcal: number; // por 100 g
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  portion_name: string;
  portion_g: number;
  source: string;
  estimated: boolean;
  is_custom: boolean;
}

export interface RecipeIngredient {
  food_id: string;
  grams: number | null; // null = pendiente de pesar
}
export interface Recipe {
  id: string;
  name: string;
  kind: "receta" | "favorita";
  ingredients: RecipeIngredient[];
  servings: number;
  favorite: boolean;
  notes: string;
}

export interface FoodLog {
  id: string;
  date: ISODate;
  slot: Slot;
  food_id: string | null;
  recipe_id: string | null;
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  eaten_out: boolean;
  estimated: boolean;
  created_at: string;
}

export interface MealPlan {
  id: string;
  date: ISODate;
  slot: Slot;
  title: string;
  items: RecipeIngredient[];
  recipe_id: string | null;
  done: boolean;
}

export interface Goal {
  id: string;
  valid_from: ISODate;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  water_ml: number;
  set_by: "estimacion" | "usuaria" | "nutricionista";
  notes: string;
}

export interface HydrationLog {
  id: string;
  date: ISODate;
  ml: number;
  created_at: string;
}

export interface SleepLog {
  id: string;
  date: ISODate;
  hours: number;
  quality: number; // 1-5
}

export interface SwimSession {
  id: string;
  date: ISODate;
  duration_min: number;
  distance_m: number | null;
  rpe: number; // 1-10
  styles: string[];
  feelings: string;
}

export interface HabitLog {
  id: string;
  date: ISODate;
  energy: number | null; // 1-5
  fatigue: number | null; // 1-5 (5 = mucha)
  stress: number | null; // 1-5
  pain: boolean;
  pain_area: string;
  habits: Record<string, boolean>;
  notes: string;
}

export type Pose = "frente" | "perfil" | "espalda";
export interface ProgressPhoto {
  id: string;
  date: ISODate;
  day_number: number;
  pose: Pose;
  storage_path: string; // Supabase Storage o "local:<id>"
  notes: string;
}

export interface Evaluation {
  id: string;
  day: number; // 1,15,30,45,60,75,90
  date: ISODate;
  notes: string;
  completed: boolean;
}

export interface DayClosure {
  id: string;
  date: ISODate;
  day_number: number;
  mood: number | null;
  note: string;
  summary: Record<string, number | boolean | string>;
  created_at: string;
}

export interface Tables {
  profiles: Profile;
  body_measurements: Measurement;
  exercises: Exercise;
  routines: Routine;
  workouts: Workout;
  workout_sets: WorkoutSet;
  load_references: LoadReference;
  foods: Food;
  recipes: Recipe;
  meal_plans: MealPlan;
  food_logs: FoodLog;
  goals: Goal;
  hydration_logs: HydrationLog;
  sleep_logs: SleepLog;
  swim_sessions: SwimSession;
  habit_logs: HabitLog;
  progress_photos: ProgressPhoto;
  evaluations: Evaluation;
  day_closures: DayClosure;
}
export type TableName = keyof Tables;
export const TABLES: TableName[] = [
  "profiles",
  "body_measurements",
  "exercises",
  "routines",
  "workouts",
  "workout_sets",
  "load_references",
  "foods",
  "recipes",
  "meal_plans",
  "food_logs",
  "goals",
  "hydration_logs",
  "sleep_logs",
  "swim_sessions",
  "habit_logs",
  "progress_photos",
  "evaluations",
  "day_closures",
];
export type DB = { [K in TableName]: Tables[K][] };
