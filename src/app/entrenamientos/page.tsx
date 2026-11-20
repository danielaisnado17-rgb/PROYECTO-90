"use client";
import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, ArrowDown, ChevronRight, Pencil, Plus, Trash2, Waves, Leaf, Search, Play } from "lucide-react";
import { useStore, newId } from "@/lib/store";
import { addDays, dowLong, fmtShort, todayISO, weekStart } from "@/lib/dates";
import { allExercises, getExercise, planFor } from "@/lib/program";
import type { DayPlan, Exercise, Routine, RoutineItem } from "@/lib/types";
import { Badge, Button, Card, Chip, Empty, Field, Input, LinkButton, NumInput, PageHeader, Segmented, Select, Sheet, Textarea, confirmDelete, cx } from "@/components/ui";
import { ExerciseDetail } from "@/components/ExerciseDetail";

type Tab = "semana" | "rutinas" | "biblioteca" | "historial";

export default function Page() {
  return (
    <Suspense>
      <Entrenamientos />
    </Suspense>
  );
}

function Entrenamientos() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as Tab) || "semana";
  return (
    <div className="rise">
      <PageHeader title="Entrenamientos" subtitle="4 días de fuerza · natación el fin de semana · miércoles de recuperación" />
      <Segmented<Tab>
        value={tab}
        onChange={(v) => router.replace(`/entrenamientos?tab=${v}`)}
        options={[
          { v: "semana", label: "Mi semana" },
          { v: "rutinas", label: "Rutinas" },
          { v: "biblioteca", label: "Biblioteca" },
          { v: "historial", label: "Historial" },
        ]}
        className="mb-6 w-fit max-w-full"
      />
      {tab === "semana" && <Week />}
      {tab === "rutinas" && <Routines />}
      {tab === "biblioteca" && <Library />}
      {tab === "historial" && <History />}
    </div>
  );
}

const ORDER = [1, 2, 3, 4, 5, 6, 0];
const colorCls: Record<Routine["color"], string> = { rose: "bg-rose", sand: "bg-sand-deep/70", stone: "bg-peach", ink: "bg-ink text-white" };

function Week() {
  const { db, profile, upsert } = useStore();
  const [edit, setEdit] = useState(false);
  if (!profile) return null;
  const today = todayISO();
  const ws = weekStart(today);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((wd, i) => {
          const date = addDays(ws, i);
          const plan = planFor(profile, date);
          const r = plan.type === "workout" ? db.routines.find((x) => x.id === plan.routine_id) : null;
          const done = plan.type === "workout" ? db.workouts.some((w) => w.date === date && w.finished_at) : plan.type === "swim" ? db.swim_sessions.some((s) => s.date === date) : false;
          const isToday = date === today;
          return (
            <div key={wd} className={cx("flex min-h-40 flex-col rounded-[1.5rem] p-5", r ? colorCls[r.color] : plan.type === "swim" ? "bg-[#dfe6f7]" : "bg-surface border border-line", isToday && "ring-2 ring-ink ring-offset-2 ring-offset-bg")}>
              <div className="flex items-center justify-between">
                <Badge tone={isToday ? "ink" : "sand"}>{isToday ? "Hoy" : `${dowLong(wd).slice(0, 3)} ${fmtShort(date)}`}</Badge>
                {done && <Badge tone="good">✓ Hecho</Badge>}
              </div>
              <div className="mt-3 text-xs font-semibold tracking-wide uppercase opacity-60">{dowLong(wd)}</div>
              <div className="text-xl leading-tight font-extrabold">{r ? r.name : plan.type === "swim" ? "Natación" : "Recuperación"}</div>
              <div className="mt-1 text-xs opacity-70">{r ? `${r.items.length} ejercicios · ~60 min` : plan.type === "swim" ? "1 hora · intensidad libre" : "Movilidad y descanso"}</div>
              <div className="mt-auto pt-4">
                {r ? (
                  <Link href={`/entrenamientos/sesion?r=${r.id}`} className={cx("inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-bold", r.color === "ink" ? "bg-surface text-ink" : "bg-ink text-white")}>
                    <Play size={12} /> {done ? "Ver / editar" : "Abrir rutina"}
                  </Link>
                ) : plan.type === "swim" ? (
                  <Link href="/habitos?tab=natacion" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-xs font-bold text-white"><Waves size={12} /> Registrar</Link>
                ) : (
                  <Link href="/habitos" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-sand px-4 text-xs font-bold"><Leaf size={12} /> Check-in</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Button variant="outline" className="mt-5" onClick={() => setEdit(true)}><Pencil size={14} /> Editar días de entrenamiento</Button>
      <Sheet open={edit} onClose={() => setEdit(false)} title="Planificación semanal">
        <div className="space-y-3">
          {ORDER.map((wd) => {
            const plan = profile.schedule[String(wd)] ?? { type: "rest" };
            const value = plan.type === "workout" ? plan.routine_id : plan.type;
            return (
              <Field key={wd} label={dowLong(wd)}>
                <Select
                  value={value}
                  onChange={(e) => {
                    const v = e.target.value;
                    const next: DayPlan = v === "swim" ? { type: "swim" } : v === "rest" ? { type: "rest" } : { type: "workout", routine_id: v };
                    upsert("profiles", { ...profile, schedule: { ...profile.schedule, [String(wd)]: next } });
                  }}
                >
                  {db.routines.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  <option value="swim">Natación</option>
                  <option value="rest">Recuperación</option>
                </Select>
              </Field>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}

function Routines() {
  const { db, upsert, remove } = useStore();
  const [editing, setEditing] = useState<Routine | null>(null);
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {db.routines.map((r) => (
          <Card key={r.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={cx("mb-2 h-1.5 w-10 rounded-full", colorCls[r.color].split(" ")[0])} />
                <div className="text-lg font-extrabold">{r.name}</div>
                <div className="text-xs text-muted">{r.focus}</div>
              </div>
              <Button size="sm" variant="soft" onClick={() => setEditing(structuredClone(r))}><Pencil size={13} /> Editar</Button>
            </div>
            <div className="mt-4 divide-y divide-line">
              {r.items.map((it, i) => {
                const ex = getExercise(db, it.exercise_id);
                return (
                  <div key={i} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium">{ex?.name ?? it.exercise_id}</span>
                    <span className="text-xs text-muted">{it.sets}×{it.rep_min}–{it.rep_max}{it.per_side ? "/lado" : ""} · {it.rest_s}s</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <LinkButton href={`/entrenamientos/sesion?r=${r.id}`} className="h-9 text-xs"><Play size={12} /> Entrenar ahora</LinkButton>
            </div>
          </Card>
        ))}
      </div>
      <Button className="mt-5" onClick={() => setEditing({ id: newId(), name: "Nueva rutina", focus: "", color: "sand", items: [] })}><Plus size={16} /> Nueva rutina</Button>
      {editing && (
        <RoutineEditor
          routine={editing}
          onClose={() => setEditing(null)}
          onSave={(r) => { upsert("routines", r); setEditing(null); }}
          onDelete={db.routines.some((x) => x.id === editing.id) ? () => { if (confirmDelete("esta rutina")) { remove("routines", editing.id); setEditing(null); } } : undefined}
        />
      )}
    </>
  );
}

function RoutineEditor({ routine, onClose, onSave, onDelete }: { routine: Routine; onClose: () => void; onSave: (r: Routine) => void; onDelete?: () => void }) {
  const { db } = useStore();
  const [r, setR] = useState(routine);
  const [picker, setPicker] = useState(false);
  const exs = allExercises(db);
  const setItem = (i: number, p: Partial<RoutineItem>) => setR({ ...r, items: r.items.map((it, j) => (j === i ? { ...it, ...p } : it)) });
  const move = (i: number, d: -1 | 1) => {
    const items = [...r.items];
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    setR({ ...r, items });
  };
  const sets = r.items.reduce((a, i) => a + i.sets, 0);
  return (
    <Sheet open onClose={onClose} title="Editar rutina" wide>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nombre" className="sm:col-span-2"><Input value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} /></Field>
        <Field label="Color">
          <Select value={r.color} onChange={(e) => setR({ ...r, color: e.target.value as Routine["color"] })}>
            <option value="rose">Rosa</option><option value="sand">Arena</option><option value="stone">Gris azulado</option><option value="ink">Negro</option>
          </Select>
        </Field>
        <Field label="Enfoque" className="sm:col-span-3"><Input value={r.focus} onChange={(e) => setR({ ...r, focus: e.target.value })} /></Field>
      </div>
      <div className={cx("mt-4 rounded-2xl px-4 py-2 text-xs", sets > 24 ? "bg-peach-soft" : "bg-sand/60")}>
        {r.items.length} ejercicios · {sets} series totales{sets > 24 ? " — puede ser demasiado para 60 min; considera quitar algo." : " — adecuado para ~60 min."}
      </div>
      <div className="mt-4 space-y-3">
        {r.items.map((it, i) => {
          const ex = exs.find((e) => e.id === it.exercise_id);
          return (
            <div key={i} className="rounded-3xl border border-line p-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 font-bold">{ex?.name ?? it.exercise_id}</div>
                <button onClick={() => move(i, -1)} className="grid h-8 w-8 place-items-center rounded-full bg-sand" aria-label="Subir"><ArrowUp size={14} /></button>
                <button onClick={() => move(i, 1)} className="grid h-8 w-8 place-items-center rounded-full bg-sand" aria-label="Bajar"><ArrowDown size={14} /></button>
                <button onClick={() => setR({ ...r, items: r.items.filter((_, j) => j !== i) })} className="grid h-8 w-8 place-items-center rounded-full text-rose-deep" aria-label="Quitar"><Trash2 size={14} /></button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                <Field label="Series"><NumInput value={it.sets} onChange={(v) => setItem(i, { sets: v ?? 1 })} /></Field>
                <Field label="Reps mín"><NumInput value={it.rep_min} onChange={(v) => setItem(i, { rep_min: v ?? 1 })} /></Field>
                <Field label="Reps máx"><NumInput value={it.rep_max} onChange={(v) => setItem(i, { rep_max: v ?? 1 })} /></Field>
                <Field label="Descanso s"><NumInput value={it.rest_s} step={15} onChange={(v) => setItem(i, { rest_s: v ?? 60 })} /></Field>
                <Field label="Peso obj. kg"><NumInput value={it.target_weight_kg} step={0.5} onChange={(v) => setItem(i, { target_weight_kg: v })} /></Field>
                <Field label="Por lado">
                  <Select value={it.per_side ? "1" : "0"} onChange={(e) => setItem(i, { per_side: e.target.value === "1" })}><option value="0">No</option><option value="1">Sí</option></Select>
                </Field>
              </div>
            </div>
          );
        })}
      </div>
      <Button variant="soft" className="mt-3" onClick={() => setPicker(true)}><Plus size={14} /> Añadir ejercicio</Button>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => onSave(r)}>Guardar rutina</Button>
        {onDelete && <Button variant="danger" onClick={onDelete}><Trash2 size={14} /> Eliminar</Button>}
      </div>
      <Sheet open={picker} onClose={() => setPicker(false)} title="Elegir ejercicio">
        <ExercisePicker onPick={(e) => { setR({ ...r, items: [...r.items, { exercise_id: e.id, sets: 3, rep_min: 8, rep_max: 12, rest_s: 90, target_weight_kg: null }] }); setPicker(false); }} />
      </Sheet>
    </Sheet>
  );
}

function ExercisePicker({ onPick }: { onPick: (e: Exercise) => void }) {
  const { db } = useStore();
  const [q, setQ] = useState("");
  const list = allExercises(db).filter((e) => (e.name + e.primary_muscle).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Input placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="mt-3 max-h-[55vh] space-y-1 overflow-y-auto">
        {list.map((e) => (
          <button key={e.id} onClick={() => onPick(e)} className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left hover:bg-sand/60">
            <span><span className="block text-sm font-semibold">{e.name}</span><span className="text-xs text-muted">{e.primary_muscle}</span></span>
            <ChevronRight size={16} className="text-muted" />
          </button>
        ))}
      </div>
    </>
  );
}

const GROUPS = ["Todos", "Glúteos", "Femorales", "Cuádriceps", "Espalda", "Hombros", "Brazos", "Abdomen"];
const groupOf = (e: Exercise) => {
  const m = e.primary_muscle.toLowerCase();
  if (m.includes("glúteo")) return "Glúteos";
  if (m.includes("femoral")) return "Femorales";
  if (m.includes("cuádriceps")) return "Cuádriceps";
  if (m.includes("dorsal") || m.includes("espalda")) return "Espalda";
  if (m.includes("deltoides")) return "Hombros";
  if (m.includes("bíceps") || m.includes("tríceps") || m.includes("braquial")) return "Brazos";
  if (m.includes("core") || m.includes("abdominal")) return "Abdomen";
  return "Otros";
};

function Library() {
  const { db, upsert } = useStore();
  const [g, setG] = useState("Todos");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Exercise | null>(null);
  const [create, setCreate] = useState(false);
  const list = useMemo(() => allExercises(db).filter((e) => (g === "Todos" || groupOf(e) === g) && e.name.toLowerCase().includes(q.toLowerCase())), [db, g, q]);
  return (
    <>
      <div className="relative mb-3 max-w-md">
        <Search size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <Input className="pl-10" placeholder="Buscar ejercicio" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {GROUPS.map((x) => <Chip key={x} active={g === x} onClick={() => setG(x)}>{x}</Chip>)}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {list.map((e) => (
          <button key={e.id} onClick={() => setSel(e)} className="overflow-hidden rounded-[1.5rem] border border-line bg-surface text-left transition hover:-translate-y-0.5">
            {e.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.images[0]} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="grid aspect-[4/3] place-items-center bg-sand text-xs text-muted">Personalizado</div>
            )}
            <div className="p-3">
              <div className="text-sm leading-tight font-bold">{e.name}</div>
              <div className="mt-1 text-xs text-muted">{e.primary_muscle}</div>
            </div>
          </button>
        ))}
      </div>
      <Button variant="outline" className="mt-5" onClick={() => setCreate(true)}><Plus size={14} /> Crear ejercicio personalizado</Button>
      <ExerciseDetail ex={sel} open={!!sel} onClose={() => setSel(null)} />
      <CustomExercise open={create} onClose={() => setCreate(false)} onSave={(e) => { upsert("exercises", e); setCreate(false); }} />
    </>
  );
}

function CustomExercise({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (e: Exercise) => void }) {
  const [f, setF] = useState({ name: "", primary: "", secondary: "", equipment: "", start: "", steps: "", tech: "", mistakes: "", safety: "", inc: 1 as number | null });
  const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
  return (
    <Sheet open={open} onClose={onClose} title="Nuevo ejercicio">
      <div className="space-y-3">
        <Field label="Nombre"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Músculo principal"><Input value={f.primary} onChange={(e) => setF({ ...f, primary: e.target.value })} placeholder="Glúteos" /></Field>
          <Field label="Secundarios (coma)"><Input value={f.secondary} onChange={(e) => setF({ ...f, secondary: e.target.value })} /></Field>
          <Field label="Equipo"><Input value={f.equipment} onChange={(e) => setF({ ...f, equipment: e.target.value })} /></Field>
          <Field label="Incremento kg"><NumInput value={f.inc} step={0.5} onChange={(v) => setF({ ...f, inc: v })} /></Field>
        </div>
        <Field label="Posición inicial"><Textarea value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
        <Field label="Ejecución (un paso por línea)"><Textarea value={f.steps} onChange={(e) => setF({ ...f, steps: e.target.value })} /></Field>
        <Field label="Técnica (una por línea)"><Textarea value={f.tech} onChange={(e) => setF({ ...f, tech: e.target.value })} /></Field>
        <Field label="Errores frecuentes (uno por línea)"><Textarea value={f.mistakes} onChange={(e) => setF({ ...f, mistakes: e.target.value })} /></Field>
        <Field label="Seguridad"><Input value={f.safety} onChange={(e) => setF({ ...f, safety: e.target.value })} /></Field>
        <Button
          className="w-full"
          disabled={!f.name.trim()}
          onClick={() =>
            onSave({
              id: "cx_" + newId().slice(0, 8), name: f.name.trim(), primary_muscle: f.primary || "—", secondary_muscles: f.secondary.split(",").map((x) => x.trim()).filter(Boolean),
              equipment: f.equipment, start_position: f.start, instructions: lines(f.steps), technique: lines(f.tech), common_mistakes: lines(f.mistakes), safety: f.safety || "—",
              images: [], media_source: "Sin imagen (ejercicio personalizado)", video_url: null, increment_kg: f.inc ?? 1, is_custom: true,
            })
          }
        >
          Guardar ejercicio
        </Button>
      </div>
    </Sheet>
  );
}

function History() {
  const { db, remove } = useStore();
  const list = [...db.workouts].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (!list.length) return <Empty title="Aún no hay entrenamientos" text="Cuando completes tu primera sesión aparecerá aquí." />;
  return (
    <div className="space-y-3">
      {list.map((w) => {
        const sets = db.workout_sets.filter((s) => s.workout_id === w.id && s.completed);
        const vol = sets.reduce((a, s) => a + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);
        return (
          <Card key={w.id} className="flex items-center gap-4 py-4">
            <div className="w-14 text-center">
              <div className="text-xl font-extrabold">{Number(w.date.slice(8))}</div>
              <div className="text-[10px] text-muted uppercase">{fmtShort(w.date).split(" ")[1]}</div>
            </div>
            <div className="flex-1">
              <div className="font-bold">{w.routine_name}</div>
              <div className="text-xs text-muted">{sets.length} series · {Math.round(vol)} kg de volumen{w.session_rpe ? ` · RPE ${w.session_rpe}` : ""}{w.pain ? " · molestias registradas" : ""}{!w.finished_at ? " · sin finalizar" : ""}</div>
            </div>
            <Link href={`/entrenamientos/sesion?r=${w.routine_id}&w=${w.id}`} className="grid h-9 w-9 place-items-center rounded-full bg-sand" aria-label="Editar"><Pencil size={14} /></Link>
            <button
              className="grid h-9 w-9 place-items-center rounded-full text-rose-deep"
              aria-label="Eliminar"
              onClick={() => {
                if (!confirmDelete("este entrenamiento y sus series")) return;
                sets.concat(db.workout_sets.filter((s) => s.workout_id === w.id && !s.completed)).forEach((s) => remove("workout_sets", s.id));
                remove("workouts", w.id);
              }}
            >
              <Trash2 size={14} />
            </button>
          </Card>
        );
      })}
    </div>
  );
}
