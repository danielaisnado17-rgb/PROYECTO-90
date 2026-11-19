import type { DayPlan, DB, Exercise, Profile, Routine } from "./types";
import { SEED_EXERCISES } from "./seed/exercises";
import { addDays, dateForDay, dayNumber, EVAL_DAYS, nextEvaluationDay, PROGRAM_DAYS, todayISO, weekday, weekStart, diffDays } from "./dates";
import { currentGoal, sumLogs } from "./nutrition";
import { exerciseHistory, e1rm } from "./progression";

export function allExercises(db: DB): Exercise[] {
  const map = new Map<string, Exercise>();
  for (const e of SEED_EXERCISES) map.set(e.id, e);
  for (const e of db.exercises) map.set(e.id, e);
  return [...map.values()];
}
export function getExercise(db: DB, id: string) {
  return allExercises(db).find((e) => e.id === id);
}

export function planFor(profile: Profile, date: string): DayPlan {
  return profile.schedule[String(weekday(date))] ?? { type: "rest" };
}
export function routineFor(db: DB, profile: Profile, date: string): Routine | null {
  const p = planFor(profile, date);
  if (p.type !== "workout") return null;
  return db.routines.find((r) => r.id === p.routine_id) ?? null;
}

// ── Estado de cada día ──────────────────────────────────────────────────────
export function dayStatus(db: DB, profile: Profile, date: string) {
  const plan = planFor(profile, date);
  const workout = db.workouts.find((w) => w.date === date && w.finished_at);
  const swim = db.swim_sessions.find((s) => s.date === date);
  const activityDone = plan.type === "workout" ? !!workout : plan.type === "swim" ? !!swim : true;
  const foodLogged = db.food_logs.some((l) => l.date === date);
  const closed = db.day_closures.some((c) => c.date === date);
  const compliant = closed || (activityDone && foodLogged);
  const anything = foodLogged || !!workout || !!swim || db.habit_logs.some((h) => h.date === date) || db.hydration_logs.some((h) => h.date === date);
  return { plan, workout, swim, activityDone, foodLogged, closed, compliant, partial: !compliant && anything };
}

export function streak(db: DB, profile: Profile, today = todayISO()): number {
  let d = dayStatus(db, profile, today).compliant ? today : addDays(today, -1);
  let n = 0;
  while (d >= profile.start_date && dayStatus(db, profile, d).compliant) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function weekSessions(db: DB, profile: Profile, date = todayISO()) {
  const ws = weekStart(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const planned = days.filter((d) => planFor(profile, d).type === "workout").length;
  const done = db.workouts.filter((w) => w.finished_at && days.includes(w.date)).length;
  const swims = db.swim_sessions.filter((s) => days.includes(s.date)).length;
  return { planned, done, swims, days };
}

// ── Etapas del mapa de 90 días ──────────────────────────────────────────────
export interface StageTask { id: string; label: string; check: (c: StageCtx) => { done: boolean; progress?: string } }
export interface Stage {
  n: number; from: number; to: number; title: string; subtitle: string;
  objectives: string[]; recommendations: string[]; tasks: StageTask[]; badge: string;
}
export interface StageCtx { db: DB; profile: Profile; fromDate: string; toDate: string }

const inRange = (d: string, c: StageCtx) => d >= c.fromDate && d <= c.toDate;
const workoutsIn = (c: StageCtx) => c.db.workouts.filter((w) => w.finished_at && inRange(w.date, c)).length;
const foodDaysIn = (c: StageCtx) => new Set(c.db.food_logs.filter((l) => inRange(l.date, c)).map((l) => l.date)).size;
const swimsIn = (c: StageCtx) => c.db.swim_sessions.filter((s) => inRange(s.date, c)).length;
const sleepDaysIn = (c: StageCtx) => new Set(c.db.sleep_logs.filter((s) => inRange(s.date, c)).map((s) => s.date)).size;
const checkinDaysIn = (c: StageCtx) => new Set(c.db.habit_logs.filter((s) => inRange(s.date, c)).map((s) => s.date)).size;
const closuresIn = (c: StageCtx) => c.db.day_closures.filter((s) => inRange(s.date, c)).length;
function proteinDaysIn(c: StageCtx) {
  const dates = [...new Set(c.db.food_logs.filter((l) => inRange(l.date, c)).map((l) => l.date))];
  return dates.filter((d) => {
    const g = currentGoal(c.db, d);
    if (!g) return false;
    return sumLogs(c.db.food_logs.filter((l) => l.date === d)).protein_g >= g.protein_g * 0.9;
  }).length;
}
function measuredAround(c: StageCtx, day: number) {
  const target = dateForDay(c.profile.start_date, day);
  return c.db.body_measurements.some((m) => Math.abs(diffDays(m.date, target)) <= 3);
}
function photosAround(c: StageCtx, day: number) {
  const poses = new Set(c.db.progress_photos.filter((p) => Math.abs(p.day_number - day) <= 3).map((p) => p.pose));
  return poses.size;
}
export function improvedExercisesIn(db: DB, fromDate: string, toDate: string) {
  const ids = new Set(db.workout_sets.map((s) => s.exercise_id));
  let n = 0;
  for (const id of ids) {
    const hist = exerciseHistory(db, id);
    const best = (arr: typeof hist) => Math.max(0, ...arr.flatMap((h) => h.sets.map((s) => e1rm(s.weight_kg ?? 0, s.reps ?? 0))));
    const before = hist.filter((h) => h.date < fromDate);
    const during = hist.filter((h) => h.date >= fromDate && h.date <= toDate);
    if (before.length && during.length && best(during) > best(before)) n++;
  }
  return n;
}

const t = (id: string, label: string, check: StageTask["check"]): StageTask => ({ id, label, check });
const count = (n: number, goal: number) => ({ done: n >= goal, progress: `${Math.min(n, goal)}/${goal}` });
const evalTask = (day: number) =>
  t(`eval${day}`, `Evaluación día ${day}: medidas + 3 fotos`, (c) => {
    const m = measuredAround(c, day);
    const p = photosAround(c, day);
    return { done: m && p >= 3, progress: `${m ? "medidas ✓" : "medidas –"} · fotos ${p}/3` };
  });

export const STAGES: Stage[] = [
  {
    n: 1, from: 1, to: 15, title: "Base", subtitle: "Evaluación inicial, técnica y hábitos", badge: "Cimientos",
    objectives: ["Registrar tu punto de partida real.", "Aprender la técnica de los ejercicios principales.", "Validar tus pesos de referencia.", "Crear el hábito de registrar comidas."],
    recommendations: ["Prioriza técnica sobre peso: termina las series con 2–3 repeticiones en reserva.", "Pesa tus alimentos (crudos cuando sea posible) para aprender porciones.", "No cambies todo de golpe: una mejora de alimentación por semana."],
    tasks: [
      t("baseline", "Medidas iniciales registradas", (c) => ({ done: c.db.body_measurements.some((m) => m.is_baseline) })),
      t("photos1", "Fotos del día 1 (frente, perfil, espalda)", (c) => ({ done: photosAround(c, 1) >= 3, progress: `${photosAround(c, 1)}/3` })),
      t("loads", "Validar pesos de referencia (total, discos o por lado)", (c) => {
        const refs = c.db.load_references; const v = refs.filter((r) => r.validated).length;
        return { done: refs.length > 0 && v === refs.length, progress: `${v}/${refs.length}` };
      }),
      t("shake", "Pesar los ingredientes de tu batido", (c) => {
        const r = c.db.recipes.find((x) => x.id === "rec_batido");
        return { done: !!r && r.ingredients.length > 0 && r.ingredients.every((i) => i.grams != null && i.grams > 0) };
      }),
      t("w1", "Completar 6 entrenamientos", (c) => count(workoutsIn(c), 6)),
      t("f1", "Registrar alimentación 10 días", (c) => count(foodDaysIn(c), 10)),
      evalTask(15),
    ],
  },
  {
    n: 2, from: 16, to: 30, title: "Constancia", subtitle: "Consolidar rutinas, alimentación y registro de cargas", badge: "Constante",
    objectives: ["Entrenar los 4 días planificados.", "Llegar a tu proteína diaria con regularidad.", "Registrar cargas en cada serie."],
    recommendations: ["Repite las mismas rutinas para poder medir progreso.", "Ten 2–3 desayunos y meriendas altos en proteína 'por defecto'.", "Usa la natación como actividad agradable, no como castigo."],
    tasks: [
      t("w2", "Completar 7 entrenamientos", (c) => count(workoutsIn(c), 7)),
      t("f2", "Registrar alimentación 12 días", (c) => count(foodDaysIn(c), 12)),
      t("p2", "Proteína ≥90% del objetivo en 8 días", (c) => count(proteinDaysIn(c), 8)),
      t("s2", "3 sesiones de natación registradas", (c) => count(swimsIn(c), 3)),
      t("z2", "Registrar sueño 10 días", (c) => count(sleepDaysIn(c), 10)),
      evalTask(30),
    ],
  },
  {
    n: 3, from: 31, to: 45, title: "Fuerza", subtitle: "Progresión de fuerza e hipertrofia", badge: "Progresión",
    objectives: ["Aplicar la progresión doble en los ejercicios principales.", "Mejorar marcas manteniendo técnica.", "Sostener la alimentación con flexibilidad."],
    recommendations: ["Cuando completes el rango superior en todas las series, sube el mínimo incremento.", "Si el rendimiento cae varios días, revisa sueño y calorías antes de exigir más.", "Las molestias se registran; el dolor no se entrena."],
    tasks: [
      t("w3", "Completar 7 entrenamientos", (c) => count(workoutsIn(c), 7)),
      t("i3", "Mejorar tu marca en 3 ejercicios", (c) => count(improvedExercisesIn(c.db, c.fromDate, c.toDate), 3)),
      t("p3", "Proteína ≥90% del objetivo en 9 días", (c) => count(proteinDaysIn(c), 9)),
      evalTask(45),
    ],
  },
  {
    n: 4, from: 46, to: 60, title: "Ajuste", subtitle: "Evaluación intermedia y ajustes", badge: "Mitad del camino",
    objectives: ["Comparar día 1 vs día 60 con datos reales.", "Ajustar calorías/proteína según evolución (idealmente con tu nutricionista).", "Revisar ejercicios que no progresan."],
    recommendations: ["Si la cintura baja y el peso se mantiene o sube un poco, probablemente vas bien: no lo interpretes como un fracaso.", "Si el hambre o la energía empeoran, ajusta objetivos en Nutrición → Objetivos.", "Considera cambiar una variante que no progrese desde hace 3 semanas."],
    tasks: [
      t("w4", "Completar 7 entrenamientos", (c) => count(workoutsIn(c), 7)),
      t("g4", "Revisar / ajustar objetivos nutricionales", (c) => ({ done: c.db.goals.some((g) => inRange(g.valid_from, c)) })),
      t("c4", "Check-in de recuperación 10 días", (c) => count(checkinDaysIn(c), 10)),
      evalTask(60),
    ],
  },
  {
    n: 5, from: 61, to: 75, title: "Optimización", subtitle: "Continuidad, progresión y optimización", badge: "Imparable",
    objectives: ["Sostener la progresión.", "Optimizar comidas fuera de casa.", "Mantener sueño y recuperación."],
    recommendations: ["Usa tus comidas favoritas guardadas para registrar en segundos.", "Planifica las comidas del fin de semana (natación + vida social).", "Pequeñas mejoras sostenidas > cambios drásticos."],
    tasks: [
      t("w5", "Completar 7 entrenamientos", (c) => count(workoutsIn(c), 7)),
      t("i5", "Mejorar tu marca en 4 ejercicios", (c) => count(improvedExercisesIn(c.db, c.fromDate, c.toDate), 4)),
      t("f5", "Registrar alimentación 12 días", (c) => count(foodDaysIn(c), 12)),
      evalTask(75),
    ],
  },
  {
    n: 6, from: 76, to: 90, title: "Revelación", subtitle: "Evaluación final y comparación de resultados", badge: "Proyecto 90",
    objectives: ["Cerrar el programa con constancia.", "Evaluación final completa.", "Comparar resultados y definir siguiente etapa."],
    recommendations: ["No hagas cambios bruscos antes de la evaluación final.", "Toma las fotos en las mismas condiciones que el día 1 (luz, hora, ropa).", "Revisa tu informe final con tu nutricionista o entrenador."],
    tasks: [
      t("w6", "Completar 7 entrenamientos", (c) => count(workoutsIn(c), 7)),
      t("d6", "Cerrar 12 días con el botón 'Cerrar mi día'", (c) => count(closuresIn(c), 12)),
      evalTask(90),
    ],
  },
];

export function stageForDay(day: number): Stage {
  return STAGES.find((s) => day >= s.from && day <= s.to) ?? (day < 1 ? STAGES[0] : STAGES[STAGES.length - 1]);
}
export function stageCtx(db: DB, profile: Profile, s: Stage): StageCtx {
  return { db, profile, fromDate: dateForDay(profile.start_date, s.from), toDate: dateForDay(profile.start_date, s.to) };
}

// ── Logros (sólo se desbloquean con datos reales) ──────────────────────────
export interface Achievement { id: string; title: string; desc: string; icon: string; unlocked: boolean }
export function achievements(db: DB, profile: Profile): Achievement[] {
  const workouts = db.workouts.filter((w) => w.finished_at);
  const weeks = new Map<string, number>();
  for (const w of workouts) weeks.set(weekStart(w.date), (weeks.get(weekStart(w.date)) ?? 0) + 1);
  const proteinDays = [...new Set(db.food_logs.map((l) => l.date))].filter((d) => {
    const g = currentGoal(db, d);
    return g && sumLogs(db.food_logs.filter((l) => l.date === d)).protein_g >= g.protein_g * 0.9;
  }).length;
  const anyPR = improvedExercisesIn(db, addDays(profile.start_date, 7), "9999-12-31") > 0;
  const shake = db.recipes.find((r) => r.id === "rec_batido");
  const maxClosedDay = Math.max(0, ...db.day_closures.map((c) => c.day_number));
  const st = streak(db, profile);
  const a = (id: string, icon: string, title: string, desc: string, unlocked: boolean): Achievement => ({ id, icon, title, desc, unlocked });
  return [
    a("first_workout", "dumbbell", "Primer paso", "Completa tu primer entrenamiento", workouts.length >= 1),
    a("full_week", "calendar-check", "Semana completa", "4 entrenamientos en una misma semana", [...weeks.values()].some((n) => n >= 4)),
    a("photo", "camera", "Punto de partida", "Sube tus primeras fotos de progreso", db.progress_photos.length >= 1),
    a("shake", "cup-soda", "Batido calibrado", "Pesa todos los ingredientes de tu batido", !!shake && shake.ingredients.every((i) => (i.grams ?? 0) > 0)),
    a("streak7", "flame", "7 días seguidos", "Racha de cumplimiento de 7 días", st >= 7),
    a("protein7", "egg", "Proteína en meta", "7 días llegando a tu proteína", proteinDays >= 7),
    a("pr", "trending-up", "Nueva marca", "Supera tu mejor marca en un ejercicio", anyPR),
    a("w10", "medal", "10 entrenamientos", "Diez sesiones completadas", workouts.length >= 10),
    a("swim8", "waves", "Agua y constancia", "8 sesiones de natación", db.swim_sessions.length >= 8),
    a("streak21", "sparkles", "21 días", "Racha de 21 días: hábito instalado", st >= 21),
    a("w25", "trophy", "25 entrenamientos", "Constancia de verdad", workouts.length >= 25),
    a("half", "flag", "Mitad del camino", "Cierra el día 45", maxClosedDay >= 45),
    a("w40", "crown", "40 entrenamientos", "Más de 10 semanas de trabajo", workouts.length >= 40),
    a("day90", "gem", "Proyecto 90", "Cierra el día 90", maxClosedDay >= 90),
  ];
}

// ── Mensajes útiles del dashboard ───────────────────────────────────────────
export function dashboardMessages(db: DB, profile: Profile, date = todayISO()): { tone: "info" | "good" | "warn"; text: string; href?: string }[] {
  const out: { tone: "info" | "good" | "warn"; text: string; href?: string }[] = [];
  const day = dayNumber(profile.start_date, date);
  const st = dayStatus(db, profile, date);
  const routine = routineFor(db, profile, date);
  if (day < 1) out.push({ tone: "info", text: `Tu programa empieza en ${1 - day} día(s). Prepara tus fotos y pesa tu batido.` });
  if (routine && !st.workout) out.push({ tone: "info", text: `Hoy toca: ${routine.name.toLowerCase()}.`, href: `/entrenamientos/sesion?r=${routine.id}` });
  if (st.plan.type === "swim" && !st.swim) out.push({ tone: "info", text: "Hoy toca natación. Regístrala al terminar.", href: "/habitos?tab=natacion" });
  if (st.plan.type === "rest") out.push({ tone: "info", text: "Hoy es día de recuperación: movilidad suave, buena comida y descanso." });
  const hour = new Date().getHours();
  const slotsLogged = new Set(db.food_logs.filter((l) => l.date === date).map((l) => l.slot)).size;
  if (hour >= 14 && slotsLogged < 2) out.push({ tone: "warn", text: "Tienes pendiente completar tu registro de alimentación.", href: "/nutricion" });
  const done = db.evaluations.filter((e) => e.completed).map((e) => e.day);
  const next = nextEvaluationDay(Math.max(day, 1), done);
  if (next) {
    const inDays = next - day;
    if (inDays <= 3 && inDays >= 0) out.push({ tone: "warn", text: inDays === 0 ? `Hoy es tu evaluación del día ${next}: medidas y fotos.` : `Tu próxima evaluación es dentro de ${inDays} día(s).`, href: "/body" });
  }
  const pendingRefs = db.load_references.filter((r) => !r.validated);
  if (pendingRefs.length) out.push({ tone: "warn", text: `Valida ${pendingRefs.length} peso(s) de referencia: ¿total, discos o por lado?`, href: "/progreso?tab=referencias" });
  const shake = db.recipes.find((r) => r.id === "rec_batido");
  if (shake && shake.ingredients.some((i) => i.grams == null)) out.push({ tone: "info", text: "Pesa los ingredientes de tu batido para calcularlo con precisión.", href: "/nutricion?tab=recetas" });
  // Mejora real en la última sesión
  const lastW = [...db.workouts].filter((w) => w.finished_at).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (lastW) {
    const ids = [...new Set(db.workout_sets.filter((s) => s.workout_id === lastW.id).map((s) => s.exercise_id))];
    for (const id of ids) {
      const h = exerciseHistory(db, id);
      if (h.length >= 2 && h[0].workout?.id === lastW.id) {
        const b = (x: (typeof h)[0]) => Math.max(...x.sets.map((s) => e1rm(s.weight_kg ?? 0, s.reps ?? 0)));
        if (b(h[0]) > b(h[1])) {
          const ex = getExercise(db, id);
          out.push({ tone: "good", text: `Has mejorado tu rendimiento en ${ex?.name.toLowerCase() ?? id}.`, href: "/progreso" });
          break;
        }
      }
    }
  }
  return out;
}

export { EVAL_DAYS, PROGRAM_DAYS };
