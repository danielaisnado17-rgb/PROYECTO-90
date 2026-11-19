"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Map, Dumbbell, Apple, Ruler, TrendingUp, HeartPulse, Settings, MoreHorizontal, Cloud, CloudOff, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cx, Sheet } from "./ui";
import { Login } from "./Login";
import { Welcome } from "./Welcome";
import { useReminders } from "./useReminders";
import { onInAppNotice, registerSW } from "@/lib/notify";

const NAV = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/ruta", label: "Mi ruta 90 días", short: "Ruta", icon: Map },
  { href: "/entrenamientos", label: "Entrenamientos", short: "Entreno", icon: Dumbbell },
  { href: "/nutricion", label: "Nutrición", icon: Apple },
  { href: "/body", label: "Body Tracking", icon: Ruler },
  { href: "/progreso", label: "Progreso", icon: TrendingUp },
  { href: "/habitos", label: "Hábitos", icon: HeartPulse },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];
const MOBILE_MAIN = ["/", "/ruta", "/entrenamientos", "/nutricion"];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { ready, profile, session, mode, pending, syncing, syncError } = useStore();
  const path = usePathname();
  const [more, setMore] = useState(false);
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);
  useReminders();

  useEffect(() => {
    void registerSW();
    return onInAppNotice((t) => {
      setToast(t);
      setTimeout(() => setToast(null), 6000);
    });
  }, []);
  useEffect(() => setMore(false), [path]);

  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="text-center">
          <div className="text-xs font-bold tracking-[.3em] text-muted">PROJECT</div>
          <div className="font-serif text-6xl italic">90</div>
        </div>
      </div>
    );
  }
  if (isSupabaseConfigured && !session) return <Login />;
  if (!profile) return <Welcome />;

  const SyncIcon = mode === "cloud" ? Cloud : CloudOff;
  const syncLabel = mode === "cloud" ? (syncError ? "Error al sincronizar" : syncing || pending ? `Sincronizando (${pending})` : "Sincronizado") : "Guardado en este dispositivo";

  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar desktop */}
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface/60 px-4 py-6 backdrop-blur md:flex">
        <Link href="/" className="mb-8 px-3">
          <div className="text-[10px] font-bold tracking-[.35em] text-muted">PROJECT</div>
          <div className="-mt-1 flex items-baseline gap-2">
            <span className="font-serif text-5xl italic leading-none">90</span>
            <span className="text-[10px] font-semibold tracking-widest text-muted uppercase">Body transformation</span>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = isActive(path, n.href);
            return (
              <Link key={n.href} href={n.href} className={cx("flex h-11 items-center gap-3 rounded-full px-4 text-sm font-semibold transition", active ? "bg-ink text-white" : "text-ink/70 hover:bg-sand/70 hover:text-ink")}>
                <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className={cx("flex items-center gap-2 rounded-2xl px-3 py-2 text-xs", syncError ? "text-rose-deep" : "text-muted")} title={syncError ?? ""}>
          <SyncIcon size={14} /> {syncLabel}
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-32 md:px-10 md:pt-10 md:pb-16">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Navegación inferior móvil (estilo píldora negra) */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(.9rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between rounded-full bg-ink p-1.5 shadow-xl shadow-ink/20">
          {NAV.filter((n) => MOBILE_MAIN.includes(n.href)).map((n) => {
            const Icon = n.icon;
            const active = isActive(path, n.href);
            return (
              <Link key={n.href} href={n.href} aria-label={n.label} className={cx("flex h-12 items-center justify-center gap-2 rounded-full transition-all", active ? "bg-surface px-4 text-ink" : "w-12 text-white/70")}>
                <Icon size={20} />
                {active && <span className="text-xs font-bold">{n.short ?? n.label}</span>}
              </Link>
            );
          })}
          <button onClick={() => setMore(true)} aria-label="Más secciones" className={cx("grid h-12 w-12 place-items-center rounded-full", !MOBILE_MAIN.some((h) => isActive(path, h)) ? "bg-surface text-ink" : "text-white/70")}>
            <MoreHorizontal size={20} />
          </button>
        </div>
      </nav>
      <Sheet open={more} onClose={() => setMore(false)} title="Secciones">
        <div className="grid grid-cols-2 gap-3">
          {NAV.filter((n) => !MOBILE_MAIN.includes(n.href)).map((n) => {
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href} className={cx("flex flex-col gap-6 rounded-3xl p-4", isActive(path, n.href) ? "bg-ink text-white" : "bg-sand")}>
                <Icon size={22} />
                <span className="text-sm font-bold">{n.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted">
          <SyncIcon size={14} /> {syncLabel}
        </div>
      </Sheet>

      {toast && (
        <div className="no-print fixed inset-x-4 top-4 z-[60] mx-auto max-w-sm rise">
          <div className="flex items-start gap-3 rounded-3xl bg-ink p-4 text-white shadow-2xl">
            <div className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full bg-rose" />
            <div className="flex-1">
              <div className="text-sm font-bold">{toast.title}</div>
              <div className="mt-0.5 text-xs text-white/75">{toast.body}</div>
            </div>
            <button onClick={() => setToast(null)} aria-label="Cerrar aviso">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
