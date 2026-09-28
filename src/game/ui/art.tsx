import { useEffect, useRef } from "react";
import { drawItem, type ItemId } from "../art/items";
import { drawPerson, type Look, type PoseKind } from "../art/people";
import { heartPath } from "../art/draw";

// Small canvases that show game art inside the React menus.

function useCanvas(size: { w: number; h: number }, paint: (ctx: CanvasRenderingContext2D) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = Math.round(size.w * dpr);
    c.height = Math.round(size.h * dpr);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    paint(ctx);
  }, deps);
  return ref;
}

export function ItemArt({ id, size, className = "", locked = false }: { id: ItemId; size: number; className?: string; locked?: boolean }) {
  const ref = useCanvas(
    { w: size, h: size },
    (ctx) => {
      if (locked) ctx.filter = "grayscale(1) brightness(1.4) opacity(0.35)";
      drawItem(ctx, id, size / 2, size / 2, size * 0.82, size >= 60);
    },
    [id, size, locked],
  );
  return <canvas ref={ref} aria-hidden="true" className={className} style={{ width: size, height: size }} />;
}

export function PersonArt({ look, height, pose = "idle", flip = false, className = "", happy = false }: { look: Look; height: number; pose?: PoseKind; flip?: boolean; className?: string; happy?: boolean }) {
  const w = height * 0.62;
  const ref = useCanvas(
    { w, h: height },
    (ctx) => {
      const s = height / 86;
      ctx.translate(w / 2, height - 4 * s);
      ctx.scale(flip ? -s : s, s);
      drawPerson(ctx, look, { kind: pose, t: 0, happy }, look.id.length * 7 + 3);
    },
    [look.id, height, pose, flip, happy],
  );
  return <canvas ref={ref} aria-hidden="true" className={className} style={{ width: w, height }} />;
}

/** Round head-and-shoulders portrait for chat bubbles. */
export function Avatar({ look, size = 36, className = "" }: { look: Look; size?: number; className?: string }) {
  const ref = useCanvas(
    { w: size, h: size },
    (ctx) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd6e4";
      ctx.fill();
      ctx.clip();
      const s = size / 34;
      const headY = look.build === "girl" ? -45 : look.build === "tall" ? -57 : -51.5;
      ctx.translate(size / 2 - s * 1.5, size / 2 - headY * s + 4 * s);
      ctx.scale(s, s);
      drawPerson(ctx, look, { kind: "idle", t: 0, happy: true }, 3);
      ctx.restore();
    },
    [look.id, size],
  );
  return <canvas ref={ref} aria-hidden="true" className={`shrink-0 rounded-full ${className}`} style={{ width: size, height: size }} />;
}

export function Hearts({ n, size = 14 }: { n: number; size?: number }) {
  const ref = useCanvas(
    { w: n * (size + 3), h: size + 2 },
    (ctx) => {
      for (let i = 0; i < n; i++) {
        heartPath(ctx, size / 2 + i * (size + 3), size * 0.62, size * 0.5);
        ctx.fillStyle = "#e84a86";
        ctx.fill();
      }
    },
    [n, size],
  );
  return <canvas ref={ref} aria-hidden="true" style={{ width: n * (size + 3), height: size + 2 }} />;
}
