"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { TABLES, type DB, type Profile, type TableName, type Tables } from "./types";
import { todayISO, uid } from "./dates";
import { DEFAULT_HABITS, SEED_ROUTINES, SEED_SCHEDULE, seedLoadReferences } from "./seed/routines";
import { estimateTargets } from "./nutrition";

// ── Persistencia local-first ────────────────────────────────────────────────
// 1. Todo se guarda al instante en localStorage (funciona sin conexión).
// 2. Si hay sesión de Supabase, cada cambio se envía a la base de datos.
//    Si falla (sin red), queda en una cola que se reintenta automáticamente.
// 3. Al iniciar sesión en otro dispositivo, se descarga todo desde Supabase.

const LS_DB = "p90:db:v1";
const LS_QUEUE = "p90:queue:v1";

type Op = { op: "upsert" | "delete"; table: TableName; id: string; row?: unknown };

export const emptyDB = (): DB => Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as DB;

function loadLocal(): DB {
  try {
    const raw = localStorage.getItem(LS_DB);
    if (!raw) return emptyDB();
    const parsed = JSON.parse(raw);
    const db = emptyDB();
    for (const t of TABLES) if (Array.isArray(parsed[t])) (db as Record<string, unknown[]>)[t] = parsed[t];
    return db;
  } catch {
    return emptyDB();
  }
}
function saveLocal(db: DB) {
  try {
    localStorage.setItem(LS_DB, JSON.stringify(db));
  } catch (e) {
    console.error("No se pudo guardar localmente", e);
  }
}
function loadQueue(): Op[] {
  try {
    return JSON.parse(localStorage.getItem(LS_QUEUE) || "[]");
  } catch {
    return [];
  }
}
function saveQueue(q: Op[]) {
  try {
    localStorage.setItem(LS_QUEUE, JSON.stringify(q));
  } catch {}
}

/** Datos iniciales de la usuaria (punto de partida; no se modifican automáticamente). */
export function buildSeed(startDate: string, name: string): Partial<DB> {
  const profile: Profile = {
    id: "me",
    name,
    age: 22,
    sex: "female",
    height_cm: 157,
    start_weight_kg: 56,
    start_date: startDate,
    sleep_hours_usual: "7–8",
    gym_experience_months: 7,
    session_minutes: 60,
    activity_factor: 1.55,
    schedule: SEED_SCHEDULE,
    habits: DEFAULT_HABITS,
    notifications: { enabled: false, close_day_time: "21:30", workout_time: "08:00", water_reminders: false, log_reminder: true },
    onboarded: true,
  };
  const est = estimateTargets(profile, 56, "recomposicion");
  return {
    profiles: [profile],
    body_measurements: [
      { id: "m_baseline", date: startDate, weight_kg: 56, waist_cm: 73.4, hip_cm: 95.5, glutes_cm: null, abdomen_cm: 78, thigh_cm: 43, arm_cm: null, is_baseline: true, notes: "Medidas iniciales (punto de partida)." },
    ],
    routines: SEED_ROUTINES,
    load_references: seedLoadReferences(startDate),
    goals: [{ ...est.target, id: "g_initial", valid_from: startDate }],
    recipes: [
      {
        id: "rec_batido", name: "Batido del desayuno", kind: "receta", servings: 1, favorite: true,
        notes: "Pesa cada ingrediente en tu balanza y escribe los gramos. Las cantidades no se asumen.",
        ingredients: [
          { food_id: "f_nueces", grams: null },
          { food_id: "f_avena", grams: null },
          { food_id: "f_platano", grams: null },
          { food_id: "f_frutilla", grams: null },
          { food_id: "f_leche_entera", grams: null },
        ],
      },
    ],
  };
}

interface Ctx {
  ready: boolean;
  db: DB;
  profile: Profile | null;
  mode: "local" | "cloud";
  session: Session | null;
  pending: number;
  syncing: boolean;
  syncError: string | null;
  upsert: <T extends TableName>(table: T, row: Tables[T]) => void;
  upsertMany: <T extends TableName>(table: T, rows: Tables[T][]) => void;
  remove: (table: TableName, id: string) => void;
  initialize: (startDate: string, name: string) => void;
  replaceAll: (db: DB) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDB);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const dbRef = useRef(db);
  const sessionRef = useRef<Session | null>(null);
  const flushing = useRef(false);

  const commit = useCallback((next: DB) => {
    dbRef.current = next;
    setDb(next);
    saveLocal(next);
  }, []);

  const flush = useCallback(async () => {
    const sb = getSupabase();
    const s = sessionRef.current;
    if (!sb || !s || flushing.current) return;
    flushing.current = true;
    setSyncing(true);
    let q = loadQueue();
    try {
      while (q.length) {
        const op = q[0];
        if (op.op === "upsert") {
          const { error } = await sb.from(op.table).upsert({ ...(op.row as object), user_id: s.user.id }, { onConflict: "user_id,id" });
          if (error) throw error;
        } else {
          const { error } = await sb.from(op.table).delete().eq("id", op.id).eq("user_id", s.user.id);
          if (error) throw error;
        }
        q = q.slice(1);
        saveQueue(q);
        setPending(q.length);
      }
      setSyncError(null);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
    } finally {
      flushing.current = false;
      setSyncing(false);
      setPending(loadQueue().length);
    }
  }, []);

  const enqueue = useCallback(
    (ops: Op[]) => {
      if (!sessionRef.current) return;
      // Compacta: la última operación por (tabla,id) gana
      const q = loadQueue().filter((o) => !ops.some((n) => n.table === o.table && n.id === o.id));
      const next = [...q, ...ops];
      saveQueue(next);
      setPending(next.length);
      void flush();
    },
    [flush],
  );

  const pull = useCallback(async () => {
    const sb = getSupabase();
    const s = sessionRef.current;
    if (!sb || !s) return;
    setSyncing(true);
    try {
      await flush();
      const remote = emptyDB();
      let total = 0;
      for (const t of TABLES) {
        const { data, error } = await sb.from(t).select("*").eq("user_id", s.user.id).limit(10000);
        if (error) throw error;
        (remote as Record<string, unknown[]>)[t] = (data ?? []).map((row) => { const rest = { ...row }; delete rest.user_id; return rest; });
        total += data?.length ?? 0;
      }
      if (total === 0) {
        // Primera vez en la nube: subir lo que hubiera en este dispositivo
        const local = dbRef.current;
        const ops: Op[] = [];
        for (const t of TABLES) for (const r of local[t] as { id: string }[]) ops.push({ op: "upsert", table: t, id: r.id, row: r });
        if (ops.length) enqueue(ops);
      } else {
        commit(remote);
      }
      setSyncError(null);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));
    } finally {
      setSyncing(false);
    }
  }, [commit, enqueue, flush]);

  useEffect(() => {
    const local = loadLocal();
    dbRef.current = local;
    setDb(local);
    setPending(loadQueue().length);
    const sb = getSupabase();
    if (!sb) {
      setReady(true);
      return;
    }
    sb.auth.getSession().then(async ({ data }) => {
      sessionRef.current = data.session;
      setSession(data.session);
      if (data.session) await pull();
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((evt, s) => {
      const prev = sessionRef.current;
      sessionRef.current = s;
      setSession(s);
      if (evt === "SIGNED_IN" && !prev) void pull();
    });
    const online = () => void flush();
    window.addEventListener("online", online);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("online", online);
    };
  }, [flush, pull]);

  const upsertMany = useCallback(
    <T extends TableName>(table: T, rows: Tables[T][]) => {
      const cur = dbRef.current;
      const list = [...(cur[table] as Tables[T][])];
      for (const row of rows) {
        const i = list.findIndex((r) => (r as { id: string }).id === (row as { id: string }).id);
        if (i >= 0) list[i] = row;
        else list.push(row);
      }
      commit({ ...cur, [table]: list });
      enqueue(rows.map((row) => ({ op: "upsert" as const, table, id: (row as { id: string }).id, row })));
    },
    [commit, enqueue],
  );
  const upsert = useCallback(<T extends TableName>(table: T, row: Tables[T]) => upsertMany(table, [row]), [upsertMany]);

  const remove = useCallback(
    (table: TableName, id: string) => {
      const cur = dbRef.current;
      commit({ ...cur, [table]: (cur[table] as { id: string }[]).filter((r) => r.id !== id) } as DB);
      enqueue([{ op: "delete", table, id }]);
    },
    [commit, enqueue],
  );

  const initialize = useCallback(
    (startDate: string, name: string) => {
      const seed = buildSeed(startDate, name);
      const cur = dbRef.current;
      const next = { ...cur } as DB;
      const ops: Op[] = [];
      for (const [t, rows] of Object.entries(seed) as [TableName, { id: string }[]][]) {
        const existing = new Set((cur[t] as { id: string }[]).map((r) => r.id));
        const add = rows.filter((r) => !existing.has(r.id));
        (next as Record<string, unknown[]>)[t] = [...(cur[t] as unknown[]), ...add];
        for (const r of add) ops.push({ op: "upsert", table: t, id: r.id, row: r });
      }
      commit(next);
      enqueue(ops);
    },
    [commit, enqueue],
  );

  const replaceAll = useCallback(
    (data: DB) => {
      commit(data);
      const ops: Op[] = [];
      for (const t of TABLES) for (const r of data[t] as { id: string }[]) ops.push({ op: "upsert", table: t, id: r.id, row: r });
      enqueue(ops);
    },
    [commit, enqueue],
  );

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    sessionRef.current = null;
    setSession(null);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      db,
      profile: db.profiles[0] ?? null,
      mode: isSupabaseConfigured && session ? "cloud" : "local",
      session,
      pending,
      syncing,
      syncError,
      upsert,
      upsertMany,
      remove,
      initialize,
      replaceAll,
      refresh: pull,
      signOut,
    }),
    [ready, db, session, pending, syncing, syncError, upsert, upsertMany, remove, initialize, replaceAll, pull, signOut],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore fuera de StoreProvider");
  return c;
}

/** Atajo: fecha de hoy + id nuevo */
export const newId = uid;
export const today = todayISO;
