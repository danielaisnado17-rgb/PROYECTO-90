"use client";
import { useState } from "react";
import { ExternalLink, ShieldAlert, Youtube } from "lucide-react";
import type { Exercise } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Badge, Button, Field, Input, Sheet } from "./ui";

export function ExerciseDetail({ ex, open, onClose }: { ex: Exercise | null; open: boolean; onClose: () => void }) {
  const { upsert } = useStore();
  const [img, setImg] = useState(0);
  const [video, setVideo] = useState<string>("");
  const [editing, setEditing] = useState(false);
  if (!ex) return null;

  const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + " técnica")}`;
  const saveVideo = () => {
    const url = video.trim();
    if (url && !/^https:\/\//.test(url)) return alert("Usa un enlace que empiece por https://");
    upsert("exercises", { ...ex, video_url: url || null });
    setEditing(false);
  };

  return (
    <Sheet open={open} onClose={onClose} title={ex.name} wide>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          {ex.images.length > 0 ? (
            <>
              <div className="overflow-hidden rounded-3xl bg-sand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ex.images[img]} alt={`${ex.name} — ${img === 0 ? "posición inicial" : "posición final"}`} className="aspect-[4/3] w-full object-cover" />
              </div>
              <div className="mt-2 flex gap-2">
                {ex.images.map((src, i) => (
                  <button key={src} onClick={() => setImg(i)} className={`flex-1 rounded-full py-2 text-xs font-semibold ${img === i ? "bg-ink text-white" : "bg-sand"}`}>
                    {i === 0 ? "Inicio" : "Final"}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted">Imágenes: {ex.media_source}. Corresponden a este mismo ejercicio en la base de origen.</p>
            </>
          ) : (
            <div className="grid aspect-[4/3] place-items-center rounded-3xl bg-sand text-sm text-muted">Sin imagen verificada</div>
          )}
          <div className="mt-4 rounded-3xl bg-sand/50 p-4">
            <div className="flex items-center gap-2 text-sm font-bold"><Youtube size={16} /> Video</div>
            {ex.video_url && !editing ? (
              <a href={ex.video_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-sm font-semibold underline">Ver mi video guardado <ExternalLink size={13} /></a>
            ) : !editing ? (
              <p className="mt-1 text-xs text-muted">No se incluyen videos inventados. Puedes buscar uno de un profesional y guardar el enlace que te guste.</p>
            ) : null}
            {editing ? (
              <div className="mt-2 flex gap-2">
                <Input placeholder="https://..." value={video} onChange={(e) => setVideo(e.target.value)} />
                <Button size="md" onClick={saveVideo}>Guardar</Button>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={search} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-full bg-surface px-3 text-xs font-semibold">Buscar en YouTube <ExternalLink size={12} /></a>
                <Button size="sm" variant="outline" onClick={() => { setVideo(ex.video_url ?? ""); setEditing(true); }}>{ex.video_url ? "Cambiar enlace" : "Guardar enlace"}</Button>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="ink">{ex.primary_muscle}</Badge>
            {ex.secondary_muscles.map((m) => <Badge key={m}>{m}</Badge>)}
          </div>
          <div className="text-xs text-muted">Equipo: {ex.equipment}</div>
          <Block title="Posición inicial"><p>{ex.start_position}</p></Block>
          <Block title="Ejecución"><ol className="list-decimal space-y-1 pl-4">{ex.instructions.map((s) => <li key={s}>{s}</li>)}</ol></Block>
          <Block title="Técnica correcta"><ul className="space-y-1">{ex.technique.map((s) => <li key={s}>· {s}</li>)}</ul></Block>
          <Block title="Errores frecuentes"><ul className="space-y-1">{ex.common_mistakes.map((s) => <li key={s}>· {s}</li>)}</ul></Block>
          <div className="flex gap-2 rounded-2xl bg-rose-soft p-3 text-xs">
            <ShieldAlert size={16} className="shrink-0 text-rose-deep" />
            <div><b>Seguridad.</b> {ex.safety} No entrenes con dolor; si una molestia persiste, consulta con un profesional de la salud.</div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-bold tracking-wide text-muted uppercase">{title}</div>
      <div className="text-ink/85">{children}</div>
    </div>
  );
}

export { Field };
