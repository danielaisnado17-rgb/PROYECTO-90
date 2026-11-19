"use client";
import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { useStore } from "@/lib/store";
import { dayNumber, fmtShort, PROGRAM_DAYS, todayISO } from "@/lib/dates";
import { r0 } from "@/lib/nutrition";
import { blockReport, bodyInsights, currentBlock, type BlockReport } from "@/lib/reports";
import { getExercise, improvedExercisesIn } from "@/lib/program";
import { strengthSummary } from "@/lib/progression";
import { METRICS } from "@/lib/metrics";
import { Badge, Button, Card, Disclaimer } from "@/components/ui";
import { PhotoImg } from "@/components/PhotoImg";

export default function Page() {
  return (
    <Suspense>
      <Informe />
    </Suspense>
  );
}

const fmt = (v: number | null | undefined, d = 0, u = "") => (v == null ? "Sin datos" : `${d ? v.toFixed(d) : Math.round(v)}${u}`);

function Informe() {
  const params = useSearchParams();
  const { db, profile } = useStore();
  const b = params.get("b") ?? "1";
  const isFinal = b === "final";
  const data = useMemo(() => {
    if (!profile) return null;
    const upto = isFinal ? currentBlock(profile) : Number(b);
    const blocks = isFinal ? Array.from({ length: upto }, (_, i) => blockReport(db, profile, i + 1)) : [blockReport(db, profile, Number(b))];
    return { blocks };
  }, [db, profile, b, isFinal]);
  if (!profile || !data) return null;
  const day = dayNumber(profile.start_date);

  return (
    <div className="rise mx-auto max-w-4xl">
      <div className="no-print mb-6 flex items-center justify-between">
        <Link href="/progreso?tab=informes" className="flex items-center gap-2 text-sm font-semibold"><ArrowLeft size={16} /> Informes</Link>
        <Button variant="outline" onClick={() => window.print()}><Printer size={16} /> Imprimir / PDF</Button>
      </div>
      <div className="mb-8">
        <div className="text-xs font-bold tracking-[.3em] text-muted uppercase">Project 90 · {profile.name || "Informe"}</div>
        <h1 className="mt-1 text-4xl font-extrabold tracking-tight">{isFinal ? <>Informe integral <span className="font-serif font-normal italic">90 días</span></> : `Informe quincenal ${b}`}</h1>
        <p className="mt-1 text-sm text-muted">Generado el {fmtShort(todayISO())} · día {Math.min(day, PROGRAM_DAYS)} del programa{isFinal && day < PROGRAM_DAYS ? " · el programa aún no termina: este es un avance parcial" : ""}.</p>
      </div>

      {isFinal ? <FinalSummary /> : null}
      {data.blocks.map((r) => <Block key={r.block} r={r} compact={isFinal} />)}
      <Disclaimer>Este informe sólo usa datos que registraste. Los valores nutricionales son estimaciones. No es un informe médico; compártelo con tu nutricionista o entrenador/a para tomar decisiones.</Disclaimer>
    </div>
  );
}

function Block({ r, compact }: { r: BlockReport; compact?: boolean }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xl font-extrabold">Días {r.fromDay}–{r.toDay}</h2>
        <span className="text-xs text-muted">{fmtShort(r.from)} – {fmtShort(r.to)} {r.complete ? "" : "· en curso"}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <div className="text-sm font-bold">Entrenamiento</div>
          <Rows rows={[
            ["Sesiones", r.training.planned ? `${r.training.done} / ${r.training.planned}` : `${r.training.done}`],
            ["Series completadas", r.training.sets],
            ["Volumen total", `${r.training.volume} kg`],
            ["Ejercicios con nueva marca", r.training.improved],
            ["Sesiones con molestias", r.training.painSessions],
          ]} />
        </Card>
        <Card>
          <div className="text-sm font-bold">Nutrición</div>
          <Rows rows={[
            ["Días registrados", r.nutrition.daysLogged],
            ["Calorías promedio", r.nutrition.avgKcal != null ? `${r0(r.nutrition.avgKcal)} / ${r.nutrition.goalKcal ?? "–"} kcal` : "Sin datos"],
            ["Proteína promedio", r.nutrition.avgProtein != null ? `${r0(r.nutrition.avgProtein)} / ${r.nutrition.goalProtein ?? "–"} g` : "Sin datos"],
            ["Días con proteína ≥90%", r.nutrition.proteinDays],
            ["Comidas fuera de casa", r.nutrition.outMeals],
          ]} />
        </Card>
        <Card>
          <div className="text-sm font-bold">Cuerpo</div>
          {r.body.deltas.length ? (
            <Rows rows={r.body.deltas.map((d) => [d.label, `${d.delta > 0 ? "+" : ""}${d.delta} ${d.unit}`])} />
          ) : <p className="mt-2 text-sm text-muted">Sin dos mediciones en este periodo para comparar.</p>}
          {r.body.start && r.body.end && <p className="mt-2 text-[11px] text-muted">Comparando {fmtShort(r.body.start.date)} → {fmtShort(r.body.end.date)}</p>}
        </Card>
        <Card>
          <div className="text-sm font-bold">Hábitos y recuperación</div>
          <Rows rows={[
            ["Sueño promedio", fmt(r.habits.avgSleep, 1, " h")],
            ["Energía promedio", fmt(r.habits.avgEnergy, 1, " / 5")],
            ["Natación", `${r.habits.swims} sesiones`],
            ["Hábitos cumplidos", r.habits.habitPct != null ? `${r.habits.habitPct}%` : "Sin datos"],
            ["Días cerrados", r.habits.closures],
          ]} />
        </Card>
      </div>
      {!compact && r.insights.length > 0 && (
        <Card tone="rose" className="mt-3">
          <div className="text-sm font-bold">Lectura del periodo</div>
          <ul className="mt-2 space-y-1.5 text-sm">{r.insights.map((i) => <li key={i}>· {i}</li>)}</ul>
        </Card>
      )}
    </section>
  );
}

function Rows({ rows }: { rows: (string | number)[][] }) {
  return (
    <div className="mt-2 divide-y divide-line text-sm">
      {rows.map(([l, v]) => (
        <div key={String(l)} className="flex justify-between py-1.5"><span className="text-muted">{l}</span><span className="font-semibold">{v}</span></div>
      ))}
    </div>
  );
}

function FinalSummary() {
  const { db, profile } = useStore();
  if (!profile) return null;
  const meas = [...db.body_measurements].sort((a, b) => (a.date < b.date ? -1 : 1));
  const base = meas.find((m) => m.is_baseline) ?? meas[0];
  const last = meas[meas.length - 1];
  const deltas = base && last && base.id !== last.id ? METRICS.filter((m) => base[m.k] != null && last[m.k] != null).map((m) => ({ key: m.k, label: m.l, unit: m.u, a: base[m.k] as number, b: last[m.k] as number, delta: Math.round(((last[m.k] as number) - (base[m.k] as number)) * 10) / 10 })) : [];
  const ids = [...new Set(db.workout_sets.filter((s) => s.completed).map((s) => s.exercise_id))];
  const strength = ids.map((id) => ({ ex: getExercise(db, id), s: strengthSummary(db, id) })).filter((x) => x.ex && x.s && x.s.points.length >= 1);
  const improved = improvedExercisesIn(db, profile.start_date, "9999-12-31");
  const insights = bodyInsights(deltas, improved);
  const photos = (pose: string) => {
    const ps = db.progress_photos.filter((p) => p.pose === pose).sort((a, b) => a.day_number - b.day_number);
    return ps.length >= 2 ? [ps[0], ps[ps.length - 1]] : null;
  };
  const front = photos("frente");

  return (
    <section className="mb-10">
      <div className="grid gap-3 md:grid-cols-3">
        <Card tone="ink"><div className="text-xs text-white/60">Entrenamientos</div><div className="font-serif text-5xl italic">{db.workouts.filter((w) => w.finished_at).length}</div></Card>
        <Card tone="sand"><div className="text-xs text-muted">Natación</div><div className="font-serif text-5xl italic">{db.swim_sessions.length}</div></Card>
        <Card tone="rose"><div className="text-xs text-muted">Días cerrados</div><div className="font-serif text-5xl italic">{db.day_closures.length}</div></Card>
      </div>
      <h2 className="mt-8 mb-3 text-xl font-extrabold">Día 1 vs. última medición</h2>
      {deltas.length ? (
        <div className="overflow-hidden rounded-[1.5rem] border border-line bg-surface">
          {deltas.map((d) => (
            <div key={d.key} className="flex items-center justify-between border-b border-line px-5 py-3 text-sm last:border-0">
              <span className="font-semibold">{d.label}</span>
              <span className="text-muted">{d.a} → {d.b} {d.unit}</span>
              <Badge tone={d.delta === 0 ? "sand" : "ink"}>{d.delta > 0 ? "+" : ""}{d.delta} {d.unit}</Badge>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-muted">Aún no hay una segunda medición para comparar con el día 1.</p>}
      {insights.length > 0 && <Card tone="rose" className="mt-3"><ul className="space-y-1.5 text-sm">{insights.map((i) => <li key={i}>· {i}</li>)}</ul></Card>}
      {front && (
        <>
          <h2 className="mt-8 mb-3 text-xl font-extrabold">Fotos: día {front[0].day_number} vs. día {front[1].day_number}</h2>
          <div className="grid grid-cols-2 gap-3">{front.map((p) => <PhotoImg key={p.id} path={p.storage_path} alt="" className="aspect-[3/4] w-full rounded-3xl" />)}</div>
        </>
      )}
      <h2 className="mt-8 mb-3 text-xl font-extrabold">Fuerza: inicio → mejor marca</h2>
      {strength.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {strength.map(({ ex, s }) => (
            <div key={ex!.id} className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
              <span className="font-semibold">{ex!.name}</span>
              <span className="text-muted">{s!.first.top_weight}×{s!.first.top_reps} → <b className="text-ink">{s!.best.top_weight}×{s!.best.top_reps}</b></span>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-muted">Sin series registradas.</p>}
      <h2 className="mt-10 mb-1 text-xl font-extrabold">Detalle por quincenas</h2>
    </section>
  );
}
