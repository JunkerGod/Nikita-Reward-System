import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useData } from "../lib/data";
import { useConfetti } from "../confetti/Confetti";
import { earnMessage } from "../lib/copy";
import { levelIndex } from "../lib/levels";
import type { BehaviourLevel, LevelId, Seen } from "../lib/types";
import { JagathPopup } from "../chart/JagathPopup";
import { BADGES, badgeContext, unlockedBadges, type BadgeDef } from "../lib/badges";
import { celebrationFaces, celebrationText, isToday } from "../lib/specialDays";
import { BadgeDialog } from "./BadgeDialog";

/**
 * Replays celebrations the other person triggered:
 * - Nikita sees face confetti for points Jagath added while she wasn't looking.
 * - Jagath gets a one-time pop-up when Nikita moved him on the chart.
 * - Each of us celebrates newly unlocked badges once.
 * - On a special day, the first open on each phone rains the right faces.
 */
export function Replays() {
  const data = useData();
  const play = useConfetti();
  const { me, isNikita, isJagath, seen, levels, onRealtime, photosOf, specialDays } = data;
  const seenRef = useRef(seen);
  const busy = useRef(false);
  const [move, setMove] = useState<{ from: LevelId; to: BehaviourLevel } | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<BadgeDef[]>([]);

  useEffect(() => {
    // Only move forward: the local copy may be newer than the last fetch.
    if (!seen) return;
    const cur = seenRef.current;
    const later = (a: string | null, b: string | null | undefined) => ((b ?? "") > (a ?? "") ? (b ?? null) : a);
    seenRef.current = {
      ...seen,
      last_seen_transaction_at: later(seen.last_seen_transaction_at, cur?.last_seen_transaction_at),
      last_seen_behaviour_at: later(seen.last_seen_behaviour_at, cur?.last_seen_behaviour_at),
      badges_seen: [...new Set([...(seen.badges_seen ?? []), ...(cur?.badges_seen ?? [])])],
    };
  }, [seen]);

  const happy = photosOf("nikita_happy");
  const happyRef = useRef(happy);
  happyRef.current = happy;

  const markSeen = useCallback(
    async (patch: Partial<Omit<Seen, "user_id">>) => {
      if (!me) return;
      seenRef.current = {
        user_id: me.id,
        last_seen_transaction_at: null,
        last_seen_behaviour_at: null,
        badges_seen: [],
        ...seenRef.current,
        ...patch,
      };
      await supabase.from("seen").upsert({ user_id: me.id, ...patch });
    },
    [me],
  );

  // Nikita: points added by Jagath since she last looked.
  const checkPoints = useCallback(async () => {
    if (!isNikita || !me || busy.current || document.visibilityState !== "visible") return;
    busy.current = true;
    try {
      const since = seenRef.current?.last_seen_transaction_at ?? new Date(0).toISOString();
      const { data: rows, error } = await supabase
        .from("transactions")
        .select("points,created_at")
        .eq("type", "earn")
        .neq("added_by", me.id)
        .gt("created_at", since)
        .order("created_at", { ascending: true });
      if (error || !rows?.length) return;
      const total = rows.reduce((sum, r) => sum + (r.points as number), 0);
      await markSeen({ last_seen_transaction_at: rows[rows.length - 1].created_at as string });
      play({
        images: happyRef.current.map((p) => p.url!),
        shape: "heart",
        count: total >= 50 ? 60 : 36,
        secondWave: total >= 50,
        message: earnMessage(total),
      });
    } finally {
      busy.current = false;
    }
  }, [isNikita, me, markSeen, play]);

  // Jagath: chart changes by Nikita since he last looked.
  const checkChart = useCallback(() => {
    if (!isJagath || !me || document.visibilityState !== "visible") return;
    const since = seenRef.current?.last_seen_behaviour_at ?? "";
    const unseen = levels.filter((l) => l.created_at > since && l.set_by !== me.id);
    if (!unseen.length) return;
    const latest = unseen[0];
    const before = levels.find((l) => l.created_at <= since);
    const from = before?.level ?? "good_boy";
    void markSeen({ last_seen_behaviour_at: latest.created_at });
    if (levelIndex(from) === levelIndex(latest.level)) return;
    setMove({ from, to: latest });
  }, [isJagath, me, levels, markSeen]);

  useEffect(() => {
    void checkPoints();
    const offRealtime = onRealtime((e) => {
      if (e.table === "transactions" && e.eventType === "INSERT") window.setTimeout(() => void checkPoints(), 250);
    });
    const onVisible = () => void checkPoints();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      offRealtime();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [checkPoints, onRealtime]);

  useEffect(() => {
    if (!move) checkChart();
  }, [checkChart, move]);

  useEffect(() => {
    const onVisible = () => checkChart();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [checkChart]);

  // Badges: celebrate anything unlocked since this person last looked.
  const ctx = badgeContext(data);
  const unlockedKey = unlockedBadges(ctx)
    .map((b) => b.id)
    .join(",");
  useEffect(() => {
    if (move || badgeQueue.length || !seenRef.current) return;
    const seenIds = new Set(seenRef.current.badges_seen ?? []);
    const fresh = unlockedKey ? unlockedKey.split(",").filter((id) => !seenIds.has(id)) : [];
    if (!fresh.length) return;
    setBadgeQueue(BADGES.filter((b) => fresh.includes(b.id)));
  }, [unlockedKey, move, badgeQueue.length]);

  const closeBadge = () => {
    const [done, ...rest] = badgeQueue;
    const ids = [...new Set([...(seenRef.current?.badges_seen ?? []), done.id])];
    void markSeen({ badges_seen: ids });
    setBadgeQueue(rest);
  };

  // Special days: once per day on each phone.
  const todays = specialDays.filter((d) => isToday(d));
  const todayKey = todays.map((d) => d.id).join(",");
  useEffect(() => {
    if (!todayKey || !me) return;
    const stamp = new Date().toDateString();
    const sd = specialDays.find((d) => todayKey.startsWith(d.id));
    if (!sd) return;
    const key = `special:${sd.id}:${stamp}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // Private mode: celebrate anyway.
    }
    const images = celebrationFaces(sd).flatMap((k) => photosOf(k).map((p) => p.url!));
    const t = window.setTimeout(() => {
      play({ images, shape: "heart", count: 50, secondWave: true, burst: true, message: celebrationText(sd, me.role).title });
    }, 900);
    return () => window.clearTimeout(t);
  }, [todayKey, me?.role]);

  if (move) return <JagathPopup from={move.from} to={move.to} onClose={() => setMove(null)} />;
  if (badgeQueue.length) return <BadgeDialog key={badgeQueue[0].id} badge={badgeQueue[0]} onClose={closeBadge} />;
  return null;
}
