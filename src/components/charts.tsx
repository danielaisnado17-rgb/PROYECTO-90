"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtShort } from "@/lib/dates";

const INK = "#111111";
const ROSE = "#e8559a";
const MUTED = "#8a8486";
const GRID = "#efe8e6";

function Tip({ active, payload, unit }: { active?: boolean; payload?: { payload: { date: string; value: number; label?: string } }[]; unit?: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-2xl bg-ink px-3 py-2 text-xs text-white shadow-lg">
      <div className="text-white/60">{p.label ?? fmtShort(p.date)}</div>
      <div className="font-bold">
        {p.value}
        {unit ? ` ${unit}` : ""}
      </div>
    </div>
  );
}

/** Tendencia de una sola serie (peso, medida, fuerza). Sin leyenda: el título de la tarjeta la nombra. */
export function TrendChart({ data, unit, height = 180, reference, referenceLabel, color = INK }: { data: { date: string; value: number; label?: string }[]; unit?: string; height?: number; reference?: number; referenceLabel?: string; color?: string }) {
  if (data.length === 0) return null;
  const vals = data.map((d) => d.value).concat(reference != null ? [reference] : []);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max(0.5, (max - min) * 0.25);
  const id = "g" + Math.abs(color.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ROSE} stopOpacity={0.35} />
              <stop offset="100%" stopColor={ROSE} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="date" tickFormatter={fmtShort} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis domain={[Math.floor((min - pad) * 10) / 10, Math.ceil((max + pad) * 10) / 10]} tickFormatter={(v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={52} />
          {reference != null && <ReferenceLine y={reference} stroke={MUTED} strokeDasharray="4 4" label={{ value: referenceLabel, fontSize: 10, fill: MUTED, position: "insideTopRight" }} />}
          <Tooltip content={<Tip unit={unit} />} cursor={{ stroke: MUTED, strokeDasharray: "3 3" }} />
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={{ r: 4, fill: color, stroke: "#ffffff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras diarias (proteína, calorías, agua) frente a un objetivo (línea de referencia). */
export function DailyBars({ data, target, unit, height = 180 }: { data: { date: string; value: number; label?: string }[]; target?: number; unit?: string; height?: number }) {
  if (data.length === 0) return null;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }} barCategoryGap="22%">
          <defs>
            <pattern id="p90hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#f1ecea" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#8a8486" strokeWidth="1.6" />
            </pattern>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="date" tickFormatter={fmtShort} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={48} />
          {target != null && <ReferenceLine y={target} stroke={ROSE} strokeDasharray="4 4" label={{ value: "objetivo", fontSize: 10, fill: MUTED, position: "insideTopRight" }} />}
          <Tooltip content={<Tip unit={unit} />} cursor={{ fill: "rgba(23,20,19,.05)" }} />
          <Bar dataKey="value" radius={[10, 10, 10, 10]}>
            {data.map((d, i) => (
              <Cell key={i} fill={target != null && d.value >= target * 0.9 ? INK : "url(#p90hatch)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
