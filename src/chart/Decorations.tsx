// Decorative artwork for the Boyfriend Behaviour Chart, drawn as inline SVG so it stays
// crisp at any size. Everything here is aria-hidden: the band labels carry the meaning.

import type { CSSProperties } from "react";

const GOLD = "#B5913C";
const PINK_PETAL = "#F8B7CB";
const PINK_PETAL_EDGE = "#E58FAF";
const BRANCH = "#8E5E52";
const WAVE = "#89A4C2";
const WAVE_LIGHT = "#B4C7DB";
const NAVY = "#00609C";

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

const rad = (deg: number) => (deg * Math.PI) / 180;
const r2 = (n: number) => Math.round(n * 100) / 100;
const polar = (cx: number, cy: number, r: number, deg: number) =>
  `${r2(cx + r * Math.cos(rad(deg)))} ${r2(cy + r * Math.sin(rad(deg)))}`;

/** A scalloped peony petal fanning out from the flower centre. */
function peonyPetal(cx: number, cy: number, angle: number, inner: number, outer: number, hw: number) {
  const mid = inner + (outer - inner) * 0.5;
  const P = (r: number, a: number) => polar(cx, cy, r, a);
  return [
    `M ${P(inner, angle - hw * 0.4)}`,
    `C ${P(mid, angle - hw * 1.15)} ${P(outer * 0.94, angle - hw * 1.05)} ${P(outer, angle - hw * 0.66)}`,
    `Q ${P(outer * 1.09, angle - hw * 0.33)} ${P(outer * 0.97, angle)}`,
    `Q ${P(outer * 1.09, angle + hw * 0.33)} ${P(outer, angle + hw * 0.66)}`,
    `C ${P(outer * 0.94, angle + hw * 1.05)} ${P(mid, angle + hw * 1.15)} ${P(inner, angle + hw * 0.4)}`,
  ].join(" ");
}

/** An Archimedean spiral, used for curling flourish ends. */
function spiral(cx: number, cy: number, r0: number, turns: number, startDeg: number, dir: 1 | -1) {
  const steps = Math.round(turns * 36);
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(polar(cx, cy, r0 * (1 - t * 0.85), startDeg + dir * t * turns * 360));
  }
  return pts;
}

function leafPath(x: number, y: number, angle: number, len: number, width: number) {
  const P = (r: number, a: number) => polar(x, y, r, a);
  const tip = P(len, angle);
  const sideA = polar(x, y, len * 0.55, angle - (width / len) * 60);
  const sideB = polar(x, y, len * 0.55, angle + (width / len) * 60);
  return {
    outline: `M ${x} ${y} Q ${sideA} ${tip} Q ${sideB} ${x} ${y} Z`,
    rib: `M ${x} ${y} L ${P(len * 0.85, angle)}`,
  };
}

function Peony({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  const rings = [
    { n: 7, inner: size * 0.22, outer: size, hw: 29, offset: 8 },
    { n: 6, inner: size * 0.16, outer: size * 0.74, hw: 30, offset: 34 },
    { n: 5, inner: size * 0.1, outer: size * 0.5, hw: 34, offset: 12 },
  ];
  return (
    <g>
      {rings.map((ring, ri) =>
        Array.from({ length: ring.n }, (_, i) => {
          const a = ring.offset + (360 / ring.n) * i;
          return (
            <g key={`${ri}-${i}`}>
              <path d={peonyPetal(cx, cy, a, ring.inner, ring.outer, ring.hw)} fill="#fff" stroke={GOLD} strokeWidth={1.3} strokeLinejoin="round" />
              <path d={`M ${polar(cx, cy, ring.inner * 1.3, a)} L ${polar(cx, cy, ring.outer * 0.72, a)}`} stroke={GOLD} strokeWidth={0.7} opacity={0.6} />
            </g>
          );
        }),
      )}
      <circle cx={cx} cy={cy} r={size * 0.12} fill="#fff" stroke={GOLD} strokeWidth={1.2} />
      <path d={`M ${spiral(cx, cy, size * 0.1, 1.4, 0, 1).join(" L ")}`} fill="none" stroke={GOLD} strokeWidth={0.9} />
    </g>
  );
}

function Leaf({ x, y, angle, len, width }: { x: number; y: number; angle: number; len: number; width: number }) {
  const l = leafPath(x, y, angle, len, width);
  return (
    <g>
      <path d={l.outline} fill="#fff" stroke={GOLD} strokeWidth={1.2} strokeLinejoin="round" />
      <path d={l.rib} stroke={GOLD} strokeWidth={0.8} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// 1. Mommy's Good Boy: gold line-art peony corners and an ornamental divider
// ---------------------------------------------------------------------------

export function GoldPeonyCorner({ flip = false, className = "", style }: { flip?: boolean; className?: string; style?: CSSProperties }) {
  const curlA = spiral(186, 26, 9, 1.6, 180, 1);
  const curlB = spiral(20, 150, 8, 1.6, 270, -1);
  return (
    <svg
      viewBox="0 0 220 170"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ ...style, transform: flip ? "scaleX(-1)" : undefined }}
    >
      <g fill="none" stroke={GOLD} strokeLinecap="round" strokeWidth={1.3}>
        <path d={`M 90 34 C 120 10, 150 44, 170 26 S ${curlA[0]} ${curlA[0]} L ${curlA.join(" L ")}`} />
        <path d={`M 96 48 C 126 56, 140 40, 158 52`} opacity={0.8} />
        <path d={`M 34 86 C 16 108, 44 122, 26 140 L ${curlB.join(" L ")}`} />
        <path d="M 60 96 C 70 118, 58 132, 70 146" opacity={0.8} />
      </g>
      <Leaf x={92} y={50} angle={18} len={46} width={14} />
      <Leaf x={86} y={62} angle={48} len={36} width={11} />
      <Leaf x={50} y={92} angle={78} len={40} width={12} />
      <Leaf x={36} y={90} angle={112} len={30} width={9} />
      <Peony cx={40} cy={36} size={58} />
      <g fill="none" stroke={GOLD} strokeWidth={1.1}>
        <path d={peonyPetal(148, 82, -70, 3, 16, 36)} fill="#fff" />
        <path d={peonyPetal(148, 82, -20, 3, 14, 34)} fill="#fff" />
        <path d={peonyPetal(148, 82, -120, 3, 13, 34)} fill="#fff" />
        <path d="M 148 84 C 146 96, 130 100, 122 96" />
      </g>
      <g fill={GOLD}>
        <circle cx={128} cy={30} r={1.8} />
        <circle cx={112} cy={22} r={1.3} />
        <circle cx={196} cy={44} r={1.5} />
        <circle cx={14} cy={112} r={1.5} />
        <circle cx={78} cy={134} r={1.3} />
      </g>
    </svg>
  );
}

export function GoldDivider({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 14" aria-hidden="true" focusable="false" className={className}>
      <g stroke={GOLD} strokeWidth={1.2} strokeLinecap="round" fill="none">
        <path d="M 8 7 H 104" />
        <path d="M 136 7 H 232" />
        <path d="M 104 7 C 110 2, 114 12, 120 7 C 126 2, 130 12, 136 7" opacity={0.7} />
      </g>
      <path d="M 120 1.5 L 125.5 7 L 120 12.5 L 114.5 7 Z" fill={GOLD} />
      <circle cx={4} cy={7} r={2} fill={GOLD} />
      <circle cx={236} cy={7} r={2} fill={GOLD} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 2. ok boy: watercolour cloud, cherry blossom branches, a butterfly
// ---------------------------------------------------------------------------

export function WatercolourCloud({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true" focusable="false" className={className}>
      <defs>
        <filter id="wc-edge" x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves={3} seed={7} />
          <feDisplacementMap in="SourceGraphic" scale={34} />
          <feGaussianBlur stdDeviation={5} />
        </filter>
        <radialGradient id="wc-fill" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#FCD9DD" stopOpacity={1} />
          <stop offset="70%" stopColor="#FCD9DD" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#FCD9DD" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g filter="url(#wc-edge)">
        <ellipse cx={200} cy={100} rx={180} ry={78} fill="url(#wc-fill)" />
        <ellipse cx={120} cy={86} rx={90} ry={56} fill="#FCD9DD" opacity={0.75} />
        <ellipse cx={286} cy={112} rx={100} ry={54} fill="#FCD9DD" opacity={0.75} />
        <ellipse cx={210} cy={72} rx={70} ry={34} fill="#FDE8EB" opacity={0.9} />
        <ellipse cx={158} cy={130} rx={52} ry={22} fill="#F9C7CF" opacity={0.45} />
        <ellipse cx={300} cy={80} rx={40} ry={18} fill="#F9C7CF" opacity={0.35} />
      </g>
    </svg>
  );
}

function Blossom({ cx, cy, r, rot = 0 }: { cx: number; cy: number; r: number; rot?: number }) {
  const petals = Array.from({ length: 5 }, (_, i) => {
    const a = rot + i * 72;
    const P = (rr: number, aa: number) => polar(cx, cy, rr, aa);
    return `M ${cx} ${cy} C ${P(r * 0.7, a - 42)} ${P(r * 1.08, a - 22)} ${P(r, a - 7)} L ${P(r * 0.84, a)} L ${P(r, a + 7)} C ${P(r * 1.08, a + 22)} ${P(r * 0.7, a + 42)} ${cx} ${cy} Z`;
  });
  return (
    <g>
      {petals.map((d, i) => (
        <path key={i} d={d} fill={PINK_PETAL} stroke={PINK_PETAL_EDGE} strokeWidth={0.6} />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <path key={`s${i}`} d={`M ${cx} ${cy} L ${polar(cx, cy, r * 0.45, rot + 36 + i * 72)}`} stroke="#C2406B" strokeWidth={0.6} />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.2} fill="#E0527F" />
    </g>
  );
}

function Bud({ x, y, angle }: { x: number; y: number; angle: number }) {
  return (
    <ellipse cx={x} cy={y} rx={3.2} ry={4.8} fill="#F29AB8" stroke={PINK_PETAL_EDGE} strokeWidth={0.5} transform={`rotate(${angle} ${x} ${y})`} />
  );
}

export function BlossomBranch({ flip = false, className = "", variant = 0 }: { flip?: boolean; className?: string; variant?: 0 | 1 }) {
  return (
    <svg
      viewBox="0 0 130 100"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ transform: flip ? "scaleX(-1)" : undefined }}
    >
      <g fill="none" stroke={BRANCH} strokeLinecap="round">
        <path d={variant === 0 ? "M -4 70 C 30 64, 52 50, 96 30" : "M -4 36 C 28 44, 58 60, 104 66"} strokeWidth={3.2} />
        <path d={variant === 0 ? "M 40 58 C 50 66, 62 74, 78 76" : "M 44 50 C 54 38, 64 30, 78 26"} strokeWidth={2} />
        <path d={variant === 0 ? "M 66 44 C 70 34, 72 24, 70 14" : "M 76 60 C 84 72, 90 80, 94 90"} strokeWidth={1.6} />
      </g>
      {variant === 0 ? (
        <>
          <Blossom cx={98} cy={29} r={12} rot={10} />
          <Blossom cx={78} cy={77} r={10} rot={40} />
          <Blossom cx={68} cy={14} r={9} rot={-20} />
          <Blossom cx={30} cy={62} r={8} rot={25} />
          <Bud x={112} y={22} angle={60} />
          <Bud x={88} y={84} angle={-30} />
          <Bud x={52} y={52} angle={-40} />
        </>
      ) : (
        <>
          <Blossom cx={104} cy={66} r={12} rot={0} />
          <Blossom cx={80} cy={25} r={10} rot={30} />
          <Blossom cx={94} cy={90} r={8} rot={-15} />
          <Blossom cx={28} cy={42} r={8} rot={50} />
          <Bud x={118} y={60} angle={70} />
          <Bud x={62} y={34} angle={20} />
        </>
      )}
    </svg>
  );
}

export function Butterfly({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 36" aria-hidden="true" focusable="false" className={className}>
      <g stroke="#E48AAA" strokeWidth={0.8} strokeLinejoin="round">
        <path d="M 22 17 C 16 4, 3 2, 4 10 C 5 16, 14 18, 22 18 Z" fill="#F9C5D5" />
        <path d="M 22 17 C 28 4, 41 2, 40 10 C 39 16, 30 18, 22 18 Z" fill="#F9C5D5" />
        <path d="M 22 19 C 14 20, 8 28, 13 31 C 17 33, 21 26, 22 20 Z" fill="#FBD9E3" />
        <path d="M 22 19 C 30 20, 36 28, 31 31 C 27 33, 23 26, 22 20 Z" fill="#FBD9E3" />
      </g>
      <path d="M 22 12 L 22 28" stroke="#9A4F6B" strokeWidth={1.6} strokeLinecap="round" />
      <path d="M 22 12 C 20 8, 18 6, 16 5 M 22 12 C 24 8, 26 6, 28 5" stroke="#9A4F6B" strokeWidth={0.8} fill="none" strokeLinecap="round" />
      <circle cx={10} cy={9} r={1.4} fill="#E58FAF" />
      <circle cx={34} cy={9} r={1.4} fill="#E58FAF" />
    </svg>
  );
}

/** A single falling blossom petal (used by the ok boy effect). */
export function PetalShape({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 14" aria-hidden="true" focusable="false" className={className}>
      <path d="M 6 13 C 0 9, 1 2, 4 1 L 6 3 L 8 1 C 11 2, 12 9, 6 13 Z" fill={PINK_PETAL} stroke={PINK_PETAL_EDGE} strokeWidth={0.5} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 3. thin ice: blue waves and navy baroque swirls
// ---------------------------------------------------------------------------

export function WaveCorner({ className = "", rotate = false }: { className?: string; rotate?: boolean }) {
  return (
    <svg
      viewBox="0 0 170 130"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ transform: rotate ? "rotate(180deg)" : undefined }}
    >
      <path d="M 0 0 H 34 C 48 22, 14 42, 30 64 C 44 84, 74 86, 96 102 C 110 112, 132 114, 170 130 H 0 Z" fill={WAVE} />
      <path d="M 0 16 H 14 C 26 34, 2 50, 16 70 C 28 88, 56 94, 76 108 C 88 116, 104 122, 128 130 H 0 Z" fill={WAVE_LIGHT} />
      <path d="M 22 6 C 32 26, 6 44, 22 66 C 36 84, 64 90, 86 104 C 98 112, 118 118, 150 128" fill="none" stroke="#fff" strokeWidth={1.4} opacity={0.75} />
      <path d="M 6 30 C 14 44, -2 56, 8 72 C 18 88, 40 96, 58 110" fill="none" stroke="#fff" strokeWidth={1} opacity={0.6} />
    </svg>
  );
}

export function BaroqueSwirl({ className = "", rotate = false }: { className?: string; rotate?: boolean }) {
  const s1 = spiral(34, 84, 14, 1.5, 0, -1);
  const s2 = spiral(104, 104, 9, 1.4, 180, 1);
  const s3 = spiral(62, 48, 8, 1.3, 90, 1);
  return (
    <svg
      viewBox="0 0 150 130"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ transform: rotate ? "rotate(180deg)" : undefined }}
    >
      <g fill="none" stroke={NAVY} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M ${s1.join(" L ")}`} strokeWidth={2.4} />
        <path d={`M ${s1[0]} C 52 104, 78 118, ${s2[0]}`} strokeWidth={2.4} />
        <path d={`M ${s2.join(" L ")}`} strokeWidth={2} />
        <path d={`M 40 72 C 40 58, 50 50, ${s3[0]}`} strokeWidth={2} />
        <path d={`M ${s3.join(" L ")}`} strokeWidth={1.6} />
        <path d="M 60 100 C 66 88, 80 84, 92 90" strokeWidth={1.4} />
        <path d="M 16 110 C 24 120, 40 124, 54 120" strokeWidth={1.4} />
      </g>
      <g fill={NAVY}>
        <path d="M 72 96 C 78 84, 92 82, 96 86 C 88 88, 80 92, 72 96 Z" />
        <path d="M 46 64 C 44 52, 52 40, 58 40 C 54 48, 50 56, 46 64 Z" />
        <path d="M 116 112 C 126 106, 138 110, 140 116 C 132 114, 124 114, 116 112 Z" />
        <circle cx={120} cy={96} r={2.2} />
        <circle cx={128} cy={102} r={1.6} />
        <circle cx={70} cy={30} r={2} />
        <circle cx={10} cy={96} r={1.8} />
      </g>
      <path d="M 78 92 C 84 88, 90 87, 94 87" stroke="#3B8FD0" strokeWidth={0.9} fill="none" />
    </svg>
  );
}

/** Hairline crack drawn across the thin ice band. */
export const CRACK_PATH =
  "M 0 52 L 14 48 L 22 56 L 36 44 L 48 50 L 58 38 L 70 47 L 84 42 L 92 55 L 104 49 L 116 57 L 128 46 L 140 52 L 152 40 L 166 48 L 178 44 L 190 54 L 200 50";
