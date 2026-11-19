"use client";

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export async function registerSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function requestPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  return Notification.requestPermission();
}

type Listener = (t: { title: string; body: string }) => void;
const listeners = new Set<Listener>();
export function onInAppNotice(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Muestra una notificación del sistema (si hay permiso) y siempre un aviso dentro de la app. */
export async function notify(title: string, body: string, tag?: string) {
  listeners.forEach((l) => l({ title, body }));
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerSW());
  const opts: NotificationOptions = { body, icon: "/icon-192.png", badge: "/icon-192.png", tag };
  if (reg) await reg.showNotification(title, opts);
  else new Notification(title, opts);
}

const CLOSE_MESSAGES = [
  "Hoy elegiste cuidarte. Ese es el tipo de constancia que transforma un cuerpo.",
  "Un día más construido con intención. Tu yo del día 90 te lo agradece.",
  "No hace falta un día perfecto, hace falta un día cumplido. Y hoy lo cumpliste.",
  "Cada serie, cada comida pesada y cada vaso de agua cuentan. Hoy contaron todos.",
  "Lo estás haciendo: paso a paso, día a día. Descansa bonito.",
  "La disciplina de hoy es la confianza de mañana.",
  "Músculo se construye así: entrenando, comiendo y descansando. Hoy hiciste tu parte.",
];
export function closingMessage(day: number) {
  return CLOSE_MESSAGES[Math.abs(day) % CLOSE_MESSAGES.length];
}
