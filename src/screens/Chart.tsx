import { useRef, useState } from "react";
import { ChartBoard, type ChartBoardHandle } from "../chart/ChartBoard";
import { currentLevel, useData } from "../lib/data";
import { supabase } from "../lib/supabase";
import { must, useSave } from "../lib/save";
import { useConfetti } from "../confetti/Confetti";
import { AppealPanel } from "../components/Appeals";
import { useToast } from "../components/Toasts";
import { Sheet } from "../components/Sheet";
import { Button, Counter, LoadingScreen, PageTitle, Skeleton } from "../components/ui";
import { COPY } from "../lib/copy";
import { LEVELS, levelDef, levelIndex, piecesForDistance } from "../lib/levels";
import { fmtShortDate, fmtTime } from "../lib/format";

const NOTE_MAX = 80;

export function Chart() {
  const { status, levels, isNikita, photosOf, refresh, profiles } = useData();
  const board = useRef<ChartBoardHandle>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const save = useSave();
  const play = useConfetti();
  const toast = useToast();

  const current = levelIndex(currentLevel(levels));
  const latest = levels[0];
  const jagathPhoto = photosOf("jagath")[0]?.url ?? null;

  const cancel = () => {
    setPending(null);
    void board.current?.moveFaceTo(current, { duration: 0.5 });
    board.current?.setCurrent(current);
  };

  const confirm = async () => {
    if (pending === null || note.length > NOTE_MAX) return;
    const target = pending;
    const from = current;
    setBusy(true);
    await save(
      async () =>
        must(await supabase.from("behaviour_levels").insert({ level: LEVELS[target].id, note: note.trim() || null })),
      () => {
        const down = target > from;
        setPending(null);
        setNote("");
        board.current?.setCurrent(target);
        board.current?.playEffect(LEVELS[target].id);
        play({
          images: photosOf(down ? "nikita_sad" : "nikita_happy").map((p) => p.url!),
          shape: down ? "broken" : "heart",
          count: piecesForDistance(Math.abs(target - from)),
        });
        toast.show(down ? COPY.levelDown : COPY.levelUp);
        void refresh("levels");
      },
    );
    setBusy(false);
  };

  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.name ?? "";

  return (
    <>
      <PageTitle sub={isNikita ? "Drag his face, or tap a level" : "Only Nikita can move u"}>Boyfriend Behaviour Chart</PageTitle>

      {status === "loading" ? (
        <LoadingScreen>
          <Skeleton className="h-[592px]" />
        </LoadingScreen>
      ) : (
        <>
          <ChartBoard
            ref={board}
            current={current}
            mode={isNikita ? "nikita" : "view"}
            jagathPhoto={jagathPhoto}
            onRequestMove={(i) => {
              setNote("");
              setPending(i);
            }}
          />
          {latest ? (
            <div className="mt-3 px-1 text-center">
              {latest.note ? <p className="text-base font-bold text-ink break-words">&ldquo;{latest.note}&rdquo;</p> : null}
              <p className="text-sm font-semibold text-muted">Set {fmtShortDate(latest.created_at)}</p>
            </div>
          ) : null}

          <AppealPanel board={board} />

          <section aria-labelledby="chart-history" className="mt-8">
            <h2 id="chart-history" className="mb-3 text-xl font-black text-ink">
              History
            </h2>
            {levels.length === 0 ? (
              <p className="text-base font-bold text-muted">{COPY.emptyHistory}</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {levels.map((l) => {
                  const def = levelDef(l.level);
                  return (
                    <li key={l.id} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-card">
                      <span className="w-40 shrink-0 font-script text-[30px] leading-[1.2]" style={{ color: def.color }}>
                        {def.label}
                      </span>
                      <div className="min-w-0 flex-1 text-right">
                        {l.note ? <p className="text-sm font-bold text-ink break-words">{l.note}</p> : null}
                        <p className="text-xs font-semibold text-muted">
                          {fmtShortDate(l.created_at)}, {fmtTime(l.created_at)}
                          {nameOf(l.set_by) ? ` by ${nameOf(l.set_by)}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      )}

      <Sheet
        open={pending !== null}
        onClose={cancel}
        closeLabel="Cancel"
        title={
          pending !== null ? (
            <span className="font-script text-[44px] font-normal leading-[1.2]" style={{ color: LEVELS[pending].color }}>
              {LEVELS[pending].label}
            </span>
          ) : (
            ""
          )
        }
        description="Move Jagath here"
        footer={
          <>
            <Button onClick={confirm} busy={busy} disabled={note.length > NOTE_MAX}>
              Set Level
            </Button>
            <Button variant="ghost" onClick={cancel}>
              Cancel
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void confirm();
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex items-baseline justify-between">
            <label htmlFor="level-note" className="text-sm font-extrabold text-ink">
              Why (optional)
            </label>
            <Counter value={note} max={NOTE_MAX} />
          </div>
          <input
            id="level-note"
            name="note"
            type="text"
            autoComplete="off"
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="he forgot to text back…"
            className="field"
          />
        </form>
      </Sheet>
    </>
  );
}
