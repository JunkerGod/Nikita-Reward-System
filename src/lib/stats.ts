import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useData } from "./data";
import type { BehaviourLevel, LevelId, Transaction } from "./types";

export type Tx = Pick<Transaction, "id" | "type" | "points" | "label" | "created_at" | "added_by" | "bonus_key" | "reward_id">;

/** Every transaction (lightweight columns), refetched whenever points change. */
export function useAllTransactions() {
  const { txVersion } = useData();
  const [rows, setRows] = useState<Tx[] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all: Tx[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error: err } = await supabase
          .from("transactions")
          .select("id,type,points,label,created_at,added_by,bonus_key,reward_id")
          .order("created_at", { ascending: true })
          .range(from, from + 999);
        if (err) throw err;
        all.push(...(data as Tx[]));
        if (!data || data.length < 1000) break;
      }
      return all;
    })()
      .then((all) => {
        if (!cancelled) {
          setRows(all);
          setError(false);
        }
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [txVersion, retry]);

  return { rows, error, retry: () => setRetry((r) => r + 1) };
}

const DAY = 86_400_000;
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const startOfWeek = (d: Date) => {
  const s = startOfDay(d);
  return new Date(s.getTime() - ((s.getDay() + 6) % 7) * DAY);
};
export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

const earns = (txs: Tx[]) => txs.filter((t) => t.type === "earn");
const spends = (txs: Tx[]) => txs.filter((t) => t.type === "spend");
export const sum = (txs: Tx[]) => txs.reduce((s, t) => s + t.points, 0);
export const earnedSum = (txs: Tx[]) => sum(earns(txs));
export const spentSum = (txs: Tx[]) => sum(spends(txs));

export function inMonth(txs: Tx[], year: number, month: number) {
  return txs.filter((t) => {
    const d = new Date(t.created_at);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

/** Earned points per week for the last `weeks` weeks (oldest first). */
export function pointsPerWeek(txs: Tx[], weeks = 12, now = new Date()) {
  const thisWeek = startOfWeek(now).getTime();
  const out = Array.from({ length: weeks }, (_, i) => ({ start: new Date(thisWeek - (weeks - 1 - i) * 7 * DAY), value: 0 }));
  for (const t of earns(txs)) {
    const w = startOfWeek(new Date(t.created_at)).getTime();
    const idx = Math.round((w - out[0].start.getTime()) / (7 * DAY));
    if (idx >= 0 && idx < weeks) out[idx].value += t.points;
  }
  return out;
}

/** Earned points per day of a month. */
export function pointsPerDay(txs: Tx[], year: number, month: number) {
  const days = new Date(year, month + 1, 0).getDate();
  const out = Array.from({ length: days }, (_, i) => ({ start: new Date(year, month, i + 1), value: 0 }));
  for (const t of earns(inMonth(txs, year, month))) out[new Date(t.created_at).getDate() - 1].value += t.points;
  return out;
}

export function bestDay(txs: Tx[]) {
  const byDay = new Map<string, { date: Date; value: number }>();
  for (const t of earns(txs)) {
    const d = startOfDay(new Date(t.created_at));
    const k = dayKey(d);
    const cur = byDay.get(k) ?? { date: d, value: 0 };
    cur.value += t.points;
    byDay.set(k, cur);
  }
  return [...byDay.values()].sort((a, b) => b.value - a.value)[0] ?? null;
}

export const activeDays = (txs: Tx[]) => new Set(earns(txs).map((t) => dayKey(new Date(t.created_at)))).size;

/** Most frequent labels, e.g. favourite activity or reward. */
export function topLabels(txs: Tx[], n = 3) {
  const counts = new Map<string, { label: string; count: number; points: number }>();
  for (const t of txs) {
    const c = counts.get(t.label) ?? { label: t.label, count: 0, points: 0 };
    c.count += 1;
    c.points += t.points;
    counts.set(t.label, c);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || b.points - a.points).slice(0, n);
}

export const topActivities = (txs: Tx[], n = 3) => topLabels(earns(txs).filter((t) => !t.bonus_key), n);
export const topRewards = (txs: Tx[], n = 3) => topLabels(spends(txs), n);

const weekdayFmt = new Intl.DateTimeFormat("en-AU", { weekday: "long" });
export function busiestWeekday(txs: Tx[]) {
  const counts = new Array(7).fill(0) as number[];
  for (const t of earns(txs)) counts[new Date(t.created_at).getDay()] += t.points;
  const best = counts.indexOf(Math.max(...counts));
  if (counts[best] === 0) return null;
  return weekdayFmt.format(new Date(2026, 0, 4 + best)); // 4 Jan 2026 is a Sunday
}

export function averagePerWeek(txs: Tx[], now = new Date()) {
  const e = earns(txs);
  if (!e.length) return 0;
  const weeks = Math.max(1, (now.getTime() - new Date(e[0].created_at).getTime()) / (7 * DAY));
  return Math.round(sum(e) / weeks);
}

/** Share of time on each level, plus moves up and down. */
export function levelSummary(levels: BehaviourLevel[], from?: Date, to = new Date()) {
  const asc = [...levels].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const order: LevelId[] = ["good_boy", "ok_boy", "thin_ice", "bad_boy"];
  const ms: Record<LevelId, number> = { good_boy: 0, ok_boy: 0, thin_ice: 0, bad_boy: 0 };
  let up = 0;
  let down = 0;
  asc.forEach((l, i) => {
    const start = Math.max(new Date(l.created_at).getTime(), from?.getTime() ?? 0);
    const end = Math.min(i + 1 < asc.length ? new Date(asc[i + 1].created_at).getTime() : Date.now(), to.getTime());
    if (end > start) ms[l.level] += end - start;
    if (i > 0) {
      const inRange = new Date(l.created_at) >= (from ?? new Date(0)) && new Date(l.created_at) <= to;
      if (inRange) {
        const d = order.indexOf(l.level) - order.indexOf(asc[i - 1].level);
        if (d < 0) up += 1;
        if (d > 0) down += 1;
      }
    }
  });
  const total = Object.values(ms).reduce((a, b) => a + b, 0);
  const share = order.map((id) => ({ id, pct: total ? ms[id] / total : 0, days: ms[id] / DAY }));
  return { share, up, down };
}
