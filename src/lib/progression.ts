import type { DB, Exercise, RoutineItem, Workout, WorkoutSet } from "./types";

export interface Suggestion {
  kind: "increase" | "keep" | "reduce" | "first" | "caution";
  weight: number | null;
  repsGoal: string;
  message: string;
}

/** Sesiones anteriores (más reciente primero) de un ejercicio, con sus series completadas. */
export function exerciseHistory(db: DB, exerciseId: string, beforeWorkoutId?: string) {
  const byWorkout = new Map<string, WorkoutSet[]>();
  for (const s of db.workout_sets) {
    if (s.exercise_id !== exerciseId || !s.completed) continue;
    if (beforeWorkoutId && s.workout_id === beforeWorkoutId) continue;
    const arr = byWorkout.get(s.workout_id) ?? [];
    arr.push(s);
    byWorkout.set(s.workout_id, arr);
  }
  const sessions = [...byWorkout.entries()].map(([wid, sets]) => {
    const w = db.workouts.find((x) => x.id === wid);
    sets.sort((a, b) => a.set_index - b.set_index);
    return { workout: w as Workout | undefined, date: sets[0].date, sets };
  });
  sessions.sort((a, b) => (a.date < b.date ? 1 : -1));
  return sessions;
}

/**
 * Progresión doble:
 * 1) Trabajar dentro del rango de repeticiones.
 * 2) Cuando TODAS las series objetivo llegan al tope del rango con esfuerzo controlado (RPE ≤ 8,5)
 *    y sin dolor registrado → sugerir un incremento pequeño y volver a la parte baja del rango.
 * 3) Si hubo dolor, RPE muy alto o reps por debajo del mínimo → mantener o reducir.
 */
export function suggestNext(db: DB, ex: Exercise, item: RoutineItem, currentWorkoutId?: string): Suggestion {
  const hist = exerciseHistory(db, ex.id, currentWorkoutId);
  const range = `${item.rep_min}–${item.rep_max}`;
  if (hist.length === 0) {
    const ref = db.load_references.find((r) => r.exercise_id === ex.id);
    if (ref && !ref.validated)
      return { kind: "first", weight: ref.weight_kg, repsGoal: range, message: `Referencia inicial ${ref.weight_kg} kg (pendiente de validar). Elige un peso que te permita ${range} reps con 2–3 en reserva.` };
    return { kind: "first", weight: item.target_weight_kg, repsGoal: range, message: `Primera vez: elige un peso con el que completes ${range} reps con buena técnica y 2–3 reps en reserva.` };
  }
  const last = hist[0];
  const working = last.sets.filter((s) => s.weight_kg != null || s.reps != null);
  const topWeight = Math.max(...working.map((s) => s.weight_kg ?? 0));
  const rpes = working.map((s) => s.rpe).filter((x): x is number => x != null);
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null;
  const pain = last.workout?.pain ?? false;
  const atTop = working.length >= item.sets && working.slice(0, item.sets).every((s) => (s.reps ?? 0) >= item.rep_max && (s.weight_kg ?? 0) >= topWeight);
  const belowMin = working.filter((s) => (s.reps ?? 0) < item.rep_min).length >= Math.ceil(working.length / 2);

  if (pain)
    return { kind: "caution", weight: topWeight || null, repsGoal: range, message: "La última sesión registraste dolor o molestias. Mantén o reduce la carga y no entrenes con dolor. Si persiste, consulta con un profesional." };
  if (avgRpe != null && avgRpe >= 9.5)
    return { kind: "keep", weight: topWeight || null, repsGoal: range, message: `Esfuerzo muy alto la última vez (RPE ${avgRpe.toFixed(1)}). Mantén ${topWeight} kg y busca técnica más limpia.` };
  if (atTop && (avgRpe == null || avgRpe <= 8.5)) {
    const inc = ex.increment_kg || 0;
    if (inc === 0) return { kind: "increase", weight: null, repsGoal: range, message: "Completaste el rango superior. Aumenta la dificultad (más pausa, más rango o una variante más exigente)." };
    return { kind: "increase", weight: topWeight + inc, repsGoal: `${item.rep_min}–${item.rep_min + 2}`, message: `¡Rango superior completado en todas las series! Prueba +${inc} kg (${topWeight + inc} kg) y vuelve a ${item.rep_min} reps. Sólo si la técnica se mantiene.` };
  }
  if (belowMin)
    return { kind: "reduce", weight: topWeight || null, repsGoal: range, message: `La mayoría de series quedaron por debajo de ${item.rep_min} reps. Mantén ${topWeight} kg o baja un poco para entrar en el rango.` };
  const bestReps = Math.max(...working.map((s) => s.reps ?? 0));
  return { kind: "keep", weight: topWeight || null, repsGoal: range, message: `Mantén ${topWeight} kg e intenta sumar 1 repetición por serie (mejor: ${bestReps}). Al llegar a ${item.rep_max} en todas, sube peso.` };
}

/** Estimación de 1RM (Epley) sólo para tendencias; no es una prueba de máximo. */
export const e1rm = (w: number, reps: number) => (reps <= 0 ? 0 : w * (1 + reps / 30));

export function strengthSummary(db: DB, exerciseId: string) {
  const hist = exerciseHistory(db, exerciseId).reverse(); // cronológico
  if (hist.length === 0) return null;
  const points = hist.map((h) => {
    const top = h.sets.reduce((best, s) => ((s.weight_kg ?? 0) > (best.weight_kg ?? 0) || ((s.weight_kg ?? 0) === (best.weight_kg ?? 0) && (s.reps ?? 0) > (best.reps ?? 0)) ? s : best), h.sets[0]);
    const volume = h.sets.reduce((a, s) => a + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);
    return { date: h.date, top_weight: top.weight_kg ?? 0, top_reps: top.reps ?? 0, e1rm: Math.round(e1rm(top.weight_kg ?? 0, top.reps ?? 0) * 10) / 10, volume, sets: h.sets };
  });
  const first = points[0];
  const last = points[points.length - 1];
  const best = points.reduce((b, p) => (p.e1rm > b.e1rm ? p : b), points[0]);
  return { points, first, last, best };
}
