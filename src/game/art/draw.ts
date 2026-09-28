// Small drawing helpers shared by every piece of game art. All art is drawn in code with
// Canvas 2D paths, so it stays sharp at any size and nothing personal ships as an image.

export type Ctx = CanvasRenderingContext2D;

export const INK = "#3b2430";

/** Seeded random numbers so patterns (camo, graffiti, crowds) look the same every frame. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fillStroke(ctx: Ctx, fill: string | CanvasGradient | CanvasPattern | null, stroke: string | null = INK, width = 1.3) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(rx, 0.01), Math.max(ry, 0.01), rot, 0, Math.PI * 2);
}

export function circle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(r, 0.01), 0, Math.PI * 2);
}

export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number | number[]) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** A closed shape through points with rounded corners (quadratic curves through midpoints). */
export function blob(ctx: Ctx, pts: [number, number][]) {
  ctx.beginPath();
  const n = pts.length;
  const mid = (i: number) => {
    const a = pts[i % n];
    const b = pts[(i + 1) % n];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
  };
  const m0 = mid(n - 1);
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const m = mid(i);
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  ctx.closePath();
}

/** A straight closed polygon. */
export function poly(ctx: Ctx, pts: [number, number][]) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

/** A rounded limb: a capsule from (x1,y1) to (x2,y2) that tapers from w1 to w2. */
export function limb(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, w1: number, w2: number) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const nx = Math.cos(a + Math.PI / 2);
  const ny = Math.sin(a + Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(x1 + (nx * w1) / 2, y1 + (ny * w1) / 2);
  ctx.lineTo(x2 + (nx * w2) / 2, y2 + (ny * w2) / 2);
  ctx.arc(x2, y2, w2 / 2, a + Math.PI / 2, a - Math.PI / 2, true);
  ctx.lineTo(x1 - (nx * w1) / 2, y1 - (ny * w1) / 2);
  ctx.arc(x1, y1, w1 / 2, a - Math.PI / 2, a + Math.PI / 2, true);
  ctx.closePath();
}

/** Like limb() but the far end is cut flat (trouser hems). */
export function limbFlat(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, w1: number, w2: number) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const nx = Math.cos(a + Math.PI / 2);
  const ny = Math.sin(a + Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(x1 + (nx * w1) / 2, y1 + (ny * w1) / 2);
  ctx.lineTo(x2 + (nx * w2) / 2, y2 + (ny * w2) / 2);
  ctx.lineTo(x2 - (nx * w2) / 2, y2 - (ny * w2) / 2);
  ctx.lineTo(x1 - (nx * w1) / 2, y1 - (ny * w1) / 2);
  ctx.arc(x1, y1, w1 / 2, a - Math.PI / 2, a + Math.PI / 2, true);
  ctx.closePath();
}

/** Clip to the current path, run `paint`, then restore. */
export function clipped(ctx: Ctx, paint: () => void) {
  ctx.save();
  ctx.clip();
  paint();
  ctx.restore();
}

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt * (amt > 0 ? 255 - c : c))));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function linGrad(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

export function radGrad(ctx: Ctx, x: number, y: number, r0: number, r1: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** Camo-style blobs over whatever is clipped. */
export function camo(ctx: Ctx, x: number, y: number, w: number, h: number, colors: string[], seed: number, size = 4) {
  const r = rng(seed);
  for (let i = 0; i < (w * h) / (size * size * 1.2); i++) {
    const cx = x + r() * w;
    const cy = y + r() * h;
    ctx.fillStyle = colors[Math.floor(r() * colors.length)];
    const s = size * (0.6 + r() * 0.9);
    blob(ctx, [
      [cx - s, cy - s * 0.3],
      [cx - s * 0.2, cy - s * 0.8],
      [cx + s, cy - s * 0.4],
      [cx + s * 0.7, cy + s * 0.6],
      [cx - s * 0.4, cy + s * 0.7],
    ]);
    ctx.fill();
  }
}

/** Mottled acid-wash / faded denim over whatever is clipped. */
export function mottle(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, seed: number, alpha = 0.35) {
  const r = rng(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let i = 0; i < (w * h) / 10; i++) {
    ellipse(ctx, x + r() * w, y + r() * h, 0.8 + r() * 2.2, 0.5 + r() * 1.2, r() * 3);
    ctx.fill();
  }
  ctx.restore();
}

/** Text helper that sets a rounded game font. */
export function text(ctx: Ctx, s: string, x: number, y: number, size: number, color: string, opts: { align?: CanvasTextAlign; weight?: number; font?: string; baseline?: CanvasTextBaseline } = {}) {
  ctx.font = `${opts.weight ?? 900} ${size}px ${opts.font ?? '"Nunito Variable", Nunito, ui-rounded, system-ui, sans-serif'}`;
  ctx.textAlign = opts.align ?? "center";
  ctx.textBaseline = opts.baseline ?? "middle";
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

export function heartPath(ctx: Ctx, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.55, y - s * 1.05, x, y - s * 0.55);
  ctx.bezierCurveTo(x + s * 0.55, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35);
  ctx.closePath();
}
