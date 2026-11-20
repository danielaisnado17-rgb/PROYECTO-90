"use client";
import { useState } from "react";
import { Mail, Sparkles } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { setManualLogin } from "@/lib/store";
import { Button, Field, Input } from "./ui";

/** Acceso SIN contraseña: enlace mágico al correo, o entrar directamente sin cuenta. */
export function Login() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setMsg(null);
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "¡Listo! Revisa tu correo y toca el enlace para entrar. 💌" });
  }

  async function guest() {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setManualLogin(false);
    const { error } = await sb.auth.signInAnonymously();
    setBusy(false);
    if (error) setMsg({ ok: false, text: "El acceso sin correo no está activado en Supabase todavía. Usa el enlace al correo." });
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm rise">
        <div className="mb-10 text-center">
          <div className="text-xs font-bold tracking-[.35em] text-muted">PROJECT</div>
          <div className="font-serif text-8xl leading-none italic">90</div>
          <div className="mt-2 text-xs font-semibold tracking-[.25em] text-muted uppercase">Body transformation</div>
        </div>
        <div className="card space-y-4 p-6">
          <Button size="lg" className="w-full" onClick={guest} disabled={busy}>
            <Sparkles size={18} /> Entrar
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />o en otro dispositivo<span className="h-px flex-1 bg-line" />
          </div>
          <form onSubmit={sendLink} className="space-y-3">
            <Field label="Tu correo (sin contraseña)">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="tu@correo.com" />
            </Field>
            <Button variant="soft" className="w-full" disabled={busy}>
              <Mail size={16} /> Enviarme un enlace para entrar
            </Button>
          </form>
          {msg && <p className={msg.ok ? "text-sm text-good" : "text-sm text-rose-deep"}>{msg.text}</p>}
        </div>
        <p className="mt-4 text-center text-xs text-muted">Nunca te pediremos contraseña. Tus datos y fotos sólo los puedes ver tú.</p>
      </div>
    </div>
  );
}
