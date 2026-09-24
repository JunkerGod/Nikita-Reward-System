import { useEffect, useRef, useState } from "react";
import { Sheet } from "../components/Sheet";
import { Button } from "../components/ui";
import { ChartBoard, type ChartBoardHandle } from "./ChartBoard";
import { useData } from "../lib/data";
import { useConfetti } from "../confetti/Confetti";
import { COPY } from "../lib/copy";
import { levelDef, levelIndex, piecesForDistance } from "../lib/levels";
import { fmtShortDate } from "../lib/format";
import type { BehaviourLevel, LevelId } from "../lib/types";

/** Jagath's one-time pop-up after Nikita moves him on the chart. */
export function JagathPopup({ from, to, onClose }: { from: LevelId; to: BehaviourLevel; onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const board = useRef<ChartBoardHandle>(null);
  const { photosOf } = useData();
  const play = useConfetti();
  const fromIdx = levelIndex(from);
  const toIdx = levelIndex(to.level);
  const photosRef = useRef({ happy: photosOf("nikita_happy"), sad: photosOf("nikita_sad"), jagath: photosOf("jagath")[0]?.url ?? null });

  useEffect(() => {
    const t = window.setTimeout(async () => {
      await board.current?.moveFaceTo(toIdx, { duration: 1 });
      board.current?.setCurrent(toIdx);
      board.current?.playEffect(to.level);
      const down = toIdx > fromIdx;
      const images = (down ? photosRef.current.sad : photosRef.current.happy).map((p) => p.url!);
      play({ images, shape: down ? "broken" : "heart", count: piecesForDistance(Math.abs(toIdx - fromIdx)) });
    }, 450);
    return () => window.clearTimeout(t);
  }, [fromIdx, toIdx, to.level, play]);

  const close = () => {
    setOpen(false);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      variant="center"
      lightBackdrop
      title={COPY.movedTo(levelDef(to.level).label)}
      description={
        <>
          {to.note ? <span className="block text-ink">&ldquo;{to.note}&rdquo;</span> : null}
          <span className="block text-sm">{fmtShortDate(to.created_at)}</span>
        </>
      }
      footer={<Button onClick={close}>Got It</Button>}
    >
      <div className="chart-compact">
        <ChartBoard ref={board} current={fromIdx} mode="view" compact jagathPhoto={photosRef.current.jagath} idPrefix="popup" />
      </div>
    </Sheet>
  );
}
