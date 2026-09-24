import type { Appeal, BehaviourLevel, Redemption, Stats, Streak, Wish } from "./types";

export interface BadgeContext {
  earned: number;
  bestStreak: number;
  redeemed: number;
  goodBoyDays: number;
  appealsWon: number;
  wishesGranted: number;
}

export interface BadgeDef {
  id: string;
  title: string;
  hint: string;
  icon: "trophy" | "star" | "crown" | "fire" | "gift" | "seal" | "chat" | "sparkle" | "heart" | "medal";
  value: (c: BadgeContext) => number;
  target: number;
}

export const BADGES: BadgeDef[] = [
  { id: "points_100", title: "First 100", hint: "Earn 100 points", icon: "star", value: (c) => c.earned, target: 100 },
  { id: "points_250", title: "Quarter K", hint: "Earn 250 points", icon: "sparkle", value: (c) => c.earned, target: 250 },
  { id: "points_500", title: "500 Club", hint: "Earn 500 points", icon: "medal", value: (c) => c.earned, target: 500 },
  { id: "points_1000", title: "1K Legend", hint: "Earn 1,000 points", icon: "trophy", value: (c) => c.earned, target: 1000 },
  { id: "points_2500", title: "Superstar", hint: "Earn 2,500 points", icon: "crown", value: (c) => c.earned, target: 2500 },
  { id: "points_5000", title: "Hall of Fame", hint: "Earn 5,000 points", icon: "crown", value: (c) => c.earned, target: 5000 },
  { id: "streak_7", title: "On Fire", hint: "7 day streak", icon: "fire", value: (c) => c.bestStreak, target: 7 },
  { id: "streak_30", title: "Unstoppable", hint: "30 day streak", icon: "fire", value: (c) => c.bestStreak, target: 30 },
  { id: "redeem_1", title: "Treat Yourself", hint: "Get ur first reward", icon: "gift", value: (c) => c.redeemed, target: 1 },
  { id: "redeem_10", title: "Big Spender", hint: "Get 10 rewards", icon: "gift", value: (c) => c.redeemed, target: 10 },
  { id: "goodboy_7", title: "Certified Good Boy", hint: "Jagath stays Good Boy for 7 days", icon: "seal", value: (c) => c.goodBoyDays, target: 7 },
  { id: "appeal_won", title: "Smooth Talker", hint: "Jagath wins an appeal", icon: "chat", value: (c) => c.appealsWon, target: 1 },
  { id: "wishes_3", title: "Wish Granted", hint: "3 wishes turned into rewards", icon: "heart", value: (c) => c.wishesGranted, target: 3 },
];

/** Longest time (in whole days) Jagath has stayed on each level. */
export function longestRuns(levels: BehaviourLevel[], now = Date.now()) {
  const asc = [...levels].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const best: Record<string, number> = {};
  const total: Record<string, number> = {};
  asc.forEach((l, i) => {
    const start = new Date(l.created_at).getTime();
    const end = i + 1 < asc.length ? new Date(asc[i + 1].created_at).getTime() : now;
    const ms = Math.max(0, end - start);
    best[l.level] = Math.max(best[l.level] ?? 0, ms);
    total[l.level] = (total[l.level] ?? 0) + ms;
  });
  const days = (ms: number) => Math.floor(ms / 86_400_000);
  return {
    bestDays: Object.fromEntries(Object.entries(best).map(([k, v]) => [k, days(v)])) as Record<string, number>,
    totalMs: total,
  };
}

export function badgeContext(input: {
  stats: Stats | null;
  streak: Streak;
  redemptions: Redemption[];
  levels: BehaviourLevel[];
  appeals: Appeal[];
  wishes: Wish[];
}): BadgeContext {
  return {
    earned: input.stats?.total_earned ?? 0,
    bestStreak: input.streak.best_streak,
    redeemed: input.redemptions.length,
    goodBoyDays: longestRuns(input.levels).bestDays.good_boy ?? 0,
    appealsWon: input.appeals.filter((a) => a.status === "accepted").length,
    wishesGranted: input.wishes.filter((w) => w.status === "added").length,
  };
}

export const unlockedBadges = (c: BadgeContext) => BADGES.filter((b) => b.value(c) >= b.target);
