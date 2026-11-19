"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, Heart, Search, Store } from "lucide-react";
import { useStore, newId } from "@/lib/store";
import { nowISO } from "@/lib/dates";
import { allFoods, macrosFor, r0, r1, recipeMacros } from "@/lib/nutrition";
import type { Food, FoodLog, Recipe, Slot } from "@/lib/types";
import { SLOT_LABEL } from "@/lib/types";
import { Badge, Button, Chip, Input, NumInput, Sheet, cx } from "./ui";

export function StateBadge({ state }: { state: Food["state"] }) {
  if (state === "crudo") return <Badge tone="warn">Peso en crudo</Badge>;
  if (state === "cocido") return <Badge tone="good">Peso cocido</Badge>;
  return null;
}

export function AddFoodSheet({ open, onClose, date, slot, editLog }: { open: boolean; onClose: () => void; date: string; slot: Slot; editLog?: FoodLog | null }) {
  const { db, upsert } = useStore();
  const foods = useMemo(() => allFoods(db), [db]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Todos");
  const [food, setFood] = useState<Food | null>(editLog?.food_id ? foods.find((f) => f.id === editLog.food_id) ?? null : null);
  const [recipe, setRecipe] = useState<Recipe | null>(editLog?.recipe_id ? db.recipes.find((r) => r.id === editLog.recipe_id) ?? null : null);
  const [grams, setGrams] = useState<number | null>(editLog?.grams ?? null);
  const [servings, setServings] = useState<number | null>(1);
  const [out, setOut] = useState(editLog?.eaten_out ?? false);

  const cats = ["Todos", "Recetas y favoritas", ...new Set(foods.map((f) => f.category))];
  const recipes = db.recipes.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  const list = foods.filter((f) => (cat === "Todos" || f.category === cat) && f.name.toLowerCase().includes(q.toLowerCase()));

  const reset = () => { setFood(null); setRecipe(null); setGrams(null); setServings(1); setQ(""); };
  const close = () => { reset(); onClose(); };

  function save() {
    const base = { id: editLog?.id ?? newId(), date, slot, eaten_out: out, created_at: editLog?.created_at ?? nowISO() };
    if (food && grams) {
      const m = macrosFor(food, grams);
      upsert("food_logs", { ...base, food_id: food.id, recipe_id: null, name: food.name, grams, kcal: r1(m.kcal), protein_g: r1(m.protein_g), carbs_g: r1(m.carbs_g), fat_g: r1(m.fat_g), fiber_g: r1(m.fiber_g), estimated: food.estimated });
    } else if (recipe && servings) {
      const { macros, grams: g } = recipeMacros(recipe, foods);
      const k = servings / Math.max(1, recipe.servings);
      upsert("food_logs", { ...base, food_id: null, recipe_id: recipe.id, name: `${recipe.name}${servings !== recipe.servings ? ` (${servings} porc.)` : ""}`, grams: r0(g * k), kcal: r1(macros.kcal * k), protein_g: r1(macros.protein_g * k), carbs_g: r1(macros.carbs_g * k), fat_g: r1(macros.fat_g * k), fiber_g: r1(macros.fiber_g * k), estimated: true });
    }
    close();
  }

  const preview = food && grams ? macrosFor(food, grams) : recipe && servings ? (() => { const { macros } = recipeMacros(recipe, foods); const k = servings / Math.max(1, recipe.servings); return { kcal: macros.kcal * k, protein_g: macros.protein_g * k, carbs_g: macros.carbs_g * k, fat_g: macros.fat_g * k, fiber_g: macros.fiber_g * k }; })() : null;
  const recipeMissing = recipe ? recipeMacros(recipe, foods).missing : 0;

  return (
    <Sheet open={open} onClose={close} title={food || recipe ? <button onClick={reset} className="flex items-center gap-1"><ChevronLeft size={18} />{SLOT_LABEL[slot]}</button> : `Añadir a ${SLOT_LABEL[slot].toLowerCase()}`}>
      {!food && !recipe ? (
        <>
          <div className="relative">
            <Search size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
            <Input className="pl-10" placeholder="Buscar alimento o receta" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
            {cats.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)} className="shrink-0">{c}</Chip>)}
          </div>
          <div className="mt-3 max-h-[52vh] space-y-1 overflow-y-auto">
            {(cat === "Todos" || cat === "Recetas y favoritas") && recipes.map((r) => {
              const m = recipeMacros(r, foods);
              return (
                <button key={r.id} onClick={() => { setRecipe(r); setServings(r.servings); }} className="flex w-full items-center gap-3 rounded-2xl bg-rose-soft/60 px-3 py-2.5 text-left">
                  <Heart size={15} className="shrink-0 text-rose-deep" />
                  <span className="flex-1"><span className="block text-sm font-semibold">{r.name}</span><span className="text-xs text-muted">{m.missing ? `${m.missing} ingrediente(s) sin pesar` : `${r0(m.macros.kcal)} kcal · ${r0(m.macros.protein_g)} g prot.`}</span></span>
                </button>
              );
            })}
            {cat !== "Recetas y favoritas" && list.map((f) => (
              <button key={f.id} onClick={() => { setFood(f); setGrams(f.portion_g); }} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-sand/60">
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{f.name}</span>
                  <span className="text-xs text-muted">{f.kcal} kcal · {f.protein_g} g prot. /100 g {f.state !== "listo" ? `· ${f.state}` : ""}</span>
                </span>
              </button>
            ))}
            {list.length === 0 && recipes.length === 0 && <p className="py-6 text-center text-sm text-muted">Sin resultados. Puedes crear un alimento en Nutrición → Alimentos.</p>}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="text-xl font-extrabold">{food?.name ?? recipe?.name}</div>
            {food && <div className="mt-1 flex flex-wrap gap-1.5"><StateBadge state={food.state} />{food.estimated && <Badge>Valor de referencia</Badge>}</div>}
          </div>
          {food ? (
            <>
              <div className="flex items-center gap-2">
                <NumInput value={grams} onChange={setGrams} placeholder="gramos" className="text-lg font-bold" />
                <span className="text-sm font-semibold text-muted">g</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip onClick={() => setGrams(food.portion_g)}>{food.portion_name} ({food.portion_g} g)</Chip>
                {[50, 100, 150, 200].map((g) => <Chip key={g} onClick={() => setGrams(g)}>{g} g</Chip>)}
              </div>
              {food.state === "crudo" && <p className="text-xs text-muted">Estos valores son para el alimento <b>pesado en crudo</b>. Si lo pesaste cocido, busca la versión «cocido».</p>}
              {food.state === "cocido" && <p className="text-xs text-muted">Estos valores son para el alimento <b>pesado ya cocido</b>.</p>}
            </>
          ) : recipe ? (
            <>
              <div className="flex items-center gap-2">
                <NumInput value={servings} step={0.5} onChange={setServings} className="text-lg font-bold" />
                <span className="text-sm font-semibold text-muted">porción(es) de {recipe.servings}</span>
              </div>
              {recipeMissing > 0 && <p className="rounded-2xl bg-[#f6ead9] px-3 py-2 text-xs">Hay {recipeMissing} ingrediente(s) sin gramos: no se cuentan. Complétalos en Recetas.</p>}
            </>
          ) : null}
          <button onClick={() => setOut(!out)} className={cx("flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold", out ? "bg-ink text-white" : "bg-sand/60")}>
            <span className="flex items-center gap-2"><Store size={16} /> Comí fuera de casa</span>
            <span>{out ? "Sí" : "No"}</span>
          </button>
          {preview && (
            <div className="grid grid-cols-4 gap-2 rounded-3xl bg-sand/50 p-3 text-center">
              {[["kcal", preview.kcal], ["Prot.", preview.protein_g], ["Carb.", preview.carbs_g], ["Grasa", preview.fat_g]].map(([l, v]) => (
                <div key={l as string}><div className="text-lg font-extrabold">{r0(v as number)}</div><div className="text-[10px] text-muted">{l}{l !== "kcal" ? " g" : ""}</div></div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted">Valores aproximados: {food?.source ?? "calculados a partir de los ingredientes de la receta"}.</p>
          <Button size="lg" className="w-full" onClick={save} disabled={!preview}>{editLog ? "Guardar cambios" : "Añadir"}</Button>
        </div>
      )}
    </Sheet>
  );
}
