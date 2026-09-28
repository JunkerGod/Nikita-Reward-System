import { INK, camo, circle, clipped, ellipse, fillStroke, heartPath, limb, limbFlat, linGrad, radGrad, mottle, rng, rrect, shade, type Ctx } from "./draw";

// Everyone in the game, drawn as soft chibi cartoons. Origin is between the feet, facing right.

export type TopKind =
  | "tee"
  | "hoodie"
  | "jacket"
  | "overshirt"
  | "sweater"
  | "uniform"
  | "halfzip"
  | "zipshirt"
  | "ruched"
  | "longtop"
  | "puffer";
export type BottomKind = "wide" | "cargo" | "sweats" | "jeans";
export type HairKind = "nikita" | "curly" | "straight" | "chichi" | "aayam" | "short" | "bun" | "cap" | "bob" | "ponytail" | "buzz";

export interface Top {
  kind: TopKind;
  color: string;
  inner?: string; // tee or top visible at the neck/opening
  pattern?: "camo" | "camoGrey" | "lightning" | "print";
  oversized?: boolean;
}
export interface Bottom {
  kind: BottomKind;
  color: string;
  pattern?: "camoGrey" | "acid" | "fade";
  frayed?: boolean;
}
export interface Look {
  id: string;
  build: "girl" | "boy" | "tall";
  skin: string;
  hair: HairKind;
  hairColor: string;
  hairEnd?: string; // ombre ends
  top: Top;
  bottom: Bottom;
  shoes: string;
  sole?: string;
  hoops?: boolean;
  stud?: boolean;
  glasses?: boolean;
  bag?: boolean;
  necklace?: "name" | "chain" | "heart" | "silver";
  bearEars?: string;
  lashes?: boolean;
}

export type PoseKind = "idle" | "run" | "jump" | "fall" | "crouch" | "wave" | "hi" | "kiss" | "hurt" | "sit" | "talk" | "lean" | "look";

export interface Pose {
  kind: PoseKind;
  t: number; // 0..1 through the cycle
  blink?: boolean;
  happy?: boolean;
}

interface Metrics {
  headR: number;
  headY: number;
  shY: number;
  shW: number;
  hipY: number;
  hipW: number;
  legLen: number;
  armLen: number;
}

const METRICS: Record<Look["build"], Metrics> = {
  girl: { headR: 12.2, headY: -45, shY: -32, shW: 7.6, hipY: -17, hipW: 6.8, legLen: 14, armLen: 13 },
  boy: { headR: 12.2, headY: -51.5, shY: -38, shW: 9, hipY: -20, legLen: 17, hipW: 7.2, armLen: 15 },
  tall: { headR: 12.4, headY: -57, shY: -43.5, shW: 9.6, hipY: -22.5, legLen: 19.5, hipW: 7.6, armLen: 16.5 },
};

export const personHeight = (look: Look) => -METRICS[look.build].headY + METRICS[look.build].headR + (look.hair === "curly" ? 7 : 2);

// ---------------------------------------------------------------------------
// Pose maths
// ---------------------------------------------------------------------------

interface Joints {
  lean: number;
  bob: number;
  legF: [number, number]; // thigh angle, knee bend (radians, 0 = straight down, + = forward)
  legB: [number, number];
  armF: [number, number]; // upper arm angle, elbow bend
  armB: [number, number];
  headTilt: number;
  crouch: number;
  eyes: "open" | "closed" | "happy" | "hurt" | "look";
  mouth: "smile" | "open" | "o" | "kiss" | "grin" | "flat";
  handToMouth?: boolean;
}

function joints(pose: Pose): Joints {
  const p = pose.t * Math.PI * 2;
  const base: Joints = {
    lean: 0,
    bob: 0,
    legF: [0.05, 0],
    legB: [-0.05, 0],
    armF: [0.12, 0.18],
    armB: [-0.1, 0.12],
    headTilt: 0,
    crouch: 0,
    eyes: pose.blink ? "closed" : pose.happy ? "happy" : "open",
    mouth: pose.happy ? "grin" : "smile",
  };
  switch (pose.kind) {
    case "idle":
    case "talk":
      base.bob = Math.sin(p) * 0.45;
      base.armF = [0.12 + Math.sin(p) * 0.03, 0.2];
      if (pose.kind === "talk") base.mouth = Math.sin(p * 3) > 0 ? "open" : "smile";
      return base;
    case "run": {
      const s = Math.sin(p);
      base.lean = 0.09;
      base.bob = -Math.abs(Math.cos(p)) * 1.8 + 0.9;
      base.legF = [s * 0.62, -(Math.max(0, -s) * 1.1 + 0.15)];
      base.legB = [-s * 0.62, -(Math.max(0, s) * 1.1 + 0.15)];
      base.armF = [-s * 0.75, 0.95];
      base.armB = [s * 0.75, 0.95];
      return base;
    }
    case "jump":
      base.legF = [1.0, -1.5];
      base.legB = [-0.3, -0.6];
      base.armF = [-2.6, 0.3];
      base.armB = [0.6, 0.6];
      base.mouth = "open";
      return base;
    case "fall":
      base.legF = [0.35, -0.4];
      base.legB = [-0.3, -0.3];
      base.armF = [-2.2, 0.3];
      base.armB = [-2.0, 0.3];
      base.mouth = "o";
      return base;
    case "crouch":
      base.crouch = 7;
      base.legF = [1.4, -2.4];
      base.legB = [1.2, -2.3];
      base.armF = [0.9, 1.5];
      base.armB = [0.7, 1.4];
      base.eyes = "look";
      base.mouth = "flat";
      return base;
    case "wave":
      base.bob = Math.sin(p) * 0.4;
      base.handToMouth = true;
      base.armF = [-0.55 + Math.sin(p * 2) * 0.06, -2.5];
      base.armB = [-0.1, 0.2];
      base.headTilt = -0.1;
      base.eyes = "happy";
      base.mouth = "smile";
      return base;
    case "hi":
      base.bob = Math.sin(p) * 0.4;
      base.armF = [-2.7 + Math.sin(p * 2) * 0.25, 0.35];
      base.eyes = "happy";
      base.mouth = "grin";
      return base;
    case "kiss":
      base.lean = 0.16;
      base.armF = [1.0, 0.6];
      base.armB = [0.9, 0.6];
      base.eyes = "closed";
      base.mouth = "kiss";
      base.headTilt = 0.12;
      return base;
    case "hurt":
      base.lean = -0.12;
      base.armF = [-1.4, 0.5];
      base.armB = [-1.2, 0.5];
      base.legF = [0.3, -0.4];
      base.eyes = "hurt";
      base.mouth = "o";
      return base;
    case "sit":
      base.legF = [1.5, -1.5];
      base.legB = [1.4, -1.45];
      base.armF = [0.5, 0.6];
      base.armB = [0.3, 0.5];
      return base;
    case "lean":
      base.lean = 0.12;
      base.armF = [1.1, 0.8];
      return base;
    case "look":
      base.eyes = "look";
      base.mouth = "o";
      return base;
  }
}

/** How far the hips sit above the feet, for placing someone on a bench. */
export const hipHeight = (look: Look) => -METRICS[look.build].hipY;

// ---------------------------------------------------------------------------
// Drawing
// ---------------------------------------------------------------------------

const OUT = 1.3;

/** Two-segment limb: outline pass then fill pass so the knee/elbow joins cleanly. */
function drawLimb(
  ctx: Ctx,
  x0: number,
  y0: number,
  a1: number,
  l1: number,
  bend: number,
  l2: number,
  w0: number,
  w1: number,
  w2: number,
  fill: string,
  paint?: (x: number, y: number, w: number, h: number) => void,
  flat = false,
) {
  const seg2 = flat ? limbFlat : limb;
  const x1 = x0 + Math.sin(a1) * l1;
  const y1 = y0 + Math.cos(a1) * l1;
  const a2 = a1 + bend;
  const x2 = x1 + Math.sin(a2) * l2;
  const y2 = y1 + Math.cos(a2) * l2;
  ctx.lineJoin = "round";
  // outline
  ctx.strokeStyle = INK;
  ctx.lineWidth = OUT * 2;
  limb(ctx, x0, y0, x1, y1, w0, w1);
  ctx.stroke();
  seg2(ctx, x1, y1, x2, y2, w1, w2);
  ctx.stroke();
  // fill
  ctx.fillStyle = fill;
  limb(ctx, x0, y0, x1, y1, w0, w1);
  ctx.fill();
  if (paint) clipped(ctx, () => paint(Math.min(x0, x1) - w0, Math.min(y0, y1) - w0, Math.abs(x1 - x0) + w0 * 2, Math.abs(y1 - y0) + w0 * 2));
  seg2(ctx, x1, y1, x2, y2, w1, w2);
  ctx.fill();
  if (paint) clipped(ctx, () => paint(Math.min(x1, x2) - w1, Math.min(y1, y2) - w1, Math.abs(x2 - x1) + w1 * 2, Math.abs(y2 - y1) + w1 * 2));
  return { x: x2, y: y2, a: a2, kx: x1, ky: y1 };
}

function bottomPaint(ctx: Ctx, b: Bottom, seed: number) {
  if (b.pattern === "camoGrey") return (x: number, y: number, w: number, h: number) => camo(ctx, x, y, w, h, ["#8d8f8c", "#5f625f", "#2f302f", "#b9bab4"], seed, 3.2);
  if (b.pattern === "acid") return (x: number, y: number, w: number, h: number) => mottle(ctx, x, y, w, h, "#ffffff", seed, 0.3);
  if (b.pattern === "fade") return (x: number, y: number, w: number, h: number) => mottle(ctx, x, y, w, h, "#ffffff", seed, 0.16);
  return undefined;
}

function topPaint(ctx: Ctx, t: Top, seed: number) {
  if (t.pattern === "camo") return (x: number, y: number, w: number, h: number) => camo(ctx, x, y, w, h, ["#5d6b3a", "#3e4a2a", "#8a7b52", "#2a2a20"], seed, 3.4);
  if (t.pattern === "camoGrey") return (x: number, y: number, w: number, h: number) => camo(ctx, x, y, w, h, ["#8d8f8c", "#5f625f", "#2f302f"], seed, 3);
  if (t.pattern === "lightning")
    return (x: number, y: number, w: number, h: number) => {
      ctx.strokeStyle = "#dfe9ff";
      ctx.lineWidth = 0.7;
      const r = rng(seed);
      for (let i = 0; i < 3; i++) {
        let lx = x + r() * w;
        let ly = y;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        while (ly < y + h) {
          lx += (r() - 0.5) * 6;
          ly += 2 + r() * 3;
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }
    };
  if (t.pattern === "print")
    return (x: number, y: number, w: number, h: number) => {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ellipse(ctx, x + w * 0.5, y + h * 0.45, w * 0.28, h * 0.3, 0.3);
      ctx.fill();
    };
  return undefined;
}

function shoe(ctx: Ctx, x: number, y: number, a: number, color: string, sole: string, chunky: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-a * 0.6);
  const h = chunky ? 4.6 : 4;
  rrect(ctx, -3.6, -h + 0.6, 10.6, h + 0.4, [3, 3.8, 1.4, 1.4]);
  fillStroke(ctx, color);
  rrect(ctx, -3.8, 0.2, 11, chunky ? 2.4 : 1.8, 1);
  fillStroke(ctx, sole, INK, 1);
  ctx.restore();
}

function drawHairBack(ctx: Ctx, look: Look, hx: number, hy: number, m: Metrics) {
  const r = m.headR;
  if (look.hair === "nikita" || look.hair === "chichi") {
    const bottom = m.hipY + (look.hair === "chichi" ? 3 : 1);
    const g = linGrad(ctx, 0, hy - r, 0, bottom, look.hairEnd
      ? [
          [0, look.hairColor],
          [0.42, look.hairColor],
          [0.72, shade(look.hairEnd, -0.25)],
          [1, look.hairEnd],
        ]
      : [
          [0, look.hairColor],
          [1, shade(look.hairColor, 0.08)],
        ]);
    ctx.beginPath();
    ctx.moveTo(hx - r * 0.2, hy - r - 1.2);
    ctx.bezierCurveTo(hx - r - 4, hy - r, hx - r - 3.5, hy + 2, hx - r - 2, hy + 10);
    ctx.bezierCurveTo(hx - r - 1, bottom - 10, hx - r - 3.5, bottom - 4, hx - r - 1.5, bottom);
    ctx.quadraticCurveTo(hx - r + 3, bottom + 2.5, hx - 4, bottom - 0.5);
    ctx.quadraticCurveTo(hx + 1, bottom + 2, hx + 5, bottom - 1.5);
    ctx.bezierCurveTo(hx + 7, bottom - 10, hx + r - 2, hy + 14, hx + r - 1, hy + 4);
    ctx.bezierCurveTo(hx + r + 2, hy - r + 2, hx + 4, hy - r - 2, hx - r * 0.2, hy - r - 1.2);
    ctx.closePath();
    fillStroke(ctx, g);
    // balayage strands
    if (look.hairEnd) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = shade(look.hairEnd, 0.25);
      ctx.lineWidth = 1;
      for (const dx of [-r - 0.5, -r + 4, -3]) {
        ctx.beginPath();
        ctx.moveTo(hx + dx, hy + 12);
        ctx.quadraticCurveTo(hx + dx - 2, bottom - 8, hx + dx + 0.5, bottom - 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  } else if (look.hair === "ponytail") {
    ellipse(ctx, hx - r - 3, hy + 2, 4, 9, 0.3);
    fillStroke(ctx, look.hairColor);
  } else if (look.hair === "bob") {
    ctx.beginPath();
    ctx.ellipse(hx - 1, hy + 1, r + 2.5, r + 1.5, 0, 0, Math.PI * 2);
    fillStroke(ctx, look.hairColor);
  }
}

function drawHairFront(ctx: Ctx, look: Look, hx: number, hy: number, m: Metrics) {
  const r = m.headR;
  const c = look.hairColor;
  switch (look.hair) {
    case "nikita":
    case "chichi": {
      const g = linGrad(ctx, 0, hy - r, 0, m.hipY, look.hairEnd
        ? [
            [0, c],
            [0.45, c],
            [0.78, shade(look.hairEnd, -0.25)],
            [1, look.hairEnd],
          ]
        : [
            [0, c],
            [1, c],
          ]);
      const px = hx + 2.4; // middle part, shifted toward the face side
      ctx.beginPath();
      ctx.moveTo(hx - r - 0.8, hy + 10);
      ctx.bezierCurveTo(hx - r - 2.2, hy - 2, hx - r + 1, hy - r - 1.5, px, hy - r - 1.2);
      ctx.bezierCurveTo(hx + r + 1.5, hy - r - 0.5, hx + r + 2, hy - 1, hx + r + 0.6, hy + 7);
      // front strand down over the shoulder
      ctx.bezierCurveTo(hx + r + 0.4, hy + 14, hx + r - 1, hy + 20, hx + r - 2.5, m.shY + 12);
      ctx.quadraticCurveTo(hx + r - 3.4, m.shY + 10, hx + r - 2.2, hy + 10);
      ctx.bezierCurveTo(hx + r - 1.4, hy + 3, hx + r - 1.2, hy - 5, px + 0.6, hy - r + 3.4);
      ctx.bezierCurveTo(hx - 3, hy - r + 4, hx - 8.6, hy - 4, hx - 9.4, hy + 5);
      ctx.quadraticCurveTo(hx - 9.8, hy + 9, hx - r - 0.8, hy + 10);
      ctx.closePath();
      fillStroke(ctx, g);
      // part and shine
      ctx.strokeStyle = shade(c, 0.35);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(hx - 6, hy - r + 1);
      ctx.quadraticCurveTo(hx - 2, hy - r - 0.8, hx + 1, hy - r - 0.2);
      ctx.stroke();
      break;
    }
    case "curly":
    case "aayam": {
      const big = look.hair === "curly";
      const rand = rng(big ? 7 : 11);
      const curls: [number, number, number][] = [];
      // outer ring over the top of the head
      const n = big ? 11 : 9;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (1.02 + (0.96 * i) / (n - 1));
        const rx = r + (big ? 1.4 : 1);
        const ry = r * 0.66 + (big ? 4.2 : 2.6);
        curls.push([hx + 0.5 + Math.cos(a) * rx, hy - 3.5 + Math.sin(a) * ry, (big ? 3.7 : 3.1) + rand() * 0.8]);
      }
      // inner fill ring
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (1.1 + (0.8 * i) / 5);
        curls.push([hx + 0.5 + Math.cos(a) * (r - 3.5), hy - 5 + Math.sin(a) * (r * 0.5 + 1), 3.6]);
      }
      // fringe curls falling on the forehead
      const fringe: [number, number, number][] = big
        ? [
            [hx - 4, hy - 6.4, 2.7],
            [hx + 0.6, hy - 6.9, 2.8],
            [hx + 5.2, hy - 6.2, 2.7],
            [hx + 9.2, hy - 4.8, 2.4],
          ]
        : [
            [hx - 1, hy - 7, 2.4],
            [hx + 4, hy - 6.6, 2.4],
            [hx + 8.4, hy - 5.4, 2.2],
          ];
      // base mass so there are no gaps
      ellipse(ctx, hx + 0.5, hy - 10, r + 0.8, big ? 6.5 : 5);
      ctx.fillStyle = c;
      ctx.fill();
      const all = [...curls, ...fringe];
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      for (const [x, y, cr] of all) {
        circle(ctx, x, y, cr);
        ctx.stroke();
      }
      ctx.fillStyle = c;
      ellipse(ctx, hx + 0.5, hy - 10, r + 0.8, big ? 6.5 : 5);
      ctx.fill();
      for (const [x, y, cr] of all) {
        circle(ctx, x, y, cr);
        ctx.fill();
      }
      // curl texture
      ctx.lineWidth = 0.75;
      for (const [x, y, cr] of all) {
        ctx.strokeStyle = shade(c, 0.22 + rand() * 0.1);
        ctx.beginPath();
        ctx.arc(x + 0.3, y + 0.2, cr * 0.5, 0.4 + rand(), 3.2 + rand());
        ctx.stroke();
      }
      break;
    }
    case "straight": {
      ctx.beginPath();
      ctx.moveTo(hx - r - 0.6, hy + 2);
      ctx.bezierCurveTo(hx - r - 1.5, hy - r - 2, hx + 4, hy - r - 4, hx + r + 1, hy - 5);
      ctx.quadraticCurveTo(hx + r + 1, hy - 2, hx + r - 1, hy - 1.5);
      ctx.bezierCurveTo(hx + 7, hy - 6, hx + 2, hy - 7.5, hx - 3, hy - 4.5);
      ctx.bezierCurveTo(hx - 6, hy - 3, hx - 8, hy - 1, hx - 8.5, hy + 2);
      ctx.closePath();
      fillStroke(ctx, c);
      ctx.strokeStyle = shade(c, 0.3);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(hx - 3, hy - r);
      ctx.quadraticCurveTo(hx + 5, hy - r + 1, hx + 9, hy - 5);
      ctx.stroke();
      break;
    }
    case "short":
    case "buzz": {
      ctx.beginPath();
      ctx.arc(hx, hy - 1, r + 0.6, Math.PI * 1.02, Math.PI * 1.98);
      ctx.quadraticCurveTo(hx + 4, hy - 7, hx - r + 2, hy - 2);
      ctx.closePath();
      fillStroke(ctx, c);
      break;
    }
    case "bun": {
      circle(ctx, hx - 2, hy - r - 3, 5);
      fillStroke(ctx, c);
      ctx.beginPath();
      ctx.arc(hx, hy - 1, r + 0.8, Math.PI * 1.0, Math.PI * 2);
      ctx.quadraticCurveTo(hx + 3, hy - 6, hx - r, hy);
      ctx.closePath();
      fillStroke(ctx, c);
      break;
    }
    case "ponytail":
    case "bob": {
      ctx.beginPath();
      ctx.arc(hx, hy - 1, r + 1, Math.PI * 1.0, Math.PI * 2);
      ctx.quadraticCurveTo(hx + 2, hy - 7, hx - r - 1, hy + 1);
      ctx.closePath();
      fillStroke(ctx, c);
      break;
    }
    case "cap": {
      ctx.beginPath();
      ctx.arc(hx, hy - 2, r + 1, Math.PI, Math.PI * 2);
      ctx.closePath();
      fillStroke(ctx, c);
      rrect(ctx, hx + 2, hy - 4.5, 15, 3, 1.5);
      fillStroke(ctx, shade(c, -0.2));
      break;
    }
  }
}

function drawFace(ctx: Ctx, look: Look, hx: number, hy: number, j: Joints) {
  const fx = hx + 2.8;
  const girl = look.build === "girl";
  const ey = hy + 1.6;
  const exL = fx - 5.2;
  const exR = fx + 4.6;
  // blush
  ctx.fillStyle = "rgba(240,120,140,0.28)";
  ellipse(ctx, fx - 7.4, hy + 6, 2.8, 1.6);
  ctx.fill();
  ellipse(ctx, fx + 8, hy + 5.6, 2.4, 1.5);
  ctx.fill();
  // brows
  ctx.strokeStyle = shade(look.hairColor, -0.2);
  ctx.lineCap = "round";
  ctx.lineWidth = girl ? 1.1 : 1.5;
  const browY = ey - (j.eyes === "hurt" ? 4.2 : 4.8);
  ctx.beginPath();
  ctx.moveTo(exL - 2.4, browY + 0.6);
  ctx.quadraticCurveTo(exL, browY - 0.9, exL + 2.2, browY + 0.2);
  ctx.moveTo(exR - 2.1, browY + 0.2);
  ctx.quadraticCurveTo(exR + 0.3, browY - 0.9, exR + 2.3, browY + 0.6);
  ctx.stroke();
  // eyes
  const eyeRx = girl ? 1.95 : 1.75;
  const eyeRy = girl ? 2.7 : 2.3;
  for (const ex of [exL, exR]) {
    if (j.eyes === "closed" || j.eyes === "happy") {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (j.eyes === "happy") ctx.arc(ex, ey + 0.8, 2, Math.PI * 1.1, Math.PI * 1.9);
      else ctx.arc(ex, ey - 0.4, 2, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    } else if (j.eyes === "hurt") {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(ex - 1.6, ey - 1.6);
      ctx.lineTo(ex + 1.6, ey);
      ctx.lineTo(ex - 1.6, ey + 1.6);
      ctx.stroke();
    } else {
      const look2 = j.eyes === "look" ? -1 : 0;
      ellipse(ctx, ex, ey, eyeRx, eyeRy);
      ctx.fillStyle = "#2a1712";
      ctx.fill();
      circle(ctx, ex + 0.7 + look2, ey - 0.9, girl ? 0.8 : 0.65);
      ctx.fillStyle = "#fff";
      ctx.fill();
      circle(ctx, ex - 0.5 + look2, ey + 1, 0.35);
      ctx.fill();
    }
    if (look.lashes && j.eyes !== "hurt") {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(ex + 1.6, ey - 1.8);
      ctx.lineTo(ex + 2.8, ey - 2.8);
      ctx.moveTo(ex + 0.6, ey - 2.5);
      ctx.lineTo(ex + 1.2, ey - 3.6);
      ctx.stroke();
    }
  }
  // glasses
  if (look.glasses) {
    ctx.strokeStyle = "#1c1c22";
    ctx.lineWidth = 0.9;
    rrect(ctx, exL - 3.2, ey - 2.6, 6.2, 5, 1.6);
    ctx.stroke();
    rrect(ctx, exR - 3, ey - 2.6, 6.2, 5, 1.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(exL + 3, ey - 0.8);
    ctx.lineTo(exR - 3, ey - 0.8);
    ctx.moveTo(exL - 3.2, ey - 1);
    ctx.lineTo(hx - 10, ey - 1.8);
    ctx.stroke();
  }
  // nose
  ctx.strokeStyle = shade(look.skin, -0.35);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(fx + 0.4, hy + 4.2);
  ctx.quadraticCurveTo(fx + 1.6, hy + 5.6, fx + 0.2, hy + 5.8);
  ctx.stroke();
  // mouth
  const my = hy + 8.2;
  const lip = girl ? "#b4575f" : shade(look.skin, -0.45);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  switch (j.mouth) {
    case "smile":
      ctx.beginPath();
      ctx.arc(fx, my - 1.4, 2.4, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
      break;
    case "grin":
      ctx.beginPath();
      ctx.arc(fx, my - 1.2, 2.8, 0, Math.PI);
      ctx.closePath();
      fillStroke(ctx, "#7a2d3b", INK, 1);
      break;
    case "open":
      ellipse(ctx, fx, my, 1.8, 1.4);
      fillStroke(ctx, "#7a2d3b", INK, 1);
      break;
    case "o":
      ellipse(ctx, fx, my, 1.1, 1.3);
      fillStroke(ctx, "#7a2d3b", INK, 0.9);
      break;
    case "kiss":
      ellipse(ctx, fx + 0.6, my - 0.4, 1.4, 1.1);
      fillStroke(ctx, lip, INK, 0.9);
      break;
    case "flat":
      ctx.beginPath();
      ctx.moveTo(fx - 1.6, my - 0.4);
      ctx.lineTo(fx + 1.6, my - 0.2);
      ctx.stroke();
      break;
  }
}

function drawTorso(ctx: Ctx, look: Look, m: Metrics, cx: number, seed: number) {
  const t = look.top;
  const over = t.oversized ? 1.8 : 0;
  const shY = m.shY;
  const hem = m.hipY + (t.kind === "hoodie" || t.kind === "puffer" ? 3.5 : t.kind === "overshirt" ? 2.5 : t.kind === "tee" || t.kind === "zipshirt" ? 1.5 : 0.5);
  const w = m.shW + over;
  const hw = m.hipW + over * 0.8 + (t.kind === "puffer" ? 1.5 : 0);
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(cx - w + 1.5, shY - 1);
    ctx.quadraticCurveTo(cx, shY - 3.2, cx + w - 1.5, shY - 1);
    ctx.quadraticCurveTo(cx + w + 0.8, shY + 1, cx + w, shY + 5);
    ctx.lineTo(cx + hw + (look.build === "girl" ? -0.8 : 0), m.hipY - 4);
    ctx.quadraticCurveTo(cx + hw + 0.8, hem - 1, cx + hw, hem);
    ctx.lineTo(cx - hw, hem);
    ctx.quadraticCurveTo(cx - hw - 0.8, hem - 1, cx - hw - (look.build === "girl" ? -0.8 : 0), m.hipY - 4);
    ctx.lineTo(cx - w, shY + 5);
    ctx.quadraticCurveTo(cx - w - 0.8, shY + 1, cx - w + 1.5, shY - 1);
    ctx.closePath();
  };
  path();
  fillStroke(ctx, t.color);
  const paint = topPaint(ctx, t, seed);
  if (paint) {
    path();
    clipped(ctx, () => paint(cx - w - 2, shY - 4, w * 2 + 4, hem - shY + 6));
  }
  // shading down the back side
  path();
  clipped(ctx, () => {
    ctx.fillStyle = "rgba(40,20,30,0.12)";
    ctx.fillRect(cx - w - 2, shY - 4, 4.5, hem - shY + 6);
  });

  ctx.lineWidth = 0.9;
  const detail = shade(t.color, t.color === "#1b1a1f" || t.color.startsWith("#1") || t.color.startsWith("#2") ? 0.28 : -0.28);
  const zx = cx + 1.6;
  switch (t.kind) {
    case "tee":
      ctx.strokeStyle = detail;
      ctx.beginPath();
      ctx.arc(cx + 1, shY - 2.4, 3.2, 0.25, Math.PI - 0.25);
      ctx.stroke();
      break;
    case "hoodie":
    case "jacket":
    case "puffer": {
      // zip
      ctx.strokeStyle = detail;
      ctx.beginPath();
      ctx.moveTo(zx, shY - 1.5);
      ctx.lineTo(zx, hem);
      ctx.stroke();
      if (t.kind === "puffer") {
        for (let y = shY + 4; y < hem; y += 4.5) {
          ctx.beginPath();
          ctx.moveTo(cx - w, y);
          ctx.quadraticCurveTo(cx, y + 1.2, cx + w, y);
          ctx.stroke();
        }
      }
      if (t.kind === "hoodie") {
        // pockets + hem band + drawstrings
        ctx.beginPath();
        ctx.moveTo(cx - hw + 1, hem - 2);
        ctx.lineTo(cx + hw - 1, hem - 2);
        ctx.moveTo(zx - 2, shY - 0.5);
        ctx.lineTo(zx - 2.3, shY + 5);
        ctx.moveTo(zx + 2, shY - 0.5);
        ctx.lineTo(zx + 2.3, shY + 5);
        ctx.stroke();
      } else {
        // collar
        ctx.beginPath();
        ctx.moveTo(cx - 3.5, shY - 2.2);
        ctx.lineTo(zx, shY + 1.5);
        ctx.lineTo(cx + 5.5, shY - 2.2);
        ctx.stroke();
      }
      break;
    }
    case "halfzip": {
      // fitted jacket unzipped to mid chest showing the top underneath
      ctx.beginPath();
      ctx.moveTo(zx - 3.2, shY - 1.4);
      ctx.lineTo(zx, shY + 6.5);
      ctx.lineTo(zx + 3.4, shY - 1.4);
      ctx.closePath();
      fillStroke(ctx, t.inner ?? "#c8233a", INK, 0.9);
      ctx.strokeStyle = "#9da3ad";
      ctx.beginPath();
      ctx.moveTo(zx, shY + 6.5);
      ctx.lineTo(zx, hem);
      ctx.stroke();
      // collar stand
      ctx.strokeStyle = detail;
      ctx.beginPath();
      ctx.moveTo(zx - 4.4, shY - 3.2);
      ctx.lineTo(zx - 3.2, shY - 1.2);
      ctx.moveTo(zx + 4.6, shY - 3.2);
      ctx.lineTo(zx + 3.4, shY - 1.2);
      ctx.stroke();
      // side seam curve (the fitted look)
      ctx.beginPath();
      ctx.moveTo(cx + w - 1.5, shY + 3);
      ctx.quadraticCurveTo(cx + hw - 2.4, m.hipY - 5, cx + hw - 1.2, hem);
      ctx.stroke();
      break;
    }
    case "overshirt": {
      // open suede overshirt over a black tee
      ctx.beginPath();
      ctx.moveTo(zx - 2, shY - 1.8);
      ctx.lineTo(zx + 3.6, shY - 1.8);
      ctx.lineTo(zx + 2.8, hem);
      ctx.lineTo(zx - 1.2, hem);
      ctx.closePath();
      fillStroke(ctx, t.inner ?? "#1b1a1f", INK, 0.9);
      // collar points
      ctx.beginPath();
      ctx.moveTo(zx - 5, shY - 2.8);
      ctx.lineTo(zx - 1.4, shY + 2.8);
      ctx.lineTo(zx - 2.2, shY - 1.8);
      ctx.closePath();
      fillStroke(ctx, shade(t.color, -0.08), INK, 0.8);
      ctx.beginPath();
      ctx.moveTo(zx + 7.2, shY - 2.6);
      ctx.lineTo(zx + 3.2, shY + 2.8);
      ctx.lineTo(zx + 3.8, shY - 1.8);
      ctx.closePath();
      fillStroke(ctx, shade(t.color, -0.08), INK, 0.8);
      // chest flap pockets
      for (const px of [cx - w + 2.2, zx + 4.3]) {
        rrect(ctx, px, shY + 3.5, 3.8, 4.4, 0.8);
        fillStroke(ctx, shade(t.color, 0.05), INK, 0.7);
        ctx.beginPath();
        ctx.moveTo(px, shY + 5);
        ctx.lineTo(px + 3.8, shY + 5);
        ctx.stroke();
      }
      // buttons
      ctx.fillStyle = "#1d1714";
      for (let by = shY + 4; by < hem - 1; by += 3.6) {
        circle(ctx, zx + 3.9, by, 0.55);
        ctx.fill();
      }
      break;
    }
    case "sweater": {
      // fluffy V-neck
      ctx.beginPath();
      ctx.moveTo(zx - 3.6, shY - 1.6);
      ctx.lineTo(zx, shY + 5.8);
      ctx.lineTo(zx + 3.8, shY - 1.6);
      ctx.closePath();
      fillStroke(ctx, look.skin, INK, 0.9);
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 0.6;
      const r = rng(seed + 3);
      for (let i = 0; i < 40; i++) {
        const x = cx - w + r() * w * 2;
        const y = shY + r() * (hem - shY);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (r() - 0.5) * 1.6, y + 1.2);
        ctx.stroke();
      }
      break;
    }
    case "uniform": {
      // black school sweater with the white shirt collar
      ctx.beginPath();
      ctx.moveTo(zx - 3.4, shY - 1.6);
      ctx.lineTo(zx, shY + 4.8);
      ctx.lineTo(zx + 3.6, shY - 1.6);
      ctx.closePath();
      fillStroke(ctx, "#f4f4f2", INK, 0.9);
      ctx.beginPath();
      ctx.moveTo(zx - 4.4, shY - 2.6);
      ctx.lineTo(zx - 0.4, shY + 1.4);
      ctx.lineTo(zx - 2.8, shY + 2.4);
      ctx.closePath();
      fillStroke(ctx, "#ffffff", INK, 0.8);
      ctx.beginPath();
      ctx.moveTo(zx + 4.6, shY - 2.6);
      ctx.lineTo(zx + 0.6, shY + 1.4);
      ctx.lineTo(zx + 3, shY + 2.4);
      ctx.closePath();
      fillStroke(ctx, "#ffffff", INK, 0.8);
      ctx.strokeStyle = detail;
      ctx.beginPath();
      ctx.moveTo(cx - hw + 0.5, hem - 1.6);
      ctx.lineTo(cx + hw - 0.5, hem - 1.6);
      ctx.stroke();
      break;
    }
    case "zipshirt": {
      ctx.strokeStyle = "#d8d8d8";
      ctx.beginPath();
      ctx.moveTo(zx, shY - 1);
      ctx.lineTo(zx, hem);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(zx - 5, shY - 2.6);
      ctx.lineTo(zx, shY + 1.6);
      ctx.lineTo(zx + 5.4, shY - 2.6);
      ctx.strokeStyle = INK;
      ctx.stroke();
      break;
    }
    case "ruched": {
      // sweetheart neckline with lace trim and ruching down the middle
      ctx.beginPath();
      ctx.moveTo(zx - 4.2, shY - 1.8);
      ctx.quadraticCurveTo(zx - 2, shY + 3.5, zx, shY + 2);
      ctx.quadraticCurveTo(zx + 2, shY + 3.5, zx + 4.4, shY - 1.8);
      ctx.closePath();
      fillStroke(ctx, look.skin, INK, 0.8);
      ctx.strokeStyle = "#d9d4cf";
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(zx - 2 + i * 1.3, shY + 4);
        ctx.quadraticCurveTo(zx - 1 + i * 0.6, shY + 7, zx - 0.5 + i * 0.5, shY + 10);
        ctx.stroke();
      }
      break;
    }
    case "longtop": {
      ctx.strokeStyle = detail;
      ctx.beginPath();
      ctx.arc(zx - 0.5, shY - 3, 4, 0.3, Math.PI - 0.3);
      ctx.stroke();
      break;
    }
  }
}

function sleeveColor(t: Top) {
  return t.color;
}

function drawArm(ctx: Ctx, look: Look, m: Metrics, sx: number, sy: number, a: [number, number], back: boolean, seed: number) {
  const t = look.top;
  const short = t.kind === "tee" || t.kind === "zipshirt";
  const over = t.oversized ? 0.9 : 0;
  const wUp = 4.8 + over + (t.kind === "puffer" ? 1.2 : 0);
  const color = back ? shade(sleeveColor(t), -0.12) : sleeveColor(t);
  const skin = back ? shade(look.skin, -0.1) : look.skin;
  const l1 = m.armLen * 0.5;
  const l2 = m.armLen * 0.5;
  const paint = topPaint(ctx, t, seed + (back ? 5 : 9));
  let end;
  if (short) {
    // skin arm with a short sleeve cap
    end = drawLimb(ctx, sx, sy, a[0], l1, a[1], l2, 3.6, 3.4, 3.1, skin);
    drawLimb(ctx, sx, sy, a[0], l1 * 0.75, 0, 0.01, wUp + 0.6, wUp, wUp, color, paint);
  } else {
    end = drawLimb(ctx, sx, sy, a[0], l1, a[1], l2, wUp, wUp - 0.4, wUp - 0.2 + over, color, paint);
    // cuffs: white shirt cuff for the uniform
    if (t.kind === "uniform") {
      ctx.save();
      ctx.translate(end.x, end.y);
      ctx.rotate(-end.a);
      rrect(ctx, -2.6, -1.2, 5.2, 1.8, 0.6);
      fillStroke(ctx, "#ffffff", INK, 0.7);
      ctx.restore();
    }
  }
  // hand (tucked into the sleeve for oversized tops)
  const hx = end.x + Math.sin(end.a) * (over ? 0.4 : 1.4);
  const hy = end.y + Math.cos(end.a) * (over ? 0.4 : 1.4);
  circle(ctx, hx, hy, over ? 2.1 : 2.4);
  fillStroke(ctx, skin, INK, 1);
  return { x: hx, y: hy };
}

function drawLeg(ctx: Ctx, look: Look, m: Metrics, hx: number, hy: number, a: [number, number], back: boolean, seed: number) {
  const b = look.bottom;
  const color = back ? shade(b.color, -0.13) : b.color;
  const widths: Record<BottomKind, [number, number, number]> = {
    wide: [7.4, 7.8, 9.6],
    cargo: [7.8, 7.6, 7.8],
    sweats: [7.2, 6.4, 5.6],
    jeans: [6.8, 6.1, 5.9],
  };
  const [w0, w1, w2] = widths[b.kind];
  const l = m.legLen * 0.5;
  const end = drawLimb(ctx, hx, hy, a[0], l, a[1], l - 2.2, w0, w1, w2, color, bottomPaint(ctx, b, seed + (back ? 1 : 2)), true);
  ctx.save();
  ctx.translate(end.kx, end.ky);
  ctx.rotate(-(a[0] + a[1] * 0.5));
  ctx.strokeStyle = shade(b.color, 0.25);
  ctx.lineWidth = 0.7;
  if (b.kind === "cargo") {
    // side pocket on the thigh
    rrect(ctx, -2.2, -2.6, 4.8, 4.6, 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-2.2, -1.1);
    ctx.lineTo(2.6, -1.1);
    ctx.stroke();
  }
  ctx.restore();
  if (b.kind === "sweats") {
    // gathered cuff
    ctx.save();
    ctx.translate(end.x, end.y);
    ctx.rotate(-end.a);
    rrect(ctx, -w2 / 2, -2, w2, 2, 0.8);
    fillStroke(ctx, shade(color, -0.05), INK, 0.8);
    ctx.restore();
  }
  if (b.frayed) {
    ctx.save();
    ctx.translate(end.x, end.y);
    ctx.rotate(-end.a);
    ctx.strokeStyle = "#e9e6df";
    ctx.lineWidth = 0.6;
    for (let i = -w2 / 2 + 0.8; i < w2 / 2; i += 1.3) {
      ctx.beginPath();
      ctx.moveTo(i, -0.6);
      ctx.lineTo(i + 0.3, 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }
  return end;
}

/** Draw a whole person. Call inside a transform where (0,0) is between the feet. */
export function drawPerson(ctx: Ctx, look: Look, pose: Pose, seed = 1) {
  const m = METRICS[look.build];
  const j = joints(pose);
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.translate(0, j.bob + j.crouch);
  // shadow is drawn by the world, not here
  const hipX = 0;
  const hipY = m.hipY;
  const legs = () => {
    for (const back of [true, false]) {
      const a = back ? j.legB : j.legF;
      const x0 = hipX + (back ? -2.2 : 2.2);
      const l = m.legLen * 0.5;
      const kx = x0 + Math.sin(a[0]) * l;
      const ky = hipY + Math.cos(a[0]) * l;
      const ax = kx + Math.sin(a[0] + a[1]) * l;
      const ay = ky + Math.cos(a[0] + a[1]) * l;
      shoe(ctx, ax - 0.6, ay + 0.9, a[0] + a[1], back ? shade(look.shoes, -0.12) : look.shoes, look.sole ?? "#f2efe9", look.shoes !== "#1c1b1f");
      drawLeg(ctx, look, m, x0, hipY, a, back, seed);
    }
  };

  // everything above the hips leans and turns with the body
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(j.lean);
  ctx.translate(-hipX, -hipY);

  const headX = 0.8;
  const headY = m.headY;
  ctx.save();
  ctx.translate(headX, headY + m.headR);
  ctx.rotate(j.headTilt);
  ctx.translate(-headX, -(headY + m.headR));
  drawHairBack(ctx, look, headX, headY, m);
  ctx.restore();

  // hood behind the neck
  if (look.top.kind === "hoodie") {
    ellipse(ctx, -3.5, m.shY - 2.5, 7, 4.2, -0.2);
    fillStroke(ctx, shade(look.top.color, -0.1));
  }

  // back arm
  drawArm(ctx, look, m, -m.shW + 2.5, m.shY + 1.6, j.armB, true, seed);
  ctx.restore();

  legs();

  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(j.lean);
  ctx.translate(-hipX, -hipY);
  // waistband peeking under shorter tops
  rrect(ctx, -m.hipW - 0.2, hipY - 2.2, m.hipW * 2 + 0.4, 4.4, 1.5);
  fillStroke(ctx, look.bottom.color);
  drawTorso(ctx, look, m, 0, seed);

  // bag strap across the chest
  if (look.bag) {
    ctx.strokeStyle = "#111014";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(m.shW - 1.5, m.shY - 1);
    ctx.quadraticCurveTo(m.shW + 1, m.hipY - 6, m.shW + 1.8, m.hipY - 0.5);
    ctx.stroke();
    rrect(ctx, m.shW - 3, m.hipY - 0.8, 7.4, 4.6, [1.2, 1.2, 3, 3]);
    fillStroke(ctx, "#15141a");
    ctx.strokeStyle = "#b9bcc4";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(m.shW - 2.2, m.hipY + 0.6);
    ctx.lineTo(m.shW + 3.6, m.hipY + 0.6);
    ctx.stroke();
  }

  // neck + head
  ctx.save();
  ctx.translate(headX, headY + m.headR);
  ctx.rotate(j.headTilt);
  ctx.translate(-headX, -(headY + m.headR));
  rrect(ctx, headX - 2.6, headY + m.headR - 3, 5.4, 5.5, 1.5);
  fillStroke(ctx, shade(look.skin, -0.12));
  // back ear
  ellipse(ctx, headX - m.headR + 1.2, headY + 2, 2.4, 3.2);
  fillStroke(ctx, look.skin);
  ellipse(ctx, headX, headY, m.headR, m.headR * 1.02);
  fillStroke(ctx, look.skin);
  if (look.hair === "curly" || look.hair === "aayam") {
    // short faded sides
    ellipse(ctx, headX, headY, m.headR, m.headR * 1.02);
    clipped(ctx, () => {
      ctx.fillStyle = radGrad(ctx, headX - m.headR + 1, headY - 5, 1, 7.5, [
        [0, "rgba(22,16,14,0.85)"],
        [1, "rgba(22,16,14,0)"],
      ]);
      ctx.fillRect(headX - m.headR - 2, headY - 14, 12, 18);
    });
  }
  if (look.stud) {
    circle(ctx, headX - m.headR + 1.4, headY + 5.2, 0.95);
    fillStroke(ctx, "#f4f7ff", "#8d95a6", 0.5);
  }
  if (look.hoops) {
    ctx.strokeStyle = "#d6a43c";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(headX - m.headR + 1.5, headY + 6.6, 1.7, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawFace(ctx, look, headX, headY, j);
  drawHairFront(ctx, look, headX, headY, m);
  if (look.bearEars) {
    for (const dx of [-7, 6]) {
      circle(ctx, headX + dx, headY - m.headR - 1, 3.6);
      fillStroke(ctx, look.bearEars, INK, 1);
      circle(ctx, headX + dx, headY - m.headR - 0.6, 1.8);
      ctx.fillStyle = shade(look.bearEars, -0.2);
      ctx.fill();
    }
  }
  ctx.restore();

  // necklace
  if (look.necklace) {
    const col = look.necklace === "silver" ? "#cfd4de" : "#dcae45";
    ctx.strokeStyle = col;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(-3.2, m.shY - 2);
    ctx.quadraticCurveTo(1.6, m.shY + (look.necklace === "chain" || look.necklace === "silver" ? 3.6 : 4.4), 5.5, m.shY - 2);
    ctx.stroke();
    if (look.necklace === "name") {
      rrect(ctx, 0.2, m.shY + 3.2, 3.4, 1.4, 0.6);
      ctx.fillStyle = col;
      ctx.fill();
    } else if (look.necklace === "heart") {
      heartPath(ctx, 1.4, m.shY + 4.6, 1.3);
      ctx.fillStyle = "#e8e3ea";
      ctx.fill();
    }
  }

  // front arm (hand to mouth for her shy wave)
  if (j.handToMouth) {
    const sx = m.shW - 2;
    const sy = m.shY + 1.6;
    drawArm(ctx, look, m, sx, sy, j.armF, false, seed);
    // palm over the smile with nails
    const px = headX + 5.2;
    const py = headY + 7.2;
    ellipse(ctx, px, py, 3.2, 3.6, -0.3);
    fillStroke(ctx, look.skin, INK, 1);
    ctx.fillStyle = "#e6b8a8";
    for (let i = 0; i < 4; i++) {
      ellipse(ctx, px - 2 + i * 1.3, py - 3.4 - Math.abs(1.5 - i) * -0.2, 0.45, 0.8);
      ctx.fill();
    }
  } else {
    drawArm(ctx, look, m, m.shW - 2.2, m.shY + 1.6, j.armF, false, seed);
  }
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The cast
// ---------------------------------------------------------------------------

const NIKITA_BASE = {
  build: "girl" as const,
  skin: "#c98a64",
  hair: "nikita" as const,
  hairColor: "#2b1a14",
  hairEnd: "#c98542",
  hoops: true,
  lashes: true,
  shoes: "#1c1b1f",
  sole: "#2c2b30",
};
const JAG_BASE = {
  build: "boy" as const,
  skin: "#8e5a3b",
  hair: "curly" as const,
  hairColor: "#16100e",
  stud: true,
  necklace: "chain" as const,
  shoes: "#ece8df",
  sole: "#ffffff",
};

export const OUTFITS = {
  nikita: {
    home: { ...NIKITA_BASE, id: "n-home", top: { kind: "hoodie", color: "#1d1c21", oversized: true }, bottom: { kind: "wide", color: "#5c5f66", pattern: "fade", frayed: true }, bag: true },
    sep13: { ...NIKITA_BASE, id: "n-sep13", top: { kind: "longtop", color: "#5f93d6" }, bottom: { kind: "jeans", color: "#1e1d22" }, bag: true },
    aug: { ...NIKITA_BASE, id: "n-aug", top: { kind: "uniform", color: "#1f1e24" }, bottom: { kind: "jeans", color: "#1c1b20" } },
    jul26: { ...NIKITA_BASE, id: "n-jul26", top: { kind: "sweater", color: "#1b1a1f" }, bottom: { kind: "wide", color: "#9bb7d6", pattern: "fade" }, necklace: "name" },
    jul17: { ...NIKITA_BASE, id: "n-jul17", top: { kind: "jacket", color: "#8a8d93" }, bottom: { kind: "sweats", color: "#1f1e23" } },
    jul16: { ...NIKITA_BASE, id: "n-jul16", top: { kind: "jacket", color: "#1f1e23", oversized: true }, bottom: { kind: "sweats", color: "#8f9297" }, necklace: "name" },
    jul9: { ...NIKITA_BASE, id: "n-jul9", top: { kind: "halfzip", color: "#16161a", inner: "#c8233a" }, bottom: { kind: "cargo", color: "#a4a6a2", pattern: "camoGrey" } },
  },
  jagath: {
    home: { ...JAG_BASE, id: "j-home", top: { kind: "overshirt", color: "#b49364", inner: "#18171b" }, bottom: { kind: "wide", color: "#141317" } },
    sep13: { ...JAG_BASE, id: "j-sep13", top: { kind: "tee", color: "#18171b" }, bottom: { kind: "sweats", color: "#1c1b20" } },
    aug: { ...JAG_BASE, id: "j-aug", top: { kind: "tee", color: "#5d6b3a", pattern: "camo" }, bottom: { kind: "cargo", color: "#8c8f93" } },
    jul26: { ...JAG_BASE, id: "j-jul26", top: { kind: "tee", color: "#18171b" }, bottom: { kind: "cargo", color: "#b7b9bb", pattern: "acid" } },
    jul17: { ...JAG_BASE, id: "j-jul17", top: { kind: "tee", color: "#18171b" }, bottom: { kind: "jeans", color: "#1b1a1f" } },
    jul16: { ...JAG_BASE, id: "j-jul16", top: { kind: "hoodie", color: "#a3a5a8", pattern: "print" }, bottom: { kind: "cargo", color: "#a9acae", pattern: "acid" } },
    jul9: { ...JAG_BASE, id: "j-jul9", top: { kind: "jacket", color: "#8b8e92" }, bottom: { kind: "cargo", color: "#8c8f93" } },
  },
} satisfies Record<string, Record<string, Look>>;

export type OutfitKey = keyof typeof OUTFITS.nikita;

export const NEON: Look = {
  id: "neon",
  build: "tall",
  skin: "#9a6546",
  hair: "straight",
  hairColor: "#111013",
  glasses: true,
  top: { kind: "puffer", color: "#2d3a4f" },
  bottom: { kind: "sweats", color: "#7b7e84" },
  shoes: "#e9e7e2",
};

export const CHICHI: Look = {
  id: "chichi",
  build: "girl",
  skin: "#efcfb6",
  hair: "chichi",
  hairColor: "#141116",
  lashes: true,
  necklace: "heart",
  top: { kind: "ruched", color: "#f5f3ef" },
  bottom: { kind: "wide", color: "#56585d" },
  shoes: "#1c1b1f",
  sole: "#2c2b30",
};

export const AAYAM: Look = {
  id: "aayam",
  build: "boy",
  skin: "#c38d67",
  hair: "aayam",
  hairColor: "#1d1411",
  stud: true,
  necklace: "silver",
  top: { kind: "zipshirt", color: "#17161a", pattern: "lightning" },
  bottom: { kind: "cargo", color: "#18171b" },
  shoes: "#f3f2ee",
};

/** Random station people and commuters. */
export function randomLook(seed: number, kind: "commuter" | "person"): Look {
  const r = rng(seed * 97 + 13);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const girl = r() > 0.5;
  const skins = ["#f0cdb2", "#d9a67f", "#b77b54", "#8a5537", "#e6bb95", "#6e4630"];
  const commuterTops = ["#2f3a4c", "#4a4f57", "#1f2430", "#6b4f3a", "#3d4a3a"];
  const casualTops = ["#e07a8a", "#f2c14e", "#5fa8d3", "#8bc59b", "#b58ad6", "#f19a5c", "#e5e2dc"];
  return {
    id: `${kind}-${seed}`,
    build: girl ? "girl" : "boy",
    skin: pick(skins),
    hair: girl ? pick(["ponytail", "bob", "bun"] as HairKind[]) : pick(["short", "buzz", "cap"] as HairKind[]),
    hairColor: pick(["#1b1411", "#3b2618", "#6a4a2c", "#2a2a2a", "#8a6a44"]),
    top: kind === "commuter" ? { kind: "jacket", color: pick(commuterTops) } : { kind: pick(["tee", "hoodie", "longtop"] as TopKind[]), color: pick(casualTops) },
    bottom: { kind: kind === "commuter" ? "jeans" : pick(["jeans", "cargo", "sweats"] as BottomKind[]), color: pick(["#23252b", "#3f4a63", "#6d6f73", "#2e3b55"]) },
    shoes: pick(["#1c1b1f", "#ece8df", "#7a4b32"]),
  };
}
