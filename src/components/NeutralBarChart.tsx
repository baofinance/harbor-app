"use client";

import React, { useEffect } from"react";
import {
 BarChart,
 Bar,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
 Cell,
} from"recharts";

export type NeutralBarPoint = {
 timestamp: number;
 [key: string]: number;
};

export type NeutralBarSeries = {
 key: string;
 label: string;
 fill: string; // rgba/hex neutral color
};

interface NeutralBarChartProps {
 data: NeutralBarPoint[];
 series: NeutralBarSeries[];
 height?: number;
 formatTimestamp?: (ts: number) => string;
 unit?: string;
 // accent sprinkle controls
 sprinkleAccent?: boolean;
 sprinkleRate?: number; // 0..1, default 0.15
 accentColor?: string; // default #ff8b7b
}

const NeutralTooltip: React.FC<{
 active?: boolean;
 payload?: any[];
 label?: number;
 unit?: string;
 formatTimestamp?: (ts: number) => string;
}> = ({ active, payload, label, unit, formatTimestamp }) => {
 if (!active || !payload || !payload.length) return null;
 const items = payload as { name: string; value: number; color: string }[];
 return (
 <div className="bg-zinc-950/95 p-3 text-xs text-white/80">
 {typeof label ==="number" && (
 <div className="mb-1 text-white">
 {formatTimestamp
 ? formatTimestamp(label)
 : new Date(label).toLocaleDateString()}
 </div>
 )}
 <div className="space-y-0.5">
 {items.map((it, idx) => (
 <div key={idx} className="flex items-center justify-between gap-4">
 <span className="inline-flex items-center gap-4">
 <span
 className="inline-block w-2.5 h-2.5"
 style={{ backgroundColor: it.color }}
 />
 {it.name}
 </span>
 <span className="text-white">
 {it.value.toFixed(2)}
 {unit ||""}
 </span>
 </div>
 ))}
 </div>
 </div>
 );
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
 if (!hex) return null;
 const h = hex.replace("#","");
 const str =
 h.length === 3
 ? h
 .split("")
 .map((c) => c + c)
 .join("")
 : h;
 const n = parseInt(str, 16);
 if (Number.isNaN(n) || str.length !== 6) return null;
 return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbMix(
 a: { r: number; g: number; b: number },
 b: { r: number; g: number; b: number },
 t: number
) {
 const cl = (x: number) => Math.round(Math.max(0, Math.min(255, x)));
 return `rgb(${cl(a.r + (b.r - a.r) * t)} ${cl(a.g + (b.g - a.g) * t)} ${cl(
 a.b + (b.b - a.b) * t
 )})`;
}
function shouldAccent(index: number, rate: number) {
 const s = Math.sin(index * 12.9898) * 43758.5453;
 const f = s - Math.floor(s);
 return f < rate;
}

export default function NeutralBarChart({
 data,
 series,
 height = 160,
 formatTimestamp,
 unit,
 sprinkleAccent = true,
 sprinkleRate = 0.15,
 accentColor ="#ff8b7b",
}: NeutralBarChartProps) {
 useEffect(() => {
 const id = setTimeout(() => {
 try {
 window.dispatchEvent(new Event("resize"));
 } catch {}
 }, 60);
 return () => clearTimeout(id);
 }, []);

 const accentRgb = hexToRgb(accentColor) || { r: 255, g: 139, b: 123 };

 return (
 <div className="w-full min-w-0 relative" style={{ height }}>
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
 <CartesianGrid
 strokeDasharray="2 6"
 stroke="#ffffff"
 opacity={0.08}
 vertical={false}
 />
 <XAxis
 dataKey="timestamp"
 tickFormatter={(v) =>
 formatTimestamp
 ? formatTimestamp(v)
 : new Date(v).toLocaleDateString()
 }
 tick={{ fontSize: 11, fill:"#A3A3A3" }}
 tickLine={{ stroke:"#A3A3A3", opacity: 0.2 }}
 axisLine={{ stroke:"#A3A3A3", opacity: 0.2 }}
 />
 <YAxis
 tick={{ fontSize: 11, fill:"#A3A3A3" }}
 tickLine={{ stroke:"#A3A3A3", opacity: 0.2 }}
 axisLine={{ stroke:"#A3A3A3", opacity: 0.2 }}
 width={40}
 />
 <Tooltip
 content={
 <NeutralTooltip unit={unit} formatTimestamp={formatTimestamp} />
 }
 />
 {series.map((s) => (
 <Bar
 key={s.key}
 dataKey={s.key}
 name={s.label}
 stackId="a"
 fill={s.fill}
 >
 {data.map((d, idx) => {
 const baseHex = s.fill;
 const base = hexToRgb(baseHex) || { r: 161, g: 161, b: 170 };
 const val =
 typeof d[s.key] ==="number" ? (d[s.key] as number) : 0;
 const t =
 0.3 + 0.5 * Math.max(0, Math.min(1, val / (val || 1))); // stronger with higher bar
 const fill =
 sprinkleAccent && shouldAccent(idx, sprinkleRate)
 ? rgbMix(base, accentRgb, t)
 : `rgb(${base.r} ${base.g} ${base.b})`;
 return <Cell key={`cell-${s.key}-${idx}`} fill={fill} />;
 })}
 </Bar>
 ))}
 </BarChart>
 </ResponsiveContainer>
 </div>
 );
}
