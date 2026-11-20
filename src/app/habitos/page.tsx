"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Moon, Trash2, Waves, Battery, Pencil } from "lucide-react";
import { useStore, newId } from "@/lib/store";
import { addDays, fmtLong, fmtShort, todayISO } from "@/lib/dates";
import type { HabitLog, SleepLog, SwimSession } from "@/lib/types";
import { Badge, Button, Card, Chip, Disclaimer, Dots, Empty, Field, Input, NumInput, PageHeader, SectionTitle, Segmented, Sheet, Stepper, Textarea, confirmDelete, cx } from "@/components/ui";
import { TrendChart } from "@/components/charts";

type Tab = "checkin" | "natacion" | "historial";

export default function Page() {
  return (
    <Suspense>
      <Habitos />
    </Suspense>
  );
}

function Habitos() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as Tab) || "checkin";
  return (
    <div className="rise">
      <PageHeader title="Hábitos y recuperación" subtitle="Sueño, energía, molestias, natación y pequeños hábitos que suman" />
      <Segmented<Tab> value={tab} onChange={(v) => router.replace(`/habitos?tab=${v}`)} options={[{ v: "checkin", label: "Check-in diario" }, { v: "natacion", label: "Natación" }, { v: "historial", label: "Tendencias" }]} className="mb-6 w-fit max-w-full" />
      {tab === "checkin" && <CheckIn />}
      {tab === "natacion" && <Swim />}
      {tab === "historial" && <Trends />}
    </div>
  );
}

function CheckIn() {
  const { db, profile, upsert } = useStore();
  const [date, setDate] = useState(todayISO());
  if (!profile) return null;
  const log: HabitLog = db.habit_logs.find((h) => h.date === date) ?? { id: newId(), date, energy: null, fatigue: null, stress: null, pain: false, pain_area: "", habits: {}, notes: "" };
  const sleep: SleepLog = db.sleep_logs.find((s) => s.date === date) ?? { id: newId(), date, hours: 0, quality: 0 };
  const save = (p: Partial<HabitLog>) => upsert("habit_logs", { ...log, ...p });
  const saveSleep = (p: Partial<SleepLog>) => upsert("sleep_logs", { ...sleep, ...p });
  const done = profile.habits.filter((h) => log.habits[h]).length;

  // Estado de recuperación (últimos 3 días con datos)
  const recent = db.habit_logs.filter((h) => h.date <= date && h.date > addDays(date, -3));
  const recentSleep = db.sleep_logs.filter((s) => s.date <= date && s.date > addDays(date, -3) && s.hours > 0);
  const avgF = recent.filter((r) => r.fatigue).reduce((a, r) => a + (r.fatigue ?? 0), 0) / Math.max(1, recent.filter((r) => r.fatigue).length);
  const avgS = recentSleep.reduce((a, s) => a + s.hours, 0) / Math.max(1, recentSleep.length);
  const anyPain = recent.some((r) => r.pain);
  const advice: string[] = [];
  if (anyPain) advice.push("Registraste molestias: evita cargar la zona afectada y no entrenes con dolor. Si persiste más de unos días o es intenso, consulta con un profesional de la salud.");
  if (recent.length && avgF >= 4) advice.push("Fatiga alta en los últimos días: considera una sesión más ligera (menos series o RPE más bajo) y prioriza dormir.");
  if (recentSleep.length && avgS < 6.5) advice.push(`Dormiste en promedio ${avgS.toFixed(1)} h: el sueño es clave para ganar músculo. Intenta acercarte a tus 7–8 h.`);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setDate(addDays(date, -1))} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface" aria-label="Anterior"><ChevronLeft size={18} /></button>
        <div className="text-sm font-bold first-letter:uppercase">{fmtLong(date)}</div>
        <button onClick={() => setDate(addDays(date, 1))} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface" aria-label="Siguiente"><ChevronRight size={18} /></button>
      </div>
      {advice.length > 0 && <div className="mb-4 space-y-2">{advice.map((a) => <div key={a} className="rounded-2xl bg-rose-soft px-4 py-3 text-sm">{a}</div>)}</div>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2 text-sm font-bold"><Moon size={16} /> Sueño de anoche</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Horas"><Stepper value={sleep.hours || null} step={0.5} onChange={(v) => saveSleep({ hours: v })} suffix="h" /></Field>
            <div />
          </div>
          <div className="mt-3 mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Calidad</div>
          <Dots value={sleep.quality || null} onChange={(v) => saveSleep({ quality: v })} labels={["Mala", "Excelente"]} />
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm font-bold"><Battery size={16} /> Cómo está tu cuerpo</div>
          <div className="mt-3 space-y-3">
            <div><div className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Energía</div><Dots value={log.energy} onChange={(v) => save({ energy: v })} labels={["Baja", "Alta"]} /></div>
            <div><div className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Fatiga muscular</div><Dots value={log.fatigue} onChange={(v) => save({ fatigue: v })} labels={["Nada", "Mucha"]} /></div>
            <div><div className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Estrés</div><Dots value={log.stress} onChange={(v) => save({ stress: v })} labels={["Bajo", "Alto"]} /></div>
          </div>
        </Card>
        <Card>
          <button onClick={() => save({ pain: !log.pain })} className={cx("flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold", log.pain ? "bg-rose-soft text-rose-deep" : "bg-sand/60")}>
            ¿Dolor o molestias hoy?<span>{log.pain ? "Sí" : "No"}</span>
          </button>
          {log.pain && (
            <div className="mt-3 space-y-2">
              <Input placeholder="¿Dónde? (rodilla, zona lumbar…)" value={log.pain_area} onChange={(e) => save({ pain_area: e.target.value })} />
              <p className="text-xs text-muted">Esta app no diagnostica lesiones. Si el dolor es agudo, punzante, aumenta o dura varios días, consulta con un profesional.</p>
            </div>
          )}
          <Textarea className="mt-3" placeholder="Notas del día (opcional)" value={log.notes} onChange={(e) => save({ notes: e.target.value })} />
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">Hábitos</div>
            <Badge tone={done === profile.habits.length && done > 0 ? "ink" : "sand"}>{done}/{profile.habits.length}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {profile.habits.map((h) => (
              <button key={h} onClick={() => save({ habits: { ...log.habits, [h]: !log.habits[h] } })} className={cx("flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition", log.habits[h] ? "bg-ink text-white" : "bg-sand/50")}>
                <span className={cx("grid h-6 w-6 place-items-center rounded-full", log.habits[h] ? "bg-rose text-ink" : "border-2 border-sand-deep")}>{log.habits[h] && <Check size={13} />}</span>
                {h}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">Edita tu lista de hábitos en Configuración.</p>
        </Card>
      </div>
    </>
  );
}

const STYLES = ["Crol / libre", "Espalda", "Pecho / braza", "Mariposa", "Patada con tabla", "Mixto"];

function Swim() {
  const { db, upsert, remove } = useStore();
  const [edit, setEdit] = useState<SwimSession | null>(null);
  const list = [...db.swim_sessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const total = list.reduce((a, s) => a + s.duration_min, 0);
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card tone="ink" className="md:col-span-1">
          <Waves className="text-rose" />
          <div className="mt-3 font-serif text-6xl italic">{list.length}</div>
          <div className="text-xs text-white/60">sesiones · {Math.round(total / 60)} h en el agua</div>
          <Button variant="rose" className="mt-5 w-full" onClick={() => setEdit({ id: newId(), date: todayISO(), duration_min: 60, distance_m: null, rpe: 5, styles: [], feelings: "" })}>Registrar natación</Button>
        </Card>
        <Card className="md:col-span-2">
          <div className="text-sm font-bold">Natación dentro de tu plan</div>
          <ul className="mt-3 space-y-2 text-sm text-ink/80">
            <li>· Cuenta como actividad (ya incluida en tu factor de actividad 1,55). No asumimos que sea siempre intensa: tú registras la intensidad.</li>
            <li>· Sesiones suaves (RPE ≤ 5) funcionan como recuperación activa para piernas y glúteos.</li>
            <li>· Si nadas intenso (RPE ≥ 7), suma un snack con carbohidratos + proteína después (p. ej. yogur con fruta) y bebe agua extra.</li>
            <li>· Si el lunes llegas con las piernas muy cansadas, reduce una serie en los ejercicios principales.</li>
          </ul>
        </Card>
      </div>
      <SectionTitle>Historial</SectionTitle>
      {list.length === 0 ? <Empty icon={<Waves size={26} />} title="Sin sesiones registradas" text="Registra tu natación del sábado y domingo." /> : (
        <div className="space-y-2">
          {list.map((s) => (
            <Card key={s.id} className="flex items-center gap-4 py-4">
              <div className="w-14 text-center"><div className="text-xl font-extrabold">{Number(s.date.slice(8))}</div><div className="text-[10px] text-muted uppercase">{fmtShort(s.date).split(" ")[1]}</div></div>
              <div className="flex-1">
                <div className="font-bold">{s.duration_min} min{s.distance_m ? ` · ${s.distance_m} m` : ""} · RPE {s.rpe}</div>
                <div className="text-xs text-muted">{s.styles.join(", ") || "Estilo no indicado"}{s.feelings ? ` · “${s.feelings}”` : ""}</div>
              </div>
              <button onClick={() => setEdit({ ...s })} className="grid h-9 w-9 place-items-center rounded-full bg-sand" aria-label="Editar"><Pencil size={13} /></button>
              <button onClick={() => confirmDelete("esta sesión") && remove("swim_sessions", s.id)} className="grid h-9 w-9 place-items-center rounded-full text-rose-deep" aria-label="Eliminar"><Trash2 size={13} /></button>
            </Card>
          ))}
        </div>
      )}
      {edit && (
        <Sheet open onClose={() => setEdit(null)} title="Sesión de natación">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha"><Input type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></Field>
              <Field label="Duración (min)"><NumInput value={edit.duration_min} step={5} onChange={(v) => setEdit({ ...edit, duration_min: v ?? 0 })} /></Field>
              <Field label="Distancia (m)" hint="Opcional" className="col-span-2"><NumInput value={edit.distance_m} step={25} onChange={(v) => setEdit({ ...edit, distance_m: v })} /></Field>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Intensidad percibida: {edit.rpe}/10</div>
              <input type="range" min={1} max={10} value={edit.rpe} onChange={(e) => setEdit({ ...edit, rpe: Number(e.target.value) })} className="w-full accent-[#e8559a]" />
              <div className="flex justify-between text-[11px] text-muted"><span>Muy suave</span><span>Máxima</span></div>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Estilos</div>
              <div className="flex flex-wrap gap-2">{STYLES.map((st) => <Chip key={st} active={edit.styles.includes(st)} onClick={() => setEdit({ ...edit, styles: edit.styles.includes(st) ? edit.styles.filter((x) => x !== st) : [...edit.styles, st] })}>{st}</Chip>)}</div>
            </div>
            <Field label="Sensaciones"><Textarea value={edit.feelings} onChange={(e) => setEdit({ ...edit, feelings: e.target.value })} placeholder="¿Cómo te sentiste en el agua?" /></Field>
            <Button className="w-full" onClick={() => { upsert("swim_sessions", edit); setEdit(null); }}>Guardar</Button>
          </div>
        </Sheet>
      )}
    </>
  );
}

function Trends() {
  const { db, profile } = useStore();
  const data = useMemo(() => {
    const sleep = [...db.sleep_logs].filter((s) => s.hours > 0).sort((a, b) => (a.date < b.date ? -1 : 1)).map((s) => ({ date: s.date, value: s.hours }));
    const hl = [...db.habit_logs].sort((a, b) => (a.date < b.date ? -1 : 1));
    const energy = hl.filter((h) => h.energy).map((h) => ({ date: h.date, value: h.energy! }));
    const fatigue = hl.filter((h) => h.fatigue).map((h) => ({ date: h.date, value: h.fatigue! }));
    const habits = hl.map((h) => ({ date: h.date, value: profile ? Math.round((profile.habits.filter((x) => h.habits[x]).length / Math.max(1, profile.habits.length)) * 100) : 0 }));
    return { sleep, energy, fatigue, habits };
  }, [db, profile]);
  const charts = [
    { t: "Horas de sueño", d: data.sleep, u: "h", ref: 7 },
    { t: "Energía (1–5)", d: data.energy, u: "" },
    { t: "Fatiga muscular (1–5)", d: data.fatigue, u: "" },
    { t: "Cumplimiento de hábitos", d: data.habits, u: "%" },
  ];
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {charts.map((c) => (
          <Card key={c.t}>
            <div className="text-sm font-bold">{c.t}</div>
            {c.d.length >= 2 ? <div className="mt-2"><TrendChart data={c.d} unit={c.u} reference={c.ref} referenceLabel={c.ref ? `${c.ref} h` : undefined} /></div> : <p className="mt-3 text-sm text-muted">Necesitas al menos 2 registros para ver la tendencia ({c.d.length} por ahora).</p>}
          </Card>
        ))}
      </div>
      <div className="mt-4"><Disclaimer>Estas tendencias sólo usan tus registros reales. Si algo te preocupa (sueño muy alterado, estrés sostenido, dolor), habla con un profesional.</Disclaimer></div>
    </>
  );
}
