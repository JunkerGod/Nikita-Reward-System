import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";
import { HeartBreakIcon, HeartIcon } from "@phosphor-icons/react";
import { gsap, useGSAP, isLowPower, prefersReducedMotion } from "../lib/motion";

export type ConfettiShape = "heart" | "broken";

export interface ConfettiOptions {
  /** Face sticker image URLs. Empty means shapes only. */
  images: string[];
  /** Extra shapes mixed in: pink hearts or blue broken hearts. */
  shape: ConfettiShape;
  /** Pieces in the first wave. */
  count: number;
  /** Centre message, e.g. "YAY +10". */
  message?: string;
  /** Add a second wave. */
  secondWave?: boolean;
  /** Add a burst from the centre (redeeming). */
  burst?: boolean;
}

type Play = (opts: ConfettiOptions) => void;

const ConfettiContext = createContext<Play | null>(null);

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function preload(urls: string[]) {
  return Promise.all(
    [...new Set(urls)].map(
      (src) =>
        new Promise<string | null>((resolve) => {
          const img = new Image();
          img.decoding = "async";
          img.onload = () => resolve(src);
          img.onerror = () => resolve(null);
          img.src = src;
        }),
    ),
  ).then((r) => r.filter((x): x is string => x !== null));
}

export function ConfettiProvider({ children }: { children: ReactNode }) {
  const layer = useRef<HTMLDivElement>(null);
  const templates = useRef<HTMLDivElement>(null);
  const active = useRef<gsap.core.Timeline[]>([]);

  const { contextSafe } = useGSAP({ scope: layer });

  const clear = contextSafe(() => {
    active.current.forEach((tl) => tl.kill());
    active.current = [];
    if (layer.current) layer.current.replaceChildren();
    document.removeEventListener("pointerdown", clear, true);
  });

  const makePiece = (images: string[], shape: ConfettiShape, heartShare: number) => {
    const useFace = images.length > 0 && Math.random() >= heartShare;
    const size = useFace ? rand(36, 72) : rand(20, 34);
    let el: HTMLElement;
    if (useFace) {
      const img = document.createElement("img");
      img.src = pick(images);
      img.alt = "";
      img.width = Math.round(size);
      img.height = Math.round(size * 1.25);
      img.draggable = false;
      img.style.objectFit = "contain";
      el = img;
    } else {
      const tpl = templates.current?.querySelector(`[data-shape="${shape}"] svg`);
      const wrap = document.createElement("div");
      if (tpl) wrap.appendChild(tpl.cloneNode(true));
      wrap.style.width = wrap.style.height = `${size}px`;
      wrap.style.color = shape === "heart" ? pick(["#FF9EC0", "#E84A86", "#FFB3CE"]) : pick(["#6E8FC0", "#89A4C2", "#4F74A8"]);
      el = wrap;
    }
    el.setAttribute("aria-hidden", "true");
    el.className = "absolute left-0 top-0 will-change-transform";
    return { el, size };
  };

  const fallWave = (opts: ConfettiOptions, count: number, delay: number, tl: gsap.core.Timeline) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const heartShare = opts.images.length ? 0.2 : 1;
    for (let i = 0; i < count; i++) {
      const { el, size } = makePiece(opts.images, opts.shape, heartShare);
      layer.current!.appendChild(el);
      const duration = rand(2.5, 4);
      const start = delay + rand(0, 1.2);
      const sway = rand(18, 48) * (Math.random() < 0.5 ? -1 : 1);
      gsap.set(el, { x: rand(-size / 2, vw - size / 2), y: -size * 1.4, rotation: rand(-40, 40) });
      tl.to(el, { y: vh + size * 1.5, rotation: `+=${rand(-300, 300)}`, duration, ease: "power1.in" }, start)
        .to(el, { x: `+=${sway}`, duration: duration / 4, ease: "sine.inOut", yoyo: true, repeat: 3 }, start)
        .to(el, { scale: rand(1.06, 1.18), duration: duration / 6, ease: "sine.inOut", yoyo: true, repeat: 5 }, start)
        .call(() => el.remove(), undefined, start + duration);
    }
  };

  const burst = (opts: ConfettiOptions, count: number, tl: gsap.core.Timeline) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const vh = window.innerHeight;
    for (let i = 0; i < count; i++) {
      const { el, size } = makePiece(opts.images, opts.shape, 0.35);
      layer.current!.appendChild(el);
      const angle = (i / count) * Math.PI * 2 + rand(-0.2, 0.2);
      const dist = rand(110, 220);
      gsap.set(el, { x: cx - size / 2, y: cy - size / 2, scale: 0.2, opacity: 0 });
      tl.to(el, { x: `+=${Math.cos(angle) * dist}`, y: `+=${Math.sin(angle) * dist}`, scale: 1, opacity: 1, rotation: rand(-90, 90), duration: 0.55, ease: "power3.out" }, 0.05)
        .to(el, { y: vh + size * 2, rotation: `+=${rand(-200, 200)}`, duration: rand(1.6, 2.4), ease: "power2.in" }, 0.6)
        .call(() => el.remove(), undefined, 3.1);
    }
  };

  const showMessage = (text: string, image?: string) => {
    const box = document.createElement("div");
    box.className = "absolute inset-0 flex flex-col items-center justify-center gap-3";
    if (image) {
      const img = document.createElement("img");
      img.src = image;
      img.alt = "";
      img.width = 120;
      img.height = 150;
      img.style.objectFit = "contain";
      box.appendChild(img);
    }
    const msg = document.createElement("p");
    msg.className = "confetti-message";
    msg.textContent = text;
    box.appendChild(msg);
    layer.current!.appendChild(box);
    return box;
  };

  const play = useCallback<Play>(
    contextSafe((opts: ConfettiOptions) => {
      if (!layer.current) return;
      clear();
      void preload(opts.images).then(
        contextSafe((images: string[]) => {
          if (!layer.current) return;
          const o = { ...opts, images };
          const tl = gsap.timeline({ onComplete: clear });
          active.current.push(tl);
          document.addEventListener("pointerdown", clear, true);

          if (prefersReducedMotion()) {
            // Reduced motion: one sticker and the message fade in and out in the centre.
            const box = showMessage(o.message ?? "", images[0]);
            tl.fromTo(box, { opacity: 0 }, { opacity: 1, duration: 0.3 }).to(box, { opacity: 0, duration: 0.4 }, "+=1.6");
            return;
          }

          const cap = isLowPower() ? 20 : Infinity;
          const first = Math.min(o.count, cap);
          fallWave(o, first, 0, tl);
          if (o.secondWave && cap === Infinity) fallWave(o, Math.round(o.count * 0.7), 1.3, tl);
          if (o.burst) burst(o, cap === Infinity ? 16 : 8, tl);
          if (o.message) {
            const box = showMessage(o.message);
            const msg = box.querySelector("p");
            tl.fromTo(msg, { scale: 0.3, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.9, ease: "elastic.out(1, 0.45)" }, 0.05)
              .to(msg, { opacity: 0, scale: 0.9, duration: 0.35, ease: "power2.in" }, 2)
              .call(() => box.remove(), undefined, 2.4);
          }
        }),
      );
    }),
    [],
  );

  const value = useMemo(() => play, [play]);

  return (
    <ConfettiContext.Provider value={value}>
      {children}
      <div
        ref={layer}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
      />
      <div ref={templates} hidden>
        <span data-shape="heart">
          <HeartIcon weight="fill" size="100%" />
        </span>
        <span data-shape="broken">
          <HeartBreakIcon weight="fill" size="100%" />
        </span>
      </div>
    </ConfettiContext.Provider>
  );
}

export function useConfetti() {
  const ctx = useContext(ConfettiContext);
  if (!ctx) throw new Error("useConfetti outside ConfettiProvider");
  return ctx;
}
