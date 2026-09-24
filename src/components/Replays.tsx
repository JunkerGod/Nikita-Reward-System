import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useData } from "../lib/data";
import { useConfetti } from "../confetti/Confetti";
import { earnMessage } from "../lib/copy";
import { levelIndex } from "../lib/levels";
import type { BehaviourLevel, LevelId } from "../lib/types";
import { JagathPopup } from "../chart/JagathPopup";

/**
 * Replays celebrations the other person triggered:
 * - Nikita sees face confetti for points Jagath added while she wasn't looking.
 * - Jagath gets a one-time pop-up when Nikita moved him on the chart.
 */
export function Replays() {
  const data = useData();
  const play = useConfetti();
  const { me, isNikita, isJagath, seen, levels, onRealtime, photosOf } = data;
  const seenRef = useRef(seen);
  const busy = useRef(false);
  const [move, setMove] = useState<{ from: LevelId; to: BehaviourLevel } | null>(null);

  useEffect(() => {
    // Only move forward: the local copy may be newer than the last fetch.
    if (!seen) return;
    const cur = seenRef.current;
    const later = (a: string | null, b: string | null | undefined) => ((b ?? "") > (a ?? "") ? (b ?? null) : a);
    seenRef.current = {
      ...seen,
      last_seen_transaction_at: later(seen.last_seen_transaction_at, cur?.last_seen_transaction_at),
      last_seen_behaviour_at: later(seen.last_seen_behaviour_at, cur?.last_seen_behaviour_at),
    };
  }, [seen]);

  const happy = photosOf("nikita_happy");
  const happyRef = useRef(happy);
  happyRef.current = happy;

  const markSeen = useCallback(
    async (patch: { last_seen_transaction_at?: string; last_seen_behaviour_at?: string }) => {
      if (!me) return;
      seenRef.current = { user_id: me.id, last_seen_transaction_at: null, last_seen_behaviour_at: null, ...seenRef.current, ...patch };
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

  return move ? <JagathPopup from={move.from} to={move.to} onClose={() => setMove(null)} /> : null;
}
