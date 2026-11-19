"use client";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { Button, Field, Input } from "./ui";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setMsg(null);
    const { error } = mode === "in" ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === "up") setMsg("Cuenta creada. Si tu proyecto exige confirmación, revisa tu correo y luego inicia sesión.");
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="text-xs font-bold tracking-[.35em] text-muted">PROJECT</div>
          <div className="font-serif text-8xl leading-none italic">90</div>
          <div className="mt-2 text-xs font-semibold tracking-[.25em] text-muted uppercase">Body transformation</div>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6">
          <Field label="Correo">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Contraseña">
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
          </Field>
          {msg && <p className="text-sm text-rose-deep">{msg}</p>}
          <Button className="w-full" disabled={busy}>{mode === "in" ? "Entrar" : "Crear cuenta"}</Button>
          <button type="button" className="w-full text-center text-sm text-muted" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "¿Primera vez? Crear cuenta" : "Ya tengo cuenta"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">Tus datos y fotos están protegidos con Row Level Security: sólo tú puedes verlos.</p>
      </div>
    </div>
  );
}
