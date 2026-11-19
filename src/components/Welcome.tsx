"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { todayISO } from "@/lib/dates";
import { Button, Field, Input } from "./ui";

export function Welcome() {
  const { initialize } = useStore();
  const [name, setName] = useState("");
  const [start, setStart] = useState(todayISO());
  return (
    <div className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-md rise">
        <div className="mb-8">
          <div className="text-xs font-bold tracking-[.35em] text-muted">PROJECT</div>
          <div className="font-serif text-8xl leading-none italic">90</div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Tu transformación empieza aquí.</h1>
          <p className="mt-2 text-sm text-muted">Cargaré tu perfil inicial (22 años · 157 cm · 56 kg), tus medidas de partida, tu plan de 4 días + natación y unos objetivos nutricionales estimados que podrás ajustar.</p>
        </div>
        <div className="card space-y-4 p-6">
          <Field label="¿Cómo te llamo?">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
          </Field>
          <Field label="Día 1 del programa" hint="Puedes cambiarlo después en Configuración.">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Button className="w-full" size="lg" onClick={() => initialize(start, name.trim())}>
            Empezar mis 90 días
          </Button>
        </div>
      </div>
    </div>
  );
}
