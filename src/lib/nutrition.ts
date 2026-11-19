import type { DB, Food, FoodLog, Goal, Profile, Recipe, RecipeIngredient } from "./types";
import { SEED_FOODS } from "./seed/foods";

export interface Macros { kcal: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number }
export const ZERO: Macros = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };

export function allFoods(db: DB): Food[] {
  const map = new Map<string, Food>();
  for (const f of SEED_FOODS) map.set(f.id, f);
  for (const f of db.foods) map.set(f.id, f);
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export function macrosFor(food: Food, grams: number): Macros {
  const k = grams / 100;
  return {
    kcal: food.kcal * k,
    protein_g: food.protein_g * k,
    carbs_g: food.carbs_g * k,
    fat_g: food.fat_g * k,
    fiber_g: food.fiber_g * k,
  };
}
export function add(a: Macros, b: Macros): Macros {
  return { kcal: a.kcal + b.kcal, protein_g: a.protein_g + b.protein_g, carbs_g: a.carbs_g + b.carbs_g, fat_g: a.fat_g + b.fat_g, fiber_g: a.fiber_g + b.fiber_g };
}
export function sumLogs(logs: FoodLog[]): Macros {
  return logs.reduce<Macros>((acc, l) => add(acc, l), { ...ZERO });
}
export function ingredientsMacros(items: RecipeIngredient[], foods: Food[]): { macros: Macros; grams: number; missing: number } {
  let macros = { ...ZERO };
  let grams = 0;
  let missing = 0;
  for (const it of items) {
    const f = foods.find((x) => x.id === it.food_id);
    if (!f || it.grams == null || it.grams <= 0) { missing++; continue; }
    macros = add(macros, macrosFor(f, it.grams));
    grams += it.grams;
  }
  return { macros, grams, missing };
}
export function recipeMacros(r: Recipe, foods: Food[]) {
  return ingredientsMacros(r.ingredients, foods);
}

/** Mifflin-St Jeor (1990). Estimación del gasto en reposo. */
export function bmrMifflin(p: Pick<Profile, "sex" | "age" | "height_cm">, weight: number): number {
  const base = 10 * weight + 6.25 * p.height_cm - 5 * p.age;
  return p.sex === "female" ? base - 161 : base + 5;
}

export const ACTIVITY_LEVELS = [
  { v: 1.375, label: "Ligera (1–3 sesiones/sem)" },
  { v: 1.55, label: "Moderada (4 gym + 2 natación suaves)" },
  { v: 1.65, label: "Moderada-alta (sesiones intensas + pasos altos)" },
  { v: 1.725, label: "Alta (entrenamiento diario intenso)" },
];

export type Strategy = "recomposicion" | "mantenimiento" | "superavit_ligero" | "deficit_ligero";
export const STRATEGIES: { v: Strategy; label: string; factor: number; desc: string }[] = [
  { v: "recomposicion", label: "Recomposición (recomendado)", factor: 0.95, desc: "≈5% bajo mantenimiento: ganar músculo y reducir grasa poco a poco." },
  { v: "mantenimiento", label: "Mantenimiento", factor: 1.0, desc: "Calorías estimadas de mantenimiento." },
  { v: "deficit_ligero", label: "Déficit ligero", factor: 0.9, desc: "≈10% bajo mantenimiento. Sólo si la grasa baja no avanza." },
  { v: "superavit_ligero", label: "Superávit ligero", factor: 1.05, desc: "≈5% sobre mantenimiento, si el rendimiento se estanca." },
];

export interface Estimate { bmr: number; tdee: number; target: Goal }
/** Objetivos estimados. NO usa % de grasa (no medido). Proteína 2,0 g/kg, grasa 0,9 g/kg, resto carbohidratos. */
export function estimateTargets(p: Profile, weight: number, strategy: Strategy = "recomposicion", proteinPerKg = 2.0, fatPerKg = 0.9): Estimate {
  const bmr = bmrMifflin(p, weight);
  const tdee = bmr * p.activity_factor;
  const factor = STRATEGIES.find((s) => s.v === strategy)?.factor ?? 0.95;
  const kcal = Math.round((tdee * factor) / 10) * 10;
  const protein_g = Math.round(weight * proteinPerKg);
  const fat_g = Math.round(weight * fatPerKg);
  const carbs_g = Math.max(0, Math.round((kcal - protein_g * 4 - fat_g * 9) / 4));
  const fiber_g = Math.round((kcal / 1000) * 14); // 14 g por cada 1000 kcal
  const water_ml = Math.round((weight * 35) / 100) * 100;
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target: {
      id: "", valid_from: "", kcal, protein_g, carbs_g, fat_g, fiber_g,
      water_ml: Math.min(3000, Math.max(1500, water_ml)),
      set_by: "estimacion",
      notes: `Estimación Mifflin-St Jeor × ${p.activity_factor} (${strategy}). Proteína ${proteinPerKg} g/kg, grasa ${fatPerKg} g/kg.`,
    },
  };
}

export function currentGoal(db: DB, date: string): Goal | null {
  const valid = db.goals.filter((g) => g.valid_from <= date).sort((a, b) => (a.valid_from < b.valid_from ? 1 : a.valid_from > b.valid_from ? -1 : 0));
  return valid[0] ?? db.goals[0] ?? null;
}

export const r0 = (n: number) => Math.round(n);
export const r1 = (n: number) => Math.round(n * 10) / 10;
