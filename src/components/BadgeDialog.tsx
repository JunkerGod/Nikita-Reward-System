import { useEffect, useState } from "react";
import {
  ChatsCircleIcon,
  CrownIcon,
  FireIcon,
  GiftIcon,
  HeartIcon,
  MedalIcon,
  SealCheckIcon,
  SparkleIcon,
  StarIcon,
  TrophyIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { BadgeDef } from "../lib/badges";
import { useConfetti } from "../confetti/Confetti";
import { useData } from "../lib/data";
import { Sheet } from "./Sheet";
import { Button } from "./ui";

const ICONS: Record<BadgeDef["icon"], Icon> = {
  trophy: TrophyIcon,
  star: StarIcon,
  crown: CrownIcon,
  fire: FireIcon,
  gift: GiftIcon,
  seal: SealCheckIcon,
  chat: ChatsCircleIcon,
  sparkle: SparkleIcon,
  heart: HeartIcon,
  medal: MedalIcon,
};

/** Round badge medallion. Locked badges are drawn as an outline. */
export function BadgeMedal({ badge, locked = false, size = 64 }: { badge: BadgeDef; locked?: boolean; size?: number }) {
  const Cmp = ICONS[badge.icon];
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full ${
        locked ? "border-2 border-dashed border-mid bg-surface text-mid" : "bg-soft text-btn ring-4 ring-mid"
      }`}
      style={{ width: size, height: size }}
    >
      <Cmp size={Math.round(size * 0.5)} />
    </span>
  );
}

/** The big moment when a badge unlocks. */
export function BadgeDialog({ badge, onClose }: { badge: BadgeDef; onClose: () => void }) {
  const [open, setOpen] = useState(true);
  const play = useConfetti();
  const { photosOf } = useData();

  useEffect(() => {
    const t = window.setTimeout(() => {
      play({
        images: photosOf("nikita_happy").map((p) => p.url!),
        shape: "heart",
        count: 40,
        secondWave: true,
        burst: true,
      });
    }, 250);
    return () => window.clearTimeout(t);
    // Play once when the badge opens.
  }, []);

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
      title={"NEW BADGE \u{1F979}"}
      description="Unlocked just now"
      footer={<Button onClick={close}>Got It</Button>}
    >
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <BadgeMedal badge={badge} size={96} />
        <p className="text-2xl font-black text-ink">{badge.title}</p>
        <p className="text-base font-semibold text-muted">{badge.hint}</p>
      </div>
    </Sheet>
  );
}
