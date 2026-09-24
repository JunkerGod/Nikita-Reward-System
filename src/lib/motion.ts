import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, Draggable);

export const REDUCE = "(prefers-reduced-motion: reduce)";
export const FULL = "(prefers-reduced-motion: no-preference)";

// One app-wide gsap.matchMedia() keeps a live answer for imperative code (confetti, chart moves).
const motionState = { reduce: false };
gsap.matchMedia().add({ reduce: REDUCE, full: FULL }, (ctx) => {
  motionState.reduce = Boolean(ctx.conditions?.reduce);
});

export const prefersReducedMotion = () => motionState.reduce;

/** Small or low-power phones get fewer confetti pieces. */
export function isLowPower() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (
    window.innerWidth < 360 ||
    (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency < 4) ||
    (nav.deviceMemory !== undefined && nav.deviceMemory <= 2)
  );
}

export { gsap, Draggable, useGSAP };
