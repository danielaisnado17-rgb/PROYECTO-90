"use client";
import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, FileText, Trophy, AlertCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { addDays, fmtShort, todayISO, weekStart } from "@/lib/dates";
import { currentGoal, sumLogs } from "@/lib/nutrition";
import { allExercises, getExercise, planFor } from "@/lib/program";
import { strengthSummary } from "@/lib/progression";
import { currentBlock } from "@/lib/reports";
import { METRICS } from "@/lib/metrics";
import type { LoadReference, LoadType } from "@/lib/types";
import { Badge, Button, Card, Chip, Disclaimer, Empty, Field, Input, NumInput, PageHeader, SectionTitle, Segmented, Select, Stat, Textarea, cx } from "@/components/ui";
import { DailyBars, TrendChart } from "@/components/charts";

type Tab = "fuerza" | "estadisticas" | "informes" | "referencias";

export default function Page() {
  return (
    <Suspense>
      <Progreso />
    </Suspense>
  );
}

function Progreso() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as Tab) || "fuerza";
  return (
    <div className="rise">
      <PageHeader title="Progreso" subtitle="Sólo datos reales: lo que registras es lo que ves" />
      <Segmented<Tab> value={tab} onChange={(v) => router.replace(`/progreso?tab=${v}`)} options={[{ v: "fuerza", label: "Mi fuerza" }, { v: "estadisticas", label: "Estadísticas" }, { v: "informes", label: "Informes" }, { v: "referencias", label: "Pesos de referencia" }]} className="mb-6 w-fit max-w-full" />
      {tab === "fuerza" && <Strength />}
      {tab === "estadisticas" && <Stats />}
      {tab === "informes" && <Reports />}
      {tab === "referencias" && <References />}
    </div>
  );
}

// ─────────────────────────── MI PROGRESO DE FUERZA ───────────────────────────
function Strength() {
  const { db } = useStore();
  const trained = useMemo(() => {
    const ids = [...new Set(db.workout_sets.filter((s) => s.completed).map((s) => s.exercise_id))];
    return ids.map((id) => ({ ex: getExercise(db, id), s: strengthSummary(db, id) })).filter((x) => x.ex && x.s) as { ex: NonNullable<ReturnType<typeof getExercise>>; s: NonNullable<ReturnType<typeof strengthSummary>> }[];
  }, [db]);
  const [sel, setSel] = useState<string | null>(null);
  const cur = trained.find((t) => t.ex.id === sel) ?? trained[0];
  if (!trained.length) return <Empty icon={<Trophy size={28} />} title="Mi progreso de fuerza" text="Aquí verás peso inicial, actual, mejor marca e historial de cada ejercicio en cuanto registres tus primeras series." action={<Link href="/entrenamientos" className="text-sm font-semibold underline">Ir a entrenar</Link>} />;

  // Evolución semanal: mejor 1RM estimado por semana
  const weekly = new Map<string, number>();
  for (const p of cur.s.points) { const w = weekStart(p.date); weekly.set(w, Math.max(weekly.get(w) ?? 0, p.e1rm)); }
  const weeklyData = [...weekly.entries()].sort().map(([date, value]) => ({ date, value, label: `Semana del ${fmtShort(date)}` }));
  const ref = db.load_references.find((r) => r.exercise_id === cur.ex.id);

  return (
    <>
      <h2 className="mb-3 text-xs font-bold tracking-[.25em] text-muted uppercase">Mi progreso de fuerza</h2>
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto pb-1">
        {trained.map((t) => <Chip key={t.ex.id} active={cur.ex.id === t.ex.id} onClick={() => setSel(t.ex.id)} className="shrink-0">{t.ex.name}</Chip>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card tone="ink" className="lg:col-span-1">
          <div className="text-lg font-extrabold">{cur.ex.name}</div>
          <div className="text-xs text-white/60">{cur.s.points.length} sesión(es) registradas</div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div><div className="text-xs text-white/50">Peso inicial</div><div className="text-2xl font-extrabold">{cur.s.first.top_weight} <span className="text-sm">kg</span></div><div className="text-[11px] text-white/50">× {cur.s.first.top_reps} reps</div></div>
            <div><div className="text-xs text-white/50">Peso actual</div><div className="text-2xl font-extrabold">{cur.s.last.top_weight} <span className="text-sm">kg</span></div><div className="text-[11px] text-white/50">× {cur.s.last.top_reps} reps</div></div>
            <div className="col-span-2 rounded-2xl bg-white/10 p-3"><div className="flex items-center gap-1.5 text-xs text-rose"><Trophy size={13} /> Mejor marca</div><div className="text-xl font-extrabold">{cur.s.best.top_weight} kg × {cur.s.best.top_reps}</div><div className="text-[11px] text-white/50">{fmtShort(cur.s.best.date)} · 1RM estimado {cur.s.best.e1rm} kg</div></div>
          </div>
          {ref && !ref.validated && <p className="mt-4 text-xs text-rose">Referencia inicial {ref.weight_kg} kg pendiente de validar.</p>}
          <p className="mt-4 text-[11px] text-white/50">El 1RM estimado (Epley) sirve para ver tendencias; no es una prueba de máximo.</p>
        </Card>
        <Card className="lg:col-span-2">
          <div className="text-sm font-bold">Evolución semanal (1RM estimado)</div>
          {weeklyData.length >= 2 ? <TrendChart data={weeklyData} unit="kg" height={200} /> : <p className="mt-3 text-sm text-muted">Aparecerá con datos de al menos dos semanas.</p>}
          <div className="mt-4 text-sm font-bold">Peso de la mejor serie por sesión</div>
          {cur.s.points.length >= 2 ? <TrendChart data={cur.s.points.map((p) => ({ date: p.date, value: p.top_weight }))} unit="kg" height={160} /> : <p className="mt-2 text-sm text-muted">Necesitas 2 sesiones.</p>}
        </Card>
      </div>
      <SectionTitle>Historial</SectionTitle>
      <div className="overflow-x-auto rounded-[1.5rem] border border-line bg-surface">
        <table className="w-full min-w-[520px] text-sm">
          <thead><tr className="border-b border-line text-left text-[10px] tracking-wide text-muted uppercase"><th className="px-4 py-3">Fecha</th><th>Series (kg × reps @RPE)</th><th className="px-4 text-right">Volumen</th></tr></thead>
          <tbody>
            {[...cur.s.points].reverse().map((p) => (
              <tr key={p.date + p.volume} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-semibold">{fmtShort(p.date)}</td>
                <td className="py-3"><div className="flex flex-wrap gap-1">{p.sets.map((s) => <span key={s.id} className="rounded-full bg-sand px-2 py-0.5 text-xs">{s.weight_kg ?? 0}×{s.reps ?? 0}{s.rpe ? ` @${s.rpe}` : ""}</span>)}</div></td>
                <td className="px-4 py-3 text-right">{Math.round(p.volume)} kg</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SectionTitle>Resumen de todos los ejercicios</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {trained.map((t) => {
          const diff = Math.round((t.s.last.top_weight - t.s.first.top_weight) * 10) / 10;
          return (
            <button key={t.ex.id} onClick={() => setSel(t.ex.id)} className="card p-4 text-left">
              <div className="font-bold">{t.ex.name}</div>
              <div className="mt-2 flex items-end justify-between">
                <div className="text-xs text-muted">{t.s.first.top_weight} → <b className="text-ink">{t.s.last.top_weight} kg</b></div>
                <Badge tone={diff > 0 ? "good" : "sand"}>{diff > 0 ? "+" : ""}{diff} kg</Badge>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─────────────────────────── Estadísticas ───────────────────────────
function Stats() {
  const { db, profile } = useStore();
  const [metric, setMetric] = useState<(typeof METRICS)[number]["k"]>("weight_kg");
  const [range, setRange] = useState<"14" | "30" | "90">("30");
  const today = todayISO();
  const data = useMemo(() => {
    if (!profile) return null;
    const from = addDays(today, -Number(range) + 1);
    const dates = [...new Set(db.food_logs.filter((l) => l.date >= from).map((l) => l.date))].sort();
    const protein = dates.map((d) => ({ date: d, value: Math.round(sumLogs(db.food_logs.filter((l) => l.date === d)).protein_g) }));
    const kcal = dates.map((d) => ({ date: d, value: Math.round(sumLogs(db.food_logs.filter((l) => l.date === d)).kcal) }));
    const meas = [...db.body_measurements].sort((a, b) => (a.date < b.date ? -1 : 1)).filter((m) => m[metric] != null).map((m) => ({ date: m.date, value: m[metric] as number }));
    // Cumplimiento semanal de entrenamientos desde el inicio
    const weeks: { date: string; value: number; label: string }[] = [];
    for (let w = weekStart(profile.start_date); w <= today; w = addDays(w, 7)) {
      let planned = 0;
      for (let i = 0; i < 7; i++) { const d = addDays(w, i); if (d >= profile.start_date && d <= today && planFor(profile, d).type === "workout") planned++; }
      const done = db.workouts.filter((x) => x.finished_at && x.date >= w && x.date < addDays(w, 7)).length;
      if (planned) weeks.push({ date: w, value: Math.round((done / planned) * 100), label: `Semana del ${fmtShort(w)} · ${done}/${planned}` });
    }
    const water = dates.length ? Math.round(dates.reduce((a, d) => a + db.hydration_logs.filter((h) => h.date === d).reduce((x, h) => x + h.ml, 0), 0) / dates.length) : null;
    return { protein, kcal, meas, weeks, water };
  }, [db, profile, today, range, metric]);
  if (!profile || !data) return null;
  const g = currentGoal(db, today);
  const info = METRICS.find((m) => m.k === metric)!;
  return (
    <>
      <Segmented value={range} onChange={setRange} options={[{ v: "14", label: "14 días" }, { v: "30", label: "30 días" }, { v: "90", label: "90 días" }]} className="mb-4 w-fit" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card><div className="text-sm font-bold">Proteína diaria</div>{data.protein.length ? <DailyBars data={data.protein} target={g?.protein_g} unit="g" /> : <p className="mt-3 text-sm text-muted">Sin registros en este periodo.</p>}</Card>
        <Card><div className="text-sm font-bold">Consumo energético</div>{data.kcal.length ? <DailyBars data={data.kcal} target={g?.kcal} unit="kcal" /> : <p className="mt-3 text-sm text-muted">Sin registros en este periodo.</p>}</Card>
        <Card>
          <div className="text-sm font-bold">Evolución de medidas</div>
          <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">{METRICS.map((m) => <Chip key={m.k} active={metric === m.k} onClick={() => setMetric(m.k)} className="h-8 shrink-0 text-xs">{m.l.split(" ")[0]}</Chip>)}</div>
          {data.meas.length >= 2 ? <TrendChart data={data.meas} unit={info.u} /> : <p className="mt-3 text-sm text-muted">{data.meas.length} registro(s). Se necesitan 2 para el gráfico.</p>}
        </Card>
        <Card><div className="text-sm font-bold">Cumplimiento de entrenamientos por semana</div>{data.weeks.length ? <DailyBars data={data.weeks} target={100} unit="%" /> : <p className="mt-3 text-sm text-muted">Aún no hay semanas registradas.</p>}</Card>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card><Stat label="Entrenamientos" value={db.workouts.filter((w) => w.finished_at).length} /></Card>
        <Card><Stat label="Natación" value={db.swim_sessions.length} unit="sesiones" /></Card>
        <Card><Stat label="Días cerrados" value={db.day_closures.length} /></Card>
        <Card><Stat label="Agua promedio" value={data.water != null ? (data.water / 1000).toFixed(2) : "–"} unit="L/día" sub="en días con registro" /></Card>
      </div>
      <p className="mt-3 text-xs text-muted">Las tendencias de sueño, energía y hábitos están en Hábitos → Tendencias.</p>
    </>
  );
}

// ─────────────────────────── Informes ───────────────────────────
function Reports() {
  const { profile } = useStore();
  if (!profile) return null;
  const cb = currentBlock(profile);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => i + 1).map((b) => {
          const available = b <= cb;
          return (
            <Link key={b} href={available ? `/progreso/informe?b=${b}` : "#"} className={cx("card flex items-center gap-4 p-5", !available && "pointer-events-none opacity-50")}>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sand"><FileText size={20} /></div>
              <div className="flex-1">
                <div className="font-bold">Informe quincenal {b}</div>
                <div className="text-xs text-muted">Días {(b - 1) * 15 + 1}–{b * 15}{b === cb ? " · en curso" : b < cb ? " · cerrado" : ""}</div>
              </div>
            </Link>
          );
        })}
      </div>
      <Link href="/progreso/informe?b=final" className="mt-4 flex items-center gap-4 rounded-[1.5rem] bg-ink p-6 text-white">
        <Trophy className="text-rose" />
        <div className="flex-1"><div className="text-lg font-extrabold">Informe integral de 90 días</div><div className="text-xs text-white/60">Se completa al terminar el programa; puedes ver el avance parcial en cualquier momento.</div></div>
      </Link>
    </>
  );
}

// ─────────────────────────── Referencias de carga ───────────────────────────
const LOAD_TYPES: { v: LoadType; l: string }[] = [
  { v: "total", l: "Peso total (barra + discos)" },
  { v: "discos", l: "Sólo los discos (sin contar la barra)" },
  { v: "por_lado", l: "Por cada lado de la barra" },
  { v: "maquina", l: "Placas de máquina / polea" },
  { v: "mancuerna_c_u", l: "Cada mancuerna" },
];
function References() {
  const { db, upsert } = useStore();
  return (
    <>
      <Disclaimer>Pesos iniciales aproximados que indicaste. Antes de usarlos para progresar, confirma: ¿10 kg era el peso total, sólo los discos o cada lado? ¿Qué barra o equipo usaste? Así no se asume nada.</Disclaimer>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {db.load_references.map((r) => <RefCard key={r.id} r={r} name={getExercise(db, r.exercise_id)?.name ?? r.exercise_id} onSave={(x) => upsert("load_references", x)} />)}
      </div>
      {!db.load_references.length && <Empty title="Sin referencias" />}
      <p className="mt-4 text-xs text-muted">Ejercicios en la biblioteca: {allExercises(db).length}.</p>
    </>
  );
}
function RefCard({ r, name, onSave }: { r: LoadReference; name: string; onSave: (r: LoadReference) => void }) {
  const [x, setX] = useState(r);
  const total = x.load_type === "total" ? x.weight_kg : x.load_type === "discos" && x.bar_weight_kg != null ? x.weight_kg + x.bar_weight_kg : x.load_type === "por_lado" && x.bar_weight_kg != null ? x.weight_kg * 2 + x.bar_weight_kg : null;
  return (
    <Card tone={r.validated ? "surface" : "rose"}>
      <div className="flex items-center justify-between">
        <div className="text-lg font-extrabold">{name}</div>
        {r.validated ? <Badge tone="good"><Check size={11} /> Validado</Badge> : <Badge tone="warn"><AlertCircle size={11} /> Pendiente</Badge>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Peso indicado (kg)"><NumInput value={x.weight_kg} step={0.5} onChange={(v) => setX({ ...x, weight_kg: v ?? 0 })} /></Field>
        <Field label="Peso de la barra (kg)" hint="Si aplica (p. ej. 20, 15, 10)"><NumInput value={x.bar_weight_kg} step={0.5} onChange={(v) => setX({ ...x, bar_weight_kg: v })} /></Field>
        <Field label="¿Qué representa?" className="col-span-2"><Select value={x.load_type ?? ""} onChange={(e) => setX({ ...x, load_type: (e.target.value || null) as LoadType | null })}><option value="">Elegir…</option>{LOAD_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</Select></Field>
        <Field label="Equipo utilizado" className="col-span-2"><Input value={x.equipment} placeholder="Barra olímpica, Smith, máquina…" onChange={(e) => setX({ ...x, equipment: e.target.value })} /></Field>
      </div>
      {total != null && <p className="mt-2 text-sm">Carga total equivalente: <b>{total} kg</b></p>}
      <Textarea className="mt-3" value={x.notes} onChange={(e) => setX({ ...x, notes: e.target.value })} />
      <Button className="mt-3" disabled={!x.load_type || !x.equipment} onClick={() => onSave({ ...x, validated: true })}>Guardar y validar</Button>
    </Card>
  );
}

