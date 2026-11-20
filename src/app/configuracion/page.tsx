"use client";
import { useState } from "react";
import { Bell, Cloud, CloudOff, Download, LogOut, Plus, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { useStore, emptyDB, setManualLogin } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase";
import { notificationsSupported, notify, requestPermission } from "@/lib/notify";
import { ACTIVITY_LEVELS } from "@/lib/nutrition";
import { TABLES, type DB, type Profile } from "@/lib/types";
import { Button, Card, Disclaimer, Field, Input, NumInput, PageHeader, SectionTitle, Select, cx } from "@/components/ui";

export default function Configuracion() {
  const { db, profile, upsert, mode, session, pending, syncError, refresh, signOut, replaceAll } = useStore();
  const [p, setP] = useState<Profile | null>(profile);
  const [newHabit, setNewHabit] = useState("");
  const [perm, setPerm] = useState<string>(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported");
  if (!profile || !p) return null;
  const dirty = JSON.stringify(p) !== JSON.stringify(profile);
  const save = (next: Profile) => { setP(next); upsert("profiles", next); };

  async function enableNotifications() {
    const r = await requestPermission();
    setPerm(r);
    if (r === "granted") {
      save({ ...p!, notifications: { ...p!.notifications, enabled: true } });
      void notify("Notificaciones activadas ✨", "Te avisaremos al cerrar tu día y con tus recordatorios.");
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ app: "project90", version: 1, exported_at: new Date().toISOString(), data: db }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `project90-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }
  function importData(file?: File) {
    if (!file) return;
    file.text().then((t) => {
      try {
        const parsed = JSON.parse(t);
        const data = parsed.data ?? parsed;
        const next = emptyDB();
        for (const tb of TABLES) if (Array.isArray(data[tb])) (next as Record<string, unknown[]>)[tb] = data[tb];
        if (!next.profiles.length) throw new Error("El archivo no contiene un perfil");
        if (confirm("Esto reemplazará los datos de este dispositivo por los del archivo. ¿Continuar?")) replaceAll(next as DB);
      } catch (e) {
        alert("Archivo no válido: " + (e instanceof Error ? e.message : ""));
      }
    });
  }

  return (
    <div className="rise">
      <PageHeader title="Configuración" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-bold">Perfil</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Nombre" className="col-span-2"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
            <Field label="Día 1 del programa" className="col-span-2" hint="Cambiarlo recalcula el día actual, etapas y evaluaciones."><Input type="date" value={p.start_date} onChange={(e) => setP({ ...p, start_date: e.target.value })} /></Field>
            <Field label="Edad"><NumInput value={p.age} onChange={(v) => setP({ ...p, age: v ?? 22 })} /></Field>
            <Field label="Estatura (cm)"><NumInput value={p.height_cm} onChange={(v) => setP({ ...p, height_cm: v ?? 157 })} /></Field>
            <Field label="Peso de referencia (kg)" hint="Referencia, no obligación"><NumInput value={p.start_weight_kg} step={0.1} onChange={(v) => setP({ ...p, start_weight_kg: v ?? 56 })} /></Field>
            <Field label="Experiencia (meses)"><NumInput value={p.gym_experience_months} onChange={(v) => setP({ ...p, gym_experience_months: v ?? 0 })} /></Field>
            <Field label="Sueño habitual"><Input value={p.sleep_hours_usual} onChange={(e) => setP({ ...p, sleep_hours_usual: e.target.value })} /></Field>
            <Field label="Duración sesión (min)"><NumInput value={p.session_minutes} onChange={(v) => setP({ ...p, session_minutes: v ?? 60 })} /></Field>
            <Field label="Nivel de actividad" className="col-span-2"><Select value={p.activity_factor} onChange={(e) => setP({ ...p, activity_factor: Number(e.target.value) })}>{ACTIVITY_LEVELS.map((a) => <option key={a.v} value={a.v}>{a.v} · {a.label}</option>)}</Select></Field>
          </div>
          <Button className="mt-4" disabled={!dirty} onClick={() => upsert("profiles", p)}>Guardar perfil</Button>
          <p className="mt-2 text-xs text-muted">Las medidas iniciales se editan en Body Tracking. Los días de entrenamiento, en Entrenamientos → Mi semana.</p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-sm font-bold"><Bell size={16} /> Notificaciones</div>
          {!notificationsSupported() ? (
            <p className="mt-3 text-sm text-muted">Este navegador no admite notificaciones. En iPhone: abre la app en Safari → Compartir → «Añadir a pantalla de inicio», y ábrela desde ese icono (iOS 16.4+).</p>
          ) : perm !== "granted" ? (
            <>
              <p className="mt-2 text-sm text-muted">Recibe una notificación bonita cada vez que cierres tu día, y recordatorios opcionales.</p>
              <Button className="mt-3" onClick={enableNotifications}>Activar notificaciones</Button>
              {perm === "denied" && <p className="mt-2 text-xs text-rose-deep">Bloqueadas en el navegador. Actívalas desde los ajustes del sitio.</p>}
            </>
          ) : (
            <div className="mt-3 space-y-3">
              <Toggle label="Notificaciones activas" on={p.notifications.enabled} onChange={(v) => save({ ...p, notifications: { ...p.notifications, enabled: v } })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Recordatorio de entreno"><Input type="time" value={p.notifications.workout_time} onChange={(e) => save({ ...p, notifications: { ...p.notifications, workout_time: e.target.value } })} /></Field>
                <Field label="Cerrar mi día"><Input type="time" value={p.notifications.close_day_time} onChange={(e) => save({ ...p, notifications: { ...p.notifications, close_day_time: e.target.value } })} /></Field>
              </div>
              <Toggle label="Recordar registrar comidas (15:00)" on={p.notifications.log_reminder} onChange={(v) => save({ ...p, notifications: { ...p.notifications, log_reminder: v } })} />
              <Toggle label="Recordatorios de agua" on={p.notifications.water_reminders} onChange={(v) => save({ ...p, notifications: { ...p.notifications, water_reminders: v } })} />
              <Button variant="soft" size="sm" onClick={() => notify("Así se verá ✨", "Día 12 completado. Lo estás haciendo: paso a paso, día a día.")}>Probar notificación</Button>
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted">Los recordatorios funcionan mientras la app está abierta o instalada en segundo plano. La notificación de cierre de día llega siempre al pulsar «Cerrar mi día».</p>
        </Card>

        <Card>
          <div className="text-sm font-bold">Mis hábitos</div>
          <div className="mt-3 space-y-2">
            {p.habits.map((h) => (
              <div key={h} className="flex items-center gap-2 rounded-2xl bg-sand/50 py-1 pr-1 pl-4 text-sm">
                <span className="flex-1">{h}</span>
                <button className="grid h-9 w-9 place-items-center rounded-full text-muted" aria-label="Quitar" onClick={() => save({ ...p, habits: p.habits.filter((x) => x !== h) })}><X size={14} /></button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input placeholder="Nuevo hábito" value={newHabit} onChange={(e) => setNewHabit(e.target.value)} />
            <Button disabled={!newHabit.trim() || p.habits.includes(newHabit.trim())} onClick={() => { save({ ...p, habits: [...p.habits, newHabit.trim()] }); setNewHabit(""); }}><Plus size={16} /></Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-sm font-bold">{mode === "cloud" ? <Cloud size={16} /> : <CloudOff size={16} />} Cuenta y datos</div>
          {mode === "cloud" ? (
            <div className="mt-3 space-y-2 text-sm">
              {session?.user.is_anonymous ? <LinkEmail /> : <p>Cuenta: <b>{session?.user.email}</b></p>}
              <p className={cx(syncError ? "text-rose-deep" : "text-muted")}>{syncError ? `Error: ${syncError}` : pending ? `${pending} cambio(s) pendientes de subir` : "Todo sincronizado con la base de datos."}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="soft" onClick={() => refresh()}><RefreshCw size={13} /> Sincronizar</Button>
                {!session?.user.is_anonymous && <Button size="sm" variant="outline" onClick={() => { setManualLogin(true); void signOut(); }}><LogOut size={13} /> Cerrar sesión</Button>}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">
              {isSupabaseConfigured ? "Inicia sesión para sincronizar." : "Modo local: tus datos se guardan en este navegador. Para recuperarlos desde otro dispositivo, conecta Supabase (ver README) o usa la copia de seguridad."}
            </p>
          )}
          <SectionTitle>Copia de seguridad</SectionTitle>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="soft" onClick={exportData}><Download size={13} /> Exportar (.json)</Button>
            <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border border-ink/15 bg-surface px-3 text-xs font-semibold"><Upload size={13} /> Importar<input type="file" accept="application/json" className="hidden" onChange={(e) => importData(e.target.files?.[0])} /></label>
          </div>
          <p className="mt-2 text-[11px] text-muted">La copia no incluye los archivos de fotos (sólo sus referencias).</p>
          {mode === "local" && (
            <Button size="sm" variant="danger" className="mt-4" onClick={() => { if (confirm("¿Borrar TODOS los datos de este dispositivo? No se puede deshacer.")) { localStorage.removeItem("p90:db:v1"); location.reload(); } }}><Trash2 size={13} /> Borrar datos locales</Button>
          )}
        </Card>
      </div>
      <div className="mt-6"><Disclaimer>PROJECT 90 es una herramienta de seguimiento personal. No ofrece diagnóstico ni tratamiento médico. Ante dolor, lesiones, condiciones de salud o dudas sobre alimentación, consulta con profesionales (médico/a, fisioterapeuta, nutricionista).</Disclaimer></div>
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between rounded-2xl bg-sand/50 px-4 py-3 text-sm font-medium">
      {label}
      <span className={cx("relative h-6 w-11 rounded-full transition", on ? "bg-ink" : "bg-stone")}>
        <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", on ? "left-[1.375rem]" : "left-0.5")} />
      </span>
    </button>
  );
}

function LinkEmail() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  async function link() {
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb.auth.updateUser({ email }, { emailRedirectTo: window.location.origin });
    setMsg(error ? `No se pudo: ${error.message}` : "Te enviamos un correo: toca el enlace para confirmar. Después podrás entrar desde cualquier dispositivo con ese correo (sin contraseña).");
  }
  return (
    <div className="rounded-2xl bg-rose-soft p-4">
      <p className="font-semibold">Estás usando la app sin correo.</p>
      <p className="mt-1 text-xs text-ink/70">Tus datos se guardan en la nube, pero para recuperarlos en otro celular (o si borras el navegador), vincula tu correo. No necesitas contraseña.</p>
      <div className="mt-3 flex gap-2">
        <Input type="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button size="md" disabled={!email.includes("@")} onClick={link}>Vincular</Button>
      </div>
      {msg && <p className="mt-2 text-xs">{msg}</p>}
    </div>
  );
}
