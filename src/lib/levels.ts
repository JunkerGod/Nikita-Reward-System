import type { LevelId } from "./types";

export interface LevelDef {
  id: LevelId;
  label: string;
  /** Text colour, darkened where needed so the script passes 3:1 as large text. */
  color: string;
}

export const LEVELS: LevelDef[] = [
  { id: "good_boy", label: "Mommy’s Good Boy", color: "#A67F2E" },
  { id: "ok_boy", label: "ok boy", color: "#B8558F" },
  { id: "thin_ice", label: "thin ice", color: "#758CAB" },
  { id: "bad_boy", label: "bad boy", color: "#FE5757" },
];

export const levelIndex = (id: LevelId) => LEVELS.findIndex((l) => l.id === id);
export const levelDef = (id: LevelId) => LEVELS[levelIndex(id)] ?? LEVELS[0];

/** Confetti pieces for a move of n levels: 30, 45 or 60. */
export const piecesForDistance = (n: number) => 15 + 15 * Math.min(Math.max(n, 1), 3);
