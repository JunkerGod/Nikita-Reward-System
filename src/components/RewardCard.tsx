import type { ReactNode } from "react";
import { SparkleIcon } from "@phosphor-icons/react";
import { NamedIcon } from "../lib/icons";
import { fmtPoints, isNew } from "../lib/format";

export interface RewardCardData {
  name: string;
  icon: string;
  price: number;
  description: string | null;
  created_at: string;
  active: boolean;
}

/** One reward in the shop. The same card is used for the live preview in the form. */
export function RewardCard({
  reward,
  actions,
  status,
  headingLevel = "h3",
  preview = false,
}: {
  reward: RewardCardData;
  actions?: ReactNode;
  status?: ReactNode;
  headingLevel?: "h2" | "h3";
  preview?: boolean;
}) {
  const Heading = headingLevel;
  return (
    <article className={`flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card ${reward.active ? "" : "border-2 border-dashed border-mid"}`}>
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-soft text-btn">
          <NamedIcon name={reward.icon} size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Heading className="min-w-0 text-lg font-black leading-snug text-ink break-words">
              {reward.name || (preview ? "Reward name" : "")}
            </Heading>
            {isNew(reward.created_at) && reward.active ? (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-bright bg-surface px-2 py-0.5 text-xs font-black text-btn">
                <SparkleIcon size={12} className="text-bright" aria-hidden="true" />
                New
              </span>
            ) : null}
            {!reward.active ? (
              <span className="rounded-full bg-soft px-2 py-0.5 text-xs font-black text-ink">Hidden</span>
            ) : null}
          </div>
          {reward.description ? (
            <p className="mt-0.5 text-sm font-semibold text-muted break-words">{reward.description}</p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full bg-soft px-3 py-1 text-sm font-black text-ink tabular-nums">
          {fmtPoints(reward.price || 0)}
        </span>
      </div>
      {status}
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </article>
  );
}
