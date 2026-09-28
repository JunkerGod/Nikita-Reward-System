import { heartPath, rrect } from "../art/draw";
import type { Sprites } from "./sprites";
import { BOOST_ITEM, type BoostId, type World } from "./world";

// Hearts, flowers, keepsake slots and boost timers, drawn over the game in screen space.

export function drawHud(ctx: CanvasRenderingContext2D, world: World, sprites: Sprites, dpr: number, w: number, safeTop: number, safeLeft: number) {
  const s = dpr * Math.max(0.85, Math.min(1.25, Math.min(w / dpr, 900) / 640));
  ctx.save();
  ctx.setTransform(s, 0, 0, s, 0, 0);
  const left = 12 + safeLeft / (s / dpr);
  const top = 10 + safeTop / (s / dpr);

  // hearts
  for (let i = 0; i < world.maxHearts; i++) {
    const x = left + 12 + i * 24;
    heartPath(ctx, x, top + 14, 10);
    ctx.fillStyle = i < world.hearts ? "#e84a86" : "rgba(255,255,255,0.75)";
    ctx.fill();
    ctx.strokeStyle = "#3b2430";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // flowers collected this run
  const fy = top + 38;
  pill(ctx, left, fy, 78, 26);
  sprites.drawItem(ctx, "rose", left + 14, fy + 13, 18);
  ctx.fillStyle = "#3b2430";
  ctx.font = "900 14px 'Nunito Variable', ui-rounded, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(String(world.flowers), left + 28, fy + 14);

  // keepsake and secret slots
  const kx = left + 86;
  pill(ctx, kx, fy, 60, 26);
  ctx.globalAlpha = world.keepsake ? 1 : 0.28;
  sprites.drawItem(ctx, world.def.keepsake.id, kx + 15, fy + 13, 20);
  ctx.globalAlpha = world.secret ? 1 : 0.28;
  sprites.drawItem(ctx, world.def.secret.id, kx + 44, fy + 13, 18);
  ctx.globalAlpha = 1;

  // active boosts with a draining ring
  let bx = left;
  const by = fy + 34;
  const max: Record<BoostId, number> = { chai: 8, yochi: 8, flan: 8, kfc: 8, smiski: 14, shield: 25 };
  for (const k of Object.keys(world.boosts) as BoostId[]) {
    const t = world.boosts[k];
    if (t <= 0) continue;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(bx + 15, by + 15, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e84a86";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx + 15, by + 15, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, t / (max[k] * 1.5 > t ? max[k] : t)));
    ctx.stroke();
    sprites.drawItem(ctx, BOOST_ITEM[k], bx + 15, by + 15, 18);
    bx += 36;
  }
  ctx.restore();
}

function pill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  rrect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(59,36,48,0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();
}
