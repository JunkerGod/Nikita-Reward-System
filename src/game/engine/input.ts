// Keyboard and touch input folded into one set of buttons the game reads each frame.

export type Button = "left" | "right" | "jump" | "down" | "call" | "pause" | "confirm";

const KEYS: Record<string, Button> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "jump",
  KeyW: "jump",
  Space: "jump",
  KeyZ: "jump",
  ArrowDown: "down",
  KeyS: "down",
  KeyE: "call",
  ShiftLeft: "call",
  ShiftRight: "call",
  Escape: "pause",
  KeyP: "pause",
  Enter: "confirm",
};

export class Input {
  private held = new Set<Button>();
  private touch = new Set<Button>();
  private pressedQueue = new Set<Button>();
  private prev = new Set<Button>();
  private now = new Set<Button>();
  private edge = new Set<Button>();
  usingTouch = false;

  attach() {
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("keyup", this.onKey);
    window.addEventListener("blur", this.clear);
  }

  dispose() {
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("keyup", this.onKey);
    window.removeEventListener("blur", this.clear);
  }

  private onKey = (e: KeyboardEvent) => {
    const b = KEYS[e.code];
    if (!b) return;
    // Let form fields and menu buttons keep their keys.
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
    if (t && t.tagName === "BUTTON" && (b === "confirm" || e.code === "Space")) return;
    e.preventDefault();
    if (e.type === "keydown") {
      if (!this.held.has(b)) this.pressedQueue.add(b);
      this.held.add(b);
      this.usingTouch = false;
    } else this.held.delete(b);
  };

  clear = () => {
    this.held.clear();
    this.touch.clear();
    this.pressedQueue.clear();
    this.edge.clear();
    this.now.clear();
  };

  setTouch(b: Button, on: boolean) {
    this.usingTouch = true;
    if (on) {
      if (!this.touch.has(b)) this.pressedQueue.add(b);
      this.touch.add(b);
    } else this.touch.delete(b);
  }

  /** Call once per frame before reading. */
  poll() {
    this.prev = this.now;
    this.now = new Set([...this.held, ...this.touch, ...this.pressedQueue]);
    this.edge = new Set(this.pressedQueue);
    this.pressedQueue.clear();
  }
  down(b: Button) {
    return this.now.has(b);
  }
  pressed(b: Button) {
    return this.edge.has(b) || (this.now.has(b) && !this.prev.has(b));
  }
}
