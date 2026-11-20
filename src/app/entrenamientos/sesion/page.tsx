"use client";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Info, Plus, Timer, TrendingUp, AlertTriangle, SkipForward, Trash2 } from "lucide-react";
import { useStore, newId } from "@/lib/store";
import { fmtLong, nowISO, todayISO } from "@/lib/dates";
import { getExercise } from "@/lib/program";
import { suggestNext } from "@/lib/progression";
import { notify } from "@/lib/notify";
import type { Exercise, RoutineItem, Workout, WorkoutSet } from "@/lib/types";
import { Badge, Button, Card, Dots, Sheet, Textarea, cx, Empty, LinkButton } from "@/components/ui";
import { ExerciseDetail } from "@/components/ExerciseDetail";

export default function Page() {
  return (
    <Suspense>
      <Session />
    </Suspense>
  );
}

function Session() {
  const params = useSearchParams();
  const router = useRouter();
  const { db, upsert, remove } = useStore();
  const routineId = params.get("r");
  const wParam = params.get("w");
  const routine = db.routines.find((r) => r.id === routineId);
  const today = todayISO();

  // Sesión existente: por parámetro, o la de hoy sin terminar de esta rutina
  const existing = useMemo(() => {
    if (wParam) return db.workouts.find((w) => w.id === wParam) ?? null;
    return db.workouts.find((w) => w.date === today && w.routine_id === routineId && !w.finished_at) ?? null;
  }, [db.workouts, wParam, routineId, today]);
  const [draftId] = useState(() => newId());
  const workoutId = existing?.id ?? draftId;
  const date = existing?.date ?? today;
  const sets = db.workout_sets.filter((s) => s.workout_id === workoutId);

  const ensureWorkout = useCallback(() => {
    if (existing || !routine) return;
    const w: Workout = { id: workoutId, date, routine_id: routine.id, routine_name: routine.name, started_at: nowISO(), finished_at: null, session_rpe: null, feeling: null, pain: false, notes: "" };
    upsert("workouts", w);
  }, [existing, routine, workoutId, date, upsert]);

  // Temporizador de descanso
  const [rest, setRest] = useState<{ end: number; total: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!rest) return;
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, [rest]);
  const left = rest ? Math.max(0, Math.ceil((rest.end - now) / 1000)) : 0;
  const notified = useRef(false);
  useEffect(() => {
    if (rest && left === 0 && !notified.current) {
      notified.current = true;
      if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
      void notify("Descanso terminado", "¡A por la siguiente serie!", "rest");
      setTimeout(() => setRest(null), 1500);
    }
  }, [left, rest]);
  const startRest = (s: number) => {
    notified.current = false;
    setRest({ end: Date.now() + s * 1000, total: s });
  };

  const [info, setInfo] = useState<Exercise | null>(null);
  const [finish, setFinish] = useState(false);

  if (!routine) {
    return <Empty title="Rutina no encontrada" text="Vuelve a Entrenamientos y elige una rutina." action={<LinkButton href="/entrenamientos">Volver</LinkButton>} />;
  }
  const completed = sets.filter((s) => s.completed).length;
  const planned = routine.items.reduce((a, i) => a + i.sets, 0);

  return (
    <div className="rise pb-24">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/entrenamientos" className="grid h-10 w-10 place-items-center rounded-full bg-surface border border-line"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <div className="text-xs text-muted first-letter:uppercase">{fmtLong(date)}</div>
          <h1 className="text-2xl font-extrabold tracking-tight">{routine.name}</h1>
        </div>
        {existing?.finished_at && <Badge tone="good">Completado</Badge>}
      </div>
      <Card className="mb-4 flex items-center justify-between py-4">
        <div className="text-sm"><b>{completed}</b> / {planned} series</div>
        <div className="h-2 w-1/2 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-rose-deep transition-all" style={{ width: `${(completed / Math.max(1, planned)) * 100}%` }} /></div>
      </Card>
      <p className="mb-4 text-xs text-muted">Cada serie se guarda automáticamente al marcarla. Calienta 5–10 min y haz 1–2 series de aproximación ligeras en el primer ejercicio.</p>

      <div className="space-y-4">
        {routine.items.map((item, idx) => {
          const ex = getExercise(db, item.exercise_id);
          if (!ex) return null;
          return (
            <ExerciseBlock
              key={item.exercise_id + idx}
              ex={ex}
              item={item}
              workoutId={workoutId}
              date={date}
              sets={sets.filter((s) => s.exercise_id === ex.id).sort((a, b) => a.set_index - b.set_index)}
              onInfo={() => setInfo(ex)}
              onSave={(s) => {
                ensureWorkout();
                upsert("workout_sets", s);
                if (s.completed) startRest(item.rest_s);
              }}
              onDelete={(id) => remove("workout_sets", id)}
            />
          );
        })}
      </div>

      <div className="mt-6">
        <Button size="lg" className="w-full" onClick={() => { ensureWorkout(); setFinish(true); }} disabled={completed === 0}>
          <Check size={18} /> {existing?.finished_at ? "Editar cierre del entrenamiento" : "Finalizar entrenamiento"}
        </Button>
      </div>

      {rest && (
        <div className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-md md:bottom-6">
          <div className="flex items-center gap-3 rounded-full bg-ink p-2 pl-5 text-white shadow-2xl">
            <Timer size={18} className="text-rose" />
            <div className="flex-1">
              <div className="text-[10px] tracking-widest text-white/60 uppercase">Descanso</div>
              <div className="font-mono text-2xl font-bold tabular-nums">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</div>
            </div>
            <button className="h-10 rounded-full bg-white/10 px-3 text-xs font-bold" onClick={() => setRest({ ...rest, end: rest.end + 15000 })}>+15s</button>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-rose text-ink" onClick={() => setRest(null)} aria-label="Saltar descanso"><SkipForward size={16} /></button>
          </div>
        </div>
      )}

      <ExerciseDetail ex={info} open={!!info} onClose={() => setInfo(null)} />
      <FinishSheet
        key={existing?.id ?? "new"}
        open={finish}
        onClose={() => setFinish(false)}
        workout={existing}
        onSave={(patch) => {
          const base = db.workouts.find((w) => w.id === workoutId);
          if (!base) return;
          upsert("workouts", { ...base, ...patch, finished_at: base.finished_at ?? nowISO() });
          setFinish(false);
          void notify("Entrenamiento completado 💪", `${routine.name}: ${completed} series registradas. ¡Buen trabajo!`, "workout-done");
          router.push("/");
        }}
      />
    </div>
  );
}

function ExerciseBlock({ ex, item, workoutId, date, sets, onInfo, onSave, onDelete }: { ex: Exercise; item: RoutineItem; workoutId: string; date: string; sets: WorkoutSet[]; onInfo: () => void; onSave: (s: WorkoutSet) => void; onDelete: (id: string) => void }) {
  const { db } = useStore();
  const sug = useMemo(() => suggestNext(db, ex, item, workoutId), [db, ex, item, workoutId]);
  const [extra, setExtra] = useState(0);
  const n = Math.max(item.sets + extra, ...sets.map((s) => s.set_index + 1));
  const rows = Array.from({ length: n }, (_, i) => sets.find((s) => s.set_index === i) ?? null);
  const isPlank = ex.id === "plancha";

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {ex.images[0] && <img src={ex.images[0]} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />}
        <div className="min-w-0 flex-1">
          <div className="font-bold leading-tight">{ex.name}</div>
          <div className="mt-0.5 text-xs text-muted">
            {item.sets} × {item.rep_min}–{item.rep_max} {isPlank ? "seg" : "reps"}{item.per_side ? " por lado" : ""} · descanso {item.rest_s}s
          </div>
          {item.note && <div className="mt-1 text-xs text-rose-deep">{item.note}</div>}
        </div>
        <button onClick={onInfo} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sand" aria-label="Ver técnica"><Info size={16} /></button>
      </div>
      <div className={cx("mt-3 flex gap-2 rounded-2xl px-3 py-2 text-xs", sug.kind === "increase" ? "bg-good-soft" : sug.kind === "caution" ? "bg-rose-soft" : "bg-sand/60")}>
        {sug.kind === "increase" ? <TrendingUp size={14} className="mt-0.5 shrink-0" /> : sug.kind === "caution" ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <Info size={14} className="mt-0.5 shrink-0" />}
        <span>{sug.message}</span>
      </div>
      <div className="mt-3 grid grid-cols-[1.5rem_1fr_1fr_3.4rem_2.75rem] items-center gap-2 text-[10px] font-semibold tracking-wide text-muted uppercase">
        <span>#</span><span className="text-center">kg</span><span className="text-center">{isPlank ? "seg" : "reps"}</span><span className="text-center">RPE</span><span />
      </div>
      <div className="mt-1 space-y-2">
        {rows.map((s, i) => (
          <SetRow key={s?.id ?? `new-${i}`} index={i} set={s} defaultWeight={sug.weight} defaultReps={item.rep_min} exId={ex.id} workoutId={workoutId} date={date} onSave={onSave} onDelete={onDelete} />
        ))}
      </div>
      <button className="mt-2 flex items-center gap-1 text-xs font-semibold text-muted" onClick={() => setExtra(extra + 1)}><Plus size={14} /> Añadir serie</button>
    </Card>
  );
}

function SetRow({ index, set, defaultWeight, defaultReps, exId, workoutId, date, onSave, onDelete }: { index: number; set: WorkoutSet | null; defaultWeight: number | null; defaultReps: number; exId: string; workoutId: string; date: string; onSave: (s: WorkoutSet) => void; onDelete: (id: string) => void }) {
  const [w, setW] = useState<number | null>(set?.weight_kg ?? defaultWeight ?? null);
  const [r, setR] = useState<number | null>(set?.reps ?? defaultReps);
  const [rpe, setRpe] = useState<number | null>(set?.rpe ?? null);
  const [id] = useState(() => set?.id ?? newId());
  const done = set?.completed ?? false;
  const save = (completed: boolean, patch: Partial<WorkoutSet> = {}) =>
    onSave({ id, workout_id: workoutId, date, exercise_id: exId, set_index: index, weight_kg: w, reps: r, rpe, completed, created_at: set?.created_at ?? nowISO(), ...patch });

  return (
    <div className={cx("grid grid-cols-[1.5rem_1fr_1fr_3.4rem_2.75rem] items-center gap-2 rounded-2xl transition", done && "opacity-90")}>
      <span className="text-sm font-bold text-muted">{index + 1}</span>
      <input aria-label="kg" type="number" inputMode="decimal" step={0.5} value={w ?? ""} onChange={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); setW(v); if (done) save(true, { weight_kg: v }); }} className="h-10 w-full min-w-0 rounded-2xl bg-sand/70 text-center text-base font-bold outline-none focus:bg-sand" />
      <input aria-label="reps" type="number" inputMode="numeric" value={r ?? ""} onChange={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); setR(v); if (done) save(true, { reps: v }); }} className="h-10 w-full min-w-0 rounded-2xl bg-sand/70 text-center text-base font-bold outline-none focus:bg-sand" />
      <select aria-label="RPE" value={rpe ?? ""} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : null; setRpe(v); if (done) save(true, { rpe: v }); }} className="h-10 rounded-2xl bg-sand/70 text-center text-sm font-semibold outline-none">
        <option value="">–</option>
        {[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
      <div className="flex items-center">
        <button
          onClick={() => save(!done)}
          onContextMenu={(e) => { e.preventDefault(); if (set) onDelete(set.id); }}
          aria-label={done ? "Desmarcar serie" : "Completar serie"}
          className={cx("grid h-10 w-10 place-items-center rounded-full transition active:scale-90", done ? "bg-ink text-white" : "border-2 border-sand-deep text-transparent")}
        >
          <Check size={18} />
        </button>
      </div>
      {set && !done && (
        <button className="col-span-5 -mt-1 flex items-center gap-1 justify-self-end text-[11px] text-muted" onClick={() => onDelete(set.id)}><Trash2 size={11} /> eliminar serie</button>
      )}
    </div>
  );
}

function FinishSheet({ open, onClose, workout, onSave }: { open: boolean; onClose: () => void; workout: Workout | null; onSave: (p: Partial<Workout>) => void }) {
  const [rpe, setRpe] = useState<number | null>(workout?.session_rpe ?? null);
  const [feeling, setFeeling] = useState<number | null>(workout?.feeling ?? null);
  const [pain, setPain] = useState(workout?.pain ?? false);
  const [notes, setNotes] = useState(workout?.notes ?? "");
  return (
    <Sheet open={open} onClose={onClose} title="¿Cómo fue el entrenamiento?">
      <div className="space-y-5">
        <div>
          <div className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Esfuerzo de la sesión (RPE 1–10)</div>
          <div className="grid grid-cols-5 gap-2">
            {[5, 6, 7, 8, 9].map((v) => (
              <button key={v} onClick={() => setRpe(v)} className={cx("h-11 rounded-2xl text-sm font-bold", rpe === v ? "bg-ink text-white" : "bg-sand")}>{v}</button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-muted"><span>Cómodo</span><span>Muy duro</span></div>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Sensación general</div>
          <Dots value={feeling} onChange={setFeeling} labels={["Mal", "Excelente"]} />
        </div>
        <button onClick={() => setPain(!pain)} className={cx("flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold", pain ? "bg-rose-soft text-rose-deep" : "bg-sand/60")}>
          ¿Hubo dolor o molestias?
          <span>{pain ? "Sí" : "No"}</span>
        </button>
        {pain && <p className="text-xs text-rose-deep">La próxima sesión te sugeriremos no subir carga. Si el dolor persiste o es agudo, consulta con un profesional de la salud. No entrenes con dolor.</p>}
        <Textarea placeholder="Notas (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button size="lg" className="w-full" onClick={() => onSave({ session_rpe: rpe, feeling, pain, notes })}>Guardar y terminar</Button>
      </div>
    </Sheet>
  );
}
