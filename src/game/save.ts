import { supabase } from "../lib/supabase";
import type { OutfitKey } from "./art/people";
import type { Upgrades } from "./engine/world";

// Progress is kept on the phone and in Supabase (game_saves), so it follows her between devices.

export interface LevelProgress {
  done: boolean;
  stars: [boolean, boolean, boolean]; // keepsake, every flower, no hits
  best: number | null;
  keepsake: boolean;
  secret: boolean;
}

export interface GameSave {
  v: 1;
  bank: number;
  levels: Record<string, LevelProgress>;
  up: Upgrades;
  outfit: "auto" | OutfitKey;
  seenHow: boolean;
  finished: boolean;
  pending: { key: string; note: string }[];
  updatedAt: string;
}

export interface GameSettings {
  music: number;
  sfx: number;
  vibrate: boolean;
  buttons: "s" | "m" | "l";
  lefty: boolean;
}

export const emptySave = (): GameSave => ({
  v: 1,
  bank: 0,
  levels: {},
  up: { hearts: 0, doubleJump: false, magnet: false, longBoosts: false, calls: 1 },
  outfit: "auto",
  seenHow: false,
  finished: false,
  pending: [],
  updatedAt: new Date(0).toISOString(),
});

export const emptyLevel = (): LevelProgress => ({ done: false, stars: [false, false, false], best: null, keepsake: false, secret: false });

const LOCAL = (uid: string) => `nikitas-adventure:${uid}`;
const SETTINGS = "nikitas-adventure:settings";

function readLocal(uid: string): GameSave | null {
  try {
    const raw = localStorage.getItem(LOCAL(uid));
    return raw ? (JSON.parse(raw) as GameSave) : null;
  } catch {
    return null;
  }
}

function writeLocal(uid: string, s: GameSave) {
  try {
    localStorage.setItem(LOCAL(uid), JSON.stringify(s));
  } catch {
    // private mode or full storage: the cloud copy still works
  }
}

function normalise(s: Partial<GameSave> | null): GameSave {
  const base = emptySave();
  if (!s) return base;
  return { ...base, ...s, up: { ...base.up, ...(s.up ?? {}) }, levels: s.levels ?? {}, pending: s.pending ?? [] };
}

/** Load the newer of the local and cloud copies. */
export async function loadSave(uid: string): Promise<GameSave> {
  const local = readLocal(uid);
  let cloud: GameSave | null = null;
  try {
    const { data } = await supabase.from("game_saves").select("data").eq("user_id", uid).maybeSingle();
    cloud = (data?.data as GameSave | undefined) ?? null;
  } catch {
    // offline: use the phone copy
  }
  const pick = !cloud ? local : !local ? cloud : new Date(cloud.updatedAt) >= new Date(local.updatedAt) ? cloud : local;
  return normalise(pick);
}

let timer: number | null = null;

/** Save now on the phone, and soon to the cloud. */
export function storeSave(uid: string, s: GameSave) {
  writeLocal(uid, s);
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    void supabase.from("game_saves").upsert({ user_id: uid, data: s, updated_at: new Date().toISOString() });
  }, 800);
}

export function flushSave(uid: string, s: GameSave) {
  if (timer) window.clearTimeout(timer);
  timer = null;
  writeLocal(uid, s);
  void supabase.from("game_saves").upsert({ user_id: uid, data: s, updated_at: new Date().toISOString() });
}

export function loadSettings(): GameSettings {
  const base: GameSettings = { music: 0.5, sfx: 0.8, vibrate: true, buttons: "m", lefty: false };
  try {
    return { ...base, ...(JSON.parse(localStorage.getItem(SETTINGS) ?? "{}") as Partial<GameSettings>) };
  } catch {
    return base;
  }
}

export function storeSettings(s: GameSettings) {
  try {
    localStorage.setItem(SETTINGS, JSON.stringify(s));
  } catch {
    // ignore
  }
}

/** Send any rewards waiting to be paid. Returns the points actually added. */
export async function claimRewards(save: GameSave): Promise<{ save: GameSave; points: number }> {
  let points = 0;
  const left: GameSave["pending"] = [];
  for (const p of save.pending) {
    try {
      const { data, error } = await supabase.rpc("game_reward", { p_key: p.key, p_note: p.note });
      if (error) {
        left.push(p);
        continue;
      }
      const res = data as { status: string; points: number };
      if (res.status === "awarded") points += res.points;
      else if (res.status === "capped") left.push(p);
      // duplicate / not_allowed: drop it
    } catch {
      left.push(p);
    }
  }
  return { save: { ...save, pending: left }, points };
}
