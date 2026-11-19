"use client";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Check, Dumbbell, Droplets, Egg, Waves, Moon } from "lucide-react";
import { useStore, newId } from "@/lib/store";
import { dayNumber, nowISO, todayISO } from "@/lib/dates";
import { currentGoal, r0, sumLogs } from "@/lib/nutrition";
import { dayStatus, streak } from "@/lib/program";
import { closingMessage, notify } from "@/lib/notify";
import { Button, Dots, Sheet, Textarea, cx } from "./ui";

export function CloseDayButton({ date = todayISO(), className }: { date?: string; className?: string }) {
  const { db, profile, upsert } = useStore();
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [celebrate, setCelebrate] = useState<null | { day: number; msg: string; streak: number }>(null);
  const closed = db.day_closures.find((c) => c.date === date);

  const summary = useMemo(() => {
    if (!profile) return null;
    const st = dayStatus(db, profile, date);
    const logs = db.food_logs.filter((l) => l.date === date);
    const m = sumLogs(logs);
    const g = currentGoal(db, date);
    const water = db.hydration_logs.filter((h) => h.date === date).reduce((a, h) => a + h.ml, 0);
    const sleep = db.sleep_logs.find((s) => s.date === date);
    return { st, m, g, water, sleep, meals: new Set(logs.map((l) => l.slot)).size };
  }, [db, profile, date]);
  if (!profile || !summary) return null;
  const day = dayNumber(profile.start_date, date);

  function save() {
    if (!profile || !summary) return;
    const s = summary;
    upsert("day_closures", {
      id: closed?.id ?? newId(),
      date,
      day_number: day,
      mood,
      note,
      summary: {
        activity: s.st.plan.type,
        activity_done: s.st.activityDone,
        kcal: r0(s.m.kcal),
        protein_g: r0(s.m.protein_g),
        water_ml: s.water,
        meals_logged: s.meals,
      },
      created_at: nowISO(),
    });
    setOpen(false);
    const msg = closingMessage(day);
    // Racha se recalcula con el cierre incluido
    const st = streak({ ...db, day_closures: [...db.day_closures, { id: "tmp", date, day_number: day, mood, note, summary: {}, created_at: "" }] }, profile);
    setCelebrate({ day, msg, streak: st });
    void notify(`Día ${day} completado ✨`, msg, "close-day");
  }

  const rows = [
    { icon: Dumbbell, label: summary.st.plan.type === "workout" ? "Entrenamiento" : summary.st.plan.type === "swim" ? "Natación" : "Recuperación", ok: summary.st.activityDone, value: summary.st.activityDone ? "Hecho" : "Pendiente" },
    { icon: Egg, label: "Proteína", ok: !!summary.g && summary.m.protein_g >= summary.g.protein_g * 0.9, value: `${r0(summary.m.protein_g)} / ${summary.g?.protein_g ?? "–"} g` },
    { icon: Sparkles, label: "Calorías", ok: summary.meals >= 3, value: `${r0(summary.m.kcal)} / ${summary.g?.kcal ?? "–"} kcal` },
    { icon: Droplets, label: "Agua", ok: !!summary.g && summary.water >= summary.g.water_ml * 0.8, value: `${(summary.water / 1000).toFixed(2)} L` },
    { icon: Moon, label: "Sueño", ok: !!summary.sleep, value: summary.sleep ? `${summary.sleep.hours} h` : "Sin registro" },
  ];

  return (
    <>
      <Button variant={closed ? "soft" : "primary"} size="lg" className={cx("w-full", className)} onClick={() => setOpen(true)}>
        {closed ? <Check size={18} /> : <Sparkles size={18} />}
        {closed ? `Día ${day} cerrado · editar` : "Cerrar mi día"}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Cierre del día ${day}`}>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 rounded-2xl bg-sand/50 px-4 py-3">
              <r.icon size={18} className="text-muted" />
              <div className="flex-1 text-sm font-semibold">{r.label}</div>
              <div className="text-sm text-muted">{r.value}</div>
              <div className={cx("grid h-6 w-6 place-items-center rounded-full", r.ok ? "bg-ink text-white" : "bg-stone text-transparent")}>
                <Check size={14} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">No tiene que ser perfecto. Cerrar el día es reconocer lo que sí hiciste.</p>
        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">¿Cómo te sentiste hoy?</div>
          <Dots value={mood ?? closed?.mood ?? null} onChange={setMood} labels={["Difícil", "Increíble"]} />
        </div>
        <Textarea className="mt-4" placeholder="Una nota para tu yo del día 90 (opcional)" value={note || closed?.note || ""} onChange={(e) => setNote(e.target.value)} />
        <Button className="mt-5 w-full" size="lg" onClick={save}>
          <Sparkles size={18} /> Cerrar el día {day}
        </Button>
      </Sheet>
      {celebrate && <Celebration {...celebrate} onClose={() => setCelebrate(null)} />}
    </>
  );
}

function Celebration({ day, msg, streak, onClose }: { day: number; msg: string; streak: number; onClose: () => void }) {
  const confetti = Array.from({ length: 28 }, (_, i) => i);
  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#f7e6e6,transparent_55%),radial-gradient(circle_at_80%_80%,#ece2d5,transparent_55%)] bg-surface px-6" onClick={onClose}>
      {confetti.map((i) => (
        <span
          key={i}
          className="absolute h-2 w-2 rounded-full"
          style={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 53) % 100}%`,
            background: i % 3 === 0 ? "#c9828c" : i % 3 === 1 ? "#e8b9be" : "#171413",
            opacity: 0.55,
            animation: `floaty ${2.5 + (i % 5) * 0.4}s ease-in-out ${i * 0.07}s infinite`,
          }}
        />
      ))}
      <div className="pop relative max-w-sm text-center">
        <div className="text-xs font-bold tracking-[.35em] text-muted uppercase">Día completado</div>
        <div className="my-2 font-serif text-[9rem] leading-none italic">{day}</div>
        <p className="text-lg font-semibold leading-snug">{msg}</p>
        {streak > 1 && (
          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white">
            <Waves size={16} /> Racha de {streak} días
          </div>
        )}
        <div className="mt-8 text-xs text-muted">Toca para continuar</div>
      </div>
    </div>,
    document.body,
  );
}
