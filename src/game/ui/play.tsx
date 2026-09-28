import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { ArrowDownIcon, CaretLeftIcon, CaretRightIcon, HeartIcon, PauseIcon, StarIcon } from "@phosphor-icons/react";
import { gsap, useGSAP, prefersReducedMotion } from "../../lib/motion";
import { AAYAM, CHICHI, NEON, type Look } from "../art/people";
import type { Collectible, LevelDef, Line, Who } from "../types";
import type { Button, Input } from "../engine/input";
import type { LevelResult } from "../engine/world";
import type { Audio } from "../engine/audio";
import { CREDITS } from "../levels";
import { Avatar, ItemArt, PersonArt } from "./art";
import { GButton, Pop, cx } from "./screens";

// ---------------------------------------------------------------------------
// Chat: the dialogue as texts, one bubble at a time
// ---------------------------------------------------------------------------

export function Chat({ lines, looks, heading, audio, onDone }: { lines: Line[]; looks: { n: Look; j: Look }; heading: string; audio: Audio; onDone: () => void }) {
  const [shown, setShown] = useState(1);
  const [typing, setTyping] = useState(true);
  const list = useRef<HTMLOListElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    setTyping(true);
    const t = window.setTimeout(() => {
      setTyping(false);
      audio.play("blip");
    }, 380);
    return () => window.clearTimeout(t);
  }, [shown, audio]);

  useEffect(() => {
    list.current?.lastElementChild?.scrollIntoView({ block: "end", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [shown, typing]);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }, [onDone]);

  const next = useCallback(() => {
    if (typing) {
      setTyping(false);
      return;
    }
    if (shown >= lines.length) finish();
    else setShown((s) => s + 1);
  }, [typing, shown, lines.length, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.code === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, finish]);

  const lookFor = (w: Who) => (w === "n" ? looks.n : w === "j" ? looks.j : w === "c" ? CHICHI : w === "a" ? AAYAM : NEON);
  const nameFor = (w: Who) => (w === "c" ? "Chichi" : w === "a" ? "Aayam" : w === "neon" ? "Neon" : null);

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-gradient-to-t from-ink/35 to-transparent p-3" onClick={next} role="dialog" aria-modal="true" aria-label="Chat">
      <Pop className="flex max-h-[78%] w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-[#fdf6f9] shadow-pop ring-1 ring-soft">
        <div className="flex items-center justify-between gap-2 border-b border-soft bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            <Avatar look={looks.j} size={30} />
            <span className="text-sm font-black text-ink">{heading}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              finish();
            }}
            className="press rounded-full px-3 py-1.5 text-sm font-extrabold text-btn hover:bg-soft"
          >
            Skip
          </button>
        </div>
        <ol ref={list} className="flex flex-col gap-1.5 overflow-y-auto px-3 py-3" aria-live="polite">
          {lines.slice(0, shown).map((l, i) => {
            const mine = l.who === "n";
            const last = i === shown - 1;
            if (last && typing)
              return (
                <li key={i} className={cx("flex items-end gap-2", mine && "flex-row-reverse")}>
                  {!mine ? <Avatar look={lookFor(l.who)} size={28} /> : null}
                  <span className={cx("flex gap-1 rounded-2xl px-3 py-3", mine ? "bg-bright" : "bg-white ring-1 ring-soft")} aria-label="typing">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className={cx("size-1.5 animate-bounce rounded-full", mine ? "bg-white" : "bg-muted")} style={{ animationDelay: `${d * 120}ms` }} />
                    ))}
                  </span>
                </li>
              );
            return (
              <li key={i} className={cx("flex items-end gap-2", mine && "flex-row-reverse")}>
                {!mine ? <Avatar look={lookFor(l.who)} size={28} /> : null}
                <span className={cx("max-w-[78%] rounded-3xl px-4 py-2 text-[17px] font-bold leading-snug break-words", mine ? "rounded-br-lg bg-bright text-white" : "rounded-bl-lg bg-white text-ink ring-1 ring-soft")}>
                  {nameFor(l.who) ? <span className="block text-xs font-black text-muted">{nameFor(l.who)}</span> : null}
                  {l.text}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="pb-2 text-center text-xs font-bold text-muted">tap to keep going</p>
      </Pop>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pop-up when a keepsake or secret is collected
// ---------------------------------------------------------------------------

export function PickupPopup({ kind, item, level, jag, onDone }: { kind: "keepsake" | "secret" | "final"; item: Collectible; level: LevelDef; jag: Look; onDone: () => void }) {
  const ray = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.to(ray.current, { rotate: 360, duration: 14, ease: "none", repeat: -1 });
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "Space" || e.code === "Escape") {
        e.preventDefault();
        onDone();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);
  return (
    <div className="absolute inset-0 z-30 flex overflow-y-auto bg-ink/55 p-3" role="dialog" aria-modal="true" aria-label={item.name}>
      <Pop className="relative m-auto flex w-full max-w-sm flex-col items-center gap-2 rounded-[32px] bg-white p-4 text-center shadow-pop landscape:max-w-xl landscape:flex-row landscape:text-left">
        <div className="relative flex size-56 shrink-0 items-center justify-center">
          <div
            ref={ray}
            aria-hidden="true"
            className="absolute size-56 rounded-full opacity-70"
            style={{ background: "repeating-conic-gradient(from 0deg, #ffd6e4 0deg 12deg, #fff5f8 12deg 24deg)" }}
          />
          <div className="relative">{kind === "final" ? <PersonArt look={jag} height={200} pose="hi" happy /> : <ItemArt id={item.id} size={kind === "secret" ? 150 : 200} />}</div>
        </div>
        <div className="flex flex-col gap-2 landscape:pl-2">
          <p className="text-xs font-black uppercase tracking-widest text-btn">{kind === "final" ? "Final collectible" : kind === "secret" ? "Secret found" : "New keepsake"}</p>
          <h3 className="text-2xl font-black leading-tight text-ink">{item.name}</h3>
          <p className="text-sm font-bold text-muted">
            {level.date} &middot; {level.place}
          </p>
          <p className="rounded-2xl bg-soft/60 px-4 py-3 text-base font-bold text-ink">{item.note}</p>
          <GButton onClick={onDone} autoFocus className="mt-1">
            Keep It ☺️
          </GButton>
        </div>
      </Pop>
    </div>
  );
}

// ---------------------------------------------------------------------------
// End of a date
// ---------------------------------------------------------------------------

export function Complete({
  level,
  result,
  stars,
  best,
  newBest,
  points,
  hasNext,
  onNext,
  onReplay,
  onShop,
  onMenu,
}: {
  level: LevelDef;
  result: LevelResult;
  stars: [boolean, boolean, boolean];
  best: number | null;
  newBest: boolean;
  points: number | null;
  hasNext: boolean;
  onNext: () => void;
  onReplay: () => void;
  onShop: () => void;
  onMenu: () => void;
}) {
  const starRow = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.fromTo(starRow.current!.children, { scale: 0, rotate: -40 }, { scale: 1, rotate: 0, duration: 0.5, ease: "back.out(2.4)", stagger: 0.18, delay: 0.3 });
  });
  const labels = ["Keepsake", "Every flower", "No hits"];
  return (
    <div className="absolute inset-0 z-30 flex overflow-y-auto bg-ink/45 p-3" role="dialog" aria-modal="true" aria-label="Date cleared">
      <Pop className="m-auto flex w-full max-w-md flex-col items-center gap-3 rounded-[32px] bg-white p-4 text-center shadow-pop landscape:max-w-2xl landscape:flex-row landscape:items-stretch landscape:gap-5">
        <div className="flex flex-col items-center gap-2 landscape:w-56 landscape:justify-center">
          <p className="text-xs font-black uppercase tracking-widest text-btn">Date cleared</p>
          <h3 className="font-script text-5xl leading-none text-btn">{level.place.split(",")[0]}</h3>
          <p className="text-sm font-bold text-muted">{level.date}</p>
          <div ref={starRow} className="flex gap-3">
            {stars.map((s, i) => (
              <div key={i} className="flex flex-col items-center">
                <StarIcon size={42} weight="fill" className={s ? "text-[#f5b82e] drop-shadow" : "text-[#eadde3]"} aria-hidden="true" />
                <span className={cx("text-[11px] font-extrabold", s ? "text-ink" : "text-muted")}>{labels[i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center gap-3">
          <dl className="grid w-full grid-cols-3 gap-2 text-center">
            <Stat label="Flowers" value={`${result.flowers}/${result.flowersTotal}`} />
            <Stat label="Time" value={fmtTime(result.time)} hint={newBest ? "new best" : best ? `best ${fmtTime(best)}` : undefined} />
            <Stat label="Secret" value={result.secret ? "found" : "missed"} />
          </dl>
          <p className="flex items-center gap-1 font-extrabold text-ink">
            +{result.flowers} <ItemArt id="rose" size={22} /> to spend in the shop
          </p>
          {points !== null && points > 0 ? <p className="rounded-full bg-soft px-4 py-1.5 text-sm font-black text-btn">+{points} points in ur rewards ☺️</p> : null}
          <div className="flex flex-wrap justify-center gap-2">
            {hasNext ? (
              <GButton onClick={onNext} autoFocus>
                Next Date
              </GButton>
            ) : null}
            <GButton variant="soft" onClick={onReplay}>
              Replay
            </GButton>
            <GButton variant="soft" onClick={onShop}>
              Shop
            </GButton>
            <GButton variant="ghost" onClick={onMenu}>
              Menu
            </GButton>
          </div>
        </div>
      </Pop>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-page px-2 py-2">
      <dt className="text-xs font-extrabold text-muted">{label}</dt>
      <dd className="text-lg font-black tabular-nums text-ink">{value}</dd>
      {hint ? <dd className="text-[11px] font-bold text-btn">{hint}</dd> : null}
    </div>
  );
}

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// ---------------------------------------------------------------------------
// Pause
// ---------------------------------------------------------------------------

export function Pause({ onResume, onRestart, onHow, onSettings, onQuit }: { onResume: () => void; onRestart: () => void; onHow: () => void; onSettings: () => void; onQuit: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape" || e.code === "KeyP") {
        e.preventDefault();
        onResume();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onResume]);
  return (
    <div className="absolute inset-0 z-30 flex overflow-y-auto bg-ink/45 p-3" role="dialog" aria-modal="true" aria-label="Paused">
      <Pop className="m-auto flex w-full max-w-xs flex-col gap-2 rounded-[32px] bg-white p-4 shadow-pop">
        <h3 className="mb-1 text-center font-script text-4xl leading-none text-btn">Paused</h3>
        <GButton onClick={onResume} autoFocus>
          Keep Playing
        </GButton>
        <GButton variant="soft" onClick={onRestart}>
          Restart Date
        </GButton>
        <GButton variant="soft" onClick={onHow}>
          How to Play
        </GButton>
        <GButton variant="soft" onClick={onSettings}>
          Settings
        </GButton>
        <GButton variant="ghost" onClick={onQuit}>
          Quit to Menu
        </GButton>
        <p className="text-center text-xs font-bold text-muted">Flowers from this run only save when u finish the date</p>
      </Pop>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Little overlays
// ---------------------------------------------------------------------------

export function LevelIntro({ level }: { level: LevelDef }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const tl = gsap.timeline();
    tl.fromTo(ref.current, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" });
    tl.to(ref.current, { opacity: 0, y: -10, duration: 0.5, delay: 2.4 });
  });
  return (
    <div ref={ref} className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-3xl bg-white/95 px-5 py-2 text-center shadow-pop" style={{ marginTop: "env(safe-area-inset-top)" }}>
      <p className="text-xs font-black uppercase tracking-widest text-btn">
        Level {level.id} &middot; {level.date}
      </p>
      <p className="font-script text-4xl leading-tight text-ink">{level.place.split(",")[0]}</p>
    </div>
  );
}

export function GameToast({ text, id }: { text: string; id: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const tl = gsap.timeline();
      tl.fromTo(ref.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25 });
      tl.to(ref.current, { opacity: 0, duration: 0.4, delay: 2.6 });
    },
    { dependencies: [id], revertOnUpdate: true },
  );
  return (
    <div ref={ref} role="status" className="pointer-events-none absolute left-1/2 top-[22%] z-20 max-w-[80%] -translate-x-1/2 rounded-full bg-ink/85 px-4 py-2 text-center text-sm font-extrabold text-white">
      {text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Touch controls
// ---------------------------------------------------------------------------

const SIZES = { s: 60, m: 72, l: 86 };

/**
 * iPhone Safari treats a quick double tap as "zoom in", and one finger holding an arrow while
 * another taps jump as a pinch. Cancelling the touch events on the controls stops both; the
 * pointer events the buttons use still arrive.
 */
function useNoZoom() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    const opts = { passive: false } as const;
    el.addEventListener("touchstart", stop, opts);
    el.addEventListener("touchmove", stop, opts);
    el.addEventListener("touchend", stop, opts);
    return () => {
      el.removeEventListener("touchstart", stop);
      el.removeEventListener("touchmove", stop);
      el.removeEventListener("touchend", stop);
    };
  }, []);
  return ref;
}

export function TouchControls({ input, size, lefty, calls, layout, onPause }: { input: Input; size: "s" | "m" | "l"; lefty: boolean; calls: number; layout: "overlay" | "deck"; onPause: () => void }) {
  const px = SIZES[size];
  const pad = useRef<HTMLDivElement>(null);
  const leftZone = useNoZoom();
  const rightZone = useNoZoom();
  const padPointer = useRef<number | null>(null);

  const setDir = (dir: "left" | "right" | null) => {
    input.setTouch("left", dir === "left");
    input.setTouch("right", dir === "right");
  };
  const onPad = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.type === "pointerdown") {
      padPointer.current = e.pointerId;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (padPointer.current !== e.pointerId) return;
    if (e.type === "pointerup" || e.type === "pointercancel" || e.type === "lostpointercapture") {
      padPointer.current = null;
      setDir(null);
      return;
    }
    const r = pad.current!.getBoundingClientRect();
    setDir(e.clientX < r.left + r.width / 2 ? "left" : "right");
  };

  const hold = (b: Button) => ({
    onPointerDown: (e: RPointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      input.setTouch(b, true);
    },
    onPointerUp: () => input.setTouch(b, false),
    onPointerCancel: () => input.setTouch(b, false),
    onLostPointerCapture: () => input.setTouch(b, false),
    onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
  });

  const round = "flex items-center justify-center rounded-full select-none touch-none";
  const dpad = (
    <div
      ref={pad}
      onPointerDown={onPad}
      onPointerMove={onPad}
      onPointerUp={onPad}
      onPointerCancel={onPad}
      onLostPointerCapture={onPad}
      className="flex touch-none select-none gap-2"
      role="group"
      aria-label="Move"
    >
      <span className={cx(round, "bg-white/85 text-btn shadow-card ring-2 ring-soft")} style={{ width: px, height: px }}>
        <CaretLeftIcon size={px * 0.45} aria-hidden="true" />
      </span>
      <span className={cx(round, "bg-white/85 text-btn shadow-card ring-2 ring-soft")} style={{ width: px, height: px }}>
        <CaretRightIcon size={px * 0.45} aria-hidden="true" />
      </span>
    </div>
  );
  const actions = (
    <div className={cx("flex items-end gap-2", lefty && "flex-row-reverse")}>
      <div className="flex flex-col items-center gap-2">
        <button type="button" aria-label={`Call Jagath, ${calls} left`} disabled={calls <= 0} {...hold("call")} className={cx(round, "relative bg-white/85 text-bright shadow-card ring-2 ring-soft disabled:opacity-40")} style={{ width: px * 0.72, height: px * 0.72 }}>
          <HeartIcon size={px * 0.36} aria-hidden="true" />
          <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-btn text-[11px] font-black text-white">{calls}</span>
        </button>
        <button type="button" aria-label="Hide" {...hold("down")} className={cx(round, "bg-white/85 text-btn shadow-card ring-2 ring-soft")} style={{ width: px * 0.72, height: px * 0.72 }}>
          <ArrowDownIcon size={px * 0.34} aria-hidden="true" />
        </button>
      </div>
      <button type="button" aria-label="Jump" {...hold("jump")} className={cx(round, "bg-bright text-lg font-black text-white shadow-pop ring-4 ring-white/70")} style={{ width: px * 1.2, height: px * 1.2 }}>
        JUMP
      </button>
    </div>
  );
  const pause = (
    <button type="button" onClick={onPause} aria-label="Pause" className={cx(round, "press bg-white/90 text-btn shadow-card")} style={{ width: 44, height: 44 }}>
      <PauseIcon size={22} aria-hidden="true" />
    </button>
  );

  if (layout === "deck")
    return (
      <div ref={leftZone} className={cx("flex h-full items-center justify-between px-5", lefty && "flex-row-reverse")} style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {dpad}
        {actions}
      </div>
    );
  return (
    <>
      <div className="absolute z-10" style={{ top: "max(10px, env(safe-area-inset-top))", right: "max(12px, env(safe-area-inset-right))" }}>
        {pause}
      </div>
      <div className={cx("pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between", lefty && "flex-row-reverse")} style={{ padding: "0 max(18px, env(safe-area-inset-right)) max(14px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left))" }}>
        <div ref={leftZone} className="pointer-events-auto">
          {dpad}
        </div>
        <div ref={rightZone} className="pointer-events-auto">
          {actions}
        </div>
      </div>
    </>
  );
}

export function PauseCorner({ onPause, children }: { onPause: () => void; children?: ReactNode }) {
  return (
    <div className="absolute z-10 flex gap-2" style={{ top: "max(10px, env(safe-area-inset-top))", right: "max(12px, env(safe-area-inset-right))" }}>
      {children}
      <button type="button" onClick={onPause} aria-label="Pause" className="press flex size-11 items-center justify-center rounded-full bg-white/90 text-btn shadow-card">
        <PauseIcon size={22} aria-hidden="true" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Credits after the kiss
// ---------------------------------------------------------------------------

export function Credits({ points, onAgain, onMenu }: { points: number | null; onAgain: () => void; onMenu: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const items = box.current!.querySelectorAll("[data-line]");
    if (prefersReducedMotion()) {
      gsap.set(items, { opacity: 1 });
      return;
    }
    gsap.fromTo(items, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", stagger: 1.1, delay: 0.4 });
  });
  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-gradient-to-b from-[#ffd6e4] via-[#fff5f8] to-[#ffe3ec] p-6" role="dialog" aria-modal="true" aria-label="The end">
      <div ref={box} className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-3 text-center">
        <h2 data-line className="font-script text-6xl leading-none text-btn opacity-0">
          The End
        </h2>
        {CREDITS.map((l, i) => (
          <p key={i} data-line className={cx("opacity-0", i === 0 || i === CREDITS.length - 1 ? "font-script text-4xl text-btn" : "text-lg font-extrabold text-ink")}>
            {l}
          </p>
        ))}
        <div data-line className="mt-2 flex flex-col items-center gap-2 opacity-0">
          {points ? <p className="rounded-full bg-white px-4 py-1.5 text-sm font-black text-btn">+{points} points in ur rewards ☺️</p> : null}
          <p className="text-sm font-bold text-muted">Play again to find every secret and all 21 stars</p>
          <div className="flex gap-2">
            <GButton onClick={onAgain}>Play Again</GButton>
            <GButton variant="soft" onClick={onMenu}>
              Menu
            </GButton>
          </div>
        </div>
      </div>
    </div>
  );
}
