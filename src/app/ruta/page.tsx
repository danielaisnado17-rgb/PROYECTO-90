"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Lock, MapPin, Dumbbell, CalendarCheck, Camera, CupSoda, Flame, Egg, TrendingUp, Medal, Waves, Sparkles, Trophy, Flag, Crown, Gem, Star, type LucideIcon } from "lucide-react";
import { useStore } from "@/lib/store";
import { dateForDay, dayNumber, EVAL_DAYS, fmtShort, PROGRAM_DAYS, todayISO } from "@/lib/dates";
import { achievements, dayStatus, STAGES, stageCtx, stageForDay } from "@/lib/program";
import { Badge, Bar, Card, PageHeader, SectionTitle, cx } from "@/components/ui";

const ICON: Record<string, LucideIcon> = {
  dumbbell: Dumbbell, "calendar-check": CalendarCheck, camera: Camera, "cup-soda": CupSoda, flame: Flame, egg: Egg,
  "trending-up": TrendingUp, medal: Medal, waves: Waves, sparkles: Sparkles, trophy: Trophy, flag: Flag, crown: Crown, gem: Gem,
};

export default function Ruta() {
  const { db, profile } = useStore();
  const today = todayISO();
  const day = profile ? dayNumber(profile.start_date, today) : 1;
  const current = stageForDay(Math.max(1, Math.min(90, day)));
  const [sel, setSel] = useState(current.n);
  const stage = STAGES[sel - 1];

  const taskState = useMemo(() => {
    if (!profile) return [];
    return STAGES.map((s) => {
      const ctx = stageCtx(db, profile, s);
      const tasks = s.tasks.map((t) => ({ ...t, r: t.check(ctx) }));
      return { done: tasks.filter((t) => t.r.done).length, total: tasks.length, tasks };
    });
  }, [db, profile]);
  const ach = useMemo(() => (profile ? achievements(db, profile) : []), [db, profile]);
  const pathRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);
  useEffect(() => {
    if (pathRef.current) setLen(pathRef.current.getTotalLength());
  }, [profile]);
  if (!profile) return null;
  const pts = STAGES.map((_, i) => ({ x: i % 2 === 0 ? 80 : 240, y: 60 + i * 110 }));
  const d = pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} C ${pts[i - 1].x} ${pts[i - 1].y + 70}, ${p.x} ${p.y - 70}, ${p.x} ${p.y}`), "");
  const frac = Math.min(1, Math.max(0, (day - 1) / (PROGRAM_DAYS - 1)));
  const st = taskState[sel - 1];

  return (
    <div className="rise">
      <PageHeader title={<>Mi ruta <span className="font-serif font-normal italic">90 días</span></>} subtitle={day < 1 ? `Empiezas el ${fmtShort(profile.start_date)}` : day > 90 ? "Programa completado" : `Día ${day} · Etapa ${current.n}: ${current.title}`} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Mapa */}
        <Card className="p-3">
          <svg viewBox="0 0 320 680" className="w-full">
            <path d={d} fill="none" stroke="var(--color-sand-deep)" strokeWidth="10" strokeLinecap="round" strokeDasharray="1 16" />
            <path ref={pathRef} d={d} fill="none" stroke="var(--color-ink)" strokeWidth="6" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - frac)} style={{ transition: "stroke-dashoffset 1s ease" }} />
            {pts.map((p, i) => {
              const s = STAGES[i];
              const reached = day >= s.from;
              const complete = day > s.to;
              const isSel = sel === s.n;
              const ts = taskState[i];
              return (
                <g key={s.n} onClick={() => setSel(s.n)} className="cursor-pointer">
                  <circle cx={p.x} cy={p.y} r={isSel ? 34 : 30} fill={complete ? "var(--color-ink)" : reached ? "var(--color-rose)" : "var(--color-surface)"} stroke={isSel ? "var(--color-ink)" : "var(--color-sand-deep)"} strokeWidth={isSel ? 3 : 2} />
                  <text x={p.x} y={p.y + 7} textAnchor="middle" fontSize="22" fontWeight="800" fill={complete ? "#fff" : "var(--color-ink)"}>{s.n}</text>
                  <text x={i % 2 === 0 ? p.x + 46 : p.x - 46} y={p.y - 4} textAnchor={i % 2 === 0 ? "start" : "end"} fontSize="15" fontWeight="800" fill="var(--color-ink)">{s.title}</text>
                  <text x={i % 2 === 0 ? p.x + 46 : p.x - 46} y={p.y + 14} textAnchor={i % 2 === 0 ? "start" : "end"} fontSize="11" fill="var(--color-muted)">Días {s.from}–{s.to} · {ts?.done}/{ts?.total} tareas</text>
                </g>
              );
            })}
            {day >= 1 && day <= 90 && len > 0 && (() => {
              const pt = pathRef.current?.getPointAtLength(len * frac);
              return pt ? (
                <g>
                  <circle cx={pt.x} cy={pt.y} r="11" fill="var(--color-rose-deep)" stroke="#fff" strokeWidth="3" />
                </g>
              ) : null;
            })()}
          </svg>
        </Card>

        {/* Detalle de etapa */}
        <div>
          <Card tone={stage.n === current.n ? "rose" : "surface"} className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="ink">Etapa {stage.n}</Badge>
              <Badge>Días {stage.from}–{stage.to}</Badge>
              <Badge>{fmtShort(dateForDay(profile.start_date, stage.from))} – {fmtShort(dateForDay(profile.start_date, stage.to))}</Badge>
              {stage.n === current.n && day >= 1 && <Badge tone="rose"><MapPin size={11} /> Estás aquí</Badge>}
            </div>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">{stage.title}</h2>
            <p className="text-sm text-ink/70">{stage.subtitle}</p>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs font-semibold"><span>Cumplimiento</span><span>{st.done}/{st.total}</span></div>
              <Bar value={st.done} max={st.total} color="bg-ink" />
            </div>
          </Card>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card>
              <div className="text-sm font-bold">Objetivos</div>
              <ul className="mt-3 space-y-2 text-sm">
                {stage.objectives.map((o) => (
                  <li key={o} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-deep" />{o}</li>
                ))}
              </ul>
            </Card>
            <Card>
              <div className="text-sm font-bold">Recomendaciones</div>
              <ul className="mt-3 space-y-2 text-sm text-ink/80">
                {stage.recommendations.map((o) => (
                  <li key={o} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sand-deep" />{o}</li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="mt-4">
            <div className="text-sm font-bold">Tareas e indicadores</div>
            <p className="text-xs text-muted">Se marcan solas a partir de tus registros reales.</p>
            <div className="mt-3 space-y-2">
              {st.tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-2xl bg-sand/40 px-4 py-3">
                  <div className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-full", t.r.done ? "bg-ink text-white" : "border-2 border-sand-deep")}>{t.r.done && <Check size={15} />}</div>
                  <div className="flex-1 text-sm font-medium">{t.label}</div>
                  {t.r.progress && <div className="text-xs text-muted">{t.r.progress}</div>}
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-muted">Logro de etapa: <b className="text-ink">{stage.badge}</b> {st.done === st.total ? "— ¡desbloqueado!" : "— completa todas las tareas"}</div>
          </Card>
        </div>
      </div>

      {/* Cuadrícula de días */}
      <SectionTitle>Tus 90 días</SectionTitle>
      <Card>
        <div className="grid grid-cols-10 gap-1.5 sm:gap-2 md:grid-cols-15">
          {Array.from({ length: PROGRAM_DAYS }, (_, i) => i + 1).map((n) => {
            const date = dateForDay(profile.start_date, n);
            const past = date < today;
            const isToday = date === today;
            const s = date <= today ? dayStatus(db, profile, date) : null;
            const isEval = EVAL_DAYS.includes(n);
            return (
              <div
                key={n}
                title={`Día ${n} · ${fmtShort(date)}${isEval ? " · evaluación" : ""}`}
                className={cx(
                  "relative grid aspect-square place-items-center rounded-full text-[10px] font-bold",
                  s?.compliant ? "bg-rose-deep text-white" : s?.partial ? "bg-rose-soft text-rose-deep" : past ? "bg-stone text-muted" : "border border-line text-muted",
                  isToday && "ring-2 ring-ink ring-offset-2 ring-offset-surface",
                )}
              >
                {n}
                {isEval && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-ink" />}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-rose-deep" />Cumplido</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-rose-soft" />Parcial</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-stone" />Sin registro</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink" />Evaluación</span>
        </div>
        <p className="mt-2 text-xs text-muted">Un día cuenta como cumplido si lo cierras con «Cerrar mi día», o si hiciste la actividad planificada y registraste tu alimentación.</p>
      </Card>

      {/* Logros */}
      <SectionTitle right={<span className="text-sm text-muted">{ach.filter((a) => a.unlocked).length}/{ach.length}</span>}>Logros</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ach.map((a) => {
          const Icon = ICON[a.icon] ?? Star;
          return (
            <div key={a.id} className={cx("rounded-3xl p-4 transition", a.unlocked ? "bg-ink text-white" : "border border-dashed border-sand-deep bg-surface/50 text-ink/50")}>
              <div className={cx("grid h-10 w-10 place-items-center rounded-full", a.unlocked ? "bg-rose text-ink" : "bg-sand")}>
                {a.unlocked ? <Icon size={18} /> : <Lock size={16} />}
              </div>
              <div className="mt-3 text-sm font-bold">{a.title}</div>
              <div className={cx("text-xs", a.unlocked ? "text-white/60" : "text-muted")}>{a.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
