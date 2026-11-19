import type { DayPlan, LoadReference, Routine } from "../types";

// Diseño de programa: 4 sesiones de ~60 min, 5–8 ejercicios, 2–4 series.
// Volumen semanal aproximado (series efectivas): glúteos ~18–20, femorales ~8–10,
// cuádriceps ~10, espalda ~11, hombros ~11, brazos ~8, abdomen ~9.
// Adecuado para ~7 meses de experiencia con recuperación (miércoles) y natación el fin de semana.
export const SEED_ROUTINES: Routine[] = [
  {
    id: "r_lunes", name: "Glúteos y femorales", focus: "Glúteos · Femorales", color: "rose",
    items: [
      { exercise_id: "hip_thrust", sets: 4, rep_min: 8, rep_max: 12, rest_s: 120, target_weight_kg: 10, note: "Ejercicio principal" },
      { exercise_id: "rdl", sets: 3, rep_min: 8, rep_max: 12, rest_s: 120, target_weight_kg: 20 },
      { exercise_id: "curl_fem_sentado", sets: 3, rep_min: 10, rep_max: 15, rest_s: 90, target_weight_kg: null },
      { exercise_id: "patada_polea", sets: 2, rep_min: 12, rep_max: 15, rest_s: 60, target_weight_kg: null, per_side: true },
      { exercise_id: "abduccion", sets: 3, rep_min: 12, rep_max: 20, rest_s: 60, target_weight_kg: null },
    ],
  },
  {
    id: "r_martes", name: "Espalda, hombros y brazos", focus: "Espalda · Hombros · Brazos", color: "sand",
    items: [
      { exercise_id: "jalon", sets: 3, rep_min: 8, rep_max: 12, rest_s: 90, target_weight_kg: 15 },
      { exercise_id: "remo_sentado", sets: 3, rep_min: 10, rep_max: 12, rest_s: 90, target_weight_kg: null },
      { exercise_id: "press_hombros", sets: 3, rep_min: 8, rep_max: 12, rest_s: 90, target_weight_kg: null },
      { exercise_id: "elev_laterales", sets: 3, rep_min: 12, rep_max: 20, rest_s: 60, target_weight_kg: null },
      { exercise_id: "curl_biceps", sets: 2, rep_min: 10, rep_max: 15, rest_s: 60, target_weight_kg: null },
      { exercise_id: "ext_triceps_polea", sets: 2, rep_min: 10, rep_max: 15, rest_s: 60, target_weight_kg: null },
      { exercise_id: "face_pull", sets: 2, rep_min: 12, rep_max: 20, rest_s: 60, target_weight_kg: null },
    ],
  },
  {
    id: "r_jueves", name: "Glúteos y cuádriceps", focus: "Glúteos · Cuádriceps", color: "stone",
    items: [
      { exercise_id: "sentadilla", sets: 3, rep_min: 8, rep_max: 12, rest_s: 120, target_weight_kg: 10, note: "Si la técnica no es estable, usa goblet" },
      { exercise_id: "bulgara", sets: 3, rep_min: 8, rep_max: 12, rest_s: 90, target_weight_kg: null, per_side: true },
      { exercise_id: "prensa", sets: 3, rep_min: 10, rep_max: 15, rest_s: 90, target_weight_kg: null },
      { exercise_id: "ext_cadera", sets: 3, rep_min: 12, rep_max: 15, rest_s: 60, target_weight_kg: null },
      { exercise_id: "ext_cuadriceps", sets: 2, rep_min: 12, rep_max: 15, rest_s: 60, target_weight_kg: null },
      { exercise_id: "abduccion", sets: 2, rep_min: 15, rep_max: 20, rest_s: 60, target_weight_kg: null },
    ],
  },
  {
    id: "r_viernes", name: "Tren superior y abdomen", focus: "Tren superior · Abdomen", color: "ink",
    items: [
      { exercise_id: "remo_mancuerna", sets: 3, rep_min: 8, rep_max: 12, rest_s: 90, target_weight_kg: null, per_side: true },
      { exercise_id: "elev_laterales", sets: 3, rep_min: 12, rep_max: 20, rest_s: 60, target_weight_kg: null },
      { exercise_id: "pajaros", sets: 2, rep_min: 12, rep_max: 20, rest_s: 60, target_weight_kg: null },
      { exercise_id: "curl_martillo", sets: 2, rep_min: 10, rep_max: 15, rest_s: 60, target_weight_kg: null },
      { exercise_id: "ext_triceps_cabeza", sets: 2, rep_min: 10, rep_max: 15, rest_s: 60, target_weight_kg: null },
      { exercise_id: "crunch_polea", sets: 3, rep_min: 10, rep_max: 15, rest_s: 60, target_weight_kg: null },
      { exercise_id: "pallof", sets: 2, rep_min: 10, rep_max: 12, rest_s: 45, target_weight_kg: null, per_side: true },
      { exercise_id: "elev_piernas", sets: 2, rep_min: 10, rep_max: 15, rest_s: 45, target_weight_kg: null },
    ],
  },
];

export const SEED_SCHEDULE: Record<string, DayPlan> = {
  "1": { type: "workout", routine_id: "r_lunes" },
  "2": { type: "workout", routine_id: "r_martes" },
  "3": { type: "rest" },
  "4": { type: "workout", routine_id: "r_jueves" },
  "5": { type: "workout", routine_id: "r_viernes" },
  "6": { type: "swim" },
  "0": { type: "swim" },
};

export function seedLoadReferences(date: string): LoadReference[] {
  const base = { load_type: null, equipment: "", bar_weight_kg: null, validated: false, notes: "Referencia aproximada indicada al inicio. Pendiente de validar.", date };
  return [
    { id: "lr_hip_thrust", exercise_id: "hip_thrust", weight_kg: 10, ...base },
    { id: "lr_sentadilla", exercise_id: "sentadilla", weight_kg: 10, ...base },
    { id: "lr_rdl", exercise_id: "rdl", weight_kg: 20, ...base },
    { id: "lr_jalon", exercise_id: "jalon", weight_kg: 15, ...base },
  ];
}

export const DEFAULT_HABITS = [
  "Proteína en cada comida",
  "Pesé mis comidas",
  "Comida casera la mayor parte del día",
  "Fruta o verdura en 2+ comidas",
  "Movilidad / estiramiento 10 min",
  "Pasos o caminata",
];
