import type { ItemId } from "./art/items";
import type { OutfitKey, PoseKind } from "./art/people";
import type { SongId } from "./engine/audio";

export const TILE = 32;

export type Theme = "mall" | "street" | "station" | "train" | "haymarket" | "booth" | "carpark" | "rooftop" | "river" | "arcade" | "outdoor";

export type Who = "n" | "j" | "c" | "a" | "neon";
export interface Line {
  who: Who;
  text: string;
}

export type PropKind =
  | "shop"
  | "stationSign"
  | "bench"
  | "busShelter"
  | "bridge"
  | "trainCar"
  | "arcade"
  | "hoop"
  | "claw"
  | "booth"
  | "sign"
  | "door"
  | "lamp"
  | "tree"
  | "car"
  | "tower"
  | "fence"
  | "fridge"
  | "arches"
  | "lanterns"
  | "levelNum"
  | "window"
  | "stairs"
  | "plant"
  | "pole"
  | "escalator"
  | "barberPole";

export interface Prop {
  kind: PropKind;
  label?: string;
  sub?: string;
  w?: number; // width in tiles
  h?: number;
  color?: string;
  variant?: number;
  front?: boolean;
}

export interface Story {
  id: string;
  lines: Line[];
  /** Where Jagath stands for this scene (relative to the anchor, in tiles). Omit to leave him out. */
  jag?: { dx: number; pose?: PoseKind; facing?: 1 | -1; stay?: boolean };
  npcs?: { who: "chichi" | "aayam"; dx: number; facing?: 1 | -1 }[];
  /** A small tip shown after the chat, like how to hide. */
  tip?: string;
}

export interface Anchor {
  prop?: Prop;
  story?: Story;
}

export interface Collectible {
  id: ItemId;
  name: string;
  note: string;
}

export interface LevelDef {
  id: number;
  date: string; // "13 September"
  short: string; // "13 Sep"
  place: string; // "Penrith"
  blurb: string;
  outfit: OutfitKey;
  song: SongId;
  rows: string[];
  zones: { at: number; theme: Theme }[];
  anchors: Record<string, Anchor>;
  keepsake: Collectible;
  secret: Collectible;
  outro: Line[];
  dark?: [number, number][];
  final?: boolean;
}
