import type { DB, Measurement, Profile } from "./types";
import { addDays, dateForDay, dayNumber, todayISO } from "./dates";
import { currentGoal, sumLogs } from "./nutrition";
import { improvedExercisesIn, planFor } from "./program";
import { METRICS } from "./metrics";

export interface BlockReport {
  block: number; fromDay: number; toDay: number; from: string; to: string; complete: boolean;
  training: { planned: number; done: number; sets: number; volume: number; improved: number; painSessions: number };
  nutrition: { daysLogged: number; avgKcal: number | null; avgProtein: number | null; proteinDays: number; outMeals: number; goalKcal: number | null; goalProtein: number | null };
  body: { start?: Measurement; end?: Measurement; deltas: { label: string; unit: string; delta: number }[] };
  habits: { avgSleep: number | null; avgEnergy: number | null; swims: number; closures: number; habitPct: number | null; checkins: number };
  insights: string[];
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function closestMeasurement(db: DB, date: string, maxDays = 4) {
  return [...db.body_measurements]
    .map((m) => ({ m, d: Math.abs(new Date(m.date).getTime() - new Date(date).getTime()) / 86400000 }))
    .filter((x) => x.d <= maxDays)
    .sort((a, b) => a.d - b.d)[0]?.m;
}

export function bodyInsights(deltas: { key: string; delta: number }[], strengthImproved: number): string[] {
  const g = (k: string) => deltas.find((d) => d.key === k)?.delta;
  const w = g("weight_kg");
  const waist = g("waist_cm");
  const hip = g("hip_cm") ?? g("glutes_cm");
  const out: string[] = [];
  if (w != null && waist != null) {
    if (w >= 0 && waist < 0) out.push("El peso se mantuvo o subió mientras la cintura bajó: patrón compatible con recomposición corporal (más músculo, menos grasa). ¡Buen progreso!");
    else if (w < 0 && waist < 0) out.push("Bajaron peso y cintura. Vigila que la fuerza se mantenga o suba para proteger tu masa muscular.");
    else if (w > 0 && waist > 0) out.push("Subieron peso y cintura. Revisa con calma las calorías promedio y las comidas fuera de casa; un pequeño ajuste suele bastar.");
    else if (w <= 0 && waist >= 0) out.push("La cintura no bajó. Puede deberse a variaciones normales (retención, ciclo menstrual, hora de medición). Compara con la siguiente evaluación antes de cambiar nada.");
  }
  if (hip != null && hip > 0) out.push(`Cadera/glúteos +${hip} cm: si la cintura no sube al mismo ritmo, es una señal positiva de desarrollo de glúteos.`);
  if (strengthImproved > 0) out.push(`Mejoraste tu marca en ${strengthImproved} ejercicio(s): tu fuerza está progresando.`);
  if (w != null && w > 0 && strengthImproved > 0) out.push("Una subida de peso con más fuerza y medidas estables o mejores NO es un resultado negativo.");
  return out;
}

export function blockReport(db: DB, profile: Profile, block: number): BlockReport {
  const fromDay = (block - 1) * 15 + 1;
  const toDay = block * 15;
  const from = dateForDay(profile.start_date, fromDay);
  const to = dateForDay(profile.start_date, toDay);
  const today = todayISO();
  const end = to < today ? to : today;
  const inR = (d: string) => d >= from && d <= to;

  let planned = 0;
  for (let d = from; d <= end; d = addDays(d, 1)) if (planFor(profile, d).type === "workout") planned++;
  const workouts = db.workouts.filter((w) => w.finished_at && inR(w.date));
  const wIds = new Set(workouts.map((w) => w.id));
  const sets = db.workout_sets.filter((s) => s.completed && wIds.has(s.workout_id));

  const logDates = [...new Set(db.food_logs.filter((l) => inR(l.date)).map((l) => l.date))];
  const daySums = logDates.map((d) => ({ d, m: sumLogs(db.food_logs.filter((l) => l.date === d)) }));
  const g = currentGoal(db, end);
  const proteinDays = daySums.filter(({ d, m }) => { const gg = currentGoal(db, d); return gg && m.protein_g >= gg.protein_g * 0.9; }).length;

  const start = closestMeasurement(db, from) ?? (block === 1 ? db.body_measurements.find((m) => m.is_baseline) : undefined);
  const endM = closestMeasurement(db, to);
  const deltas: { key: string; label: string; unit: string; delta: number }[] = [];
  if (start && endM && start.id !== endM.id)
    for (const m of METRICS) {
      const a = start[m.k];
      const b = endM[m.k];
      if (a != null && b != null) deltas.push({ key: m.k, label: m.l, unit: m.u, delta: Math.round((b - a) * 10) / 10 });
    }
  const improved = improvedExercisesIn(db, from, to);

  const sleeps = db.sleep_logs.filter((s) => inR(s.date) && s.hours > 0).map((s) => s.hours);
  const hl = db.habit_logs.filter((h) => inR(h.date));
  const habitPct = hl.length && profile.habits.length ? Math.round((avg(hl.map((h) => profile.habits.filter((x) => h.habits[x]).length / profile.habits.length)) ?? 0) * 100) : null;

  const insights = bodyInsights(deltas, improved);
  if (planned > 0) {
    const pct = workouts.length / planned;
    if (pct >= 0.9) insights.unshift(`Constancia excelente: ${workouts.length} de ${planned} entrenamientos.`);
    else if (pct < 0.6 && workouts.length > 0) insights.push(`Completaste ${workouts.length} de ${planned} entrenamientos. Si la semana se complica, prioriza los dos días de glúteos.`);
  }
  if (daySums.length && g && (avg(daySums.map((x) => x.m.protein_g)) ?? 0) < g.protein_g * 0.8) insights.push("La proteína promedio quedó por debajo del 80% del objetivo: añadir una fuente de proteína en desayuno y merienda suele ser lo más fácil.");

  return {
    block, fromDay, toDay, from, to, complete: to < today,
    training: { planned, done: workouts.length, sets: sets.length, volume: Math.round(sets.reduce((a, s) => a + (s.weight_kg ?? 0) * (s.reps ?? 0), 0)), improved, painSessions: workouts.filter((w) => w.pain).length },
    nutrition: { daysLogged: logDates.length, avgKcal: avg(daySums.map((x) => x.m.kcal)), avgProtein: avg(daySums.map((x) => x.m.protein_g)), proteinDays, outMeals: db.food_logs.filter((l) => inR(l.date) && l.eaten_out).length, goalKcal: g?.kcal ?? null, goalProtein: g?.protein_g ?? null },
    body: { start, end: endM, deltas },
    habits: { avgSleep: avg(sleeps), avgEnergy: avg(hl.filter((h) => h.energy).map((h) => h.energy!)), swims: db.swim_sessions.filter((s) => inR(s.date)).length, closures: db.day_closures.filter((c) => inR(c.date)).length, habitPct, checkins: hl.length },
    insights,
  };
}

export function currentBlock(profile: Profile) {
  const d = dayNumber(profile.start_date);
  return Math.min(6, Math.max(1, Math.ceil(d / 15)));
}
