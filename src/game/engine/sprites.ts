import { drawPerson, type Look, type PoseKind } from "../art/people";
import { drawItem, type ItemId } from "../art/items";

// Pre-rendered bitmaps of people and items at the current screen scale, so each frame is just
// a handful of drawImage calls instead of hundreds of paths.

export const FRAMES: Partial<Record<PoseKind, number>> = { run: 8, idle: 4, wave: 4, hi: 4, talk: 4 };

const BOX = { left: 30, right: 30, top: 92, bottom: 8 };

export class Sprites {
  private people = new Map<string, HTMLCanvasElement>();
  private items = new Map<string, HTMLCanvasElement>();
  private px = 1;

  /** px = device pixels per world unit. Clears the caches when it changes. */
  setScale(px: number) {
    const q = Math.round(px * 4) / 4;
    if (q === this.px) return;
    this.px = q;
    this.people.clear();
    this.items.clear();
  }

  private canvas(w: number, h: number) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  person(look: Look, kind: PoseKind, frame: number, blink = false, happy = false) {
    const n = FRAMES[kind] ?? 1;
    const f = ((frame % n) + n) % n;
    const key = `${look.id}|${kind}|${f}|${blink ? 1 : 0}|${happy ? 1 : 0}`;
    let c = this.people.get(key);
    if (!c) {
      const s = this.px;
      c = this.canvas((BOX.left + BOX.right) * s, (BOX.top + BOX.bottom) * s);
      const ctx = c.getContext("2d")!;
      ctx.scale(s, s);
      ctx.translate(BOX.left, BOX.top);
      drawPerson(ctx, look, { kind, t: f / n, blink, happy }, look.id.length * 7 + 3);
      this.people.set(key, c);
    }
    return c;
  }

  /** Draw a person with feet at (x, y) in world units. */
  drawPerson(ctx: CanvasRenderingContext2D, look: Look, kind: PoseKind, frame: number, x: number, y: number, facing: 1 | -1, opts: { blink?: boolean; happy?: boolean; alpha?: number; scale?: number } = {}) {
    const c = this.person(look, kind, frame, opts.blink, opts.happy);
    const s = opts.scale ?? 1;
    ctx.save();
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    ctx.translate(x, y);
    ctx.scale(facing * s, s);
    ctx.drawImage(c, -BOX.left, -BOX.top, BOX.left + BOX.right, BOX.top + BOX.bottom);
    ctx.restore();
  }

  item(id: ItemId, size: number) {
    const key = `${id}|${size}`;
    let c = this.items.get(key);
    if (!c) {
      const s = this.px;
      const pad = size * 0.2;
      c = this.canvas((size + pad * 2) * s, (size + pad * 2) * s);
      const ctx = c.getContext("2d")!;
      ctx.scale(s, s);
      drawItem(ctx, id, size / 2 + pad, size / 2 + pad, size, size >= 60);
      this.items.set(key, c);
    }
    return c;
  }

  /** Draw an item centred at (x, y) in world units. */
  drawItem(ctx: CanvasRenderingContext2D, id: ItemId, x: number, y: number, size: number) {
    const c = this.item(id, size);
    const pad = size * 0.2;
    ctx.drawImage(c, x - size / 2 - pad, y - size / 2 - pad, size + pad * 2, size + pad * 2);
  }
}
