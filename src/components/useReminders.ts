"use client";
import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { notify } from "@/lib/notify";
import { todayISO } from "@/lib/dates";
import { dayStatus, routineFor } from "@/lib/program";

// Recordatorios opcionales mientras la app esté abierta o instalada en segundo plano.
// (Las notificaciones con la app totalmente cerrada requieren Web Push; ver README.)
const KEY = "p90:fired";
function fired(tag: string) {
  try {
    const m = JSON.parse(localStorage.getItem(KEY) || "{}");
    return m[tag] === todayISO();
  } catch {
    return false;
  }
}
function mark(tag: string) {
  try {
    const m = JSON.parse(localStorage.getItem(KEY) || "{}");
    m[tag] = todayISO();
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {}
}
const hm = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function useReminders() {
  const { db, profile } = useStore();
  const ref = useRef({ db, profile });
  ref.current = { db, profile };

  useEffect(() => {
    const tick = () => {
      const { db, profile } = ref.current;
      if (!profile?.notifications.enabled) return;
      const n = profile.notifications;
      const today = todayISO();
      const now = hm();
      const st = dayStatus(db, profile, today);
      if (n.workout_time && now >= n.workout_time && !fired("workout")) {
        mark("workout");
        const r = routineFor(db, profile, today);
        if (r && !st.workout) void notify("Hoy toca entrenar", `${r.name}. Tu rutina te espera 💪`, "workout");
        else if (st.plan.type === "swim" && !st.swim) void notify("Hoy toca natación", "Una hora en el agua. Disfrútala 🌊", "workout");
      }
      if (n.log_reminder && now >= "15:00" && !fired("log")) {
        mark("log");
        if (new Set(db.food_logs.filter((l) => l.date === today).map((l) => l.slot)).size < 2) void notify("Registro de comidas", "¿Registramos desayuno y almuerzo? Toma 30 segundos.", "log");
      }
      if (n.water_reminders) {
        for (const t of ["11:00", "14:00", "17:00", "19:30"]) {
          if (now >= t && !fired("water" + t)) {
            mark("water" + t);
            void notify("Un vaso de agua", "Pequeño recordatorio de hidratación 💧", "water");
          }
        }
      }
      if (n.close_day_time && now >= n.close_day_time && !fired("close") && !st.closed) {
        mark("close");
        void notify("Cierra tu día ✨", "Revisa lo que lograste hoy y celébralo.", "close");
      }
    };
    tick();
    const i = setInterval(tick, 60_000);
    return () => clearInterval(i);
  }, []);
}
