import { drawBackdrop, drawFar, drawGroundTile, drawLedgeTile, drawProp, FAR_H, FAR_W, INDOOR_BG, SKY } from "../art/scenery";
import { CHICHI, AAYAM, NEON, randomLook, type Look, type PoseKind } from "../art/people";
import { heartPath, rrect, text } from "../art/draw";
import type { ItemId } from "../art/items";
import { TILE, type Collectible, type LevelDef, type Story, type Theme } from "../types";
import type { Audio, Sfx } from "./audio";
import type { Input } from "./input";
import type { Sprites } from "./sprites";

// The running level: physics, enemies, pickups, camera and drawing.

const GRAV = 1900;
const MAX_FALL = 780;
const RUN = 172;
const ACC = 1500;
const AIR_ACC = 1150;
const FRICTION = 1900;
const JUMP_V = 640;
const DJUMP_V = 540;
const COYOTE = 0.1;
const BUFFER = 0.13;
const PW = 16;
const PH = 46;
const CHUNK = 512;

export type BoostId = "chai" | "yochi" | "flan" | "kfc" | "smiski" | "shield";
export const BOOST_ITEM: Record<BoostId, ItemId> = { chai: "chai", yochi: "yochi", flan: "flan", kfc: "kfc", smiski: "smiski", shield: "bouquet" };
const BOOST_CHARS: Record<string, BoostId | "watermelon"> = { c: "chai", y: "yochi", f: "flan", k: "kfc", s: "smiski", p: "shield", w: "watermelon" };
export const BOOST_TEXT: Record<BoostId | "watermelon", string> = {
  chai: "ICED CHAI, zoom zoom",
  yochi: "YO-CHI brain freeze, everyone froze",
  flan: "FLAN, super bouncy",
  kfc: "KFC power meal, cant touch her",
  smiski: "SMISKI glow, secret paths",
  shield: "Pipe cleaner flowers, one free hit",
  watermelon: "Watermelon, +1 heart",
};

export interface Upgrades {
  hearts: number; // extra hearts bought (0-2)
  doubleJump: boolean;
  magnet: boolean;
  longBoosts: boolean;
  calls: number; // Jagath calls per level
}

export interface LevelResult {
  time: number;
  flowers: number; // value collected (rose 1, lily 5)
  flowersTotal: number;
  keepsake: boolean;
  secret: boolean;
  hits: number;
}

export interface WorldEvents {
  story(story: Story, done: () => void): void;
  pickup(kind: "keepsake" | "secret", item: Collectible, done: () => void): void;
  arrive(result: LevelResult): void;
  toast(text: string): void;
  sfx(s: Sfx): void;
  vibrate(ms: number): void;
}

interface Ent {
  kind: "rose" | "lily" | "ball" | "boost" | "keepsake" | "secret" | "flag" | "walker" | "person" | "crowd" | "gate" | "neon" | "hide" | "jag" | "npc" | "helper";
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  dir: 1 | -1;
  t: number;
  alive: boolean;
  alpha: number;
  boost?: BoostId | "watermelon";
  look?: Look;
  state?: string;
  timer?: number;
  x0?: number;
  x1?: number;
  bubble?: { text: string; t: number };
  seed?: number;
  story?: Story;
  pose?: PoseKind;
  stay?: boolean;
  variant?: number;
  tapped?: boolean;
  home?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: "spark" | "heart" | "dust" | "poof" | "confetti" | "firework";
  color: string;
  size: number;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

const HAPPY_BUBBLES = ["Ugh", "Nooo", ":(", "☹️"];

export class World {
  readonly def: LevelDef;
  readonly cols: number;
  readonly rows: number;
  readonly W: number;
  readonly H: number;
  private tiles: Uint8Array;
  private ents: Ent[] = [];
  private parts: Particle[] = [];
  private floats: FloatText[] = [];
  private chunks = new Map<number, HTMLCanvasElement>();
  private farCache = new Map<Theme, HTMLCanvasElement>();
  private chunkPx = 0;
  private floors: number[] = [];
  private shopSpans: [number, number][] = [];

  // player
  px = 0;
  py = 0;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  onGround = false;
  private coyote = 0;
  private buffer = 0;
  private jumps = 0;
  private hurtT = 0;
  private knockT = 0;
  hidden = false;
  private crouch = false;
  private animT = 0;
  private blinkT = 2;
  private landT = 0;
  private wasGround = false;
  private dropT = 0;
  hearts: number;
  maxHearts: number;
  boosts: Record<BoostId, number> = { chai: 0, yochi: 0, flan: 0, kfc: 0, smiski: 0, shield: 0 };
  callsLeft: number;
  private checkpoint = { x: 0, y: 0 };
  private safe = { x: 0, y: 0 };
  private safeT = 0;
  private arrowT = 0;
  private bubble: { text: string; t: number } | null = null;
  private caughtT = 0;
  private respawnT = 0;
  private flashT = 0;

  // level stats
  time = 0;
  flowers = 0;
  flowersTotal = 0;
  keepsake = false;
  secret = false;
  hits = 0;

  paused = false;
  busy = false; // a chat or pop-up is showing
  arrived = false;
  private arriveT = 0;
  cinematic: { kind: "kiss"; t: number } | null = null;

  // camera
  camX = 0;
  camY = 0;
  private camInit = false;
  viewW = 640;
  viewH = 360;
  private theme: Theme;
  private prevTheme: Theme;
  private themeFade = 1;
  private readonly look: Look;
  private readonly jagLook: Look;
  private readonly upgrades: Upgrades;
  private readonly sprites: Sprites;
  private readonly input: Input;
  private readonly ev: WorldEvents;
  private readonly boostLen: number;

  constructor(def: LevelDef, look: Look, jagLook: Look, upgrades: Upgrades, sprites: Sprites, audio: Audio, input: Input, ev: WorldEvents) {
    this.def = def;
    this.look = look;
    this.jagLook = jagLook;
    this.upgrades = upgrades;
    this.sprites = sprites;
    void audio;
    this.input = input;
    this.ev = ev;
    this.boostLen = upgrades.longBoosts ? 1.5 : 1;
    this.maxHearts = 3 + upgrades.hearts;
    this.hearts = this.maxHearts;
    this.callsLeft = upgrades.calls;
    this.rows = def.rows.length;
    this.cols = Math.max(...def.rows.map((r) => r.length));
    this.W = this.cols * TILE;
    this.H = this.rows * TILE;
    this.tiles = new Uint8Array(this.cols * this.rows);
    this.parse();
    this.theme = this.themeAt(this.px / TILE);
    this.prevTheme = this.theme;
  }

  // -------------------------------------------------------------------------
  // Level parsing
  // -------------------------------------------------------------------------

  private parse() {
    const { rows, anchors } = this.def;
    let seed = 1;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const ch = rows[r][c] ?? ".";
        const x = c * TILE + TILE / 2;
        const y = (r + 1) * TILE; // bottom of the cell
        const i = r * this.cols + c;
        switch (ch) {
          case "#":
            this.tiles[i] = 1;
            break;
          case "=":
            this.tiles[i] = 2;
            break;
          case "H":
            this.tiles[i] = 3;
            break;
          case "N":
            this.px = x;
            this.py = y;
            break;
          case "r":
            this.add({ kind: "rose", x, y: y - 16, w: 20, h: 20 });
            this.flowersTotal += 1;
            break;
          case "l":
            this.add({ kind: "lily", x, y: y - 16, w: 22, h: 22 });
            this.flowersTotal += 5;
            break;
          case "b":
            this.add({ kind: "ball", x, y: y - 16, w: 22, h: 22 });
            this.flowersTotal += 5;
            break;
          case "K":
            this.add({ kind: "keepsake", x, y: y - 24, w: 34, h: 34 });
            break;
          case "G":
            this.add({ kind: "secret", x, y: y - 18, w: 26, h: 26 });
            break;
          case "F":
            this.add({ kind: "flag", x, y, w: 20, h: 60, state: "down" });
            break;
          case "J":
            this.add({ kind: "jag", x, y, w: 24, h: 60, state: "end", look: this.jagLook, dir: -1 });
            break;
          case "t":
            this.add({ kind: "walker", x, y, w: 28, h: 30, vx: 28, dir: -1 });
            break;
          case "P":
            this.add({ kind: "person", x, y, w: 18, h: 56, vx: 26, dir: -1, look: randomLook(seed++, "person"), seed: seed * 3 });
            break;
          case "C":
            this.add({ kind: "crowd", x, y, w: 64, h: 60, vx: 38, dir: -1, x0: x - 5 * TILE, x1: x + 2 * TILE, seed: seed++ });
            break;
          case "o":
            this.add({ kind: "gate", x, y, w: 14, h: 54, t: c * 0.37 });
            break;
          case "B":
            this.add({ kind: "neon", x, y, w: 20, h: 70, vx: 44, dir: 1, look: NEON, state: "walk", x0: x - TILE, x1: x + 10 * TILE, timer: 3.5, home: x });
            break;
          case "h":
            this.add({ kind: "hide", x, y, w: 30, h: 64, variant: seed++ % 3 });
            break;
          default:
            if (BOOST_CHARS[ch]) this.add({ kind: "boost", x, y: y - 18, w: 26, h: 26, boost: BOOST_CHARS[ch] });
            else if (anchors[ch]?.story) {
              const st = anchors[ch].story!;
              if (st.jag) this.add({ kind: "npc", x: x + st.jag.dx * TILE, y, w: 20, h: 60, look: this.jagLook, pose: st.jag.pose ?? "idle", dir: st.jag.facing ?? -1, story: st, stay: st.jag.stay, state: "wait" });
              for (const n of st.npcs ?? []) this.add({ kind: "npc", x: x + n.dx * TILE, y, w: 20, h: 60, look: n.who === "chichi" ? CHICHI : AAYAM, pose: "idle", dir: n.facing ?? -1, stay: true, state: "extra" });
              // the trigger itself
              this.add({ kind: "npc", x, y, w: 1, h: 1, story: st, state: "trigger", alpha: 0 });
            }
        }
      }
    }
    this.checkpoint = { x: this.px, y: this.py };
    this.safe = { ...this.checkpoint };
    // named shops replace the generic shopfronts behind them
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        const p = anchors[rows[r][c]]?.prop;
        if (p && (p.kind === "shop" || p.kind === "booth" || p.kind === "hoop" || p.kind === "claw")) {
          const half = ((p.w ?? 4) * TILE) / 2 + 8;
          this.shopSpans.push([c * TILE + TILE / 2 - half, c * TILE + TILE / 2 + half]);
        }
      }
    // ground height per column for placing shopfronts
    for (let c = 0; c < this.cols; c++) {
      let f = this.H;
      for (let r = this.rows - 1; r > 0; r--) {
        if (this.tiles[r * this.cols + c] === 1 && this.tiles[(r - 1) * this.cols + c] !== 1) {
          f = r * TILE;
          break;
        }
      }
      this.floors.push(f);
    }
  }

  private add(e: Partial<Ent> & Pick<Ent, "kind" | "x" | "y" | "w" | "h">) {
    this.ents.push({ vx: 0, vy: 0, dir: 1, t: Math.random() * 6, alive: true, alpha: 1, ...e });
  }

  /** Test helper: drop Nikita onto the lowest ground in a column. */
  debugTeleport(col: number) {
    for (let r = this.rows - 2; r >= 0; r--) {
      if ((this.tile(col, r + 1) === 1 || this.tile(col, r + 1) === 2) && this.tile(col, r) === 0 && this.tile(col, r - 1) === 0) {
        this.px = col * TILE + TILE / 2;
        this.py = (r + 1) * TILE;
        this.vx = 0;
        this.vy = 0;
        this.camInit = false;
        return;
      }
    }
  }

  themeAt(col: number): Theme {
    let t = this.def.zones[0].theme;
    for (const z of this.def.zones) if (col >= z.at) t = z.theme;
    return t;
  }

  private zoneFloor(from: number, to: number) {
    const vals = this.floors.slice(Math.max(0, from), Math.min(this.cols, to)).filter((f) => f < this.H).sort((a, b) => a - b);
    return vals.length ? vals[Math.floor(vals.length / 2)] : this.H - TILE;
  }

  // -------------------------------------------------------------------------
  // Tiles
  // -------------------------------------------------------------------------

  private tile(c: number, r: number) {
    if (c < 0 || c >= this.cols) return 1;
    if (r < 0 || r >= this.rows) return 0;
    return this.tiles[r * this.cols + c];
  }

  private glowing() {
    return this.boosts.smiski > 0;
  }

  private solid(c: number, r: number) {
    const t = this.tile(c, r);
    return t === 1 || (t === 3 && this.glowing());
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  update(dt: number) {
    dt = Math.min(dt, 1 / 30);
    this.animT += dt;
    this.updateParticles(dt);
    this.updateCamera(dt);
    if (this.cinematic) {
      this.updateCinematic(dt);
      return;
    }
    if (this.paused || this.busy) return;
    this.time += dt;
    for (const k of Object.keys(this.boosts) as BoostId[]) if (this.boosts[k] > 0) this.boosts[k] = Math.max(0, this.boosts[k] - dt);
    if (this.bubble) {
      this.bubble.t -= dt;
      if (this.bubble.t <= 0) this.bubble = null;
    }
    this.arrowT = Math.max(0, this.arrowT - dt);
    this.flashT = Math.max(0, this.flashT - dt);

    if (this.respawnT > 0) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) this.respawn(this.caughtT > 0);
      this.updateEnts(dt);
      return;
    }
    if (this.arrived) {
      this.updateArrive(dt);
      this.updateEnts(dt);
      return;
    }
    this.updatePlayer(dt);
    this.updateEnts(dt);
  }

  private updatePlayer(dt: number) {
    const inp = this.input;
    const speed = RUN * (this.boosts.chai > 0 ? 1.45 : 1);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.knockT = Math.max(0, this.knockT - dt);
    this.dropT = Math.max(0, this.dropT - dt);

    // hiding: hold down behind a hide spot
    const spot = this.ents.find((e) => e.kind === "hide" && Math.abs(e.x - this.px) < 22);
    this.crouch = inp.down("down") && this.onGround;
    this.hidden = this.crouch && !!spot;

    let move = 0;
    if (this.knockT <= 0 && !this.crouch) {
      if (inp.down("left")) move -= 1;
      if (inp.down("right")) move += 1;
    }
    if (move !== 0) this.facing = move > 0 ? 1 : -1;
    const acc = this.onGround ? ACC : AIR_ACC;
    if (move !== 0) {
      this.vx += move * acc * dt;
      if (Math.abs(this.vx) > speed) this.vx = Math.sign(this.vx) * Math.max(speed, Math.abs(this.vx) - FRICTION * dt);
    } else if (this.knockT <= 0) {
      const f = (this.onGround ? FRICTION : FRICTION * 0.35) * dt;
      this.vx = Math.abs(this.vx) <= f ? 0 : this.vx - Math.sign(this.vx) * f;
    }

    // jumping
    if (inp.pressed("jump")) this.buffer = BUFFER;
    else this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = this.onGround ? COYOTE : Math.max(0, this.coyote - dt);
    const jumpMul = this.boosts.flan > 0 ? 1.28 : 1;
    if (this.buffer > 0) {
      if (this.crouch && this.onGround && this.standingOnLedge()) {
        // drop through a one-way platform
        this.dropT = 0.25;
        this.onGround = false;
        this.py += 2;
        this.buffer = 0;
      } else if (this.coyote > 0) {
        this.vy = -JUMP_V * jumpMul;
        this.coyote = 0;
        this.buffer = 0;
        this.onGround = false;
        this.jumps = 1;
        this.sfx("jump");
        this.dust(3);
      } else if (this.upgrades.doubleJump && this.jumps === 1) {
        this.vy = -DJUMP_V * jumpMul;
        this.jumps = 2;
        this.buffer = 0;
        this.sfx("djump");
        for (let i = 0; i < 6; i++) this.spark(this.px, this.py - 6, "#ffd3e2", "heart");
      }
    }
    if (!inp.down("jump") && this.vy < -200) this.vy += GRAV * 1.6 * dt; // short hop when released early

    this.vy = Math.min(MAX_FALL, this.vy + GRAV * dt);
    this.moveX(this.vx * dt);
    this.moveY(this.vy * dt);

    if (this.onGround && !this.wasGround) {
      this.landT = 0.12;
      if (this.vyBefore > 400) {
        this.dust(4);
        this.sfx("land");
      }
    }
    this.wasGround = this.onGround;
    this.landT = Math.max(0, this.landT - dt);

    // remember a safe spot to come back to after a fall
    this.safeT -= dt;
    if (this.onGround && this.safeT <= 0 && this.supportedBothSides()) {
      this.safe = { x: this.px, y: this.py };
      this.safeT = 0.4;
    }

    // fell off the world
    if (this.py > this.H + 80) {
      this.damage(true);
    }

    if (inp.pressed("call")) this.callJagath();

    // blink
    this.blinkT -= dt;
    if (this.blinkT < -0.12) this.blinkT = 2 + Math.random() * 3;
  }

  private vyBefore = 0;

  private moveX(dx: number) {
    let nx = this.px + dx;
    const top = this.py - PH;
    const r0 = Math.floor((top + 1) / TILE);
    const r1 = Math.floor((this.py - 1) / TILE);
    if (dx > 0) {
      const c = Math.floor((nx + PW / 2) / TILE);
      for (let r = r0; r <= r1; r++)
        if (this.solid(c, r)) {
          nx = c * TILE - PW / 2 - 0.01;
          this.vx = 0;
          break;
        }
    } else if (dx < 0) {
      const c = Math.floor((nx - PW / 2) / TILE);
      for (let r = r0; r <= r1; r++)
        if (this.solid(c, r)) {
          nx = (c + 1) * TILE + PW / 2 + 0.01;
          this.vx = 0;
          break;
        }
    }
    this.px = Math.max(PW / 2, Math.min(this.W - PW / 2, nx));
  }

  private moveY(dy: number) {
    this.vyBefore = this.vy;
    const c0 = Math.floor((this.px - PW / 2 + 1) / TILE);
    const c1 = Math.floor((this.px + PW / 2 - 1) / TILE);
    let ny = this.py + dy;
    this.onGround = false;
    if (dy > 0) {
      const rOld = Math.floor((this.py - 0.01) / TILE);
      const r = Math.floor(ny / TILE);
      for (let rr = rOld + 1; rr <= r; rr++) {
        let hit = false;
        for (let c = c0; c <= c1; c++) {
          const t = this.tile(c, rr);
          if (this.solid(c, rr) || (t === 2 && this.dropT <= 0 && this.py <= rr * TILE + 0.5)) hit = true;
        }
        if (hit) {
          ny = rr * TILE;
          this.vy = 0;
          this.onGround = true;
          this.jumps = 0;
          break;
        }
      }
      // standing still exactly on a surface
      if (!this.onGround && dy >= 0) {
        const rr = Math.floor(ny / TILE);
        if (ny === rr * TILE) {
          for (let c = c0; c <= c1; c++) {
            const t = this.tile(c, rr);
            if (this.solid(c, rr) || (t === 2 && this.dropT <= 0)) {
              this.onGround = true;
              this.vy = 0;
              this.jumps = 0;
            }
          }
        }
      }
    } else if (dy < 0) {
      const r = Math.floor((ny - PH) / TILE);
      for (let c = c0; c <= c1; c++)
        if (this.solid(c, r)) {
          ny = (r + 1) * TILE + PH + 0.01;
          this.vy = 0;
          break;
        }
    }
    this.py = ny;
  }

  private standingOnLedge() {
    const r = Math.floor(this.py / TILE);
    const c = Math.floor(this.px / TILE);
    return this.tile(c, r) === 2;
  }

  private supportedBothSides() {
    const r = Math.floor(this.py / TILE);
    const ok = (x: number) => {
      const c = Math.floor(x / TILE);
      return this.solid(c, r) || this.tile(c, r) === 2;
    };
    return ok(this.px - PW) && ok(this.px + PW);
  }

  private sfx(s: Sfx) {
    this.ev.sfx(s);
  }

  say(text: string, t = 1.6) {
    this.bubble = { text, t };
  }

  private damage(fell = false) {
    if (fell) {
      this.hearts -= 1;
      this.hits += 1;
      this.sfx("hurt");
      this.ev.vibrate(60);
      if (this.hearts <= 0) {
        this.respawnT = 0.01;
      } else {
        this.px = this.safe.x;
        this.py = this.safe.y;
        this.vx = 0;
        this.vy = 0;
        this.hurtT = 1.2;
        this.say(HAPPY_BUBBLES[Math.floor(Math.random() * HAPPY_BUBBLES.length)]);
      }
      return;
    }
    if (this.hurtT > 0 || this.boosts.kfc > 0) return;
    if (this.boosts.shield > 0) {
      this.boosts.shield = 0;
      this.hurtT = 1;
      this.sfx("stomp");
      for (let i = 0; i < 10; i++) this.spark(this.px, this.py - 30, ["#ffffff", "#2fb3d6", "#e2323f", "#6a3bd1"][i % 4], "spark");
      this.float(this.px, this.py - 70, "flowers saved u", "#c92f6d");
      return;
    }
    this.hearts -= 1;
    this.hits += 1;
    this.hurtT = 1.3;
    this.knockT = 0.25;
    this.vx = -this.facing * 220;
    this.vy = -280;
    this.sfx("hurt");
    this.ev.vibrate(60);
    this.say(HAPPY_BUBBLES[Math.floor(Math.random() * HAPPY_BUBBLES.length)]);
    if (this.hearts <= 0) this.respawnT = 0.5;
  }

  private respawn(caught: boolean) {
    const cp = this.checkpoint;
    this.px = cp.x;
    this.py = cp.y;
    this.vx = 0;
    this.vy = 0;
    this.caughtT = 0;
    this.hurtT = 1;
    if (!caught) {
      this.hearts = this.maxHearts;
      this.ev.toast("Oki back to the last flag, u got this");
    } else {
      this.ev.toast("Try again, hide when he turns");
    }
    // put Neon back on his route
    for (const e of this.ents) if (e.kind === "neon") Object.assign(e, { state: "walk", timer: 3.5, x: e.home, dir: 1, bubble: undefined });
    this.camInit = false;
  }

  private callJagath() {
    if (this.callsLeft <= 0 || this.ents.some((e) => e.kind === "helper" && e.alive)) {
      if (this.callsLeft <= 0) this.ev.toast("No more calls this level");
      return;
    }
    this.callsLeft -= 1;
    this.sfx("call");
    const x = this.px - this.facing * 44;
    this.add({ kind: "helper", x, y: this.py, w: 20, h: 60, look: this.jagLook, dir: this.facing, t: 0, state: "in" });
    for (let i = 0; i < 12; i++) this.spark(x, this.py - 30, "#ff9ec0", "heart");
    if (this.hearts < this.maxHearts) this.hearts += 1;
    this.arrowT = 12;
    const lines = ["Hehe i got u bean", "Its over there niki", "U got this baby", "Mommy needs help? hehe", "Js follow the arrow oke"];
    const h = this.ents[this.ents.length - 1];
    h.bubble = { text: lines[Math.floor(Math.random() * lines.length)], t: 2.2 };
  }

  private updateArrive(dt: number) {
    this.arriveT += dt;
    const jag = this.ents.find((e) => e.kind === "jag");
    if (!jag) return;
    const target = jag.x - 40;
    if (Math.abs(this.px - target) > 3 && this.arriveT < 3) {
      const dir = Math.sign(target - this.px);
      this.facing = dir > 0 ? 1 : -1;
      this.vx = dir * RUN * 0.7;
      this.moveX(this.vx * dt);
      this.vy = Math.min(MAX_FALL, this.vy + GRAV * dt);
      this.moveY(this.vy * dt);
    } else {
      this.vx = 0;
      this.facing = 1;
      if (this.state !== "done") {
        this.state = "done";
        this.ev.arrive(this.result());
      }
    }
  }
  private state = "";

  result(): LevelResult {
    return { time: this.time, flowers: this.flowers, flowersTotal: this.flowersTotal, keepsake: this.keepsake, secret: this.secret, hits: this.hits };
  }

  private updateEnts(dt: number) {
    const frozen = this.boosts.yochi > 0;
    const p = { l: this.px - PW / 2, r: this.px + PW / 2, t: this.py - PH, b: this.py };
    const overlap = (e: Ent) => p.r > e.x - e.w / 2 && p.l < e.x + e.w / 2 && p.b > e.y - e.h && p.t < e.y;
    const magnet = this.upgrades.magnet;
    for (const e of this.ents) {
      if (!e.alive) continue;
      e.t += dt;
      if (e.bubble) {
        e.bubble.t -= dt;
        if (e.bubble.t <= 0) e.bubble = undefined;
      }
      switch (e.kind) {
        case "rose":
        case "lily":
        case "ball":
        case "boost":
        case "keepsake":
        case "secret": {
          if (magnet && (e.kind === "rose" || e.kind === "lily") && Math.hypot(e.x - this.px, e.y - (this.py - 24)) < 90) {
            e.x += (this.px - e.x) * Math.min(1, dt * 8);
            e.y += (this.py - 24 - e.y) * Math.min(1, dt * 8);
          }
          if (this.respawnT <= 0 && overlap(e)) this.collect(e);
          break;
        }
        case "flag":
          if (e.state === "down" && this.px > e.x - 8) {
            e.state = "up";
            e.t = 0;
            this.checkpoint = { x: e.x, y: e.y };
            this.sfx("checkpoint");
            for (let i = 0; i < 14; i++) this.spark(e.x, e.y - 50, ["#ff9ec0", "#ffd23f", "#ffffff"][i % 3], "spark");
            this.float(e.x, e.y - 80, "checkpoint", "#c92f6d");
          }
          break;
        case "walker":
        case "person": {
          if (e.state === "gone") {
            e.alpha -= dt * 1.5;
            e.x += e.dir * 60 * dt;
            if (e.alpha <= 0) e.alive = false;
            break;
          }
          if (!frozen) {
            const speed = e.kind === "person" ? (Math.sin(e.t * 0.7 + (e.seed ?? 0)) > 0.75 ? 0 : e.vx) : e.vx;
            const nx = e.x + e.dir * speed * dt;
            const ahead = Math.floor((nx + (e.dir * e.w) / 2) / TILE);
            const row = Math.floor((e.y - 4) / TILE);
            const below = Math.floor((e.y + 4) / TILE);
            if (this.solid(ahead, row) || (!this.solid(ahead, below) && this.tile(ahead, below) !== 2)) e.dir = (e.dir * -1) as 1 | -1;
            else e.x = nx;
            if (e.kind === "person" && !e.bubble && Math.random() < dt * 0.15) e.bubble = { text: ["oh hi", "is this seat free", "...", "wait who r u"][Math.floor(Math.random() * 4)], t: 1.6 };
          }
          if (this.respawnT <= 0 && overlap(e)) this.hitEnemy(e);
          break;
        }
        case "crowd": {
          if (!frozen) {
            e.x += e.dir * e.vx * dt;
            if (e.x < e.x0!) e.dir = 1;
            if (e.x > e.x1!) e.dir = -1;
          }
          if (this.respawnT <= 0 && overlap(e)) {
            if (this.vy > 0 && this.py - 14 < e.y - e.h) {
              this.vy = -JUMP_V * 0.72;
              this.sfx("stomp");
              e.bubble = { text: "oi", t: 0.8 };
            } else if (this.boosts.kfc <= 0) {
              const d = this.px < e.x ? -1 : 1;
              this.vx = d * 240;
              this.vy = Math.min(this.vy, -160);
              this.knockT = 0.2;
              if (!e.bubble) e.bubble = { text: ["excuse me", "sorry", "move pls", "peak hour sorry"][Math.floor(Math.random() * 4)], t: 1.2 };
            }
          }
          break;
        }
        case "gate": {
          const cycle = 3.2;
          const phase = (e.t % cycle) / cycle;
          const open = frozen ? true : phase < 0.5;
          e.state = open ? "open" : "closed";
          if (this.respawnT <= 0 && overlap(e)) {
            if (!open) {
              if (this.hurtT <= 0 && this.boosts.kfc <= 0) {
                this.sfx("reject");
                this.float(e.x, e.y - 70, "beep beep", "#e0393b");
              }
              this.damage();
            } else if (!e.tapped) {
              e.tapped = true;
              this.sfx("tap");
              this.float(e.x, e.y - 70, "tap on", "#1f8f4d");
            }
          } else if (Math.abs(this.px - e.x) > 40) e.tapped = false;
          break;
        }
        case "neon":
          this.updateNeon(e, dt, frozen);
          break;
        case "npc": {
          if (e.state === "trigger" && e.story && !this.busy && this.px >= e.x - TILE && Math.abs(this.py - e.y) < 4 * TILE) {
            e.alive = false;
            this.startStory(e.story);
          }
          if (e.state === "leave") {
            e.alpha -= dt * 1.6;
            if (e.alpha <= 0) e.alive = false;
          }
          if (e.state === "wait" || e.state === "extra") e.dir = this.px < e.x ? -1 : 1;
          break;
        }
        case "jag": {
          e.dir = this.px < e.x ? -1 : 1;
          if (!this.arrived && Math.abs(this.px - e.x) < 70 && Math.abs(this.py - e.y) < 60) {
            this.arrived = true;
            this.arriveT = 0;
            this.vx = 0;
          }
          break;
        }
        case "helper": {
          if (e.t > 3) {
            e.alpha -= dt * 2;
            if (e.alpha <= 0) {
              e.alive = false;
              this.say("Good boy ☺️", 1.8);
            }
          }
          e.dir = this.px < e.x ? -1 : 1;
          break;
        }
      }
    }
    // clean up occasionally
    if (this.ents.length > 400 && Math.random() < 0.05) this.ents = this.ents.filter((e) => e.alive);
  }

  private updateNeon(e: Ent, dt: number, frozen: boolean) {
    if (frozen) return;
    e.timer = (e.timer ?? 0) - dt;
    if (e.state === "walk") {
      e.x += e.dir * e.vx * dt;
      const atEnd = (e.dir < 0 && e.x <= e.x0!) || (e.dir > 0 && e.x >= e.x1!);
      if (atEnd) {
        e.x = Math.max(e.x0!, Math.min(e.x1!, e.x));
        e.state = "turn";
        e.timer = 0.8;
        e.bubble = { text: "hm?", t: 0.8 };
      } else if (e.timer <= 0) {
        // about to look behind him: a little warning first
        e.state = "warn";
        e.timer = 0.7;
        e.bubble = { text: "hm?", t: 0.7 };
      }
    } else if (e.state === "warn") {
      if (e.timer <= 0) {
        e.state = "look";
        e.dir = (e.dir * -1) as 1 | -1;
        e.timer = 1.6;
      }
    } else if (e.state === "turn") {
      if (e.timer <= 0) {
        e.dir = (e.dir * -1) as 1 | -1;
        e.state = "walk";
        e.timer = 2.4 + Math.random() * 2;
      }
    } else if (e.state === "look") {
      if (e.timer <= 0) {
        e.state = "walk";
        e.dir = (e.dir * -1) as 1 | -1;
        e.timer = 2.4 + Math.random() * 2;
      }
    } else if (e.state === "caught") {
      return;
    }
    // what he can see: straight ahead, about 7 tiles
    const dx = this.px - e.x;
    const sees = Math.sign(dx) === e.dir && Math.abs(dx) < 7 * TILE && Math.abs(this.py - e.y) < 2 * TILE;
    if (sees && !this.hidden && this.respawnT <= 0 && e.state !== "warn" && e.state !== "turn") {
      e.state = "caught";
      e.bubble = { text: "NIKITA??", t: 1.4 };
      this.caughtT = 1;
      this.respawnT = 1.4;
      this.flashT = 0.3;
      this.sfx("caught");
      this.ev.vibrate(120);
      this.say("RUN 😭", 1.2);
    }
  }

  private hitEnemy(e: Ent) {
    const stomp = this.vy > 0 && this.py - 16 < e.y - e.h;
    if (stomp || this.boosts.kfc > 0) {
      e.state = "gone";
      e.dir = this.px < e.x ? 1 : -1;
      if (stomp) this.vy = -JUMP_V * 0.65;
      this.sfx("stomp");
      for (let i = 0; i < 8; i++) this.spark(e.x, e.y - e.h / 2, "#ffffff", "poof");
      if (e.kind === "person") e.bubble = { text: "oh sorry", t: 1 };
      return;
    }
    if (e.kind === "person" && !e.bubble) e.bubble = { text: "awkward", t: 1 };
    this.damage();
  }

  private collect(e: Ent) {
    e.alive = false;
    switch (e.kind) {
      case "rose":
        this.flowers += 1;
        this.sfx("rose");
        this.spark(e.x, e.y, "#e2334f", "spark");
        break;
      case "lily":
      case "ball":
        this.flowers += 5;
        this.sfx("lily");
        for (let i = 0; i < 5; i++) this.spark(e.x, e.y, e.kind === "ball" ? "#ff7a2f" : "#f7a8c6", "spark");
        if (e.kind === "ball") this.float(e.x, e.y - 20, "SWISH +5", "#ff7a2f");
        break;
      case "boost": {
        const b = e.boost!;
        this.sfx(b === "watermelon" ? "heal" : "boost");
        if (b === "watermelon") {
          if (this.hearts < this.maxHearts) this.hearts += 1;
          else this.flowers += 3;
        } else this.boosts[b] = (b === "smiski" ? 14 : b === "shield" ? 25 : 8) * this.boostLen;
        this.ev.toast(BOOST_TEXT[b]);
        for (let i = 0; i < 10; i++) this.spark(e.x, e.y, "#ffd23f", "spark");
        break;
      }
      case "keepsake":
        this.keepsake = true;
        this.sfx("keepsake");
        this.ev.vibrate(40);
        for (let i = 0; i < 24; i++) this.spark(e.x, e.y, ["#ff9ec0", "#ffd23f", "#ffffff", "#c92f6d"][i % 4], "confetti");
        this.busy = true;
        this.ev.pickup("keepsake", this.def.keepsake, () => (this.busy = false));
        break;
      case "secret":
        this.secret = true;
        this.sfx("secret");
        for (let i = 0; i < 18; i++) this.spark(e.x, e.y, "#ffd23f", "spark");
        this.busy = true;
        this.ev.pickup("secret", this.def.secret, () => (this.busy = false));
        break;
    }
  }

  private startStory(story: Story) {
    this.busy = true;
    this.vx = 0;
    this.ev.story(story, () => {
      this.busy = false;
      for (const e of this.ents) if (e.kind === "npc" && e.story === story && e.state === "wait" && !e.stay) e.state = "leave";
      if (story.tip) this.ev.toast(story.tip);
    });
  }

  // -------------------------------------------------------------------------
  // Ending
  // -------------------------------------------------------------------------

  startKiss() {
    this.cinematic = { kind: "kiss", t: 0 };
    this.busy = true;
  }

  private updateCinematic(dt: number) {
    const c = this.cinematic!;
    c.t += dt;
    const jag = this.ents.find((e) => e.kind === "jag");
    if (!jag) return;
    // walk together, lean in, then hearts and fireworks
    const target = jag.x - 27;
    if (this.px < target) {
      this.px = Math.min(target, this.px + 50 * dt);
      this.facing = 1;
    }
    if (c.t > 2 && c.t < 2.1) this.sfx("kiss");
    if (c.t > 2 && Math.random() < dt * 14) this.spark(jag.x - 11, jag.y - 60, ["#ff9ec0", "#e84a86", "#ffd3e2"][Math.floor(Math.random() * 3)], "heart");
    if (c.t > 3 && Math.random() < dt * 2.4) {
      const fx = this.camX + 60 + Math.random() * (this.viewW - 120);
      const fy = this.camY + 40 + Math.random() * this.viewH * 0.35;
      const col = ["#ff9ec0", "#ffd23f", "#35d2ff", "#ffffff", "#e84a86"][Math.floor(Math.random() * 5)];
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        this.parts.push({ x: fx, y: fy, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 1.2, max: 1.2, kind: "firework", color: col, size: 3 });
      }
      this.sfx("stomp");
    }
  }

  // -------------------------------------------------------------------------
  // Particles
  // -------------------------------------------------------------------------

  private spark(x: number, y: number, color: string, kind: Particle["kind"]) {
    const a = Math.random() * Math.PI * 2;
    const s = kind === "confetti" ? 180 + Math.random() * 160 : kind === "heart" ? 40 + Math.random() * 60 : 60 + Math.random() * 110;
    this.parts.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - (kind === "heart" ? 60 : 30),
      life: kind === "heart" ? 1.2 : 0.7,
      max: kind === "heart" ? 1.2 : 0.7,
      kind,
      color,
      size: kind === "confetti" ? 4 : kind === "heart" ? 6 : 3,
    });
  }

  private dust(n: number) {
    for (let i = 0; i < n; i++)
      this.parts.push({ x: this.px + (Math.random() - 0.5) * 14, y: this.py - 2, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 40, life: 0.4, max: 0.4, kind: "dust", color: "rgba(160,140,130,0.6)", size: 4 });
  }

  float(x: number, y: number, text: string, color: string) {
    this.floats.push({ x, y, text, life: 1.2, color });
  }

  private updateParticles(dt: number) {
    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === "confetti" || p.kind === "firework") p.vy += 260 * dt;
      if (p.kind === "heart") p.vy -= 20 * dt;
      p.vx *= 1 - dt * 2;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const f of this.floats) {
      f.life -= dt;
      f.y -= 30 * dt;
    }
    this.floats = this.floats.filter((f) => f.life > 0);
  }

  // -------------------------------------------------------------------------
  // Camera
  // -------------------------------------------------------------------------

  private updateCamera(dt: number) {
    const lead = this.facing * 50;
    let tx = this.px + lead - this.viewW / 2;
    let ty = this.py - this.viewH * 0.68;
    tx = Math.max(0, Math.min(this.W - this.viewW, tx));
    ty = Math.min(this.H - this.viewH, ty);
    if (this.H > this.viewH) ty = Math.max(0, ty);
    if (!this.camInit) {
      this.camX = tx;
      this.camY = ty;
      this.camInit = true;
    } else {
      const k = Math.min(1, dt * 5);
      this.camX += (tx - this.camX) * k;
      this.camY += (ty - this.camY) * Math.min(1, dt * 4);
    }
    const th = this.themeAt((this.camX + this.viewW / 2) / TILE);
    if (th !== this.theme) {
      this.prevTheme = this.theme;
      this.theme = th;
      this.themeFade = 0;
    }
    this.themeFade = Math.min(1, this.themeFade + dt * 1.5);
  }

  // -------------------------------------------------------------------------
  // Drawing
  // -------------------------------------------------------------------------

  /** px: device pixels per world unit. */
  render(ctx: CanvasRenderingContext2D, px: number, screenW: number, screenH: number) {
    if (Math.abs(px - this.chunkPx) > 0.01) {
      this.chunks.clear();
      this.farCache.clear();
      this.chunkPx = px;
    }
    this.viewW = screenW / px;
    this.viewH = screenH / px;
    const camX = Math.round(this.camX * px) / px;
    const camY = Math.round(this.camY * px) / px;

    // sky / far layers in screen space
    this.drawSky(ctx, px, screenW, screenH, this.theme, 1);
    if (this.themeFade < 1) this.drawSky(ctx, px, screenW, screenH, this.prevTheme, 1 - this.themeFade);

    ctx.save();
    ctx.scale(px, px);
    ctx.translate(-camX, -camY);

    // static chunks (512 x 512 units each), plus at most one chunk ahead prepared per frame
    const c0 = Math.floor(camX / CHUNK);
    const c1 = Math.floor((camX + this.viewW) / CHUNK);
    const r0 = Math.max(0, Math.floor(camY / CHUNK));
    const r1 = Math.min(Math.ceil(this.H / CHUNK) - 1, Math.floor((camY + this.viewH) / CHUNK));
    for (let c = c0; c <= c1; c++)
      for (let r = r0; r <= r1; r++) {
        const cv = this.chunk(c, r, px);
        if (cv) ctx.drawImage(cv, c * CHUNK, r * CHUNK, CHUNK, CHUNK);
      }
    const ahead = this.facing > 0 ? c1 + 1 : c0 - 1;
    for (let r = r0; r <= r1; r++) if (!this.chunks.has(ahead * 1000 + r)) {
      this.chunk(ahead, r, px);
      break;
    }
    if (this.chunks.size > 14)
      for (const k of this.chunks.keys()) {
        const kc = Math.floor(k / 1000);
        const kr = k % 1000;
        if (kc < c0 - 2 || kc > c1 + 2 || kr < r0 - 2 || kr > r1 + 2) this.chunks.delete(k);
      }

    // hidden platforms (only while glowing)
    this.drawHidden(ctx, camX, camY);

    const inView = (e: Ent) => e.x > camX - 100 && e.x < camX + this.viewW + 100 && e.y > camY - 60 && e.y - e.h < camY + this.viewH + 100;
    const t = this.animT;
    // pickups and gates behind characters
    for (const e of this.ents) {
      if (!e.alive || !inView(e)) continue;
      const bob = Math.sin(t * 3 + e.x * 0.05) * 3;
      switch (e.kind) {
        case "rose":
          this.sprites.drawItem(ctx, "rose", e.x, e.y + bob, 22);
          break;
        case "lily":
          this.sprites.drawItem(ctx, "lily", e.x, e.y + bob, 26);
          break;
        case "ball":
          this.drawBall(ctx, e.x, e.y + bob);
          break;
        case "boost":
          this.glow(ctx, e.x, e.y + bob, 20, "rgba(255,240,170,0.7)");
          this.sprites.drawItem(ctx, e.boost === "watermelon" ? "watermelon" : BOOST_ITEM[e.boost as BoostId], e.x, e.y + bob, 30);
          break;
        case "keepsake":
          this.glow(ctx, e.x, e.y + bob, 30, "rgba(255,180,210,0.8)");
          this.sprites.drawItem(ctx, this.def.keepsake.id, e.x, e.y + bob, 40);
          this.twinkle(ctx, e.x, e.y + bob, 26);
          break;
        case "secret":
          this.glow(ctx, e.x, e.y + bob, 20, "rgba(255,215,90,0.6)");
          this.sprites.drawItem(ctx, this.def.secret.id, e.x, e.y + bob, 28);
          this.twinkle(ctx, e.x, e.y + bob, 18);
          break;
        case "flag":
          this.drawFlag(ctx, e);
          break;
        case "gate":
          this.drawGate(ctx, e);
          break;
      }
    }

    // people and enemies
    const faint = this.boosts.yochi > 0;
    for (const e of this.ents) {
      if (!e.alive || !inView(e)) continue;
      switch (e.kind) {
        case "walker":
          this.drawTrackwork(ctx, e, faint);
          break;
        case "person":
          this.sprites.drawPerson(ctx, e.look!, faint || e.state === "gone" ? "idle" : "run", Math.floor(e.t * 8), e.x, e.y, e.dir, { alpha: e.alpha });
          break;
        case "crowd":
          for (let k = 0; k < 3; k++)
            this.sprites.drawPerson(ctx, randomLook((e.seed ?? 1) * 10 + k, "commuter"), faint ? "idle" : "run", Math.floor(e.t * 7) + k * 2, e.x - 22 + k * 22, e.y, e.dir);
          break;
        case "neon": {
          const kind: PoseKind = e.state === "walk" && !faint ? "run" : e.state === "caught" ? "look" : "idle";
          this.sprites.drawPerson(ctx, e.look!, kind, Math.floor(e.t * 6), e.x, e.y, e.dir);
          if (e.state === "look" || e.state === "caught") this.drawVision(ctx, e);
          break;
        }
        case "npc":
          if (e.state === "trigger") break;
          this.shadow(ctx, e.x, e.y, 14);
          this.sprites.drawPerson(ctx, e.look!, e.pose ?? "idle", Math.floor(t * 4), e.x, e.y, e.dir, { alpha: e.alpha, blink: Math.sin(t * 1.3 + e.x) > 0.97 });
          break;
        case "jag":
        case "helper": {
          this.shadow(ctx, e.x, e.y, 14);
          const kiss = this.cinematic && this.cinematic.t > 1.4;
          const pose: PoseKind = kiss ? "kiss" : this.arrived || e.kind === "helper" ? "hi" : "idle";
          this.sprites.drawPerson(ctx, e.look!, pose, Math.floor(t * 4), e.x, e.y, kiss ? -1 : e.dir, { alpha: e.alpha, happy: this.arrived });
          if (e.kind === "jag" && !this.arrived) this.drawHeartMarker(ctx, e.x, e.y - 90);
          break;
        }
      }
    }

    // Nikita
    this.drawPlayer(ctx);

    // hiding spots go in front of her
    for (const e of this.ents) if (e.alive && e.kind === "hide" && inView(e)) this.drawHideSpot(ctx, e);

    // bubbles
    for (const e of this.ents) if (e.alive && e.bubble && inView(e)) this.drawBubble(ctx, e.x, e.y - (e.kind === "crowd" ? 70 : e.kind === "neon" ? 88 : e.h + 16), e.bubble.text);
    if (this.bubble) this.drawBubble(ctx, this.px, this.py - 78, this.bubble.text);

    // particles
    for (const p of this.parts) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      if (p.kind === "heart") {
        heartPath(ctx, p.x, p.y, p.size);
        ctx.fillStyle = p.color;
        ctx.fill();
      } else if (p.kind === "confetti") {
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 8);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.kind === "poof" ? 1.6 - a : 1), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const f of this.floats) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#fff";
      ctx.font = "900 13px 'Nunito Variable', ui-rounded, sans-serif";
      ctx.textAlign = "center";
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // arrow to the keepsake after calling Jagath
    if (this.arrowT > 0) this.drawArrow(ctx);

    ctx.restore();

    // darkness
    this.drawDark(ctx, px, camX, camY, screenW, screenH);
    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(255,80,120,${this.flashT})`;
      ctx.fillRect(0, 0, screenW, screenH);
    }
  }

  private drawSky(ctx: CanvasRenderingContext2D, px: number, sw: number, sh: number, theme: Theme, alpha: number) {
    ctx.globalAlpha = alpha;
    const sky = SKY[theme];
    if (sky) {
      const g = ctx.createLinearGradient(0, 0, 0, sh);
      g.addColorStop(0, sky[0]);
      g.addColorStop(1, sky[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, sw, sh);
      // clouds
      if (theme !== "rooftop") {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        for (let i = 0; i < 4; i++) {
          const cx = ((i * 260 - this.camX * 0.08) % (sw / px + 300)) - 100;
          const cy = 40 + (i % 2) * 36;
          ctx.beginPath();
          ctx.ellipse(cx * px + 300, cy * px, 44 * px, 14 * px, 0, 0, Math.PI * 2);
          ctx.ellipse(cx * px + 330, (cy - 8) * px, 26 * px, 14 * px, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(0, 0, sw, sh * 0.3);
      }
      const far = this.far(theme, px);
      const par = 0.3;
      const fw = FAR_W * px;
      const groundScreen = (this.zoneFloor(0, this.cols) - this.camY * 1) * px;
      const y = Math.min(sh * 0.9, groundScreen) - FAR_H * px + 10 * px;
      let x = -((this.camX * par * px) % fw);
      while (x < sw) {
        ctx.drawImage(far, x, y, fw, FAR_H * px);
        x += fw;
      }
    } else {
      ctx.fillStyle = INDOOR_BG[theme];
      ctx.fillRect(0, 0, sw, sh);
    }
    ctx.globalAlpha = 1;
  }

  private far(theme: Theme, px: number) {
    let c = this.farCache.get(theme);
    if (!c) {
      c = document.createElement("canvas");
      c.width = Math.ceil(FAR_W * px);
      c.height = Math.ceil(FAR_H * px);
      const g = c.getContext("2d")!;
      g.scale(px, px);
      drawFar(g, theme);
      this.farCache.set(theme, c);
    }
    return c;
  }

  private chunk(i: number, j: number, px: number) {
    if (i < 0 || i * CHUNK >= this.W || j < 0 || j * CHUNK >= this.H) return null;
    const key = i * 1000 + j;
    let c = this.chunks.get(key);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = Math.ceil(CHUNK * px);
    c.height = Math.ceil(CHUNK * px);
    const g = c.getContext("2d")!;
    g.scale(px, px);
    g.translate(-i * CHUNK, -j * CHUNK);
    const x0 = i * CHUNK;
    const x1 = x0 + CHUNK;
    const y0 = j * CHUNK;
    const y1 = y0 + CHUNK;
    // backdrop per zone
    const zones = this.def.zones;
    for (let z = 0; z < zones.length; z++) {
      const za = zones[z].at * TILE;
      const zb = (zones[z + 1]?.at ?? this.cols) * TILE;
      if (zb <= x0 || za >= x1) continue;
      const theme = zones[z].theme;
      g.save();
      g.beginPath();
      g.rect(Math.max(za, x0), 0, Math.min(zb, x1) - Math.max(za, x0), this.H);
      g.clip();
      if (!SKY[theme]) {
        g.fillStyle = INDOOR_BG[theme];
        g.fillRect(x0, 0, CHUNK, this.H);
      }
      const floor = this.zoneFloor(zones[z].at, zones[z + 1]?.at ?? this.cols);
      drawBackdrop(g, theme, Math.max(za, x0), Math.min(zb, x1), floor, this.H, this.shopSpans);
      // what shows down a gap: water by the river, a dark drop everywhere else
      const pit = g.createLinearGradient(0, floor, 0, this.H);
      if (theme === "river") {
        pit.addColorStop(0, "#6fb3c9");
        pit.addColorStop(1, "#2f6f86");
      } else {
        pit.addColorStop(0, "#6d5a64");
        pit.addColorStop(1, "#2b2029");
      }
      g.fillStyle = pit;
      g.fillRect(Math.max(za, x0), floor + 10, Math.min(zb, x1) - Math.max(za, x0), this.H - floor);
      g.restore();
    }
    // landmarks (they hang upward from their anchor, so look a few rows below the chunk too)
    for (let r = Math.max(0, Math.floor(y0 / TILE) - 1); r < Math.min(this.rows, Math.ceil(y1 / TILE) + 12); r++) {
      const row = this.def.rows[r];
      for (let col = Math.max(0, Math.floor(x0 / TILE) - 10); col < Math.min(this.cols, Math.ceil(x1 / TILE) + 10); col++) {
        const a = this.def.anchors[row[col]];
        if (a?.prop) drawProp(g, a.prop, col * TILE + TILE / 2, (r + 1) * TILE);
      }
    }
    // tiles
    const cs = Math.max(0, Math.floor(x0 / TILE));
    const ce = Math.min(this.cols - 1, Math.ceil(x1 / TILE));
    for (let r = Math.max(0, Math.floor(y0 / TILE)); r < Math.min(this.rows, Math.ceil(y1 / TILE)); r++) {
      for (let col = cs; col <= ce; col++) {
        const t = this.tile(col, r);
        const theme = this.themeAt(col);
        if (t === 1) drawGroundTile(g, theme, col * TILE, r * TILE, this.tile(col, r - 1) !== 1, this.tile(col - 1, r) !== 1 && col > 0, this.tile(col + 1, r) !== 1 && col < this.cols - 1, col * 131 + r * 7);
        else if (t === 2) drawLedgeTile(g, theme, col * TILE, r * TILE, this.tile(col - 1, r) !== 2, this.tile(col + 1, r) !== 2);
      }
    }
    this.chunks.set(key, c);
    return c;
  }

  private drawHidden(ctx: CanvasRenderingContext2D, camX: number, camY: number) {
    const glow = this.glowing();
    const c0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const c1 = Math.min(this.cols - 1, Math.ceil((camX + this.viewW) / TILE) + 1);
    const r0 = Math.max(0, Math.floor(camY / TILE) - 1);
    const r1 = Math.min(this.rows - 1, Math.ceil((camY + this.viewH) / TILE) + 1);
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        if (this.tile(c, r) !== 3) continue;
        const x = c * TILE;
        const y = r * TILE;
        if (glow) {
          ctx.fillStyle = "rgba(214,250,160,0.9)";
          rrect(ctx, x + 1, y, TILE - 2, 12, 5);
          ctx.fill();
          ctx.strokeStyle = "#6fa336";
          ctx.lineWidth = 1.4;
          ctx.stroke();
        } else {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = "rgba(214,250,160,0.55)";
          ctx.lineWidth = 1.4;
          rrect(ctx, x + 1, y, TILE - 2, 12, 5);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    if (this.respawnT > 0 && this.caughtT <= 0 && this.hearts <= 0) {
      // fading out before going back to the flag
    }
    const blinkOn = this.hurtT > 0 && Math.floor(this.hurtT * 12) % 2 === 0;
    let kind: PoseKind = "idle";
    let frame = Math.floor(this.animT * 4);
    if (this.cinematic) kind = this.cinematic.t > 1.4 ? "kiss" : "run";
    else if (this.arrived) kind = Math.abs(this.vx) > 5 ? "run" : "wave";
    else if (this.caughtT > 0 && this.respawnT > 0) kind = "hurt";
    else if (this.knockT > 0) kind = "hurt";
    else if (this.crouch) kind = "crouch";
    else if (!this.onGround) kind = this.vy < 0 ? "jump" : "fall";
    else if (Math.abs(this.vx) > 12) {
      kind = "run";
      frame = Math.floor(this.animT * (this.boosts.chai > 0 ? 16 : 11));
    }
    const glowR = this.glowing() ? 26 : 0;
    if (glowR) this.glow(ctx, this.px, this.py - 28, 40, "rgba(214,250,160,0.55)");
    if (this.boosts.kfc > 0) this.glow(ctx, this.px, this.py - 28, 36, "rgba(255,170,90,0.5)");
    this.shadow(ctx, this.px, this.py, 13);
    const squash = this.landT > 0 ? 1 - this.landT * 0.6 : 1;
    this.sprites.drawPerson(ctx, this.look, kind, frame, this.px, this.py, this.facing, {
      alpha: this.hidden ? 0.55 : blinkOn ? 0.35 : 1,
      blink: this.blinkT < 0,
      happy: this.arrived,
      scale: squash,
    });
    if (this.boosts.shield > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.px, this.py - 28, 34 + Math.sin(this.animT * 5) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (this.boosts.yochi > 0) {
      ctx.fillStyle = "rgba(160,220,255,0.18)";
      ctx.fillRect(this.camX, this.camY, this.viewW, this.viewH);
    }
  }

  private shadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    ctx.fillStyle = "rgba(60,20,40,0.16)";
    ctx.beginPath();
    ctx.ellipse(x, y, r, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  private twinkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    const t = this.animT * 2;
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 3; i++) {
      const a = t + (i * Math.PI * 2) / 3;
      const s = 2 + Math.sin(t * 3 + i) * 1.2;
      const sx = x + Math.cos(a) * r;
      const sy = y + Math.sin(a) * r;
      ctx.beginPath();
      ctx.moveTo(sx, sy - s * 2);
      ctx.lineTo(sx + s * 0.5, sy);
      ctx.lineTo(sx, sy + s * 2);
      ctx.lineTo(sx - s * 0.5, sy);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawBall(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = "#e8742b";
    ctx.strokeStyle = "#3b2430";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.arc(x - 14, y, 10, -0.8, 0.8);
    ctx.moveTo(x + 4, y - 7);
    ctx.arc(x + 14, y, 10, Math.PI - 0.8, Math.PI + 0.8, false);
    ctx.stroke();
  }

  private drawFlag(ctx: CanvasRenderingContext2D, e: Ent) {
    ctx.fillStyle = "#6b6f75";
    ctx.fillRect(e.x - 2, e.y - 60, 4, 60);
    const up = e.state === "up";
    const fy = up ? e.y - 58 + Math.max(0, 1 - e.t * 3) * 40 : e.y - 22;
    const wave = Math.sin(this.animT * 5) * 2;
    ctx.fillStyle = up ? "#e84a86" : "#d8c9cf";
    ctx.strokeStyle = "#3b2430";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(e.x + 2, fy);
    ctx.quadraticCurveTo(e.x + 16, fy + 4 + wave, e.x + 28, fy + 2);
    ctx.lineTo(e.x + 26, fy + 18);
    ctx.quadraticCurveTo(e.x + 14, fy + 20 + wave, e.x + 2, fy + 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    heartPath(ctx, e.x + 14, fy + 11, 4.5);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }

  private drawGate(ctx: CanvasRenderingContext2D, e: Ent) {
    // Opal gate: two cabinets with glass paddles
    const open = e.state === "open";
    ctx.fillStyle = "#3a3f47";
    ctx.strokeStyle = "#3b2430";
    ctx.lineWidth = 1.4;
    rrect(ctx, e.x - 26, e.y - 44, 12, 44, 3);
    ctx.fill();
    ctx.stroke();
    rrect(ctx, e.x + 14, e.y - 44, 12, 44, 3);
    ctx.fill();
    ctx.stroke();
    // reader
    ctx.fillStyle = open ? "#4fd16a" : "#f07c1a";
    ctx.fillRect(e.x - 25, e.y - 44, 10, 4);
    ctx.fillRect(e.x + 15, e.y - 44, 10, 4);
    ctx.fillStyle = "rgba(170,210,235,0.75)";
    const w = open ? 4 : 13;
    rrect(ctx, e.x - 14, e.y - 52, w, 40, 3);
    ctx.fill();
    ctx.stroke();
    rrect(ctx, e.x + 14 - w, e.y - 52, w, 40, 3);
    ctx.fill();
    ctx.stroke();
    if (!open) {
      ctx.fillStyle = "#e0393b";
      ctx.beginPath();
      ctx.arc(e.x, e.y - 62, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawTrackwork(ctx: CanvasRenderingContext2D, e: Ent, frozen: boolean) {
    ctx.save();
    ctx.globalAlpha = e.alpha;
    const step = frozen || e.state === "gone" ? 0 : Math.sin(e.t * 10) * 3;
    ctx.strokeStyle = "#3b2430";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x - 6, e.y - 10);
    ctx.lineTo(e.x - 8 + step, e.y);
    ctx.moveTo(e.x + 6, e.y - 10);
    ctx.lineTo(e.x + 8 - step, e.y);
    ctx.stroke();
    rrect(ctx, e.x - 16, e.y - 34, 32, 26, 3);
    ctx.fillStyle = "#f5a623";
    ctx.fill();
    ctx.stroke();
    text(ctx, "TRACK", e.x, e.y - 26, 7.5, "#3b2430");
    text(ctx, "WORK", e.x, e.y - 17, 7.5, "#3b2430");
    ctx.fillStyle = "#3b2430";
    ctx.fillRect(e.x - 16, e.y - 12, 32, 3);
    // little angry eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(e.x - 7 * e.dir, e.y - 37, 3, 0, Math.PI * 2);
    ctx.arc(e.x + 1 * e.dir, e.y - 37, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3b2430";
    ctx.beginPath();
    ctx.arc(e.x - 6 * e.dir, e.y - 37, 1.4, 0, Math.PI * 2);
    ctx.arc(e.x + 2 * e.dir, e.y - 37, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawVision(ctx: CanvasRenderingContext2D, e: Ent) {
    const g = ctx.createLinearGradient(e.x, 0, e.x + e.dir * 7 * TILE, 0);
    g.addColorStop(0, "rgba(255,215,90,0.35)");
    g.addColorStop(1, "rgba(255,215,90,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(e.x + e.dir * 6, e.y - 60);
    ctx.lineTo(e.x + e.dir * 7 * TILE, e.y - 80);
    ctx.lineTo(e.x + e.dir * 7 * TILE, e.y);
    ctx.lineTo(e.x + e.dir * 6, e.y - 40);
    ctx.closePath();
    ctx.fill();
  }

  private drawHideSpot(ctx: CanvasRenderingContext2D, e: Ent) {
    const v = e.variant ?? 0;
    ctx.strokeStyle = "#3b2430";
    ctx.lineWidth = 1.6;
    if (v === 0) {
      // pillar with an ad
      rrect(ctx, e.x - 17, e.y - 70, 34, 70, 3);
      ctx.fillStyle = "#e6e0d8";
      ctx.fill();
      ctx.stroke();
      rrect(ctx, e.x - 12, e.y - 60, 24, 34, 2);
      ctx.fillStyle = "#ffd3e2";
      ctx.fill();
      ctx.stroke();
    } else if (v === 1) {
      // big bin
      rrect(ctx, e.x - 16, e.y - 46, 32, 46, [4, 4, 2, 2]);
      ctx.fillStyle = "#3f7f5a";
      ctx.fill();
      ctx.stroke();
      rrect(ctx, e.x - 18, e.y - 50, 36, 7, 3);
      ctx.fillStyle = "#e53935";
      ctx.fill();
      ctx.stroke();
    } else {
      // potted plant
      rrect(ctx, e.x - 15, e.y - 24, 30, 24, 3);
      ctx.fillStyle = "#f4f1ec";
      ctx.fill();
      ctx.stroke();
      for (let k = -3; k <= 3; k++) {
        ctx.beginPath();
        ctx.ellipse(e.x + k * 5, e.y - 42, 6, 20, k * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = "#6fb35c";
        ctx.fill();
        ctx.stroke();
      }
    }
    if (this.hidden && Math.abs(e.x - this.px) < 22) {
      text(ctx, "shh", e.x, e.y - 80, 11, "#c92f6d");
    }
  }

  private drawHeartMarker(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const s = 7 + Math.sin(this.animT * 4) * 1.2;
    heartPath(ctx, x, y + Math.sin(this.animT * 2) * 3, s);
    ctx.fillStyle = "#e84a86";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, s: string) {
    ctx.font = "800 11px 'Nunito Variable', ui-rounded, system-ui, sans-serif";
    const w = ctx.measureText(s).width + 16;
    const h = 20;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#3b2430";
    ctx.lineWidth = 1.3;
    rrect(ctx, x - w / 2, y - h, w, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 0.5);
    ctx.lineTo(x, y + 6);
    ctx.lineTo(x + 4, y - 0.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x - 3.4, y - 2, 6.8, 2.4);
    ctx.fillStyle = "#3b2430";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s, x, y - h / 2 + 0.5);
  }

  private drawArrow(ctx: CanvasRenderingContext2D) {
    const target = this.ents.find((e) => e.alive && e.kind === "keepsake") ?? this.ents.find((e) => e.alive && e.kind === "secret") ?? this.ents.find((e) => e.kind === "jag");
    if (!target) return;
    const dx = target.x - this.px;
    const dy = target.y - 20 - (this.py - 40);
    const a = Math.atan2(dy, dx);
    const x = this.px + Math.cos(a) * 46;
    const y = this.py - 40 + Math.sin(a) * 46;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.globalAlpha = Math.min(1, this.arrowT);
    ctx.fillStyle = "#e84a86";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-6, -9);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawDark(ctx: CanvasRenderingContext2D, px: number, camX: number, camY: number, sw: number, sh: number) {
    const dark = this.def.dark;
    if (!dark) return;
    const col = this.px / TILE;
    let amt = 0;
    for (const [a, b] of dark) {
      const inside = Math.min(col - a, b - col);
      amt = Math.max(amt, Math.max(0, Math.min(1, (inside + 2) / 4)));
    }
    if (amt <= 0) return;
    const r = (this.glowing() ? 210 : 95) * px;
    const x = (this.px - camX) * px;
    const y = (this.py - 28 - camY) * px;
    const g = ctx.createRadialGradient(x, y, r * 0.35, x, y, r);
    g.addColorStop(0, "rgba(10,8,25,0)");
    g.addColorStop(1, `rgba(10,8,25,${0.84 * amt})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, sw, sh);
  }
}
