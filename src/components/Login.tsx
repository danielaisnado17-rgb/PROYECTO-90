"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { setManualLogin } from "@/lib/store";
import { Button } from "./ui";

export const OWNER_NAME = "Daniela Isnado";

/**
 * Acceso directo, sin correo ni contraseña. Por debajo usa una sesión anónima de
 * Supabase que queda guardada en este dispositivo (la "llave" es el propio celular),
 * así los datos siguen protegidos por Row Level Security.
 */
export function Login() {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function enter() {
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setErr(null);
    setManualLogin(false);
    const { error } = await sb.auth.signInAnonymously();
    setBusy(false);
    if (error)
      setErr(
        /anonymous/i.test(error.message)
          ? "Falta un paso en Supabase: Autenticación → Sign In / Providers → activa «Allow anonymous sign-ins» y guarda. Luego vuelve a tocar Entrar."
          : `No se pudo entrar: ${error.message}`,
      );
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <div className="w-full max-w-sm rise text-center">
        <div className="mb-10">
          <div className="text-xs font-bold tracking-[.35em] text-muted">PROJECT</div>
          <div className="font-serif text-8xl leading-none italic">90</div>
          <div className="mt-2 text-xs font-semibold tracking-[.25em] text-muted uppercase">Body transformation</div>
        </div>
        <div className="card space-y-5 p-6">
          <div>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full glow text-2xl font-extrabold">D</div>
            <div className="mt-3 text-sm text-muted">Bienvenida de vuelta</div>
            <div className="text-2xl font-extrabold tracking-tight">{OWNER_NAME}</div>
          </div>
          <Button size="lg" className="w-full" onClick={enter} disabled={busy}>
            <Sparkles size={18} /> {busy ? "Entrando…" : `Entrar como ${OWNER_NAME.split(" ")[0]}`}
          </Button>
          {err && <p className="rounded-2xl bg-peach-soft px-4 py-3 text-left text-sm">{err}</p>}
        </div>
        <p className="mt-4 text-xs text-muted">Sin correo ni contraseña. Tu sesión queda guardada en este dispositivo y tus datos sólo los puedes ver tú.</p>
      </div>
    </div>
  );
}
