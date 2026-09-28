import { INK, blob, circle, clipped, ellipse, fillStroke, heartPath, linGrad, poly, rng, rrect, shade, text, type Ctx } from "./draw";
import type { Prop, Theme } from "../types";
import { TILE } from "../types";

// Places: walls, skies, ground tiles and landmarks for every date spot.

export const SKY: Record<Theme, [string, string] | null> = {
  mall: null,
  street: ["#9fd3f5", "#fdf1e4"],
  station: ["#a8d8f5", "#fdf3e8"],
  train: null,
  haymarket: ["#b3d9f2", "#fde9e0"],
  booth: null,
  carpark: null,
  rooftop: ["#c9d1d8", "#eef0f0"],
  river: ["#8fcdf3", "#f3f8ef"],
  arcade: null,
  outdoor: ["#94d0f6", "#fff4e2"],
};

export const INDOOR_BG: Record<Theme, string> = {
  mall: "#f6ece4",
  street: "#f6ece4",
  station: "#f6ece4",
  train: "#e4e7ea",
  haymarket: "#f6ece4",
  booth: "#eef3fb",
  carpark: "#b8b4ad",
  rooftop: "#dfe2e4",
  river: "#eaf4ea",
  arcade: "#1a1238",
  outdoor: "#fff4e2",
};

// ---------------------------------------------------------------------------
// Far skyline strip (parallax), 1024 x 320 units, tiles horizontally
// ---------------------------------------------------------------------------

export const FAR_W = 1024;
export const FAR_H = 320;

export function drawFar(ctx: Ctx, theme: Theme) {
  const r = rng(theme.length * 31 + 7);
  const base = FAR_H;
  if (theme === "river" || theme === "outdoor") {
    // soft hills and treelines
    ctx.fillStyle = theme === "river" ? "#b9dcb4" : "#c6e3b8";
    ctx.beginPath();
    ctx.moveTo(0, base);
    for (let x = 0; x <= FAR_W; x += 32) ctx.lineTo(x, base - 90 - Math.sin(x / 140) * 20 - Math.sin(x / 57) * 8);
    ctx.lineTo(FAR_W, base);
    ctx.fill();
    ctx.fillStyle = theme === "river" ? "#8fc28e" : "#9fcb8e";
    for (let i = 0; i < 26; i++) {
      const x = r() * FAR_W;
      const h = 30 + r() * 40;
      ellipse(ctx, x, base - 70 - h * 0.4, 16 + r() * 16, h * 0.55);
      ctx.fill();
    }
    // a few distant towers (Parramatta skyline)
    ctx.fillStyle = "#c7d6e3";
    for (let i = 0; i < 6; i++) {
      const x = 80 + i * 170 + r() * 40;
      const h = 90 + r() * 110;
      ctx.fillRect(x, base - 80 - h, 34 + r() * 20, h);
    }
    return;
  }
  if (theme === "rooftop") {
    // the view from the carpark roof: grey city with the gold and orange-striped buildings
    ctx.fillStyle = "#b9c1c9";
    for (let i = 0; i < 14; i++) {
      const x = i * 76 + r() * 20;
      const h = 140 + r() * 150;
      ctx.fillRect(x, base - h, 60 + r() * 30, h);
    }
    ctx.fillStyle = "#cbb46a";
    ctx.fillRect(300, base - 250, 110, 250);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let y = base - 240; y < base; y += 16) ctx.fillRect(300, y, 110, 3);
    ctx.fillStyle = "#c9c2bb";
    ctx.fillRect(640, base - 290, 150, 290);
    ctx.fillStyle = "#e9611d";
    ctx.fillRect(760, base - 290, 10, 290);
    ctx.fillStyle = "#5f8f86";
    for (let y = base - 270; y < base - 10; y += 26) ctx.fillRect(650, y, 100, 12);
    return;
  }
  // generic city skyline
  const cols = theme === "haymarket" ? ["#c9d7e6", "#d8e2ee", "#bfcfe0"] : ["#cfdde9", "#dfe8f0", "#c5d5e3"];
  for (let i = 0; i < 18; i++) {
    const x = i * 58 + r() * 20;
    const h = 70 + r() * 160;
    const w = 40 + r() * 34;
    ctx.fillStyle = cols[i % cols.length];
    ctx.fillRect(x, base - h, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let y = base - h + 10; y < base - 8; y += 14) for (let wx = x + 6; wx < x + w - 6; wx += 10) ctx.fillRect(wx, y, 4, 6);
  }
}

// ---------------------------------------------------------------------------
// Backdrops (world anchored, drawn into cached chunks)
// ---------------------------------------------------------------------------

const MODULE = 256;

function forModules(x0: number, x1: number, w: number, fn: (mx: number, i: number) => void) {
  const start = Math.floor(x0 / w) - 1;
  const end = Math.ceil(x1 / w) + 1;
  for (let i = start; i <= end; i++) fn(i * w, i);
}

const SHOP_NAMES = ["gifts", "kicks", "sushi", "phones", "candles", "books", "tees", "cafe", "beauty", "toys", "bags", "sweets"];
const SHOP_COLS = ["#f28bb0", "#7cc3e8", "#f5c16c", "#9ad2a4", "#c5a3e8", "#f39a7a", "#7fb0d9"];

export function drawShopfront(ctx: Ctx, x: number, floor: number, w: number, name: string, color: string, seed: number, opts: { dark?: boolean; tall?: number } = {}) {
  const h = opts.tall ?? 150;
  const top = floor - h;
  // frame
  rrect(ctx, x + 6, top, w - 12, h, [8, 8, 0, 0]);
  fillStroke(ctx, "#fbf8f4", INK, 1.6);
  // sign band
  rrect(ctx, x + 6, top, w - 12, 34, [8, 8, 0, 0]);
  fillStroke(ctx, color, INK, 1.6);
  text(ctx, name, x + w / 2, top + 18, name.length > 10 ? 15 : 19, "#ffffff");
  // glass
  rrect(ctx, x + 16, top + 44, w - 32, h - 50, 4);
  fillStroke(ctx, linGrad(ctx, 0, top + 44, 0, floor, [
    [0, opts.dark ? "#3a3350" : "#d9eef8"],
    [1, opts.dark ? "#2a2440" : "#bfe0f0"],
  ]), INK, 1.4);
  // shelves / goods
  const r = rng(seed);
  ctx.save();
  rrect(ctx, x + 16, top + 44, w - 32, h - 50, 4);
  ctx.clip();
  for (let row = 0; row < 2; row++) {
    const sy = top + 78 + row * 40;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(x + 20, sy, w - 40, 4);
    for (let gx = x + 26; gx < x + w - 34; gx += 18 + r() * 8) {
      ctx.fillStyle = SHOP_COLS[Math.floor(r() * SHOP_COLS.length)];
      rrect(ctx, gx, sy - 12 - r() * 8, 10, 14 + r() * 6, 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(x + 30, top + 44);
  ctx.lineTo(x + 60, top + 44);
  ctx.lineTo(x + 20, floor);
  ctx.lineTo(x + 16, floor);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function building(ctx: Ctx, x: number, floor: number, w: number, h: number, color: string, seed: number) {
  const r = rng(seed);
  rrect(ctx, x, floor - h, w, h, [4, 4, 0, 0]);
  fillStroke(ctx, color, INK, 1.4);
  ctx.fillStyle = shade(color, -0.1);
  ctx.fillRect(x + 1, floor - h + 1, w - 2, 8);
  for (let y = floor - h + 22; y < floor - 70; y += 34) {
    for (let wx = x + 14; wx < x + w - 26; wx += 30) {
      rrect(ctx, wx, y, 18, 22, 2);
      fillStroke(ctx, r() > 0.25 ? "#cfe8f5" : "#fff2b8", shade(color, -0.35), 1);
    }
  }
}

export function drawBackdrop(ctx: Ctx, theme: Theme, x0: number, x1: number, floor: number, levelH: number, avoid: [number, number][] = []) {
  const free = (mx: number) => !avoid.some(([a, b]) => a < mx + MODULE && b > mx);
  switch (theme) {
    case "mall": {
      ctx.fillStyle = linGrad(ctx, 0, 0, 0, floor, [
        [0, "#fbf3ec"],
        [1, "#f3e6db"],
      ]);
      ctx.fillRect(x0, 0, x1 - x0, levelH);
      // upper level balcony + skylight glow
      ctx.fillStyle = "#efe0d3";
      ctx.fillRect(x0, floor - 238, x1 - x0, 22);
      ctx.fillStyle = "rgba(190,225,240,0.5)";
      ctx.fillRect(x0, floor - 216, x1 - x0, 10);
      forModules(x0, x1, MODULE, (mx, i) => {
        const r = rng(i * 13 + 5);
        if (free(mx)) drawShopfront(ctx, mx, floor, MODULE, SHOP_NAMES[Math.abs(i) % SHOP_NAMES.length], SHOP_COLS[Math.abs(i * 3) % SHOP_COLS.length], i + 100);
        // hanging lights
        ctx.strokeStyle = "#b9a898";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mx + 128, floor - 216);
        ctx.lineTo(mx + 128, floor - 186);
        ctx.stroke();
        circle(ctx, mx + 128, floor - 180, 7);
        fillStroke(ctx, r() > 0.5 ? "#ffe9a8" : "#ffd3e2", INK, 1.2);
      });
      break;
    }
    case "street":
    case "haymarket":
    case "outdoor": {
      forModules(x0, x1, MODULE, (mx, i) => {
        const r = rng(i * 17 + (theme === "haymarket" ? 3 : 9));
        const cols = theme === "haymarket" ? ["#e8c7a8", "#d9a88c", "#f0dcc4", "#c98f7a"] : theme === "outdoor" ? ["#f1dcc0", "#e7cfb2", "#dfe6ea"] : ["#e9d6c4", "#d7c2b0", "#f1e4d4", "#c9d5dd"];
        const h = 190 + r() * 120;
        building(ctx, mx + 4, floor, MODULE - 8, h, cols[Math.abs(i) % cols.length], i * 7 + 1);
        if (theme !== "outdoor" && free(mx)) drawShopfront(ctx, mx, floor, MODULE, SHOP_NAMES[Math.abs(i * 5) % SHOP_NAMES.length], SHOP_COLS[Math.abs(i) % SHOP_COLS.length], i + 50, { tall: 110 });
        if (theme === "haymarket") {
          // lantern string
          ctx.strokeStyle = "#7a2b2b";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(mx, floor - 150);
          ctx.quadraticCurveTo(mx + 128, floor - 120, mx + 256, floor - 150);
          ctx.stroke();
          for (let k = 1; k < 5; k++) {
            const lx = mx + k * 51;
            const ly = floor - 150 + Math.sin((k / 5) * Math.PI) * 26;
            ellipse(ctx, lx, ly + 8, 7, 9);
            fillStroke(ctx, "#e0393b", INK, 1.1);
            ctx.fillStyle = "#f5c542";
            ctx.fillRect(lx - 3, ly - 2, 6, 2);
          }
        }
        if (theme === "outdoor" && r() > 0.3) {
          // gum tree
          ctx.fillStyle = "#b08a66";
          ctx.fillRect(mx + 200, floor - 120, 10, 120);
          for (const [dx, dy, s] of [
            [0, -130, 34],
            [-22, -112, 26],
            [22, -114, 26],
          ] as const) {
            circle(ctx, mx + 205 + dx, floor + dy, s);
            fillStroke(ctx, "#7fb76a", INK, 1.3);
          }
        }
      });
      break;
    }
    case "station": {
      // canopy with steel columns, back fence and a train on the far track
      const canopy = floor - 250;
      forModules(x0, x1, MODULE, (mx, i) => {
        const r = rng(i * 23 + 1);
        if (r() > 0.45) {
          // a double-decker waiting on the other track
          rrect(ctx, mx, floor - 170, MODULE + 2, 120, 12);
          fillStroke(ctx, "#e9ecef", INK, 1.4);
          ctx.fillStyle = "#f5a623";
          ctx.fillRect(mx, floor - 150, MODULE + 2, 8);
          ctx.fillStyle = "#6b7684";
          for (let wx = mx + 18; wx < mx + MODULE - 20; wx += 48) {
            rrect(ctx, wx, floor - 136, 34, 26, 5);
            ctx.fill();
            rrect(ctx, wx, floor - 100, 34, 26, 5);
            ctx.fill();
          }
        }
        // fence
        ctx.strokeStyle = "#8d9aa6";
        ctx.lineWidth = 2;
        for (let fx = mx; fx < mx + MODULE; fx += 12) {
          ctx.beginPath();
          ctx.moveTo(fx, floor - 48);
          ctx.lineTo(fx, floor);
          ctx.stroke();
        }
        ctx.fillStyle = "#8d9aa6";
        ctx.fillRect(mx, floor - 50, MODULE, 4);
        // columns + canopy
        ctx.fillStyle = "#5b7086";
        ctx.fillRect(mx + 120, canopy, 10, floor - canopy);
        ctx.fillStyle = "#e7ebee";
        ctx.fillRect(mx, canopy - 26, MODULE, 26);
        ctx.fillStyle = "#c7cfd6";
        ctx.fillRect(mx, canopy, MODULE, 6);
        // hanging lights
        ctx.fillStyle = "#fff6d5";
        rrect(ctx, mx + 40, canopy + 6, 40, 6, 3);
        ctx.fill();
      });
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x0, canopy - 26);
      ctx.lineTo(x1, canopy - 26);
      ctx.moveTo(x0, canopy + 6);
      ctx.lineTo(x1, canopy + 6);
      ctx.stroke();
      break;
    }
    case "train": {
      ctx.fillStyle = linGrad(ctx, 0, 0, 0, levelH, [
        [0, "#eef0f2"],
        [1, "#d8dde2"],
      ]);
      ctx.fillRect(x0, 0, x1 - x0, levelH);
      forModules(x0, x1, 160, (mx, i) => {
        const r = rng(i * 7 + 2);
        // windows on both decks
        for (const wy of [floor - 118, floor - 262]) {
          rrect(ctx, mx + 18, wy, 124, 70, 14);
          fillStroke(ctx, linGrad(ctx, 0, wy, 0, wy + 70, [
            [0, "#9fd3f5"],
            [0.7, "#e8f5ff"],
            [0.71, "#a7c98f"],
            [1, "#86b573"],
          ]), "#6c7680", 3);
          rrect(ctx, mx + 18, wy, 124, 70, 14);
          clipped(ctx, () => {
            ctx.fillStyle = "#7eae6a";
            for (let k = 0; k < 3; k++) {
              circle(ctx, mx + 30 + r() * 100, wy + 50, 10 + r() * 8);
              ctx.fill();
            }
            ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.fillRect(mx + 40, wy, 14, 70);
          });
        }
        // orange door stripe every other module
        if (i % 3 === 0) {
          rrect(ctx, mx + 50, floor - 126, 60, 126, 6);
          fillStroke(ctx, "#cfd4d9", INK, 1.4);
          ctx.fillStyle = "#f07c1a";
          ctx.fillRect(mx + 50, floor - 90, 60, 10);
          ctx.strokeStyle = "#9aa3ad";
          ctx.beginPath();
          ctx.moveTo(mx + 80, floor - 126);
          ctx.lineTo(mx + 80, floor);
          ctx.stroke();
        }
        // yellow grab rails
        ctx.fillStyle = "#f2c31b";
        ctx.fillRect(mx + 8, floor - 128, 5, 128);
        rrect(ctx, mx + 5, floor - 132, 11, 6, 3);
        ctx.fill();
      });
      // upper deck floor
      ctx.fillStyle = "#b9c0c7";
      ctx.fillRect(x0, floor - 132, x1 - x0, 6);
      break;
    }
    case "booth": {
      ctx.fillStyle = "#f7f8fb";
      ctx.fillRect(x0, 0, x1 - x0, levelH);
      forModules(x0, x1, MODULE, (mx, i) => {
        // white arches with shelves like the Hamafilm studio
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#d6dbe4";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mx + 60, floor);
        ctx.lineTo(mx + 60, floor - 150);
        ctx.arc(mx + 128, floor - 150, 68, Math.PI, 0);
        ctx.lineTo(mx + 196, floor);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = "#e3e7ee";
        for (let y = floor - 150; y < floor; y += 22) {
          ctx.beginPath();
          ctx.moveTo(mx + 60, y);
          ctx.lineTo(mx + 196, y);
          ctx.stroke();
        }
        if (i % 2 === 0) {
          ellipse(ctx, mx + 128, floor - 70, 18, 10);
          ctx.fillStyle = "#ff5aa5";
          ctx.fill();
        }
        // neon script sign
        ctx.save();
        ctx.shadowColor = "#57c7ff";
        ctx.shadowBlur = 10;
        ctx.font = "italic 800 22px 'Nunito Variable', ui-rounded, sans-serif";
        ctx.fillStyle = "#6fd0ff";
        ctx.textAlign = "center";
        ctx.fillText(i % 2 ? "say cheese" : "hama", mx + 128, floor - 250);
        ctx.restore();
      });
      break;
    }
    case "carpark": {
      ctx.fillStyle = "#bdb9b2";
      ctx.fillRect(x0, 0, x1 - x0, levelH);
      // concrete slabs every floor (every 4 tiles) and pillars
      ctx.fillStyle = "#a7a39c";
      for (let y = levelH - 4 * TILE; y > 0; y -= 4 * TILE) ctx.fillRect(x0, y - 10, x1 - x0, 10);
      forModules(x0, x1, 192, (mx) => {
        ctx.fillStyle = "#cfcbc4";
        ctx.fillRect(mx + 80, 0, 26, levelH);
        ctx.fillStyle = "#e6c229";
        for (let y = 0; y < levelH; y += 4 * TILE) {
          ctx.fillRect(mx + 80, y + 70, 26, 8);
        }
        ctx.fillStyle = "#1f8f4d";
        rrect(ctx, mx + 140, 40, 34, 14, 3);
        ctx.fill();
      });
      break;
    }
    case "rooftop": {
      // low graffiti parapet walls along the back
      forModules(x0, x1, MODULE, (mx, i) => {
        rrect(ctx, mx, floor - 46, MODULE, 46, 2);
        fillStroke(ctx, "#8e8a84", INK, 1.2);
        graffiti(ctx, mx + 10, floor - 44, MODULE - 20, 40, i * 11 + 3, 0.8);
        // railing
        ctx.strokeStyle = "#2b2b30";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mx, floor - 70);
        ctx.lineTo(mx + MODULE, floor - 70);
        for (let k = 0; k <= MODULE; k += 64) {
          ctx.moveTo(mx + k, floor - 70);
          ctx.lineTo(mx + k, floor - 46);
        }
        ctx.stroke();
      });
      break;
    }
    case "river": {
      // the river itself, behind the railing
      ctx.fillStyle = linGrad(ctx, 0, floor - 70, 0, floor, [
        [0, "#8fd0e3"],
        [1, "#5aa6c0"],
      ]);
      ctx.fillRect(x0, floor - 70, x1 - x0, 70);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 2;
      forModules(x0, x1, 64, (mx, i) => {
        ctx.beginPath();
        ctx.moveTo(mx + 8, floor - 50 + (i % 3) * 14);
        ctx.quadraticCurveTo(mx + 20, floor - 54 + (i % 3) * 14, mx + 32, floor - 50 + (i % 3) * 14);
        ctx.stroke();
      });
      // far bank
      ctx.fillStyle = "#a9cf8f";
      ctx.fillRect(x0, floor - 78, x1 - x0, 10);
      forModules(x0, x1, MODULE, (mx, i) => {
        const r = rng(i * 5 + 9);
        // eucalypts along the river
        ctx.fillStyle = "#c9b59c";
        ctx.fillRect(mx + 60, floor - 200, 9, 124);
        for (let k = 0; k < 4; k++) {
          circle(ctx, mx + 64 + (r() - 0.5) * 50, floor - 210 + (r() - 0.5) * 40, 20 + r() * 10);
          fillStroke(ctx, r() > 0.5 ? "#8cbf7a" : "#7aad6c", INK, 1.2);
        }
        // railing on the river path
        ctx.strokeStyle = "#6f7a82";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mx, floor - 28);
        ctx.lineTo(mx + MODULE, floor - 28);
        ctx.moveTo(mx, floor - 14);
        ctx.lineTo(mx + MODULE, floor - 14);
        for (let k = 0; k < MODULE; k += 32) {
          ctx.moveTo(mx + k, floor - 28);
          ctx.lineTo(mx + k, floor);
        }
        ctx.stroke();
      });
      // the river below the path
      ctx.fillStyle = linGrad(ctx, 0, floor, 0, levelH, [
        [0, "#6fb3c9"],
        [1, "#3f879e"],
      ]);
      ctx.fillRect(x0, floor + TILE, x1 - x0, levelH - floor);
      break;
    }
    case "arcade": {
      ctx.fillStyle = linGrad(ctx, 0, 0, 0, levelH, [
        [0, "#140e2e"],
        [1, "#241a4d"],
      ]);
      ctx.fillRect(x0, 0, x1 - x0, levelH);
      forModules(x0, x1, 128, (mx, i) => {
        const r = rng(i * 3 + 4);
        const col = ["#ff4fa3", "#35d2ff", "#ffd23f", "#7cff8a", "#b36bff"][Math.abs(i) % 5];
        // arcade cabinet silhouette with a glowing screen
        rrect(ctx, mx + 24, floor - 120, 80, 120, [10, 10, 2, 2]);
        fillStroke(ctx, "#2f2463", "#0b0820", 2);
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 14;
        rrect(ctx, mx + 34, floor - 108, 60, 40, 4);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        for (let k = 0; k < 4; k++) ctx.fillRect(mx + 38 + r() * 44, floor - 104 + r() * 30, 8, 3);
        // neon strip on the wall
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = col;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(mx, floor - 230 + Math.sin(i) * 8);
        ctx.lineTo(mx + 128, floor - 230 + Math.sin(i + 1) * 8);
        ctx.stroke();
        ctx.restore();
      });
      break;
    }
  }
}

function graffiti(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number, alpha = 1) {
  const r = rng(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const cols = ["#3d7be0", "#f06ab0", "#f5d142", "#41c47b", "#e8492f", "#ffffff", "#8a4fc8"];
  for (let i = 0; i < w / 18; i++) {
    ctx.strokeStyle = cols[Math.floor(r() * cols.length)];
    ctx.lineWidth = 2 + r() * 5;
    ctx.beginPath();
    let px = x + r() * w;
    let py = y + r() * h;
    ctx.moveTo(px, py);
    for (let k = 0; k < 4; k++) {
      px += (r() - 0.5) * 40;
      py += (r() - 0.5) * 20;
      ctx.quadraticCurveTo(px + (r() - 0.5) * 20, py - 10, px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------

const GROUND: Record<Theme, { top: string; fill: string; line?: string }> = {
  mall: { top: "#e8dccf", fill: "#d9c9b8", line: "#cdbcaa" },
  street: { top: "#cfcac4", fill: "#b3aca5", line: "#a19a93" },
  station: { top: "#d5d2cc", fill: "#b8b3ab", line: "#f2c31b" },
  train: { top: "#6a7079", fill: "#565b63", line: "#7a808a" },
  haymarket: { top: "#c9c0b8", fill: "#aa9f96", line: "#998e85" },
  booth: { top: "#e9edf5", fill: "#cdd5e4", line: "#dfe5ef" },
  carpark: { top: "#9c988f", fill: "#86827a", line: "#e6c229" },
  rooftop: { top: "#8f8b85", fill: "#77736d", line: "#6d6963" },
  river: { top: "#d8cdb6", fill: "#a79478", line: "#c3b597" },
  arcade: { top: "#2d2160", fill: "#1d1644", line: "#ff4fa3" },
  outdoor: { top: "#86c26e", fill: "#b58e67", line: "#6fab59" },
};

export function drawGroundTile(ctx: Ctx, theme: Theme, x: number, y: number, topOpen: boolean, leftOpen: boolean, rightOpen: boolean, seed: number) {
  const g = GROUND[theme];
  ctx.fillStyle = g.fill;
  ctx.fillRect(x, y, TILE, TILE);
  const r = rng(seed);
  if (theme === "arcade") {
    // arcade carpet squiggles
    ctx.strokeStyle = ["#ff4fa3", "#35d2ff", "#ffd23f"][Math.floor(r() * 3)];
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 10 + r() * 10);
    ctx.quadraticCurveTo(x + 16, y + r() * 30, x + 28, y + 12 + r() * 10);
    ctx.stroke();
  } else if (theme === "outdoor" || theme === "river") {
    ctx.fillStyle = shade(g.fill, -0.08);
    circle(ctx, x + 6 + r() * 20, y + 12 + r() * 14, 2 + r() * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = shade(g.fill, -0.08);
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  }
  if (topOpen) {
    ctx.fillStyle = g.top;
    ctx.fillRect(x, y, TILE, 9);
    if (theme === "station") {
      // yellow tactile strip
      ctx.fillStyle = "#f2c31b";
      ctx.fillRect(x, y + 3, TILE, 4);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      for (let k = 2; k < TILE; k += 6) ctx.fillRect(x + k, y + 4, 2, 2);
    } else if (theme === "carpark") {
      ctx.fillStyle = g.line!;
      if (Math.floor(x / TILE) % 3 === 0) ctx.fillRect(x + 4, y + 3, TILE - 8, 3);
    } else if (theme === "outdoor" || theme === "river") {
      ctx.fillStyle = g.line!;
      for (let k = 0; k < TILE; k += 5) ctx.fillRect(x + k, y + 7, 3, 3);
    } else if (theme === "rooftop") {
      if (r() > 0.7) {
        // puddle
        ellipse(ctx, x + 16, y + 5, 12, 2.4);
        ctx.fillStyle = "rgba(170,190,205,0.8)";
        ctx.fill();
      }
      if (r() > 0.8) {
        // chalk star
        ctx.strokeStyle = "#9fd6f0";
        ctx.lineWidth = 1.5;
        star(ctx, x + 16, y + 5, 5);
        ctx.stroke();
      }
    } else if (theme === "arcade") {
      ctx.fillStyle = g.line!;
      ctx.fillRect(x, y + 7, TILE, 2);
    } else {
      ctx.fillStyle = shade(g.top, 0.12);
      ctx.fillRect(x, y, TILE, 2);
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y + 0.7);
    ctx.lineTo(x + TILE, y + 0.7);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  if (leftOpen) {
    ctx.beginPath();
    ctx.moveTo(x + 0.7, y);
    ctx.lineTo(x + 0.7, y + TILE);
    ctx.stroke();
  }
  if (rightOpen) {
    ctx.beginPath();
    ctx.moveTo(x + TILE - 0.7, y);
    ctx.lineTo(x + TILE - 0.7, y + TILE);
    ctx.stroke();
  }
}

function star(ctx: Ctx, x: number, y: number, s: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? s * 0.45 : s;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

const LEDGE: Record<Theme, [string, string]> = {
  mall: ["#f7c9d9", "#e79bb8"],
  street: ["#9fb7c9", "#7c95a8"],
  station: ["#8fa3b5", "#6f8397"],
  train: ["#2f8fa3", "#227386"],
  haymarket: ["#d9534f", "#b33d3a"],
  booth: ["#f7c9e0", "#e3a2c4"],
  carpark: ["#b0aca5", "#8f8b84"],
  rooftop: ["#a9a49c", "#8a857e"],
  river: ["#a8835a", "#86643f"],
  arcade: ["#4b3a9a", "#35d2ff"],
  outdoor: ["#c79f74", "#a37d55"],
};

/** One-way platforms: kiosk tops, train seats, crates, logs, arcade machine tops. */
export function drawLedgeTile(ctx: Ctx, theme: Theme, x: number, y: number, leftEnd: boolean, rightEnd: boolean) {
  const [a, b] = LEDGE[theme];
  const x0 = x + (leftEnd ? 2 : 0);
  const w = TILE - (leftEnd ? 2 : 0) - (rightEnd ? 2 : 0);
  rrect(ctx, x0, y, w, 12, [leftEnd ? 6 : 0, rightEnd ? 6 : 0, rightEnd ? 4 : 0, leftEnd ? 4 : 0]);
  ctx.fillStyle = a;
  ctx.fill();
  ctx.fillStyle = b;
  ctx.fillRect(x0, y + 8, w, 4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x0, y + 0.7);
  ctx.lineTo(x0 + w, y + 0.7);
  ctx.moveTo(x0, y + 12);
  ctx.lineTo(x0 + w, y + 12);
  if (leftEnd) {
    ctx.moveTo(x0, y);
    ctx.lineTo(x0, y + 12);
  }
  if (rightEnd) {
    ctx.moveTo(x0 + w, y);
    ctx.lineTo(x0 + w, y + 12);
  }
  ctx.stroke();
  if (theme === "train") {
    // seat pattern
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    for (let k = 3; k < w; k += 7) ctx.fillRect(x0 + k, y + 3, 3, 3);
  }
  if (theme === "arcade") {
    ctx.save();
    ctx.shadowColor = "#35d2ff";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#35d2ff";
    ctx.fillRect(x0, y + 10, w, 2);
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Landmarks
// ---------------------------------------------------------------------------

function sydneySign(ctx: Ctx, x: number, y: number, label: string) {
  const w = Math.max(120, label.length * 13 + 50);
  rrect(ctx, x - w / 2, y - 30, w, 30, 5);
  fillStroke(ctx, "#1d2f5e", INK, 1.6);
  circle(ctx, x - w / 2 + 16, y - 15, 9);
  ctx.fillStyle = "#f07c1a";
  ctx.fill();
  text(ctx, "T", x - w / 2 + 16, y - 14.5, 12, "#fff");
  text(ctx, label, x + 10, y - 14.5, 16, "#ffffff");
  ctx.fillStyle = "#5b7086";
  ctx.fillRect(x - w / 2 + 10, y, 4, 40);
  ctx.fillRect(x + w / 2 - 14, y, 4, 40);
}

/** Draw a landmark with its bottom centre at (x, y). */
export function drawProp(ctx: Ctx, p: Prop, x: number, y: number) {
  const w = (p.w ?? 4) * TILE;
  switch (p.kind) {
    case "shop":
      drawShopfront(ctx, x - w / 2, y, w, p.label ?? "", p.color ?? "#e84a86", (p.variant ?? 1) * 17, { tall: p.h ? p.h * TILE : 160 });
      if (p.sub) text(ctx, p.sub, x, y - (p.h ? p.h * TILE : 160) + 42, 9, INK, { weight: 800 });
      break;
    case "barberPole": {
      rrect(ctx, x - 7, y - 70, 14, 50, 7);
      fillStroke(ctx, "#fff", INK, 1.4);
      rrect(ctx, x - 7, y - 70, 14, 50, 7);
      clipped(ctx, () => {
        ctx.strokeStyle = "#e0393b";
        ctx.lineWidth = 4;
        for (let k = -70; k < 0; k += 12) {
          ctx.beginPath();
          ctx.moveTo(x - 8, y + k);
          ctx.lineTo(x + 8, y + k - 10);
          ctx.stroke();
        }
      });
      break;
    }
    case "stationSign":
      sydneySign(ctx, x, y - 160, p.label ?? "");
      break;
    case "sign": {
      const lines = (p.label ?? "").split("\n");
      const sw = Math.max(...lines.map((l) => l.length)) * 7 + 24;
      const sh = lines.length * 14 + 12;
      ctx.fillStyle = "#6b6f75";
      ctx.fillRect(x - 2, y - 40, 4, 40);
      rrect(ctx, x - sw / 2, y - 40 - sh, sw, sh, 4);
      fillStroke(ctx, p.color ?? "#ffffff", INK, 1.4);
      lines.forEach((l, i) => text(ctx, l, x, y - 40 - sh + 13 + i * 14, 11, p.color && p.color !== "#ffffff" ? "#fff" : INK, { weight: 800 }));
      break;
    }
    case "bench": {
      rrect(ctx, x - 40, y - 26, 80, 7, 3);
      fillStroke(ctx, "#b77b4a", INK, 1.4);
      rrect(ctx, x - 40, y - 44, 80, 6, 3);
      fillStroke(ctx, "#c98a57", INK, 1.4);
      ctx.fillStyle = "#4a4f57";
      ctx.fillRect(x - 34, y - 19, 4, 19);
      ctx.fillRect(x + 30, y - 19, 4, 19);
      ctx.fillRect(x - 34, y - 44, 3, 25);
      ctx.fillRect(x + 31, y - 44, 3, 25);
      break;
    }
    case "busShelter": {
      rrect(ctx, x - w / 2, y - 120, w, 10, 3);
      fillStroke(ctx, "#4a5a6a", INK, 1.4);
      ctx.fillStyle = "rgba(200,230,245,0.55)";
      ctx.fillRect(x - w / 2 + 6, y - 110, w - 12, 80);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x - w / 2 + 6, y - 110, w - 12, 80);
      ctx.fillStyle = "#4a5a6a";
      ctx.fillRect(x - w / 2 + 4, y - 110, 4, 110);
      ctx.fillRect(x + w / 2 - 8, y - 110, 4, 110);
      rrect(ctx, x - w / 2 + 14, y - 104, 44, 60, 3);
      fillStroke(ctx, "#ffd3e2", INK, 1.1);
      heartPath(ctx, x - w / 2 + 36, y - 70, 10);
      ctx.fillStyle = "#e84a86";
      ctx.fill();
      text(ctx, "BUS", x + w / 2 - 30, y - 96, 11, "#fff");
      break;
    }
    case "bridge": {
      // Marsden St bridge: concrete deck overhead on thick piers
      const deckY = y - (p.h ?? 5) * TILE;
      ctx.fillStyle = "#b6b1a8";
      ctx.fillRect(x - w / 2, deckY - 26, w, 26);
      ctx.fillStyle = "#9e9990";
      ctx.fillRect(x - w / 2, deckY, w, 10);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(x - w / 2, deckY - 26, w, 36);
      for (const px of [x - w / 2 + 30, x + w / 2 - 70]) {
        rrect(ctx, px, deckY + 10, 40, y - deckY - 10, 2);
        fillStroke(ctx, "#a8a399", INK, 1.6);
      }
      // railing on top + name plate
      ctx.strokeStyle = "#5e646b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, deckY - 44);
      ctx.lineTo(x + w / 2, deckY - 44);
      for (let k = x - w / 2; k <= x + w / 2; k += 20) {
        ctx.moveTo(k, deckY - 44);
        ctx.lineTo(k, deckY - 26);
      }
      ctx.stroke();
      if (p.label) {
        rrect(ctx, x - 50, deckY - 20, 100, 14, 3);
        fillStroke(ctx, "#2f5d3a", INK, 1);
        text(ctx, p.label, x, deckY - 12.5, 9, "#fff");
      }
      break;
    }
    case "hoop": {
      // basketball machine like the one at Timezone
      rrect(ctx, x - 50, y - 170, 100, 170, [8, 8, 2, 2]);
      fillStroke(ctx, "#1d1a3a", "#0b0820", 2);
      ctx.save();
      ctx.shadowColor = "#ff7a2f";
      ctx.shadowBlur = 12;
      rrect(ctx, x - 40, y - 160, 80, 34, 4);
      ctx.strokeStyle = "#ff7a2f";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
      rrect(ctx, x - 38, y - 158, 76, 30, 3);
      ctx.fillStyle = "#1d5bff";
      ctx.fill();
      text(ctx, "SLAM N JAM", x, y - 143, 11, "#fff");
      rrect(ctx, x - 26, y - 118, 52, 34, 3);
      fillStroke(ctx, "rgba(255,255,255,0.2)", "#8fb3ff", 1.4);
      ellipse(ctx, x, y - 84, 14, 4);
      ctx.strokeStyle = "#ff5a1f";
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1;
      for (let k = -12; k <= 12; k += 6) {
        ctx.beginPath();
        ctx.moveTo(x + k, y - 84);
        ctx.lineTo(x + k * 0.6, y - 66);
        ctx.stroke();
      }
      ctx.save();
      ctx.shadowColor = "#35d2ff";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#35d2ff";
      ctx.fillRect(x - 50, y - 60, 5, 60);
      ctx.fillRect(x + 45, y - 60, 5, 60);
      ctx.restore();
      break;
    }
    case "claw": {
      rrect(ctx, x - 36, y - 150, 72, 150, 6);
      fillStroke(ctx, "#ff4fa3", "#0b0820", 2);
      rrect(ctx, x - 28, y - 138, 56, 80, 3);
      ctx.fillStyle = "rgba(200,240,255,0.35)";
      ctx.fill();
      ctx.strokeStyle = "#e0e6f0";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y - 138);
      ctx.lineTo(x, y - 110);
      ctx.moveTo(x - 6, y - 104);
      ctx.lineTo(x, y - 110);
      ctx.lineTo(x + 6, y - 104);
      ctx.stroke();
      for (let k = 0; k < 5; k++) {
        circle(ctx, x - 20 + k * 10, y - 66, 6);
        fillStroke(ctx, ["#ffd23f", "#7cff8a", "#35d2ff", "#ff9ec0", "#b36bff"][k], "#0b0820", 1);
      }
      break;
    }
    case "arcade":
      break;
    case "booth": {
      // a photo booth box with a curtain
      rrect(ctx, x - 50, y - 180, 100, 180, 6);
      fillStroke(ctx, "#f9d3e3", INK, 1.6);
      rrect(ctx, x - 50, y - 180, 100, 34, [6, 6, 0, 0]);
      fillStroke(ctx, "#8fb1ee", INK, 1.6);
      text(ctx, p.label ?? "hamafilm", x, y - 162, 14, "#fff");
      rrect(ctx, x - 36, y - 136, 44, 136, 2);
      fillStroke(ctx, "#6f86d6", INK, 1.4);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      for (let k = x - 30; k < x + 6; k += 8) {
        ctx.beginPath();
        ctx.moveTo(k, y - 134);
        ctx.lineTo(k, y - 2);
        ctx.stroke();
      }
      circle(ctx, x + 28, y - 120, 9);
      fillStroke(ctx, "#ffd84a", INK, 1.2);
      break;
    }
    case "fridge": {
      rrect(ctx, x - 40, y - 150, 80, 150, 4);
      fillStroke(ctx, "#f4f6f8", INK, 1.6);
      rrect(ctx, x - 32, y - 140, 64, 120, 3);
      ctx.fillStyle = "#dbeefa";
      ctx.fill();
      for (let row = 0; row < 4; row++) {
        for (let k = 0; k < 6; k++) {
          ctx.fillStyle = ["#e0393b", "#f5c542", "#4fc26a", "#3d7be0", "#ffffff"][(row + k) % 5];
          rrect(ctx, x - 28 + k * 10, y - 134 + row * 28, 7, 20, 2);
          ctx.fill();
        }
      }
      break;
    }
    case "tower": {
      // brick stair tower on the carpark roof, covered in graffiti, with the cage ladder
      const tw = w;
      const th = (p.h ?? 6) * TILE;
      rrect(ctx, x - tw / 2, y - th, tw, th, 2);
      fillStroke(ctx, "#5a3a2e", INK, 1.8);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - tw / 2, y - th, tw, th);
      ctx.clip();
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 1;
      for (let by = y - th; by < y; by += 8) {
        ctx.beginPath();
        ctx.moveTo(x - tw / 2, by);
        ctx.lineTo(x + tw / 2, by);
        ctx.stroke();
      }
      ctx.restore();
      graffiti(ctx, x - tw / 2 + 6, y - th + 20, tw - 12, th - 30, 77);
      // the big blue and pink bubble piece
      blob(ctx, [
        [x - tw / 2 + 20, y - th * 0.55],
        [x - tw / 2 + 40, y - th * 0.8],
        [x, y - th * 0.78],
        [x + 20, y - th * 0.6],
        [x - 10, y - th * 0.4],
        [x - tw / 2 + 24, y - th * 0.38],
      ]);
      fillStroke(ctx, "#f3a6c8", "#2f63c9", 4);
      // cage ladder
      ctx.strokeStyle = "#e9ecef";
      ctx.lineWidth = 2;
      const lx = x + tw / 2 - 10;
      for (let k = y - th - 30; k < y; k += 14) {
        ctx.beginPath();
        ctx.arc(lx, k, 12, Math.PI * 0.1, Math.PI * 0.9, true);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(lx - 12, y - th - 30);
      ctx.lineTo(lx - 12, y);
      ctx.moveTo(lx + 12, y - th - 30);
      ctx.lineTo(lx + 12, y);
      ctx.stroke();
      // railing on top
      ctx.beginPath();
      ctx.moveTo(x - tw / 2, y - th - 24);
      ctx.lineTo(x + tw / 2, y - th - 24);
      ctx.moveTo(x - tw / 2, y - th);
      ctx.lineTo(x - tw / 2, y - th - 24);
      ctx.stroke();
      break;
    }
    case "levelNum": {
      rrect(ctx, x - 22, y - 110, 44, 32, 4);
      fillStroke(ctx, "#e6c229", INK, 1.4);
      text(ctx, p.label ?? "", x, y - 93, 18, INK);
      break;
    }
    case "car": {
      const col = p.color ?? "#e05a5a";
      // body
      blob(ctx, [
        [x - 58, y - 12],
        [x - 56, y - 34],
        [x - 30, y - 38],
        [x - 18, y - 60],
        [x + 26, y - 60],
        [x + 42, y - 38],
        [x + 58, y - 34],
        [x + 60, y - 12],
      ]);
      fillStroke(ctx, col, INK, 1.6);
      poly(ctx, [
        [x - 12, y - 56],
        [x + 22, y - 56],
        [x + 34, y - 38],
        [x - 22, y - 38],
      ]);
      fillStroke(ctx, "#cfe8f5", INK, 1.2);
      for (const wx of [x - 34, x + 34]) {
        circle(ctx, wx, y - 10, 11);
        fillStroke(ctx, "#2b2b30", INK, 1.4);
        circle(ctx, wx, y - 10, 4);
        ctx.fillStyle = "#b9bcc4";
        ctx.fill();
      }
      break;
    }
    case "tree": {
      ctx.fillStyle = "#b08a66";
      ctx.fillRect(x - 5, y - 100, 10, 100);
      for (const [dx, dy, s] of [
        [0, -118, 30],
        [-24, -98, 22],
        [24, -100, 24],
      ] as const) {
        circle(ctx, x + dx, y + dy, s);
        fillStroke(ctx, "#79b566", INK, 1.3);
      }
      break;
    }
    case "fence": {
      // school fence
      ctx.strokeStyle = "#2f6b44";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = x - w / 2; k <= x + w / 2; k += 10) {
        ctx.moveTo(k, y);
        ctx.lineTo(k, y - 70);
      }
      ctx.moveTo(x - w / 2, y - 60);
      ctx.lineTo(x + w / 2, y - 60);
      ctx.moveTo(x - w / 2, y - 14);
      ctx.lineTo(x + w / 2, y - 14);
      ctx.stroke();
      if (p.label) {
        rrect(ctx, x - 90, y - 120, 180, 36, 4);
        fillStroke(ctx, "#1f4f8a", INK, 1.4);
        text(ctx, p.label, x, y - 108, 11, "#fff");
        if (p.sub) text(ctx, p.sub, x, y - 94, 9, "#dbe8ff", { weight: 700 });
      }
      break;
    }
    case "door": {
      rrect(ctx, x - 26, y - 90, 52, 90, [4, 4, 0, 0]);
      fillStroke(ctx, p.color ?? "#8c9aa8", INK, 1.6);
      rrect(ctx, x - 22, y - 106, 44, 14, 3);
      fillStroke(ctx, "#e0393b", INK, 1.2);
      text(ctx, p.label ?? "STAFF ONLY", x, y - 99, 7.5, "#fff");
      circle(ctx, x + 16, y - 44, 3);
      ctx.fillStyle = "#e9e3d7";
      ctx.fill();
      break;
    }
    case "lamp": {
      ctx.fillStyle = "#48525c";
      ctx.fillRect(x - 3, y - 150, 6, 150);
      rrect(ctx, x - 14, y - 160, 28, 12, 5);
      fillStroke(ctx, "#48525c", INK, 1.2);
      ellipse(ctx, x, y - 146, 10, 4);
      ctx.fillStyle = "#fff4c2";
      ctx.fill();
      break;
    }
    case "plant": {
      rrect(ctx, x - 16, y - 26, 32, 26, 4);
      fillStroke(ctx, "#f4f1ec", INK, 1.4);
      for (let k = -2; k <= 2; k++) {
        ellipse(ctx, x + k * 6, y - 40, 5, 16, k * 0.3);
        fillStroke(ctx, "#6fb35c", INK, 1);
      }
      break;
    }
    case "pole": {
      // Opal reader pole
      ctx.fillStyle = "#1f1f24";
      ctx.fillRect(x - 3, y - 70, 6, 70);
      rrect(ctx, x - 9, y - 84, 18, 18, 4);
      fillStroke(ctx, "#1f1f24", INK, 1.2);
      circle(ctx, x, y - 75, 5);
      ctx.fillStyle = "#f07c1a";
      ctx.fill();
      break;
    }
    case "escalator": {
      poly(ctx, [
        [x - 70, y],
        [x - 40, y],
        [x + 60, y - 150],
        [x + 30, y - 150],
      ]);
      fillStroke(ctx, "#c9ced4", INK, 1.6);
      ctx.strokeStyle = "#8d949c";
      for (let k = 0; k < 10; k++) {
        const t = k / 10;
        ctx.beginPath();
        ctx.moveTo(x - 70 + t * 100, y - t * 150);
        ctx.lineTo(x - 40 + t * 100, y - t * 150);
        ctx.stroke();
      }
      break;
    }
    case "lanterns":
    case "arches":
    case "window":
    case "stairs":
    case "trainCar":
      break;
  }
}
