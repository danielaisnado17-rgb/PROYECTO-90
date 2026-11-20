"use client";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Minus, Plus } from "lucide-react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className, tone = "surface", ...rest }: { children: ReactNode; className?: string; tone?: "surface" | "rose" | "sand" | "ink" | "stone" | "glow" } & React.HTMLAttributes<HTMLDivElement>) {
  const tones = {
    surface: "bg-white/80 backdrop-blur-xl border border-white/70 shadow-[0_1px_2px_rgba(17,17,17,.03)]",
    glow: "glow border border-white/50",
    rose: "bg-rose border border-rose",
    sand: "bg-white/60 backdrop-blur-xl border border-white/70",
    stone: "bg-stone border border-stone",
    ink: "bg-ink text-white border border-ink",
  };
  return (
    <div className={cx("min-w-0 rounded-[1.5rem] p-5", tones[tone], className)} {...rest}>
      {children}
    </div>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "soft" | "ghost" | "rose" | "outline" | "danger"; size?: "sm" | "md" | "lg" };
export function Button({ variant = "primary", size = "md", className, ...rest }: BtnProps) {
  const v = {
    primary: "bg-ink text-white hover:bg-ink-soft",
    soft: "bg-sand text-ink hover:bg-sand-deep/60",
    ghost: "bg-transparent text-ink hover:bg-sand/60",
    rose: "bg-rose text-ink hover:bg-rose-deep hover:text-white",
    outline: "border border-ink/15 bg-surface text-ink hover:border-ink/40",
    danger: "bg-transparent text-rose-deep hover:bg-rose-soft",
  }[variant];
  const s = { sm: "h-8 px-3 text-xs", md: "h-11 px-5 text-sm", lg: "h-14 px-6 text-base" }[size];
  return <button className={cx("inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[.97] disabled:opacity-40 disabled:pointer-events-none", v, s, className)} {...rest} />;
}
export function LinkButton({ href, variant = "primary", className, children }: { href: string; variant?: BtnProps["variant"]; className?: string; children: ReactNode }) {
  const v = {
    primary: "bg-ink text-white", soft: "bg-sand text-ink", ghost: "text-ink", rose: "bg-rose text-ink", outline: "border border-ink/15 bg-surface", danger: "text-rose-deep",
  }[variant];
  return (
    <Link href={href} className={cx("inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition active:scale-[.97]", v, className)}>
      {children}
    </Link>
  );
}

export function PageHeader({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-[2rem] leading-[1.05] font-extrabold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between">
      <h2 className="text-lg font-bold tracking-tight">{children}</h2>
      {right}
    </div>
  );
}

export function Ring({ value, max, size = 64, stroke = 7, color = "var(--color-rose-deep)", track = "var(--color-sand)", children }: { value: number; max: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Bar({ value, max, className, color = "bg-ink" }: { value: number; max: number; className?: string; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-sand", className)}>
      <div className={cx("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 backdrop-blur-[2px] md:items-center" onClick={onClose}>
      <div
        className={cx("rise max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl md:rounded-[2rem] md:p-7", wide ? "md:max-w-3xl" : "md:max-w-lg")}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-lg font-bold">{title}</div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-sand" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { v: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={cx("no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-sand p-1", className)}>
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={cx("h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition", value === o.v ? "bg-ink text-white shadow" : "text-ink/70 hover:text-ink")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-muted uppercase">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
export const inputCls = "h-11 w-full rounded-2xl border border-line bg-white/70 px-4 text-[15px] outline-none transition focus:border-ink/40 focus:bg-white";
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}
export function NumInput({ value, onChange, step = 1, placeholder, className, min }: { value: number | null | undefined; onChange: (v: number | null) => void; step?: number; placeholder?: string; className?: string; min?: number }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value.replace(",", ".")))}
      className={cx(inputCls, className)}
    />
  );
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx("min-h-20 w-full rounded-2xl border border-line bg-white/70 p-3 text-[15px] outline-none focus:border-ink/40", props.className)} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputCls, "appearance-none pr-8", props.className)} />;
}

export function Stepper({ value, onChange, step = 1, min = 0, suffix, size = "md" }: { value: number | null; onChange: (v: number) => void; step?: number; min?: number; suffix?: string; size?: "sm" | "md" }) {
  const v = value ?? 0;
  const h = size === "sm" ? "h-10" : "h-12";
  return (
    <div className={cx("flex items-center rounded-2xl bg-sand/70", h)}>
      <button type="button" aria-label="menos" className={cx("grid aspect-square place-items-center rounded-2xl", h)} onClick={() => onChange(Math.max(min, Math.round((v - step) * 100) / 100))}>
        <Minus size={16} />
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className="w-full min-w-0 bg-transparent text-center text-base font-bold outline-none"
      />
      {suffix && <span className="-ml-2 pr-1 text-xs text-muted">{suffix}</span>}
      <button type="button" aria-label="más" className={cx("grid aspect-square place-items-center rounded-2xl", h)} onClick={() => onChange(Math.round((v + step) * 100) / 100)}>
        <Plus size={16} />
      </button>
    </div>
  );
}

export function Dots({ value, onChange, max = 5, labels }: { value: number | null; onChange: (v: number) => void; max?: number; labels?: [string, string] }) {
  return (
    <div>
      <div className="flex gap-2">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} className={cx("h-11 flex-1 rounded-2xl text-sm font-bold transition", value != null && n <= value ? "bg-ink text-white" : "bg-sand text-ink/60")}>
            {n}
          </button>
        ))}
      </div>
      {labels && (
        <div className="mt-1 flex justify-between text-[11px] text-muted">
          <span>{labels[0]}</span>
          <span>{labels[1]}</span>
        </div>
      )}
    </div>
  );
}

export function Chip({ children, active, onClick, className }: { children: ReactNode; active?: boolean; onClick?: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cx("h-9 rounded-full px-4 text-sm font-medium transition", active ? "bg-ink text-white" : "bg-surface border border-line text-ink/80", className)}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "sand" }: { children: ReactNode; tone?: "sand" | "rose" | "ink" | "good" | "warn" }) {
  const t = { sand: "bg-sand text-ink/70", rose: "bg-rose-soft text-rose-deep", ink: "bg-ink text-white", good: "bg-good-soft text-good", warn: "bg-peach-soft text-warn" }[tone];
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", t)}>{children}</span>;
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-sand-deep/70 px-6 py-10 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <div className="font-semibold">{title}</div>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Stat({ label, value, unit, sub }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">
        {value}
        {unit && <span className="ml-1 text-sm font-semibold text-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-sand/60 px-4 py-3 text-xs leading-relaxed text-ink/70">{children}</p>;
}

export function confirmDelete(what = "este registro") {
  return typeof window !== "undefined" && window.confirm(`¿Eliminar ${what}? Esta acción no se puede deshacer.`);
}
