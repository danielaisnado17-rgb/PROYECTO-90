"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowUpRight, Droplets, Flame, Ruler, CalendarClock, Info, AlertCircle, TrendingUp, Plus, Waves, Leaf } from "lucide-react";
import { useStore, newId } from "@/lib/store";
import { addDays, dateForDay, dayNumber, dowShort, fmtLong, fmtShort, nextEvaluationDay, nowISO, PROGRAM_DAYS, todayISO, weekStart } from "@/lib/dates";
import { currentGoal, r0, sumLogs } from "@/lib/nutrition";
import { dashboardMessages, dayStatus, getExercise, routineFor, stageForDay, streak, weekSessions } from "@/lib/program";
import { Bar, Card, Ring, cx, LinkButton } from "@/components/ui";
import { TrendChart } from "@/components/charts";
import { CloseDayButton } from "@/components/CloseDay";

export default function Dashboard() {
  const { db, profile, upsert } = useStore();
  const today = todayISO();
  const data = useMemo(() => {
    if (!profile) return null;
    const day = dayNumber(profile.start_date, today);
    const routine = routineFor(db, profile, today);
    const st = dayStatus(db, profile, today);
    const goal = currentGoal(db, today);
    const m = sumLogs(db.food_logs.filter((l) => l.date === today));
    const water = db.hydration_logs.filter((h) => h.date === today).reduce((a, h) => a + h.ml, 0);
    const ws = weekSessions(db, profile, today);
    const meas = [...db.body_measurements].sort((a, b) => (a.date < b.date ? -1 : 1));
    const weights = meas.filter((x) => x.weight_kg != null).map((x) => ({ date: x.date, value: x.weight_kg! }));
    const done = db.evaluations.filter((e) => e.completed).map((e) => e.day);
    const nextEval = nextEvaluationDay(Math.max(1, day), done);
    return { day, routine, st, goal, m, water, ws, meas, weights, nextEval, streak: streak(db, profile, today), msgs: dashboardMessages(db, profile, today) };
  }, [db, profile, today]);
  if (!profile || !data) return null;
  const { day, routine, st, goal, m, water, ws, meas, weights, nextEval } = data;
  const progDay = Math.min(PROGRAM_DAYS, Math.max(0, day));
  const pct = Math.round((progDay / PROGRAM_DAYS) * 100);
  const stage = stageForDay(Math.max(1, day));
  const last = meas[meas.length - 1];
  const base = meas.find((x) => x.is_baseline) ?? meas[0];
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart(today), i));

  const addWater = (ml: number) => upsert("hydration_logs", { id: newId(), date: today, ml, created_at: nowISO() });

  return (
    <div className="rise">
      {/* Encabezado */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-rose text-lg font-extrabold">{(profile.name || "P").slice(0, 1).toUpperCase()}</div>
          <div>
            <div className="text-base font-bold">Hola{profile.name ? `, ${profile.name}` : ""}</div>
            <div className="text-sm text-muted first-letter:uppercase">{fmtLong(today)}</div>
          </div>
        </div>
        <Link href="/ruta" className="text-right">
          <div className="text-[10px] font-bold tracking-[.25em] text-muted uppercase">Día</div>
          <div className="font-serif text-4xl leading-none italic">
            {day < 1 ? "–" : progDay}
            <span className="text-lg text-muted not-italic">/90</span>
          </div>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Hoy toca */}
        <Card tone="rose" className="relative overflow-hidden p-6 lg:col-span-2">
          <div className="pointer-events-none absolute -top-8 -right-6 h-40 w-40 rounded-full bg-rose/70 blur-[1px]" />
          <div className="floaty pointer-events-none absolute top-10 right-10 h-16 w-16 rounded-[40%] bg-ink/90 shadow-xl" />
          <div className="pointer-events-none absolute top-24 right-28 h-10 w-10 rounded-full border-[7px] border-sand-deep" />
          <div className="relative max-w-[70%]">
            <div className="text-xs font-bold tracking-[.2em] text-rose-deep uppercase">Hoy toca</div>
            {st.plan.type === "workout" && routine ? (
              <>
                <h2 className="mt-2 text-3xl leading-tight font-extrabold tracking-tight md:text-4xl">{routine.name}</h2>
                <p className="mt-2 text-sm text-ink/70">{routine.items.map((i) => getExercise(db, i.exercise_id)?.name).filter(Boolean).slice(0, 4).join(" · ")}{routine.items.length > 4 ? "…" : ""}</p>
              </>
            ) : st.plan.type === "swim" ? (
              <>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Natación</h2>
                <p className="mt-2 text-sm text-ink/70">1 hora · intensidad a tu ritmo. Regístrala al terminar.</p>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Recuperación</h2>
                <p className="mt-2 text-sm text-ink/70">Movilidad suave, caminar, buena comida y dormir bien. El músculo crece descansando.</p>
              </>
            )}
          </div>
          <div className="relative mt-5 flex flex-wrap gap-2">
            {st.plan.type === "workout" && routine &&
              (st.workout ? (
                <span className="inline-flex h-11 items-center gap-2 rounded-full bg-ink/10 px-5 text-sm font-semibold">✓ Entrenamiento completado</span>
              ) : (
                <LinkButton href={`/entrenamientos/sesion?r=${routine.id}`}>
                  Empezar entrenamiento <ArrowUpRight size={16} />
                </LinkButton>
              ))}
            {st.plan.type === "swim" && (st.swim ? <span className="inline-flex h-11 items-center rounded-full bg-ink/10 px-5 text-sm font-semibold">✓ Natación registrada</span> : <LinkButton href="/habitos?tab=natacion"><Waves size={16} /> Registrar natación</LinkButton>)}
            {st.plan.type === "rest" && <LinkButton href="/habitos" variant="outline"><Leaf size={16} /> Check-in de recuperación</LinkButton>}
          </div>
        </Card>

        {/* Progreso del programa */}
        <Card className="flex flex-col items-center justify-center text-center">
          <Ring value={progDay} max={PROGRAM_DAYS} size={132} stroke={10}>
            <div>
              <div className="text-3xl font-extrabold">{pct}%</div>
              <div className="text-[11px] text-muted">del programa</div>
            </div>
          </Ring>
          <div className="mt-3 text-sm font-bold">Etapa {stage.n} · {stage.title}</div>
          <div className="text-xs text-muted">{stage.subtitle}</div>
        </Card>
      </div>

      {/* Semana */}
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {week.map((d) => {
          const s = dayStatus(db, profile, d);
          const isToday = d === today;
          return (
            <div key={d} className={cx("flex min-w-[3.4rem] flex-1 flex-col items-center gap-1 rounded-full border py-3", isToday ? "border-ink bg-ink text-white" : "border-line bg-surface")}>
              <span className={cx("h-1.5 w-1.5 rounded-full", s.compliant ? (isToday ? "bg-rose" : "bg-rose-deep") : s.partial ? "bg-sand-deep" : "bg-transparent")} />
              <span className={cx("text-xs", isToday ? "text-white/70" : "text-muted")}>{dowShort(d)}</span>
              <span className="text-base font-bold">{Number(d.slice(8))}</span>
            </div>
          );
        })}
      </div>

      {/* Mensajes */}
      {data.msgs.length > 0 && (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {data.msgs.map((msg, i) => {
            const Icon = msg.tone === "good" ? TrendingUp : msg.tone === "warn" ? AlertCircle : Info;
            const inner = (
              <div className={cx("flex h-full items-center gap-3 rounded-2xl px-4 py-3 text-sm", msg.tone === "good" ? "bg-[#e6ede3]" : msg.tone === "warn" ? "bg-[#f6ead9]" : "bg-surface border border-line")}>
                <Icon size={18} className="shrink-0" />
                <span className="flex-1 font-medium">{msg.text}</span>
                {msg.href && <ArrowUpRight size={16} className="shrink-0 text-muted" />}
              </div>
            );
            return msg.href ? <Link key={i} href={msg.href}>{inner}</Link> : <div key={i}>{inner}</div>;
          })}
        </div>
      )}

      {/* Nutrición de hoy */}
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="md:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">Nutrición de hoy</div>
            <Link href="/nutricion" className="text-xs font-semibold text-muted">Registrar →</Link>
          </div>
          {goal ? (
            <div className="mt-4 flex items-center gap-5">
              <Ring value={m.kcal} max={goal.kcal} size={108} stroke={9} color="var(--color-ink)">
                <div>
                  <div className="text-xl font-extrabold">{r0(m.kcal)}</div>
                  <div className="text-[10px] text-muted">de {goal.kcal} kcal</div>
                </div>
              </Ring>
              <div className="flex-1 space-y-3">
                {[
                  { l: "Proteína", v: m.protein_g, g: goal.protein_g, c: "bg-rose-deep" },
                  { l: "Carbohidratos", v: m.carbs_g, g: goal.carbs_g, c: "bg-ink" },
                  { l: "Grasas", v: m.fat_g, g: goal.fat_g, c: "bg-sand-deep" },
                ].map((x) => (
                  <div key={x.l}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-semibold">{x.l}</span>
                      <span className="text-muted">{r0(x.v)} / {x.g} g</span>
                    </div>
                    <Bar value={x.v} max={x.g} color={x.c} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Configura tus objetivos en Nutrición.</p>
          )}
          <p className="mt-3 text-[11px] text-muted">Objetivo {goal?.set_by === "nutricionista" ? "definido con nutricionista" : goal?.set_by === "usuaria" ? "ajustado por ti" : "estimado (fórmula)"}. Valores de alimentos aproximados.</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-sm font-bold"><Droplets size={16} /> Agua</div>
          <div className="mt-3 text-3xl font-extrabold">
            {(water / 1000).toFixed(2)}
            <span className="ml-1 text-sm text-muted">/ {((goal?.water_ml ?? 2000) / 1000).toFixed(1)} L</span>
          </div>
          <Bar value={water} max={goal?.water_ml ?? 2000} className="mt-3" color="bg-ink" />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => addWater(250)} className="flex h-10 items-center justify-center gap-1 rounded-full bg-sand text-sm font-semibold"><Plus size={14} />250 ml</button>
            <button onClick={() => addWater(500)} className="flex h-10 items-center justify-center gap-1 rounded-full bg-sand text-sm font-semibold"><Plus size={14} />500 ml</button>
          </div>
        </Card>

        <Card tone="ink">
          <div className="flex items-center gap-2 text-sm font-bold"><Flame size={16} className="text-rose" /> Racha</div>
          <div className="mt-2 font-serif text-6xl leading-none italic">{data.streak}</div>
          <div className="text-xs text-white/60">días cumplidos seguidos</div>
          <div className="mt-4 text-sm font-bold">Semana: {ws.done}/{ws.planned} sesiones</div>
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: ws.planned }, (_, i) => (
              <span key={i} className={cx("h-2 flex-1 rounded-full", i < ws.done ? "bg-rose" : "bg-white/15")} />
            ))}
          </div>
          <div className="mt-2 text-xs text-white/60">{ws.swims} sesión(es) de natación</div>
        </Card>
      </div>

      {/* Cuerpo */}
      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold">Evolución del peso</div>
            <Link href="/body" className="text-xs font-semibold text-muted">Body Tracking →</Link>
          </div>
          {weights.length >= 2 ? (
            <div className="mt-2"><TrendChart data={weights} unit="kg" reference={profile.start_weight_kg} referenceLabel="referencia 56 kg" /></div>
          ) : (
            <p className="mt-4 text-sm text-muted">Tienes {weights.length} registro de peso. El gráfico aparecerá cuando registres una segunda medición. Recuerda: el peso es sólo un dato; las medidas y la fuerza cuentan igual o más.</p>
          )}
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm font-bold"><Ruler size={16} /> Últimas medidas</div>
          {last ? (
            <>
              <div className="mt-1 text-xs text-muted">Último registro de cada medida · {fmtShort(last.date)}</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {([
                  ["Peso", "weight_kg", "kg"],
                  ["Cintura", "waist_cm", "cm"],
                  ["Cadera", "hip_cm", "cm"],
                  ["Abdomen", "abdomen_cm", "cm"],
                  ["Muslo", "thigh_cm", "cm"],
                  ["Brazo", "arm_cm", "cm"],
                ] as const).map(([l, k, u]) => {
                  const src = [...meas].reverse().find((x) => x[k] != null);
                  const v = src?.[k] ?? null;
                  const b = base?.[k];
                  const d = v != null && b != null && src?.id !== base?.id ? Math.round((v - b) * 10) / 10 : null;
                  return (
                    <div key={k} className="rounded-2xl bg-sand/50 px-3 py-2">
                      <div className="text-[11px] text-muted">{l}</div>
                      <div className="font-bold">{v ?? "–"}{v != null && <span className="text-xs text-muted"> {u}</span>}</div>
                      {d != null && <div className="text-[10px] text-muted">{d > 0 ? "+" : ""}{d} desde día 1</div>}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">Sin medidas aún.</p>
          )}
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-soft px-3 py-2 text-xs">
            <CalendarClock size={14} />
            {nextEval ? <span>Próxima evaluación: <b>día {nextEval}</b> ({fmtShort(dateForDay(profile.start_date, nextEval))})</span> : <span>Todas las evaluaciones completadas</span>}
          </div>
        </Card>
      </div>

      <div className="mt-6 md:mx-auto md:max-w-md">
        <CloseDayButton />
      </div>
    </div>
  );
}
