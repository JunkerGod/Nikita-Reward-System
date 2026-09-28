// A tiny level builder. Levels are made of calls like ground(), ledge() and coins() and come out
// as rows of characters the World reads:
//   # ground   = one-way ledge   H hidden ledge (Smiski)   N start   F flag   J Jagath (end)
//   r rose   l lily   b basketball   K keepsake   G secret
//   c chai   y Yo-Chi   f flan   w watermelon   k KFC   s Smiski   p pipe cleaner flowers
//   t trackwork sign   P station person   C peak-hour crowd   o Opal gate   B Neon   h hiding spot
//   anything else: an anchor (landmark or story) looked up in the level's anchors.

export class Build {
  readonly g: string[][];
  constructor(
    readonly cols: number,
    readonly rows = 12,
    readonly floor = 10,
  ) {
    this.g = Array.from({ length: rows }, () => Array.from({ length: cols }, () => "."));
  }

  set(c: number, r: number, ch: string) {
    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) this.g[r][c] = ch;
    return this;
  }

  /** Solid ground from `from` to `to` (exclusive), with its surface at row `top`. */
  ground(from: number, to: number, top = this.floor) {
    for (let c = from; c < to; c++) for (let r = top; r < this.rows; r++) this.set(c, r, "#");
    return this;
  }

  gap(from: number, len: number) {
    for (let c = from; c < from + len; c++) for (let r = 0; r < this.rows; r++) if (this.g[r][c] === "#") this.set(c, r, ".");
    return this;
  }

  block(c: number, r: number, w: number, h = 1) {
    for (let x = c; x < c + w; x++) for (let y = r; y < r + h; y++) this.set(x, y, "#");
    return this;
  }

  ledge(c: number, r: number, len: number) {
    for (let x = c; x < c + len; x++) this.set(x, r, "=");
    return this;
  }

  hidden(c: number, r: number, len: number) {
    for (let x = c; x < c + len; x++) this.set(x, r, "H");
    return this;
  }

  /** Write a string of pickups/markers starting at (c, r); dots are skipped. */
  put(c: number, r: number, s: string) {
    [...s].forEach((ch, i) => ch !== "." && this.set(c + i, r, ch));
    return this;
  }

  /** Surface row of the ground at column c. */
  top(c: number) {
    for (let r = 0; r < this.rows; r++) if (this.g[r][c] === "#") return r;
    return this.rows;
  }

  /** Put something standing on the ground at column c. */
  on(c: number, ch: string) {
    return this.set(c, this.top(c) - 1, ch);
  }

  /** A line of roses in a little arc. */
  arc(c: number, r: number, n: number, ch = "r") {
    for (let i = 0; i < n; i++) {
      const lift = Math.round(Math.sin((i / Math.max(1, n - 1)) * Math.PI) * 1.4);
      this.set(c + i, r - lift, ch);
    }
    return this;
  }

  /** Stairs going up to the right: each step is `w` wide and one row higher. */
  stairsUp(c: number, steps: number, w = 2, base = this.floor) {
    for (let s = 0; s < steps; s++) this.ground(c + s * w, c + (s + 1) * w, base - s - 1);
    return this;
  }

  stairsDown(c: number, steps: number, w = 2, base = this.floor) {
    for (let s = 0; s < steps; s++) this.ground(c + s * w, c + (s + 1) * w, base - steps + s);
    return this;
  }

  done() {
    return this.g.map((r) => r.join(""));
  }
}
