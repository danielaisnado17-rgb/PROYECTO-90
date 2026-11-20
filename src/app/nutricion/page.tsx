"use client";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Copy, Droplets, Heart, Pencil, Plus, Store, Trash2, Check, Sparkles, Calculator } from "lucide-react";
import { useStore, newId } from "@/lib/store";
import { addDays, fmtLong, fmtShort, nowISO, todayISO } from "@/lib/dates";
import { ACTIVITY_LEVELS, allFoods, currentGoal, estimateTargets, ingredientsMacros, r0, r1, recipeMacros, STRATEGIES, sumLogs, type Strategy } from "@/lib/nutrition";
import { MEAL_IDEAS } from "@/lib/seed/foods";
import { SLOTS, SLOT_LABEL, type Food, type FoodLog, type Goal, type Recipe, type Slot } from "@/lib/types";
import { Badge, Bar, Button, Card, Disclaimer, Field, Input, NumInput, PageHeader, Ring, SectionTitle, Segmented, Select, Sheet, Textarea, confirmDelete, cx } from "@/components/ui";
import { AddFoodSheet, StateBadge } from "@/components/AddFood";

type Tab = "hoy" | "plan" | "alimentos" | "recetas" | "objetivos";

export default function Page() {
  return (
    <Suspense>
      <Nutricion />
    </Suspense>
  );
}

function Nutricion() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as Tab) || "hoy";
  return (
    <div className="rise">
      <PageHeader title="Nutrición" subtitle="4 comidas al día · comer para construir músculo, sin prohibiciones" />
      <Segmented<Tab>
        value={tab}
        onChange={(v) => router.replace(`/nutricion?tab=${v}`)}
        options={[
          { v: "hoy", label: "Registro" },
          { v: "plan", label: "Planificador" },
          { v: "recetas", label: "Recetas" },
          { v: "alimentos", label: "Alimentos" },
          { v: "objetivos", label: "Objetivos" },
        ]}
        className="mb-6 w-fit max-w-full"
      />
      {tab === "hoy" && <Today />}
      {tab === "plan" && <Planner />}
      {tab === "recetas" && <Recipes />}
      {tab === "alimentos" && <Foods />}
      {tab === "objetivos" && <Goals />}
    </div>
  );
}

// ─────────────────────────── Registro diario ───────────────────────────
function Today() {
  const { db, upsert, remove } = useStore();
  const [date, setDate] = useState(todayISO());
  const [adding, setAdding] = useState<Slot | null>(null);
  const [editLog, setEditLog] = useState<FoodLog | null>(null);
  const [favSlot, setFavSlot] = useState<Slot | null>(null);
  const logs = db.food_logs.filter((l) => l.date === date);
  const m = sumLogs(logs);
  const goal = currentGoal(db, date);
  const water = db.hydration_logs.filter((h) => h.date === date);
  const waterMl = water.reduce((a, h) => a + h.ml, 0);

  const copyYesterday = (slot: Slot) => {
    const prev = db.food_logs.filter((l) => l.date === addDays(date, -1) && l.slot === slot);
    upsertCopies(prev);
  };
  const upsertCopies = (rows: FoodLog[]) => rows.forEach((l) => upsert("food_logs", { ...l, id: newId(), date, created_at: nowISO() }));

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setDate(addDays(date, -1))} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface" aria-label="Día anterior"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <div className="text-sm font-bold first-letter:uppercase">{fmtLong(date)}</div>
          {date !== todayISO() && <button className="text-xs text-muted underline" onClick={() => setDate(todayISO())}>Volver a hoy</button>}
        </div>
        <button onClick={() => setDate(addDays(date, 1))} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface" aria-label="Día siguiente"><ChevronRight size={18} /></button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          {goal ? (
            <div className="flex flex-wrap items-center gap-6">
              <Ring value={m.kcal} max={goal.kcal} size={120} stroke={10} color="var(--color-ink)">
                <div>
                  <div className="text-2xl font-extrabold">{r0(m.kcal)}</div>
                  <div className="text-[10px] text-muted">/ {goal.kcal} kcal</div>
                </div>
              </Ring>
              <div className="min-w-[220px] flex-1 space-y-3">
                {[
                  { l: "Proteína", v: m.protein_g, g: goal.protein_g, c: "bg-rose-deep" },
                  { l: "Carbohidratos", v: m.carbs_g, g: goal.carbs_g, c: "bg-ink" },
                  { l: "Grasas", v: m.fat_g, g: goal.fat_g, c: "bg-sand-deep" },
                  { l: "Fibra", v: m.fiber_g, g: goal.fiber_g, c: "bg-sage" },
                ].map((x) => (
                  <div key={x.l}>
                    <div className="mb-1 flex justify-between text-xs"><span className="font-semibold">{x.l}</span><span className="text-muted">{r0(x.v)} / {x.g} g</span></div>
                    <Bar value={x.v} max={x.g} color={x.c} />
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-sm text-muted">Sin objetivos. Configúralos en la pestaña Objetivos.</p>}
          {goal && m.protein_g < goal.protein_g && logs.length > 0 && <p className="mt-4 text-xs text-muted">Te faltan <b className="text-ink">{r0(goal.protein_g - m.protein_g)} g de proteína</b>. Ideas rápidas: yogur griego, huevos, atún, pollo.</p>}
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm font-bold"><Droplets size={16} /> Hidratación</div>
          <div className="mt-2 text-3xl font-extrabold">{(waterMl / 1000).toFixed(2)} <span className="text-sm text-muted">/ {((goal?.water_ml ?? 2000) / 1000).toFixed(1)} L</span></div>
          <Bar value={waterMl} max={goal?.water_ml ?? 2000} className="mt-2" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[150, 250, 500].map((ml) => (
              <button key={ml} onClick={() => upsert("hydration_logs", { id: newId(), date, ml, created_at: nowISO() })} className="h-10 rounded-full bg-sand text-xs font-bold">+{ml}</button>
            ))}
          </div>
          {water.length > 0 && <button className="mt-3 text-xs text-muted underline" onClick={() => remove("hydration_logs", water[water.length - 1].id)}>Deshacer último ({water[water.length - 1].ml} ml)</button>}
          <p className="mt-3 text-[11px] text-muted">Referencia configurable (1,5–3 L). En días de natación o calor puedes necesitar algo más.</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {SLOTS.map((slot) => {
          const items = logs.filter((l) => l.slot === slot);
          const sm = sumLogs(items);
          return (
            <Card key={slot}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">{SLOT_LABEL[slot]}</div>
                  <div className="text-xs text-muted">{items.length ? `${r0(sm.kcal)} kcal · ${r0(sm.protein_g)} g proteína` : "Sin registrar"}</div>
                </div>
                <button onClick={() => setAdding(slot)} className="grid h-10 w-10 place-items-center rounded-full bg-ink text-white" aria-label={`Añadir a ${SLOT_LABEL[slot]}`}><Plus size={18} /></button>
              </div>
              {items.length > 0 && (
                <div className="mt-3 divide-y divide-line">
                  {items.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 py-2">
                      <button className="flex-1 text-left" onClick={() => { setEditLog(l); setAdding(slot); }}>
                        <div className="text-sm font-semibold">{l.name} {l.eaten_out && <Store size={12} className="inline text-muted" />}</div>
                        <div className="text-xs text-muted">{l.grams} g · {r0(l.kcal)} kcal · P {r0(l.protein_g)} · C {r0(l.carbs_g)} · G {r0(l.fat_g)}</div>
                      </button>
                      <button onClick={() => remove("food_logs", l.id)} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-rose-deep" aria-label="Eliminar"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {items.length === 0 && db.food_logs.some((l) => l.date === addDays(date, -1) && l.slot === slot) && (
                  <button onClick={() => copyYesterday(slot)} className="inline-flex h-8 items-center gap-1 rounded-full bg-sand px-3 text-xs font-semibold"><Copy size={12} /> Repetir lo de ayer</button>
                )}
                {items.length > 0 && <button onClick={() => setFavSlot(slot)} className="inline-flex h-8 items-center gap-1 rounded-full bg-rose-soft px-3 text-xs font-semibold text-rose-deep"><Heart size={12} /> Guardar como favorita</button>}
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted">Los valores nutricionales son estimaciones basadas en tablas de referencia. Ningún alimento está prohibido: registrar todo con honestidad es lo que permite ajustar bien.</p>

      {adding && <AddFoodSheet key={editLog?.id ?? adding} open date={date} slot={adding} editLog={editLog} onClose={() => { setAdding(null); setEditLog(null); }} />}
      <SaveFavorite slot={favSlot} items={favSlot ? logs.filter((l) => l.slot === favSlot) : []} onClose={() => setFavSlot(null)} />
    </>
  );
}

function SaveFavorite({ slot, items, onClose }: { slot: Slot | null; items: FoodLog[]; onClose: () => void }) {
  const { upsert } = useStore();
  const [name, setName] = useState("");
  const usable = items.filter((i) => i.food_id);
  return (
    <Sheet open={!!slot} onClose={onClose} title="Guardar comida favorita">
      <Field label="Nombre"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={slot ? `Mi ${SLOT_LABEL[slot].toLowerCase()} favorito` : ""} /></Field>
      <p className="mt-3 text-xs text-muted">{usable.length} alimento(s) con sus gramos. La próxima vez podrás registrarla con un toque.</p>
      <Button className="mt-4 w-full" onClick={() => { upsert("recipes", { id: newId(), name: name || `Favorita ${slot ? SLOT_LABEL[slot] : ""}`, kind: "favorita", ingredients: usable.map((i) => ({ food_id: i.food_id!, grams: i.grams })), servings: 1, favorite: true, notes: "" }); setName(""); onClose(); }} disabled={!usable.length}>Guardar</Button>
    </Sheet>
  );
}

// ─────────────────────────── Planificador ───────────────────────────
function Planner() {
  const { db, upsert, remove } = useStore();
  const foods = useMemo(() => allFoods(db), [db]);
  const [start, setStart] = useState(todayISO());
  const [pick, setPick] = useState<{ date: string; slot: Slot } | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  function logPlan(planId: string) {
    const p = db.meal_plans.find((x) => x.id === planId);
    if (!p) return;
    for (const it of p.items) {
      const f = foods.find((x) => x.id === it.food_id);
      if (!f || !it.grams) continue;
      const k = it.grams / 100;
      upsert("food_logs", { id: newId(), date: p.date, slot: p.slot, food_id: f.id, recipe_id: null, name: f.name, grams: it.grams, kcal: r1(f.kcal * k), protein_g: r1(f.protein_g * k), carbs_g: r1(f.carbs_g * k), fat_g: r1(f.fat_g * k), fiber_g: r1(f.fiber_g * k), eaten_out: false, estimated: f.estimated, created_at: nowISO() });
    }
    upsert("meal_plans", { ...p, done: true });
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setStart(addDays(start, -7))}><ChevronLeft size={14} /></Button>
        <div className="text-sm font-semibold">{fmtShort(days[0])} – {fmtShort(days[6])}</div>
        <Button variant="outline" size="sm" onClick={() => setStart(addDays(start, 7))}><ChevronRight size={14} /></Button>
      </div>
      <div className="space-y-4">
        {days.map((d) => {
          const plans = db.meal_plans.filter((p) => p.date === d);
          const total = plans.reduce((acc, p) => { const mm = ingredientsMacros(p.items, foods).macros; return { k: acc.k + mm.kcal, p: acc.p + mm.protein_g }; }, { k: 0, p: 0 });
          return (
            <Card key={d}>
              <div className="mb-3 flex items-center justify-between">
                <div className="font-bold first-letter:uppercase">{fmtLong(d)}</div>
                {plans.length > 0 && <div className="text-xs text-muted">≈ {r0(total.k)} kcal · {r0(total.p)} g prot. planificados</div>}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {SLOTS.map((slot) => {
                  const p = plans.find((x) => x.slot === slot);
                  return (
                    <div key={slot} className={cx("rounded-2xl p-3", p ? (p.done ? "bg-good-soft" : "bg-sand/60") : "border border-dashed border-sand-deep")}>
                      <div className="text-[11px] font-bold tracking-wide text-muted uppercase">{SLOT_LABEL[slot]}</div>
                      {p ? (
                        <>
                          <div className="mt-1 text-sm font-semibold">{p.title}</div>
                          <div className="text-xs text-muted">{r0(ingredientsMacros(p.items, foods).macros.protein_g)} g prot.</div>
                          <div className="mt-2 flex gap-1">
                            {!p.done ? <button onClick={() => logPlan(p.id)} className="inline-flex h-7 items-center gap-1 rounded-full bg-ink px-2.5 text-[11px] font-bold text-white"><Check size={11} /> Lo comí</button> : <Badge tone="good">Registrado</Badge>}
                            <button onClick={() => remove("meal_plans", p.id)} className="grid h-7 w-7 place-items-center rounded-full text-muted" aria-label="Quitar"><Trash2 size={12} /></button>
                          </div>
                        </>
                      ) : (
                        <button onClick={() => setPick({ date: d, slot })} className="mt-1 flex items-center gap-1 text-sm font-semibold text-muted"><Plus size={14} /> Planificar</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
      <Sheet open={!!pick} onClose={() => setPick(null)} title={pick ? `${SLOT_LABEL[pick.slot]} · ${fmtShort(pick.date)}` : ""} wide>
        {pick && (
          <>
            <div className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">Mis recetas y favoritas</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {db.recipes.map((r) => {
                const mm = recipeMacros(r, foods);
                return (
                  <button key={r.id} onClick={() => { upsert("meal_plans", { id: newId(), date: pick.date, slot: pick.slot, title: r.name, items: r.ingredients.filter((i) => i.grams), recipe_id: r.id, done: false }); setPick(null); }} className="rounded-2xl bg-rose-soft/60 p-3 text-left">
                    <div className="text-sm font-semibold">{r.name}</div>
                    <div className="text-xs text-muted">{mm.missing ? "Faltan gramos" : `${r0(mm.macros.kcal)} kcal · ${r0(mm.macros.protein_g)} g prot.`}</div>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 mb-2 flex items-center gap-1 text-xs font-bold tracking-wide text-muted uppercase"><Sparkles size={12} /> Ideas altas en proteína</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {MEAL_IDEAS.filter((i) => i.slot === pick.slot).concat(MEAL_IDEAS.filter((i) => i.slot !== pick.slot)).map((idea) => {
                const mm = ingredientsMacros(idea.items, foods).macros;
                return (
                  <button key={idea.title} onClick={() => { upsert("meal_plans", { id: newId(), date: pick.date, slot: pick.slot, title: idea.title, items: idea.items, recipe_id: null, done: false }); setPick(null); }} className="rounded-2xl border border-line p-3 text-left hover:bg-sand/40">
                    <div className="text-sm font-semibold">{idea.title}</div>
                    <div className="text-xs text-muted">≈ {r0(mm.kcal)} kcal · {r0(mm.protein_g)} g prot.</div>
                    <div className="mt-1 text-[11px] text-ink/60">{idea.tip}</div>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-muted">Macros calculados con la base de alimentos (valores de referencia).</p>
          </>
        )}
      </Sheet>
    </>
  );
}

// ─────────────────────────── Recetas ───────────────────────────
function Recipes() {
  const { db, upsert, remove } = useStore();
  const foods = useMemo(() => allFoods(db), [db]);
  const [edit, setEdit] = useState<Recipe | null>(null);
  const list = [...db.recipes].sort((a, b) => (a.id === "rec_batido" ? -1 : b.id === "rec_batido" ? 1 : a.name.localeCompare(b.name)));
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((r) => {
          const mm = recipeMacros(r, foods);
          return (
            <Card key={r.id} tone={r.id === "rec_batido" ? "rose" : "surface"}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-extrabold">{r.name}</div>
                  <div className="text-xs text-muted">{r.kind === "favorita" ? "Comida favorita" : "Receta"} · {r.servings} porción(es)</div>
                </div>
                <Button size="sm" variant="soft" onClick={() => setEdit(structuredClone(r))}><Pencil size={13} /> Editar</Button>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {r.ingredients.map((i, k) => {
                  const f = foods.find((x) => x.id === i.food_id);
                  return <div key={k} className="flex justify-between"><span>{f?.name ?? i.food_id}</span><span className={i.grams ? "text-muted" : "font-semibold text-warn"}>{i.grams ? `${i.grams} g` : "pesar"}</span></div>;
                })}
              </div>
              <div className="mt-3 rounded-2xl bg-surface/70 px-3 py-2 text-xs">
                {mm.missing ? `Faltan ${mm.missing} ingrediente(s) por pesar — el total aún no es exacto.` : `Total: ${r0(mm.macros.kcal)} kcal · P ${r0(mm.macros.protein_g)} g · C ${r0(mm.macros.carbs_g)} g · G ${r0(mm.macros.fat_g)} g · Fibra ${r0(mm.macros.fiber_g)} g`}
              </div>
            </Card>
          );
        })}
      </div>
      <Button className="mt-5" onClick={() => setEdit({ id: newId(), name: "Nueva receta", kind: "receta", ingredients: [], servings: 1, favorite: false, notes: "" })}><Plus size={16} /> Nueva receta</Button>
      {edit && <RecipeEditor recipe={edit} foods={foods} onClose={() => setEdit(null)} onSave={(r) => { upsert("recipes", r); setEdit(null); }} onDelete={edit.id !== "rec_batido" && db.recipes.some((x) => x.id === edit.id) ? () => { if (confirmDelete("esta receta")) { remove("recipes", edit.id); setEdit(null); } } : undefined} />}
    </>
  );
}

function RecipeEditor({ recipe, foods, onClose, onSave, onDelete }: { recipe: Recipe; foods: Food[]; onClose: () => void; onSave: (r: Recipe) => void; onDelete?: () => void }) {
  const [r, setR] = useState(recipe);
  const [q, setQ] = useState("");
  const mm = recipeMacros(r, foods);
  const results = q ? foods.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8) : [];
  return (
    <Sheet open onClose={onClose} title="Editar receta" wide>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nombre" className="sm:col-span-2"><Input value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} /></Field>
        <Field label="Porciones"><NumInput value={r.servings} step={0.5} onChange={(v) => setR({ ...r, servings: v ?? 1 })} /></Field>
      </div>
      {r.id === "rec_batido" && <Disclaimer>Pesa cada ingrediente en tu balanza y escribe los gramos reales. Puedes cambiar la fruta, quitar o añadir ingredientes (p. ej. yogur griego o whey para más proteína).</Disclaimer>}
      <div className="mt-4 space-y-2">
        {r.ingredients.map((i, k) => {
          const f = foods.find((x) => x.id === i.food_id);
          return (
            <div key={k} className="flex items-center gap-2 rounded-2xl bg-sand/40 p-2 pl-4">
              <div className="flex-1">
                <div className="text-sm font-semibold">{f?.name ?? i.food_id}</div>
                {f && <StateBadge state={f.state} />}
              </div>
              <NumInput className="w-24" value={i.grams} placeholder="g" onChange={(v) => setR({ ...r, ingredients: r.ingredients.map((x, j) => (j === k ? { ...x, grams: v } : x)) })} />
              <span className="text-xs text-muted">g</span>
              <button onClick={() => setR({ ...r, ingredients: r.ingredients.filter((_, j) => j !== k) })} className="grid h-9 w-9 place-items-center rounded-full text-rose-deep" aria-label="Quitar"><Trash2 size={14} /></button>
            </div>
          );
        })}
      </div>
      <div className="mt-3">
        <Input placeholder="Añadir ingrediente: buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        {results.length > 0 && (
          <div className="mt-1 rounded-2xl border border-line bg-white p-1">
            {results.map((f) => <button key={f.id} onClick={() => { setR({ ...r, ingredients: [...r.ingredients, { food_id: f.id, grams: null }] }); setQ(""); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-sand/50">{f.name} <span className="text-xs text-muted">({f.state})</span></button>)}
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 rounded-3xl bg-sand/50 p-3 text-center">
        {[["kcal", mm.macros.kcal / r.servings], ["Prot.", mm.macros.protein_g / r.servings], ["Carb.", mm.macros.carbs_g / r.servings], ["Grasa", mm.macros.fat_g / r.servings]].map(([l, v]) => (
          <div key={l as string}><div className="text-lg font-extrabold">{r0(v as number)}</div><div className="text-[10px] text-muted">{l} / porción</div></div>
        ))}
      </div>
      {mm.missing > 0 && <p className="mt-2 text-xs text-warn">{mm.missing} ingrediente(s) sin gramos no se incluyen en el cálculo.</p>}
      <Field label="Notas" className="mt-4"><Textarea value={r.notes} onChange={(e) => setR({ ...r, notes: e.target.value })} /></Field>
      <div className="mt-5 flex gap-2">
        <Button onClick={() => onSave(r)}>Guardar</Button>
        {onDelete && <Button variant="danger" onClick={onDelete}><Trash2 size={14} /> Eliminar</Button>}
      </div>
    </Sheet>
  );
}

// ─────────────────────────── Alimentos ───────────────────────────
function Foods() {
  const { db, upsert, remove } = useStore();
  const foods = useMemo(() => allFoods(db), [db]);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Food | null>(null);
  const list = foods.filter((f) => (f.name + f.category).toLowerCase().includes(q.toLowerCase()));
  const groups = [...new Set(list.map((f) => f.category))];
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="max-w-sm" placeholder="Buscar alimento" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={() => setEdit({ id: "fc_" + newId().slice(0, 8), name: "", category: "Personalizados", state: "listo", kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, portion_name: "porción", portion_g: 100, source: "Etiqueta / dato propio", estimated: false, is_custom: true })}><Plus size={16} /> Alimento personalizado</Button>
      </div>
      <Disclaimer>Valores por 100 g tomados de USDA FoodData Central (redondeados) y marcados como referencia. Los platos de fuera de casa son estimaciones por composición. Si tienes la etiqueta del producto, edita el alimento con esos datos.</Disclaimer>
      {groups.map((g) => (
        <div key={g}>
          <SectionTitle>{g}</SectionTitle>
          <div className="overflow-hidden rounded-[1.5rem] border border-line bg-surface">
            <div className="hidden grid-cols-[1fr_repeat(5,4.5rem)_2.5rem] gap-2 border-b border-line px-4 py-2 text-[10px] font-bold tracking-wide text-muted uppercase md:grid">
              <span>Por 100 g</span><span className="text-right">kcal</span><span className="text-right">Prot.</span><span className="text-right">Carb.</span><span className="text-right">Grasa</span><span className="text-right">Fibra</span><span />
            </div>
            {list.filter((f) => f.category === g).map((f) => (
              <div key={f.id} className="grid grid-cols-[1fr_2.5rem] items-center gap-2 border-b border-line px-4 py-3 last:border-0 md:grid-cols-[1fr_repeat(5,4.5rem)_2.5rem]">
                <div>
                  <div className="text-sm font-semibold">{f.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted">
                    {f.state !== "listo" && <StateBadge state={f.state} />}
                    {f.estimated ? <Badge>{f.source.startsWith("Estimación") ? "Estimado" : "Referencia"}</Badge> : <Badge tone="good">Dato propio</Badge>}
                    <span>{f.portion_name} = {f.portion_g} g · {r0((f.kcal * f.portion_g) / 100)} kcal · {r1((f.protein_g * f.portion_g) / 100)} g prot.</span>
                  </div>
                  <div className="mt-1 text-[11px] text-muted md:hidden">{f.kcal} kcal · P {f.protein_g} · C {f.carbs_g} · G {f.fat_g} · F {f.fiber_g}</div>
                </div>
                {[f.kcal, f.protein_g, f.carbs_g, f.fat_g, f.fiber_g].map((v, i) => <span key={i} className="hidden text-right text-sm md:block">{v}</span>)}
                <button onClick={() => setEdit({ ...f })} className="grid h-9 w-9 place-items-center rounded-full bg-sand" aria-label="Editar"><Pencil size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {edit && (
        <Sheet open onClose={() => setEdit(null)} title={edit.name || "Nuevo alimento"}>
          <div className="space-y-3">
            <Field label="Nombre"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoría"><Input value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} /></Field>
              <Field label="Se pesa"><Select value={edit.state} onChange={(e) => setEdit({ ...edit, state: e.target.value as Food["state"] })}><option value="crudo">En crudo</option><option value="cocido">Cocido</option><option value="listo">Listo / tal cual</option></Select></Field>
            </div>
            <div className="text-xs font-bold tracking-wide text-muted uppercase">Por cada 100 g</div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="kcal"><NumInput value={edit.kcal} onChange={(v) => setEdit({ ...edit, kcal: v ?? 0 })} /></Field>
              <Field label="Proteína g"><NumInput value={edit.protein_g} step={0.1} onChange={(v) => setEdit({ ...edit, protein_g: v ?? 0 })} /></Field>
              <Field label="Carbs g"><NumInput value={edit.carbs_g} step={0.1} onChange={(v) => setEdit({ ...edit, carbs_g: v ?? 0 })} /></Field>
              <Field label="Grasa g"><NumInput value={edit.fat_g} step={0.1} onChange={(v) => setEdit({ ...edit, fat_g: v ?? 0 })} /></Field>
              <Field label="Fibra g"><NumInput value={edit.fiber_g} step={0.1} onChange={(v) => setEdit({ ...edit, fiber_g: v ?? 0 })} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre de porción"><Input value={edit.portion_name} onChange={(e) => setEdit({ ...edit, portion_name: e.target.value })} /></Field>
              <Field label="Porción (g)"><NumInput value={edit.portion_g} onChange={(v) => setEdit({ ...edit, portion_g: v ?? 100 })} /></Field>
            </div>
            <Field label="Fuente"><Input value={edit.source} onChange={(e) => setEdit({ ...edit, source: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.estimated} onChange={(e) => setEdit({ ...edit, estimated: e.target.checked })} /> Es un valor estimado</label>
            <div className="flex gap-2">
              <Button disabled={!edit.name.trim()} onClick={() => { upsert("foods", edit); setEdit(null); }}>Guardar</Button>
              {db.foods.some((f) => f.id === edit.id) && <Button variant="danger" onClick={() => { if (confirmDelete(edit.is_custom ? "este alimento" : "tus cambios (vuelve al valor de referencia)")) { remove("foods", edit.id); setEdit(null); } }}><Trash2 size={14} /> {edit.is_custom ? "Eliminar" : "Restaurar"}</Button>}
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}

// ─────────────────────────── Objetivos ───────────────────────────
function Goals() {
  const { db, profile, upsert, remove } = useStore();
  const today = todayISO();
  const lastWeight = [...db.body_measurements].filter((m) => m.weight_kg != null).sort((a, b) => (a.date < b.date ? 1 : -1))[0]?.weight_kg ?? profile?.start_weight_kg ?? 56;
  const [weight, setWeight] = useState<number | null>(lastWeight);
  const [activity, setActivity] = useState(profile?.activity_factor ?? 1.55);
  const [strategy, setStrategy] = useState<Strategy>("recomposicion");
  const [ppk, setPpk] = useState(2.0);
  const [fpk, setFpk] = useState(0.9);
  const goal = currentGoal(db, today);
  const [manual, setManual] = useState<Goal | null>(null);
  if (!profile) return null;
  const est = estimateTargets({ ...profile, activity_factor: activity }, weight ?? 56, strategy, ppk, fpk);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card tone="ink">
          <div className="text-sm font-bold text-white/70">Objetivo vigente</div>
          {goal ? (
            <>
              <div className="mt-2 font-serif text-6xl italic">{goal.kcal}<span className="ml-2 font-sans text-base not-italic text-white/60">kcal</span></div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div><div className="text-white/50 text-xs">Proteína</div><b>{goal.protein_g} g</b></div>
                <div><div className="text-white/50 text-xs">Carbohidratos</div><b>{goal.carbs_g} g</b></div>
                <div><div className="text-white/50 text-xs">Grasas</div><b>{goal.fat_g} g</b></div>
                <div><div className="text-white/50 text-xs">Fibra</div><b>{goal.fiber_g} g</b></div>
                <div><div className="text-white/50 text-xs">Agua</div><b>{(goal.water_ml / 1000).toFixed(1)} L</b></div>
                <div><div className="text-white/50 text-xs">Definido por</div><b>{goal.set_by === "nutricionista" ? "Nutricionista" : goal.set_by === "usuaria" ? "Tú" : "Estimación"}</b></div>
              </div>
              <div className="mt-3 text-xs text-white/50">Desde {fmtShort(goal.valid_from)}. {goal.notes}</div>
              <Button variant="rose" className="mt-5" onClick={() => setManual({ ...goal, id: newId(), valid_from: today, set_by: "usuaria", notes: "" })}><Pencil size={14} /> Ajustar manualmente / nutricionista</Button>
            </>
          ) : <p className="mt-2 text-sm">Sin objetivos aún.</p>}
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-sm font-bold"><Calculator size={16} /> Calculadora (estimación)</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Peso actual (kg)"><NumInput value={weight} step={0.1} onChange={setWeight} /></Field>
            <Field label="Actividad"><Select value={activity} onChange={(e) => setActivity(Number(e.target.value))}>{ACTIVITY_LEVELS.map((a) => <option key={a.v} value={a.v}>{a.v} · {a.label}</option>)}</Select></Field>
            <Field label="Estrategia" className="col-span-2"><Select value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy)}>{STRATEGIES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</Select></Field>
            <Field label={`Proteína: ${ppk.toFixed(1)} g/kg`}><input type="range" min={1.6} max={2.2} step={0.1} value={ppk} onChange={(e) => setPpk(Number(e.target.value))} className="w-full accent-[#e8559a]" /></Field>
            <Field label={`Grasa: ${fpk.toFixed(1)} g/kg`}><input type="range" min={0.7} max={1.1} step={0.1} value={fpk} onChange={(e) => setFpk(Number(e.target.value))} className="w-full accent-[#e8559a]" /></Field>
          </div>
          <p className="mt-2 text-xs text-muted">{STRATEGIES.find((s) => s.v === strategy)?.desc}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-3xl bg-sand/50 p-3 text-center text-sm">
            <div><div className="text-[10px] text-muted">Metabolismo basal</div><b>{est.bmr}</b></div>
            <div><div className="text-[10px] text-muted">Gasto estimado</div><b>{est.tdee}</b></div>
            <div><div className="text-[10px] text-muted">Objetivo</div><b>{est.target.kcal} kcal</b></div>
            <div><div className="text-[10px] text-muted">Proteína</div><b>{est.target.protein_g} g</b></div>
            <div><div className="text-[10px] text-muted">Carbs</div><b>{est.target.carbs_g} g</b></div>
            <div><div className="text-[10px] text-muted">Grasa</div><b>{est.target.fat_g} g</b></div>
          </div>
          <Button className="mt-4 w-full" onClick={() => upsert("goals", { ...est.target, id: newId(), valid_from: today })}>Aplicar como objetivo desde hoy</Button>
          <p className="mt-3 text-[11px] text-muted">Fórmula Mifflin-St Jeor × factor de actividad. No usa porcentaje de grasa corporal (no está medido). Es una estimación de partida: ajústala según tu peso semanal promedio, hambre, energía y rendimiento.</p>
        </Card>
      </div>

      <SectionTitle>Historial de objetivos</SectionTitle>
      <div className="space-y-2">
        {[...db.goals].sort((a, b) => (a.valid_from < b.valid_from ? 1 : -1)).map((g) => (
          <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
            <div className="w-16 text-xs text-muted">{fmtShort(g.valid_from)}</div>
            <div className="flex-1"><b>{g.kcal} kcal</b> · P {g.protein_g} · C {g.carbs_g} · G {g.fat_g} · {(g.water_ml / 1000).toFixed(1)} L</div>
            <Badge tone={g.set_by === "nutricionista" ? "rose" : "sand"}>{g.set_by}</Badge>
            {db.goals.length > 1 && <button onClick={() => confirmDelete("este objetivo") && remove("goals", g.id)} className="text-muted" aria-label="Eliminar"><Trash2 size={14} /></button>}
          </div>
        ))}
      </div>
      <div className="mt-4"><Disclaimer>Esta app no sustituye a un profesional. Para objetivos personalizados, condiciones médicas o si notas cansancio extremo, alteraciones del ciclo menstrual o mucha hambre, consulta con un/a nutricionista. No se recomiendan dietas extremas.</Disclaimer></div>

      {manual && (
        <Sheet open onClose={() => setManual(null)} title="Ajustar objetivos">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calorías"><NumInput value={manual.kcal} step={10} onChange={(v) => setManual({ ...manual, kcal: v ?? 0 })} /></Field>
            <Field label="Proteína g"><NumInput value={manual.protein_g} onChange={(v) => setManual({ ...manual, protein_g: v ?? 0 })} /></Field>
            <Field label="Carbohidratos g"><NumInput value={manual.carbs_g} onChange={(v) => setManual({ ...manual, carbs_g: v ?? 0 })} /></Field>
            <Field label="Grasas g"><NumInput value={manual.fat_g} onChange={(v) => setManual({ ...manual, fat_g: v ?? 0 })} /></Field>
            <Field label="Fibra g"><NumInput value={manual.fiber_g} onChange={(v) => setManual({ ...manual, fiber_g: v ?? 0 })} /></Field>
            <Field label="Agua ml" hint="1500–3000"><NumInput value={manual.water_ml} step={100} onChange={(v) => setManual({ ...manual, water_ml: Math.min(3000, Math.max(1500, v ?? 2000)) })} /></Field>
            <Field label="Definido por" className="col-span-2"><Select value={manual.set_by} onChange={(e) => setManual({ ...manual, set_by: e.target.value as Goal["set_by"] })}><option value="usuaria">Yo</option><option value="nutricionista">Mi nutricionista</option></Select></Field>
            <Field label="Vigente desde" className="col-span-2"><Input type="date" value={manual.valid_from} onChange={(e) => setManual({ ...manual, valid_from: e.target.value })} /></Field>
            <Field label="Notas" className="col-span-2"><Textarea value={manual.notes} onChange={(e) => setManual({ ...manual, notes: e.target.value })} /></Field>
          </div>
          <p className="mt-2 text-xs text-muted">Calorías de los macros: {manual.protein_g * 4 + manual.carbs_g * 4 + manual.fat_g * 9} kcal.</p>
          <Button className="mt-4 w-full" onClick={() => { upsert("goals", manual); setManual(null); }}>Guardar objetivo</Button>
        </Sheet>
      )}
    </>
  );
}
