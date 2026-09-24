import { useState, type RefObject } from "react";
import { GavelIcon, HourglassMediumIcon } from "@phosphor-icons/react";
import { currentLevel, useData } from "../lib/data";
import { supabase } from "../lib/supabase";
import { must, useSave } from "../lib/save";
import { useConfetti } from "../confetti/Confetti";
import { useToast } from "./Toasts";
import { Button, Counter } from "./ui";
import { Sheet } from "./Sheet";
import { Link } from "../lib/router";
import { COPY } from "../lib/copy";
import { LEVELS, levelIndex } from "../lib/levels";
import type { ChartBoardHandle } from "../chart/ChartBoard";
import type { LevelId } from "../lib/types";

const TEXT_MAX = 100;
const REPLY_MAX = 80;
const RECENT_MS = 3 * 86_400_000;

/** Appeals under the chart: Jagath asks to move up one level, Nikita decides. */
export function AppealPanel({ board }: { board: RefObject<ChartBoardHandle | null> }) {
  const { appeals, levels, isJagath, isNikita, refresh, photosOf } = useData();
  const save = useSave();
  const toast = useToast();
  const play = useConfetti();
  const [asking, setAsking] = useState(false);
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<"send" | "accept" | "deny" | null>(null);

  const current = currentLevel(levels);
  const idx = levelIndex(current);
  const pending = appeals.find((a) => a.status === "pending") ?? null;
  const lastDecided = appeals.find((a) => a.status !== "pending") ?? null;
  const showResult = !!lastDecided?.decided_at && Date.now() - new Date(lastDecided.decided_at).getTime() < RECENT_MS;
  const nextLabel = LEVELS[Math.max(0, idx - 1)].label;

  const send = async () => {
    const t = text.trim();
    if (!t || t.length > TEXT_MAX) return;
    setBusy("send");
    await save(
      async () => must(await supabase.from("appeals").insert({ text: t, from_level: current })),
      () => {
        setAsking(false);
        setText("");
        toast.show(COPY.wishSent);
        void refresh("appeals");
      },
    );
    setBusy(null);
  };

  const decide = async (accept: boolean) => {
    if (!pending) return;
    setBusy(accept ? "accept" : "deny");
    await save(
      async () =>
        must(await supabase.rpc("decide_appeal", { p_id: pending.id, p_accept: accept, p_reply: reply.trim() || null })) as LevelId | null,
      async (target) => {
        setReply("");
        if (accept && target) {
          const to = levelIndex(target);
          if (to !== idx) {
            await board.current?.moveFaceTo(to, { duration: 0.8 });
            board.current?.setCurrent(to);
            board.current?.playEffect(target);
          }
          play({ images: photosOf("nikita_happy").map((p) => p.url!), shape: "heart", count: 30 });
          toast.show(COPY.levelUp);
        } else {
          toast.show("Oki denied :(");
        }
        void refresh("appeals", "levels");
      },
    );
    setBusy(null);
  };

  if (isNikita && pending) {
    return (
      <section aria-labelledby="appeal-title" className="mt-4 rounded-2xl bg-surface p-4 shadow-card ring-2 ring-mid">
        <h2 id="appeal-title" className="flex items-center gap-2 text-lg font-black text-ink">
          <GavelIcon size={22} className="text-btn" aria-hidden="true" />
          Jagath made an appeal
        </h2>
        <p className="mt-1 text-sm font-semibold text-muted">He wants to move up to {nextLabel}</p>
        <p className="mt-3 rounded-2xl bg-page p-3 text-base font-bold text-ink break-words">&ldquo;{pending.text}&rdquo;</p>
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="appeal-reply" className="text-sm font-extrabold text-ink">
              Reply (optional)
            </label>
            <Counter value={reply} max={REPLY_MAX} />
          </div>
          <input
            id="appeal-reply"
            name="reply"
            type="text"
            autoComplete="off"
            maxLength={REPLY_MAX}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="fine but only bc of the bubble tea…"
            className="field"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button onClick={() => void decide(true)} busy={busy === "accept"} disabled={busy !== null}>
            Accept
          </Button>
          <Button variant="secondary" onClick={() => void decide(false)} busy={busy === "deny"} disabled={busy !== null}>
            Deny
          </Button>
        </div>
      </section>
    );
  }

  if (!isJagath) return null;

  return (
    <>
      {pending ? (
        <div className="mt-4 flex items-start gap-3 rounded-2xl bg-surface p-4 shadow-card">
          <HourglassMediumIcon size={24} className="mt-0.5 shrink-0 text-btn" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-extrabold text-ink">Appeal sent, waiting for Nikita</p>
            <p className="text-sm font-semibold text-muted break-words">&ldquo;{pending.text}&rdquo;</p>
          </div>
        </div>
      ) : (
        <>
          {showResult && lastDecided ? (
            <div className="mt-4 rounded-2xl bg-surface p-4 shadow-card" role="status">
              <p className="font-extrabold text-ink">
                {lastDecided.status === "accepted" ? "Appeal accepted ☺️" : "Nice try :("}
              </p>
              {lastDecided.reply ? <p className="text-sm font-semibold text-muted break-words">Nikita: &ldquo;{lastDecided.reply}&rdquo;</p> : null}
            </div>
          ) : null}
          {idx > 0 ? (
            <Button variant="secondary" className="mt-4 w-full" onClick={() => setAsking(true)}>
              <GavelIcon size={20} aria-hidden="true" />
              Make an Appeal
            </Button>
          ) : null}
        </>
      )}

      <Sheet
        open={asking}
        onClose={() => setAsking(false)}
        title="Make an Appeal"
        description={`Ask Nikita to move u up to ${nextLabel}`}
        footer={
          <>
            <Button onClick={() => void send()} busy={busy === "send"} busyLabel="Sending…" disabled={!text.trim() || text.length > TEXT_MAX}>
              Send Appeal
            </Button>
            <Button variant="ghost" onClick={() => setAsking(false)}>
              Cancel
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-baseline justify-between">
            <label htmlFor="appeal-text" className="text-sm font-extrabold text-ink">
              Why u deserve it
            </label>
            <Counter value={text} max={TEXT_MAX} />
          </div>
          <textarea
            id="appeal-text"
            name="appeal"
            rows={3}
            autoComplete="off"
            maxLength={TEXT_MAX}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="I brought u bubble tea…"
            className="field"
          />
        </form>
      </Sheet>
    </>
  );
}

/** Home card for Nikita when there's an appeal waiting. */
export function AppealHomeCard() {
  const { appeals, isNikita } = useData();
  const pending = appeals.find((a) => a.status === "pending");
  if (!isNikita || !pending) return null;
  return (
    <Link
      href="/chart"
      className="press mt-4 flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-card ring-2 ring-mid transition-colors duration-150 hover:bg-[#fffafc]"
    >
      <GavelIcon size={26} className="shrink-0 text-btn" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold text-ink">Jagath made an appeal</span>
        <span className="block truncate text-sm font-semibold text-muted">&ldquo;{pending.text}&rdquo;</span>
      </span>
      <span className="text-sm font-extrabold text-btn">Decide</span>
    </Link>
  );
}
