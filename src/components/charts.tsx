import { useId, useRef, useState, type ReactNode } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "../lib/motion";
import { fmtNumber } from "../lib/format";
import { LEVELS } from "../lib/levels";
import type { LevelId } from "../lib/types";

/** A headline number with a label: most of the stats page is these. */
export function StatTile({ label, value, sub, className = "" }: { label: string; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col rounded-2xl bg-surface p-4 shadow-card ${className}`}>
      <p className="text-sm font-extrabold text-muted">{label}</p>
      <p className="mt-1 text-3xl font-black leading-tight text-ink tabular-nums break-words">{value}</p>
      {sub ? <p className="mt-0.5 text-sm font-semibold text-muted break-words">{sub}</p> : null}
    </div>
  );
}

interface Bar {
  label: string;
  /** Short axis label, shown for some bars only. */
  tick?: string;
  value: number;
}

/**
 * Single-series bar chart. Thin bars with rounded tops anchored to the baseline, a 2px gap,
 * a recessive grid, a tooltip on hover or focus, and a hidden table for screen readers.
 */
export function BarChart({ title, bars, unit = "pts" }: { title: string; bars: Bar[]; unit?: string }) {
  const W = 320;
  const H = 150;
  const PAD_L = 28;
  const PAD_B = 20;
  const PAD_T = 8;
  const max = Math.max(10, ...bars.map((b) => b.value));
  const niceMax = Math.ceil(max / 10) * 10;
  const plotW = W - PAD_L;
  const plotH = H - PAD_B - PAD_T;
  const slot = plotW / bars.length;
  const barW = Math.max(3, Math.min(18, slot - 2));
  const [active, setActive] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const tableId = useId();

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(svg.current!.querySelectorAll("[data-bar]"), {
        scaleY: 0,
        transformOrigin: "50% 100%",
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.02,
      });
    },
    { scope: svg, dependencies: [bars.map((b) => b.value).join(",")] },
  );

  const y = (v: number) => PAD_T + plotH - (v / niceMax) * plotH;
  const barPath = (x: number, v: number) => {
    const top = y(v);
    const h = PAD_T + plotH - top;
    if (h <= 0) return "";
    const r = Math.min(4, barW / 2, h);
    return `M ${x} ${PAD_T + plotH} V ${top + r} Q ${x} ${top} ${x + r} ${top} H ${x + barW - r} Q ${x + barW} ${top} ${x + barW} ${top + r} V ${PAD_T + plotH} Z`;
  };

  return (
    <figure className="relative rounded-2xl bg-surface p-4 shadow-card">
      <figcaption className="mb-2 text-sm font-extrabold text-muted">{title}</figcaption>
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-describedby={tableId} onPointerLeave={() => setActive(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD_L} x2={W} y1={y(niceMax * f)} y2={y(niceMax * f)} stroke="#F3DDE5" strokeWidth={1} />
            <text x={PAD_L - 6} y={y(niceMax * f) + 4} textAnchor="end" fontSize={10} fontWeight={700} fill="#865369">
              {fmtNumber(niceMax * f)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const x = PAD_L + i * slot + (slot - barW) / 2;
          return (
            <g key={i}>
              <path data-bar d={barPath(x, b.value)} fill={active === i ? "#B3265F" : "#C92F6D"} />
              {b.tick ? (
                <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#865369">
                  {b.tick}
                </text>
              ) : null}
              {/* Hit target wider and taller than the bar. */}
              <rect
                x={PAD_L + i * slot}
                y={PAD_T}
                width={slot}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                aria-label={`${b.label}: ${fmtNumber(b.value)} ${unit}`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                style={{ outline: "none" }}
              />
            </g>
          );
        })}
      </svg>
      {active !== null ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-8 rounded-xl bg-ink px-3 py-1.5 text-xs font-bold text-white shadow-pop"
          style={{ left: `clamp(8px, calc(${((PAD_L + (active + 0.5) * slot) / W) * 100}% - 40px), calc(100% - 120px))` }}
        >
          {bars[active].label}: {fmtNumber(bars[active].value)} {unit}
        </div>
      ) : null}
      <table id={tableId} className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {bars.map((b, i) => (
            <tr key={i}>
              <th scope="row">{b.label}</th>
              <td>
                {fmtNumber(b.value)} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Time on each chart level. Each row is labelled, so colour is never the only cue. */
export function LevelShare({ share }: { share: { id: LevelId; pct: number; days: number }[] }) {
  return (
    <ul className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card">
      {share.map((s) => {
        const def = LEVELS.find((l) => l.id === s.id)!;
        return (
          <li key={s.id} className="grid grid-cols-[8.5rem_1fr_3rem] items-center gap-3">
            <span className="font-script text-[26px] leading-[1.2]" style={{ color: def.color }}>
              {def.label}
            </span>
            <span className="h-3 overflow-hidden rounded-full" aria-hidden="true">
              <span className="block h-full rounded-full" style={{ width: `${Math.max(s.pct > 0 ? 3 : 0, s.pct * 100)}%`, background: def.color }} />
            </span>
            <span className="text-right text-sm font-black text-ink tabular-nums">{Math.round(s.pct * 100)}%</span>
          </li>
        );
      })}
    </ul>
  );
}
