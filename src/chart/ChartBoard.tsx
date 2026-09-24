import { forwardRef, useImperativeHandle, useRef, type KeyboardEvent, type ReactNode } from "react";
import { SparkleIcon } from "@phosphor-icons/react";
import { Draggable, gsap, prefersReducedMotion, useGSAP } from "../lib/motion";
import { LEVELS } from "../lib/levels";
import type { LevelId } from "../lib/types";
import { FaceSticker } from "../components/FaceSticker";
import {
  BaroqueSwirl,
  BlossomBranch,
  Butterfly,
  CRACK_PATH,
  GoldDivider,
  GoldPeonyCorner,
  PetalShape,
  WatercolourCloud,
  WaveCorner,
} from "./Decorations";

export interface ChartBoardHandle {
  /** Slide (or jump) the face to a band. */
  moveFaceTo: (index: number, opts?: { animate?: boolean; duration?: number }) => Promise<void>;
  /** Play the band's own effect: shimmer, petals, crack or bars. */
  playEffect: (level: LevelId) => void;
  /** Show a band as the current one (full colour, slightly larger). */
  setCurrent: (index: number, animate?: boolean) => void;
  focusFace: () => void;
}

interface Props {
  /** Index of the current level (0 = Mommy's Good Boy). */
  current: number;
  /** "nikita": draggable + tappable. "view": read only. */
  mode: "nikita" | "view";
  jagathPhoto: string | null;
  compact?: boolean;
  /** Nikita dropped, tapped or arrowed to a different band. */
  onRequestMove?: (index: number) => void;
  /** Rendered under the chart, inside the same frame. */
  footer?: ReactNode;
  idPrefix?: string;
}

const FACE_W = 62;
const FACE_H = Math.round(FACE_W * 1.25);
const DIM = 0.45;

export const ChartBoard = forwardRef<ChartBoardHandle, Props>(function ChartBoard(
  { current, mode, jagathPhoto, compact = false, onRequestMove, footer, idPrefix = "chart" },
  ref,
) {
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const face = useRef<HTMLDivElement>(null);
  const shown = useRef(current); // band the face currently sits on
  const currentRef = useRef(current);
  const onMoveRef = useRef(onRequestMove);
  onMoveRef.current = onRequestMove;

  const bands = () => Array.from(list.current?.querySelectorAll<HTMLLIElement>("[data-band]") ?? []);
  const centerY = (i: number) => {
    const b = bands()[i];
    return b ? b.offsetTop + b.offsetHeight / 2 - FACE_H / 2 : 0;
  };
  const nearest = (y: number) => {
    let best = 0;
    let dist = Infinity;
    bands().forEach((_, i) => {
      const d = Math.abs(centerY(i) - y);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    return best;
  };

  const { contextSafe } = useGSAP(
    () => {
      const el = face.current!;
      // Place everything for the current level without animation.
      shown.current = currentRef.current;
      gsap.set(el, { y: centerY(currentRef.current) });
      paint(currentRef.current, null, false);

      const ro = new ResizeObserver(() => gsap.set(el, { y: centerY(shown.current) }));
      ro.observe(list.current!);

      if (mode !== "nikita") return () => ro.disconnect();

      const [drag] = Draggable.create(el, {
        type: "y",
        bounds: { minY: centerY(0) - 12, maxY: centerY(LEVELS.length - 1) + 12 },
        cursor: "grab",
        activeCursor: "grabbing",
        allowContextMenu: false,
        onPress() {
          this.applyBounds({ minY: centerY(0) - 12, maxY: centerY(LEVELS.length - 1) + 12 });
          document.body.classList.add("is-dragging");
          if (!prefersReducedMotion()) gsap.to(el, { rotation: -8, scale: 1.12, duration: 0.15, ease: "power2.out" });
        },
        onDrag() {
          paint(currentRef.current, nearest(this.y), true);
        },
        onRelease() {
          document.body.classList.remove("is-dragging");
          const target = nearest(this.y);
          settle(target);
          if (target !== currentRef.current) {
            shown.current = target;
            onMoveRef.current?.(target);
          } else {
            paint(currentRef.current, null, true);
          }
        },
      });
      // Only the face blocks touch scrolling; the rest of the page scrolls normally.
      el.style.touchAction = "none";

      return () => {
        ro.disconnect();
        drag.kill();
        document.body.classList.remove("is-dragging");
      };
    },
    { scope: root, dependencies: [mode, compact], revertOnUpdate: true },
  );

  // The level changed (saved here, or live from the other phone): glide the face over.
  const firstRun = useRef(true);
  useGSAP(
    () => {
      if (firstRun.current) {
        firstRun.current = false;
        return;
      }
      currentRef.current = current;
      if (shown.current !== current) {
        shown.current = current;
        if (prefersReducedMotion()) gsap.set(face.current, { y: centerY(current) });
        else gsap.to(face.current, { y: centerY(current), duration: 0.7, ease: "back.inOut(1.4)" });
      }
      paint(current, null, true);
    },
    { scope: root, dependencies: [current] },
  );

  /** Current band full colour and slightly larger; the others dimmed; the hover band lit. */
  function paint(cur: number, hover: number | null, animate: boolean) {
    bands().forEach((band, i) => {
      const label = band.querySelector("[data-label]");
      const lit = i === cur || i === hover;
      const vars = { opacity: lit ? 1 : DIM, duration: animate ? 0.2 : 0 };
      gsap.to(band.querySelector("[data-art]"), vars);
      gsap.to(label, { ...vars, scale: i === cur ? 1.08 : 1 });
      band.toggleAttribute("data-hover", hover === i && hover !== cur);
    });
  }

  function settle(target: number) {
    const el = face.current!;
    if (prefersReducedMotion()) {
      gsap.set(el, { y: centerY(target), rotation: 0, scale: 1 });
    } else {
      gsap.to(el, { y: centerY(target), rotation: 0, scale: 1, duration: 0.5, ease: "back.out(3)" });
    }
  }

  const requestMove = contextSafe((target: number) => {
    if (mode !== "nikita" || target === currentRef.current) return;
    shown.current = target;
    paint(currentRef.current, target, true);
    settle(target);
    onMoveRef.current?.(target);
  });

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (mode !== "nikita") return;
    const from = shown.current;
    let to = from;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") to = from - 1;
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") to = from + 1;
    else if (e.key === "Home" || e.key === "PageUp") to = 0;
    else if (e.key === "End" || e.key === "PageDown") to = LEVELS.length - 1;
    else return;
    e.preventDefault();
    requestMove(Math.max(0, Math.min(LEVELS.length - 1, to)));
  };

  const playEffect = contextSafe((level: LevelId) => {
    const band = list.current?.querySelector<HTMLElement>(`[data-band="${level}"]`);
    if (!band) return;
    const reduce = prefersReducedMotion();

    if (level === "good_boy") {
      const shimmer = band.querySelector("[data-fx=shimmer]");
      const sparkles = band.querySelectorAll("[data-fx=sparkle]");
      if (reduce) return;
      gsap.fromTo(shimmer, { xPercent: -160, opacity: 1 }, { xPercent: 320, duration: 1.1, ease: "power2.inOut", onComplete: () => void gsap.set(shimmer, { opacity: 0 }) });
      gsap.fromTo(
        sparkles,
        { scale: 0, opacity: 0, rotation: -30 },
        { scale: 1, opacity: 1, rotation: 20, duration: 0.35, ease: "back.out(3)", stagger: 0.09, yoyo: true, repeat: 1, repeatDelay: 0.35 },
      );
    }

    if (level === "ok_boy") {
      const petals = band.querySelectorAll<HTMLElement>("[data-fx=petal]");
      if (reduce) return;
      const h = band.offsetHeight;
      petals.forEach((p, i) => {
        gsap.fromTo(
          p,
          { y: -24, x: 0, opacity: 0, rotation: gsap.utils.random(-60, 60) },
          {
            keyframes: [
              { opacity: 1, duration: 0.2 },
              { y: h + 10, x: gsap.utils.random(-30, 30), rotation: `+=${gsap.utils.random(120, 260)}`, duration: gsap.utils.random(1.6, 2.4), ease: "sine.inOut" },
              { opacity: 0, duration: 0.2 },
            ],
            delay: i * 0.12,
          },
        );
      });
    }

    if (level === "thin_ice") {
      const crack = band.querySelector("[data-fx=crack]");
      const reveal = band.querySelector("[data-fx=crack-reveal]");
      if (reduce) {
        gsap.fromTo(crack, { opacity: 0 }, { opacity: 1, duration: 0.2, yoyo: true, repeat: 1, repeatDelay: 1.2 });
        return;
      }
      gsap.fromTo(band, { x: 0 }, { keyframes: { x: [0, -7, 7, -5, 5, -2, 0] }, duration: 0.45, ease: "none" });
      gsap.set(crack, { opacity: 1 });
      gsap.fromTo(reveal, { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: "power2.out", delay: 0.1 });
      gsap.to(crack, { opacity: 0, duration: 0.6, delay: 2.2 });
    }

    if (level === "bad_boy") {
      const bars = band.querySelectorAll("[data-fx=bar]");
      if (reduce) return;
      gsap.fromTo(bars, { yPercent: -110 }, { yPercent: 0, duration: 0.7, ease: "bounce.out", stagger: 0.035 });
    }
  });

  useImperativeHandle(ref, () => ({
    moveFaceTo: (index, opts) =>
      new Promise<void>((resolve) => {
        const el = face.current;
        if (!el) return resolve();
        shown.current = index;
        if (opts?.animate === false || prefersReducedMotion()) {
          gsap.set(el, { y: centerY(index), rotation: 0, scale: 1 });
          resolve();
        } else {
          gsap.to(el, { y: centerY(index), rotation: 0, scale: 1, duration: opts?.duration ?? 0.9, ease: "back.inOut(1.4)", onComplete: resolve });
        }
      }),
    playEffect,
    setCurrent: (index, animate = true) => {
      currentRef.current = index;
      paint(index, null, animate);
    },
    focusFace: () => face.current?.focus(),
  }));

  const currentLabel = LEVELS[current]?.label ?? "";
  const bandMin = compact
    ? ["min-h-[112px]", "min-h-[96px]", "min-h-[96px]", "min-h-[96px]"]
    : ["min-h-[172px]", "min-h-[140px]", "min-h-[140px]", "min-h-[140px]"];

  return (
    <div ref={root} className="chart-frame relative overflow-hidden rounded-2xl bg-white shadow-card">
      <ol ref={list} aria-label="Boyfriend Behaviour Chart" className="relative">
        {LEVELS.map((level, i) => {
          const isCurrent = i === current;
          const label = (
            <span data-label className="band-label relative z-10 block origin-center" style={{ color: level.color }}>
              {level.label}
              {isCurrent ? <span className="sr-only">, current level</span> : null}
            </span>
          );
          return (
            <li
              key={level.id}
              data-band={level.id}
              data-current={isCurrent || undefined}
              className={`band relative flex items-center justify-center overflow-hidden ${bandMin[i]} ${
                level.id === "good_boy" ? "flex-col" : ""
              }`}
            >
              <div data-art className="pointer-events-none absolute inset-0" aria-hidden="true">
                <BandArt level={level.id} />
              </div>
              <BandFx level={level.id} idPrefix={`${idPrefix}-${i}`} />
              {mode === "nikita" ? (
                <button
                  type="button"
                  onClick={() => requestMove(i)}
                  className="band-button relative z-10 flex w-full flex-1 flex-col items-center justify-center self-stretch px-4 pr-20"
                >
                  {label}
                  {!isCurrent ? <span className="sr-only">, move Jagath here</span> : null}
                  {level.id === "good_boy" ? <GoldDivider className="relative z-10 mt-1 h-3 w-44" /> : null}
                </button>
              ) : (
                <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 pr-20">
                  {label}
                  {level.id === "good_boy" ? <GoldDivider className="relative z-10 mt-1 h-3 w-44" /> : null}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div
        ref={face}
        className="face-piece absolute right-3 top-0 z-20"
        style={{ width: FACE_W, height: FACE_H }}
        {...(mode === "nikita"
          ? {
              role: "slider",
              tabIndex: 0,
              "aria-label": "Jagath’s level",
              "aria-valuemin": 0,
              "aria-valuemax": LEVELS.length - 1,
              "aria-valuenow": LEVELS.length - 1 - current,
              "aria-valuetext": currentLabel,
              "aria-orientation": "vertical" as const,
              onKeyDown,
            }
          : { role: "img", "aria-label": `Jagath is on ${currentLabel}` })}
      >
        <FaceSticker src={jagathPhoto} kind="jagath" width={FACE_W} />
      </div>
      {footer}
    </div>
  );
});

function BandArt({ level }: { level: LevelId }) {
  switch (level) {
    case "good_boy":
      return (
        <>
          <GoldPeonyCorner className="absolute -left-3 -top-3 w-[42%] max-w-[210px]" />
          <GoldPeonyCorner flip className="absolute -right-3 -top-3 w-[42%] max-w-[210px]" />
        </>
      );
    case "ok_boy":
      return (
        <>
          <WatercolourCloud className="absolute inset-x-[6%] inset-y-[4%] h-[92%] w-[88%]" />
          <BlossomBranch className="absolute -left-2 top-1 w-[30%] max-w-[150px]" />
          <BlossomBranch flip variant={1} className="absolute -right-2 bottom-1 w-[30%] max-w-[150px]" />
          <Butterfly className="absolute bottom-3 right-[30%] w-9 rotate-12" />
        </>
      );
    case "thin_ice":
      return (
        <>
          <WaveCorner className="absolute bottom-0 left-0 w-[34%] max-w-[180px]" />
          <BaroqueSwirl className="absolute bottom-0 left-0 w-[26%] max-w-[140px]" />
          <WaveCorner rotate className="absolute right-0 top-0 w-[34%] max-w-[180px]" />
          <BaroqueSwirl rotate className="absolute right-0 top-0 w-[26%] max-w-[140px]" />
        </>
      );
    case "bad_boy":
      return (
        <div className="absolute inset-0 flex justify-around px-[3%]">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} data-fx="bar" className="jail-bar h-full w-[7px] rounded-full" />
          ))}
        </div>
      );
  }
}

/** Effect layers, hidden until an effect plays. The jail bars live in BandArt. */
function BandFx({ level, idPrefix }: { level: LevelId; idPrefix: string }) {
  if (level === "good_boy") {
    const spots = [
      ["18%", "30%"],
      ["76%", "24%"],
      ["30%", "72%"],
      ["64%", "70%"],
      ["50%", "16%"],
    ];
    return (
      <div className="pointer-events-none absolute inset-0 z-[15] overflow-hidden" aria-hidden="true">
        <div data-fx="shimmer" className="shimmer absolute inset-y-0 left-0 w-1/3 opacity-0" />
        {spots.map(([left, top], i) => (
          <SparkleIcon key={i} data-fx="sparkle" size={i % 2 ? 16 : 22} weight="fill" className="absolute opacity-0" style={{ left, top, color: "#C9A246" }} />
        ))}
      </div>
    );
  }
  if (level === "ok_boy") {
    return (
      <div className="pointer-events-none absolute inset-0 z-[15]" aria-hidden="true">
        {["12%", "26%", "44%", "58%", "70%", "84%", "36%"].map((left, i) => (
          <div key={i} data-fx="petal" className="absolute top-0 opacity-0" style={{ left }}>
            <PetalShape className="w-3" />
          </div>
        ))}
      </div>
    );
  }
  if (level === "thin_ice") {
    const clipId = `${idPrefix}-crack`;
    return (
      <svg data-fx="crack" viewBox="0 0 200 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-[15] h-full w-full opacity-0" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <rect data-fx="crack-reveal" x="0" y="0" width="200" height="100" style={{ transformBox: "fill-box", transformOrigin: "left center" }} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <path d={CRACK_PATH} fill="none" stroke="#5B7392" strokeWidth={0.9} vectorEffect="non-scaling-stroke" />
          <path d="M 58 38 L 62 26 L 70 20 M 116 57 L 120 70 L 128 76 M 166 48 L 170 36" fill="none" stroke="#5B7392" strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    );
  }
  return null;
}
