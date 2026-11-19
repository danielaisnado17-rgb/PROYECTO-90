export const PROGRAM_DAYS = 90;
export const EVAL_DAYS = [1, 15, 30, 45, 60, 75, 90];

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function todayISO(): string {
  return toISO(new Date());
}
export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86400000);
}
/** Día del programa (1..90) para una fecha. Puede ser <1 (antes de empezar) o >90. */
export function dayNumber(start: string, date: string = todayISO()): number {
  return diffDays(date, start) + 1;
}
export function dateForDay(start: string, day: number): string {
  return addDays(start, day - 1);
}
export function weekday(s: string): number {
  return parseISO(s).getDay();
}
/** Lunes de la semana de la fecha dada */
export function weekStart(s: string): string {
  const wd = weekday(s);
  return addDays(s, wd === 0 ? -6 : 1 - wd);
}
const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DOW_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MON = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const dowShort = (s: string) => DOW[weekday(s)];
export const dowLong = (i: number) => DOW_LONG[i];
export function fmtShort(s: string): string {
  const d = parseISO(s);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}
export function fmtLong(s: string): string {
  const d = parseISO(s);
  return `${DOW_LONG[d.getDay()]} ${d.getDate()} de ${MON[d.getMonth()]}`;
}
export function nextEvaluationDay(current: number, done: number[]): number | null {
  for (const d of EVAL_DAYS) if (d >= current && !done.includes(d)) return d;
  return null;
}
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
export const nowISO = () => new Date().toISOString();
