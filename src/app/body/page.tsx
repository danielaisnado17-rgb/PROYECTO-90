"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Camera, Check, ImagePlus, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { useStore, newId } from "@/lib/store";
import { dateForDay, dayNumber, EVAL_DAYS, fmtShort, todayISO } from "@/lib/dates";
import { compressImage, deletePhotoFile, savePhoto } from "@/lib/photos";
import type { Measurement, Pose, ProgressPhoto } from "@/lib/types";
import { Badge, Button, Card, Chip, Disclaimer, Empty, Field, Input, NumInput, PageHeader, SectionTitle, Segmented, Sheet, Textarea, confirmDelete, cx } from "@/components/ui";
import { TrendChart } from "@/components/charts";
import { PhotoImg } from "@/components/PhotoImg";
import { METRICS } from "@/lib/metrics";

type Tab = "medidas" | "fotos" | "comparar" | "evaluaciones";
import type { MetricKey } from "@/lib/metrics";
const POSES: { v: Pose; l: string }[] = [
  { v: "frente", l: "Frente" },
  { v: "perfil", l: "Perfil" },
  { v: "espalda", l: "Espalda" },
];

export default function Page() {
  return (
    <Suspense>
      <Body />
    </Suspense>
  );
}

function Body() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as Tab) || "medidas";
  return (
    <div className="rise">
      <PageHeader title="Body Tracking" subtitle="Medidas cada 15 días · fotos privadas · comparaciones reales" />
      <Segmented<Tab>
        value={tab}
        onChange={(v) => router.replace(`/body?tab=${v}`)}
        options={[
          { v: "medidas", label: "Medidas" },
          { v: "fotos", label: "Fotos" },
          { v: "comparar", label: "Comparar" },
          { v: "evaluaciones", label: "Evaluaciones" },
        ]}
        className="mb-6 w-fit max-w-full"
      />
      {tab === "medidas" && <Measures />}
      {tab === "fotos" && <Photos />}
      {tab === "comparar" && <Compare />}
      {tab === "evaluaciones" && <Evaluations />}
    </div>
  );
}

// ─────────────────────────── Medidas ───────────────────────────
function Measures() {
  const { db, profile, upsert, remove } = useStore();
  const [edit, setEdit] = useState<Measurement | null>(null);
  const [metric, setMetric] = useState<MetricKey>("waist_cm");
  const list = useMemo(() => [...db.body_measurements].sort((a, b) => (a.date < b.date ? -1 : 1)), [db.body_measurements]);
  if (!profile) return null;
  const base = list.find((m) => m.is_baseline) ?? list[0];
  const last = list[list.length - 1];
  const series = list.filter((m) => m[metric] != null).map((m) => ({ date: m.date, value: m[metric] as number }));
  const info = METRICS.find((m) => m.k === metric)!;
  const day = dayNumber(profile.start_date);
  const nextEval = EVAL_DAYS.find((d) => d >= day);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {METRICS.map((m) => <Chip key={m.k} active={metric === m.k} onClick={() => setMetric(m.k)} className="shrink-0">{m.l}</Chip>)}
          </div>
          <div className="mt-4">
            {series.length >= 2 ? (
              <TrendChart data={series} unit={info.u} height={220} reference={base?.[metric] ?? undefined} referenceLabel="día 1" />
            ) : (
              <Empty title={`${series.length} registro(s) de ${info.l.toLowerCase()}`} text="El gráfico aparece cuando hay al menos dos mediciones. No se dibujan datos que no existen." />
            )}
          </div>
          {metric === "weight_kg" && <p className="mt-3 text-xs text-muted">En recomposición, el peso puede mantenerse o subir ligeramente mientras la cintura baja y la fuerza sube: eso es progreso, no retroceso.</p>}
        </Card>
        <Card tone="sand">
          <div className="text-sm font-bold">Nueva medición</div>
          <p className="mt-1 text-xs text-ink/70">Recomendado cada 15 días{nextEval ? ` · próxima: día ${nextEval} (${fmtShort(dateForDay(profile.start_date, nextEval))})` : ""}. Mide en ayunas, tras ir al baño, con la cinta paralela al suelo y sin apretar.</p>
          <Button className="mt-4 w-full" onClick={() => setEdit({ id: newId(), date: todayISO(), weight_kg: last?.weight_kg ?? null, waist_cm: null, hip_cm: null, glutes_cm: null, abdomen_cm: null, thigh_cm: null, arm_cm: null, is_baseline: false, notes: "" })}><Plus size={16} /> Registrar medidas</Button>
        </Card>
      </div>

      <SectionTitle>Historial</SectionTitle>
      <div className="overflow-x-auto rounded-[1.5rem] border border-line bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[10px] tracking-wide text-muted uppercase">
              <th className="px-4 py-3">Fecha</th>
              {METRICS.map((m) => <th key={m.k} className="px-2 py-3 text-right">{m.l.split(" ")[0]}</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {[...list].reverse().map((m) => (
              <tr key={m.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3"><div className="font-semibold">{fmtShort(m.date)}</div><div className="text-[11px] text-muted">Día {dayNumber(profile.start_date, m.date)}{m.is_baseline ? " · inicial" : ""}</div></td>
                {METRICS.map((k) => {
                  const v = m[k.k];
                  const b = base?.[k.k];
                  const d = v != null && b != null && m.id !== base?.id ? Math.round((v - b) * 10) / 10 : null;
                  return <td key={k.k} className="px-2 py-3 text-right">{v ?? "–"}{d != null && d !== 0 && <div className="text-[10px] text-muted">{d > 0 ? "+" : ""}{d}</div>}</td>;
                })}
                <td className="px-3 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setEdit({ ...m })} className="grid h-8 w-8 place-items-center rounded-full bg-sand" aria-label="Editar"><Pencil size={13} /></button>
                    {!m.is_baseline && <button onClick={() => confirmDelete("esta medición") && remove("body_measurements", m.id)} className="grid h-8 w-8 place-items-center rounded-full text-rose-deep" aria-label="Eliminar"><Trash2 size={13} /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {base?.is_baseline && <p className="mt-2 text-xs text-muted">Las medidas iniciales son tu punto de partida y no se modifican automáticamente (puedes corregirlas a mano si hubo un error).</p>}

      {edit && (
        <Sheet open onClose={() => setEdit(null)} title={edit.is_baseline ? "Medidas iniciales" : "Medición"}>
          <Field label="Fecha"><Input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></Field>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {METRICS.map((m) => (
              <Field key={m.k} label={`${m.l} (${m.u})`}><NumInput value={edit[m.k]} step={0.1} onChange={(v) => setEdit({ ...edit, [m.k]: v })} /></Field>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Deja en blanco lo que no midas. Cadera = perímetro mayor de cadera/glúteos; «Glúteos» es opcional si mides también el punto más prominente.</p>
          <Field label="Notas" className="mt-3"><Textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} placeholder="Fase del ciclo, hora, condiciones…" /></Field>
          <Button className="mt-4 w-full" onClick={() => { upsert("body_measurements", edit); setEdit(null); }}>Guardar</Button>
        </Sheet>
      )}
    </>
  );
}

// ─────────────────────────── Fotos ───────────────────────────
function Photos() {
  const { db, profile, session, upsert, remove } = useStore();
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState<Pose | null>(null);
  const [view, setView] = useState<ProgressPhoto | null>(null);
  const [err, setErr] = useState<string | null>(null);
  if (!profile) return null;
  const day = dayNumber(profile.start_date, date);
  const byDay = new Map<number, ProgressPhoto[]>();
  for (const p of [...db.progress_photos].sort((a, b) => (a.date < b.date ? 1 : -1))) byDay.set(p.day_number, [...(byDay.get(p.day_number) ?? []), p]);

  async function upload(pose: Pose, file: File | undefined) {
    if (!file) return;
    setBusy(pose);
    setErr(null);
    try {
      const id = newId();
      const blob = await compressImage(file);
      const path = await savePhoto(id, blob, session?.user.id ?? null);
      const existing = db.progress_photos.find((p) => p.date === date && p.pose === pose);
      if (existing) {
        await deletePhotoFile(existing.storage_path);
        remove("progress_photos", existing.id);
      }
      upsert("progress_photos", { id, date, day_number: day, pose, storage_path: path, notes: "" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo guardar la foto");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Card tone="rose">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold">Sesión de fotos · día {day}</div>
            <p className="text-xs text-ink/70">Misma luz, hora, ropa y distancia cada vez. Idealmente en los días de evaluación (1, 15, 30, 45, 60, 75, 90).</p>
          </div>
          <Field label="Fecha"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" /></Field>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {POSES.map((p) => {
            const existing = db.progress_photos.find((x) => x.date === date && x.pose === p.v);
            return (
              <label key={p.v} className="group relative block cursor-pointer overflow-hidden rounded-3xl bg-surface/80">
                {existing ? <PhotoImg path={existing.storage_path} alt={p.l} className="aspect-[3/4] w-full" /> : (
                  <div className="grid aspect-[3/4] place-items-center text-center text-muted">
                    <div>{busy === p.v ? <div className="text-xs">Guardando…</div> : <><ImagePlus size={26} className="mx-auto" /><div className="mt-1 text-xs font-semibold">{p.l}</div></>}</div>
                  </div>
                )}
                {existing && <span className="absolute bottom-2 left-2 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-bold text-white">{p.l} · cambiar</span>}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => upload(p.v, e.target.files?.[0])} />
              </label>
            );
          })}
        </div>
        {err && <p className="mt-2 text-sm text-rose-deep">{err}</p>}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink/60"><Lock size={12} /> {session ? "Guardadas en almacenamiento privado (sólo tú puedes verlas)." : "Guardadas sólo en este dispositivo (no se suben a internet)."}</p>
      </Card>

      <SectionTitle>Galería</SectionTitle>
      {byDay.size === 0 ? <Empty icon={<Camera size={28} />} title="Aún no hay fotos" text="Sube tus fotos del día 1: serán tu punto de partida para comparar." /> : (
        <div className="space-y-5">
          {[...byDay.entries()].map(([d, photos]) => (
            <div key={d}>
              <div className="mb-2 flex items-center gap-2 text-sm font-bold">Día {d} <span className="text-xs font-normal text-muted">{fmtShort(photos[0].date)}</span>{EVAL_DAYS.includes(d) && <Badge tone="rose">Evaluación</Badge>}</div>
              <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                {POSES.map((p) => {
                  const ph = photos.find((x) => x.pose === p.v);
                  return ph ? (
                    <button key={p.v} onClick={() => setView(ph)} className="overflow-hidden rounded-2xl"><PhotoImg path={ph.storage_path} alt={`Día ${d} ${p.l}`} className="aspect-[3/4] w-full" /></button>
                  ) : <div key={p.v} className="grid aspect-[3/4] place-items-center rounded-2xl border border-dashed border-sand-deep text-[11px] text-muted">{p.l}</div>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      <Sheet open={!!view} onClose={() => setView(null)} title={view ? `Día ${view.day_number} · ${view.pose}` : ""}>
        {view && (
          <>
            <PhotoImg path={view.storage_path} alt="" className="max-h-[65vh] w-full rounded-3xl object-contain" />
            <Button variant="danger" className="mt-3" onClick={async () => { if (!confirmDelete("esta foto")) return; await deletePhotoFile(view.storage_path); remove("progress_photos", view.id); setView(null); }}><Trash2 size={14} /> Eliminar foto</Button>
          </>
        )}
      </Sheet>
    </>
  );
}

// ─────────────────────────── Comparar ───────────────────────────
function Compare() {
  const { db, profile } = useStore();
  const [pose, setPose] = useState<Pose>("frente");
  const available = [...new Set(db.progress_photos.map((p) => p.day_number))].sort((a, b) => a - b);
  const [a, setA] = useState<number | null>(available[0] ?? null);
  const [b, setB] = useState<number | null>(available[available.length - 1] ?? null);
  if (!profile) return null;
  // Para cada checkpoint, la foto más cercana (±3 días)
  const near = (d: number, ps: Pose) => db.progress_photos.filter((p) => p.pose === ps && Math.abs(p.day_number - d) <= 3).sort((x, y) => Math.abs(x.day_number - d) - Math.abs(y.day_number - d))[0];
  const pa = a != null ? db.progress_photos.find((p) => p.day_number === a && p.pose === pose) : undefined;
  const pb = b != null ? db.progress_photos.find((p) => p.day_number === b && p.pose === pose) : undefined;
  const meas = (d: number | null) => (d == null ? undefined : db.body_measurements.filter((m) => Math.abs(dayNumber(profile.start_date, m.date) - d) <= 3)[0]);
  const ma = meas(a);
  const mb = meas(b);

  return (
    <>
      <Segmented<Pose> value={pose} onChange={setPose} options={POSES.map((p) => ({ v: p.v, label: p.l }))} className="mb-4 w-fit" />
      <div className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">Recorrido por evaluaciones</div>
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-2">
        {EVAL_DAYS.map((d) => {
          const p = near(d, pose);
          return (
            <div key={d} className="w-28 shrink-0">
              {p ? <PhotoImg path={p.storage_path} alt={`Día ${d}`} className="aspect-[3/4] w-full rounded-2xl" /> : <div className="grid aspect-[3/4] place-items-center rounded-2xl border border-dashed border-sand-deep text-[11px] text-muted">Sin foto</div>}
              <div className="mt-1 text-center text-xs font-bold">Día {d}</div>
            </div>
          );
        })}
      </div>

      {available.length < 2 ? (
        <Empty title="Necesitas fotos de al menos dos días" text="La comparación lado a lado se activa cuando tengas fotos de dos días diferentes. No se generan imágenes ni cambios ficticios." />
      ) : (
        <Card>
          <div className="grid grid-cols-2 gap-3">
            {[{ v: a, set: setA, p: pa, m: ma }, { v: b, set: setB, p: pb, m: mb }].map((s, i) => (
              <div key={i}>
                <select value={s.v ?? ""} onChange={(e) => s.set(Number(e.target.value))} className="mb-2 h-10 w-full rounded-2xl bg-sand px-3 text-sm font-semibold">
                  {available.map((d) => <option key={d} value={d}>Día {d}</option>)}
                </select>
                {s.p ? <PhotoImg path={s.p.storage_path} alt="" className="aspect-[3/4] w-full rounded-3xl" /> : <div className="grid aspect-[3/4] place-items-center rounded-3xl bg-sand text-xs text-muted">Sin foto de {pose} ese día</div>}
              </div>
            ))}
          </div>
          {ma && mb && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm sm:grid-cols-7">
              {METRICS.map((m) => {
                const x = ma[m.k];
                const y = mb[m.k];
                if (x == null || y == null) return null;
                const d = Math.round((y - x) * 10) / 10;
                return <div key={m.k} className="rounded-2xl bg-sand/50 p-2"><div className="text-[10px] text-muted">{m.l.split(" ")[0]}</div><div className="font-bold">{d > 0 ? "+" : ""}{d} {m.u}</div></div>;
              })}
            </div>
          )}
          <p className="mt-3 text-xs text-muted">Las diferencias sólo se muestran cuando hay medidas reales cerca de ambos días (±3 días).</p>
        </Card>
      )}
    </>
  );
}

// ─────────────────────────── Evaluaciones ───────────────────────────
function Evaluations() {
  const { db, profile, upsert } = useStore();
  const [edit, setEdit] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  if (!profile) return null;
  const day = dayNumber(profile.start_date);
  return (
    <>
      <Disclaimer>Cada evaluación incluye: peso y medidas, 3 fotos (frente, perfil, espalda) y una nota sobre cómo te sientes. Se marca completa automáticamente cuando hay medidas y fotos, o puedes marcarla tú.</Disclaimer>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {EVAL_DAYS.map((d) => {
          const date = dateForDay(profile.start_date, d);
          const ev = db.evaluations.find((e) => e.day === d);
          const hasM = db.body_measurements.some((m) => Math.abs(dayNumber(profile.start_date, m.date) - d) <= 3);
          const photos = new Set(db.progress_photos.filter((p) => Math.abs(p.day_number - d) <= 3).map((p) => p.pose)).size;
          const done = ev?.completed || (hasM && photos >= 3);
          return (
            <Card key={d} tone={done ? "sand" : d <= day + 3 && d >= day ? "rose" : "surface"}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-extrabold">Día {d}</div>
                  <div className="text-xs text-muted">{fmtShort(date)}{d === 1 ? " · inicial" : d === 60 ? " · intermedia" : d === 90 ? " · final" : ""}</div>
                </div>
                <div className={cx("grid h-9 w-9 place-items-center rounded-full", done ? "bg-ink text-white" : "border-2 border-sand-deep")}>{done && <Check size={16} />}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge tone={hasM ? "good" : "sand"}>{hasM ? "✓" : "–"} Medidas</Badge>
                <Badge tone={photos >= 3 ? "good" : "sand"}>Fotos {photos}/3</Badge>
              </div>
              {ev?.notes && <p className="mt-2 text-sm text-ink/80">“{ev.notes}”</p>}
              <Button size="sm" variant="outline" className="mt-3" onClick={() => { setEdit(d); setNotes(ev?.notes ?? ""); }}>Notas / marcar</Button>
            </Card>
          );
        })}
      </div>
      <Sheet open={edit != null} onClose={() => setEdit(null)} title={`Evaluación día ${edit}`}>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="¿Cómo te ves y te sientes? ¿Cambios en la ropa, energía, fuerza?" />
        <Button className="mt-4 w-full" onClick={() => {
          if (edit == null) return;
          const ev = db.evaluations.find((e) => e.day === edit);
          upsert("evaluations", { id: ev?.id ?? newId(), day: edit, date: todayISO(), notes, completed: true });
          setEdit(null);
        }}>Guardar y marcar como completada</Button>
      </Sheet>
    </>
  );
}
