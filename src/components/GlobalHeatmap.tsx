"use client";

import React, { useRef, useState } from"react";

type HeatCell = {
 value: number; // -1..1 or 0..1
 label?: string;
};

export interface GlobalHeatmapProps {
 // Grid mode (backward compatible)
 rows?: string[];
 cols?: string[];
 data?: HeatCell[][]; // rows x cols
 // GitHub mode
 mode?:"grid" |"github";
 weeks?: number; // number of columns (weeks)
 startDate?: Date; // end date (defaults to today)
 values?: number[]; // length = weeks * 7 (col-major), normalized 0..1
 cellSizePx?: number; // size of each cell in px (github mode)
 gapPx?: number; // gap between cells in px (github mode)
 amounts?: number[]; // raw amounts (e.g., USD) for tooltip, same indexing as values
 dates?: Date[]; // optional explicit dates per cell (overrides internal calc)
 formatAmount?: (n: number) => string; // how to display amounts in tooltip
 sprinkleBlue?: boolean; // lightly tint a few cells blue
 sprinkleBlueRate?: number; // 0..1 probability per cell (default ~0.08)
 monthView?: boolean; // hide month header and gaps (single-month mode)
 actives?: boolean[]; // mark in-month cells for dimming and tooltips
}

const NEUTRAL_PALETTE = ["#0A2F4F","#0F3D66","#1E4775","#2A5A8F","#3D6BA8"]; // harbor blue tones
const BLUE_ACCENT ="#1E4775";

function levelColor(value01: number): string {
 const v = Math.max(0, Math.min(1, value01));
 const idx = Math.min(
 NEUTRAL_PALETTE.length - 1,
 Math.floor(v * NEUTRAL_PALETTE.length)
 );
 return NEUTRAL_PALETTE[idx];
}

function colorFor(value: number): string {
 // value -1 to 1 -> grayscale from #3f3f46 to #e5e5e5
 const v = Math.max(-1, Math.min(1, value));
 const t = (v + 1) / 2; // 0..1
 const ch = Math.round(63 + t * (229 - 63)); // 0x3f to 0xe5
 return `rgb(${ch} ${ch} ${ch})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
 const h = hex.replace("#","");
 const bigint = parseInt(
 h.length === 3
 ? h
 .split("")
 .map((c) => c + c)
 .join("")
 : h,
 16
 );
 return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function mixRgb(
 a: { r: number; g: number; b: number },
 b: { r: number; g: number; b: number },
 t: number
): string {
 const cl = (x: number) => Math.round(Math.max(0, Math.min(255, x)));
 return `rgb(${cl(a.r + (b.r - a.r) * t)} ${cl(a.g + (b.g - a.g) * t)} ${cl(
 a.b + (b.b - a.b) * t
 )})`;
}

function shouldAccent(index: number, rate: number): boolean {
 // deterministic noise based on index
 const s = Math.sin(index * 12.9898) * 43758.5453;
 const frac = s - Math.floor(s);
 return frac < rate;
}

export default function GlobalHeatmap({
 rows,
 cols,
 data,
 mode ="grid",
 weeks = 20,
 startDate,
 values = [],
 cellSizePx = 14,
 gapPx = 4,
 amounts,
 dates,
 formatAmount,
 sprinkleBlue = true,
 sprinkleBlueRate = 0.2,
 monthView = false,
 actives,
}: GlobalHeatmapProps) {
 if (mode ==="github") {
 const end = startDate ?? new Date();
 // Align end to end of week (Saturday) similar to GitHub
 const endDay = end.getDay();
 const endAligned = new Date(end);
 // 0 Sun ... 6 Sat, move to Sat
 const addDays = (6 - endDay + 7) % 7;
 endAligned.setDate(end.getDate() + addDays);

 const colsArr = Array.from({ length: weeks });

 // Month labels at first column where month changes
 const monthLabels: (string | null)[] = colsArr.map((_, c) => {
 const daysBack = (weeks - 1 - c) * 7;
 const d = new Date(endAligned);
 d.setDate(endAligned.getDate() - daysBack);
 const isFirstOfMonth = d.getDate() <= 7; // show label in first week of a month
 return isFirstOfMonth
 ? d.toLocaleString(undefined, { month:"short" })
 : null;
 });

 // Determine boundaries between months for extra spacing
 const isMonthBoundary: boolean[] = colsArr.map((_, c) => {
 if (monthView) return false;
 if (c === 0) return false;
 const dCurr = new Date(endAligned);
 dCurr.setDate(endAligned.getDate() - (weeks - 1 - c) * 7);
 const dPrev = new Date(endAligned);
 dPrev.setDate(endAligned.getDate() - (weeks - c) * 7);
 return dCurr.getMonth() !== dPrev.getMonth();
 });
 const monthGapPx = monthView ? 0 : gapPx * 3;

 const cellStyle = {
 width: `${cellSizePx}px`,
 height: `${cellSizePx}px`,
 } as React.CSSProperties;
 const columnStyle = { width: `${cellSizePx}px` } as React.CSSProperties;

 // Tooltip state
 // eslint-disable-next-line react-hooks/rules-of-hooks
 const wrapRef = useRef<HTMLDivElement | null>(null);
 // eslint-disable-next-line react-hooks/rules-of-hooks
 const [tip, setTip] = useState<{
 x: number;
 y: number;
 title: string;
 subtitle: string;
 show: boolean;
 }>({ x: 0, y: 0, title:"", subtitle:"", show: false });

 const handleEnter = (title: string, subtitle: string) =>
 setTip((t) => ({ ...t, title, subtitle, show: true }));
 const handleMove = (e: React.MouseEvent) => {
 const rect = wrapRef.current?.getBoundingClientRect();
 const x = rect ? e.clientX - rect.left : e.clientX;
 const y = rect ? e.clientY - rect.top : e.clientY;
 setTip((t) => ({ ...t, x: x + 10, y: y + 10 }));
 };
 const handleLeave = () => setTip((t) => ({ ...t, show: false }));

 return (
 <div className="w-full relative" ref={wrapRef}>
 {!monthView && (
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-4 text-[11px] text-white/60">
 <span>Less</span>
 <div className="flex items-center" style={{ gap: `${gapPx}px` }}>
 {NEUTRAL_PALETTE.map((c, i) => (
 <div
 key={i}
 className="-[3px] 
 style={{ ...cellStyle, backgroundColor: c }}
 />
 ))}
 </div>
 <span>More</span>
 </div>
 </div>
 )}
 {/* Month header row with more spacing from grid */}
 {!monthView && (
 <div className="flex mb-3" style={{ gap: `${gapPx}px` }}>
 <div style={{ width: `${cellSizePx * 2}px` }} />
 <div className="flex" style={{ gap: `${gapPx}px` }}>
 {colsArr.map((_, c) => (
 <React.Fragment key={c}>
 {isMonthBoundary[c] && (
 <div style={{ width: `${monthGapPx}px` }} />
 )}
 <div style={{ ...columnStyle, flex:"0 0 auto" }}>
 {monthLabels[c] && (
 <div className="text-[11px] text-white/60">
 {monthLabels[c]}
 </div>
 )}
 </div>
 </React.Fragment>
 ))}
 </div>
 </div>
 )}
 {/* Grid (no day labels) */}
 <div className="flex" style={{ gap: `${gapPx}px` }}>
 {colsArr.map((_, c) => (
 <React.Fragment key={c}>
 {isMonthBoundary[c] && (
 <div style={{ width: `${monthGapPx}px`, flex:"0 0 auto" }} />
 )}
 <div
 className="flex flex-col"
 style={{
 gap: `${gapPx}px`,
 width: `${cellSizePx}px`,
 flex:"0 0 auto",
 }}
 >
 {Array.from({ length: 7 }).map((_, r) => {
 const idx = c * 7 + r;
 const v = values[idx] ?? 0;
 const isActive = actives ? !!actives[idx] : true;
 const computedDate = (() => {
 if (dates && dates[idx]) return dates[idx];
 const daysBackWeeks = (weeks - 1 - c) * 7;
 const offsetInWeek = 6 - r; // 0..6 from Sat
 const d = new Date(endAligned);
 d.setDate(
 endAligned.getDate() - (daysBackWeeks + offsetInWeek)
 );
 return d;
 })();
 const amt = amounts?.[idx];
 const title =
 amt !== undefined
 ? `${
 formatAmount
 ? formatAmount(amt)
 : amt.toLocaleString()
 }`
 : `${(v * 100).toFixed(0)}%`;
 const subtitle = computedDate.toLocaleDateString();
 const idxFlat = c * 7 + r;
 // compute base and optionally bluish-purple tinted color
 const baseHex = levelColor(v);
 const baseRgb = hexToRgb(baseHex);
 const blueRgb = hexToRgb(BLUE_ACCENT);
 const mixT = 0.35 + 0.45 * Math.max(0, Math.min(1, v)); // stronger tint on higher values
 const tinted =
 sprinkleBlue && shouldAccent(idxFlat, sprinkleBlueRate)
 ? mixRgb(baseRgb, blueRgb, mixT)
 : `rgb(${baseRgb.r} ${baseRgb.g} ${baseRgb.b})`;
 return (
 <div
 key={r}
 onMouseEnter={
 isActive
 ? () => handleEnter(title, subtitle)
 : undefined
 }
 onMouseMove={isActive ? handleMove : undefined}
 onMouseLeave={isActive ? handleLeave : undefined}
 className={
"-[3px]" +
 (isActive
 ?"hover:outline-white/30 hover:opacity-90 cursor-pointer"
 :"opacity-35")
 }
 style={{ ...cellStyle, backgroundColor: tinted }}
 />
 );
 })}
 </div>
 </React.Fragment>
 ))}
 </div>
 {tip.show && (
 <div
 className="pointer-events-none absolute z-50 bg-zinc-950/95 shadow-lg px-3 py-2"
 style={{ left: tip.x, top: tip.y, minWidth: 140 }}
 >
 <div className="text-white text-sm font-semibold leading-tight">
 {tip.title}
 </div>
 <div className="text-white/70 text-xs mt-0.5">{tip.subtitle}</div>
 </div>
 )}
 </div>
 );
 }

 // Grid mode (existing)
 const safeRows = rows ?? [];
 const safeCols = cols ?? [];
 const safeData = data ?? [];
 return (
 <div className="w-full overflow-x-auto">
 <div
 className="inline-grid"
 style={{
 gridTemplateColumns: `auto repeat(${safeCols.length}, minmax(44px, 1fr))`,
 }}
 >
 <div className="sticky left-0 bg-transparent" />
 {safeCols.map((c, i) => (
 <div
 key={i}
 className="px-2 py-1 text-[11px] text-white/60 text-center uppercase"
 >
 {c}
 </div>
 ))}
 {safeRows.map((r, i) => (
 <React.Fragment key={i}>
 <div className="px-2 py-1 text-[11px] text-white/60 uppercase sticky left-0 bg-zinc-950">
 {r}
 </div>
 {safeCols.map((c, j) => {
 const cell = safeData[i]?.[j] || { value: 0 };
 return (
 <div
 key={j}
 className="h-5 m-1 w-5 
 style={{ backgroundColor: colorFor(cell.value) }}
 />
 );
 })}
 </React.Fragment>
 ))}
 </div>
 </div>
 );
}
