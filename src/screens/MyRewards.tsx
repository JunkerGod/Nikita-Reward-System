import { useState } from "react";
import { CheckCircleIcon, GiftIcon } from "@phosphor-icons/react";
import { useData } from "../lib/data";
import { supabase } from "../lib/supabase";
import { must, useSave } from "../lib/save";
import { useToast } from "../components/Toasts";
import { COPY } from "../lib/copy";
import { fmtPoints, fmtShortDate } from "../lib/format";
import { NamedIcon } from "../lib/icons";
import { BackLink, Button, EmptyState, LoadingScreen, PageTitle, Skeleton } from "../components/ui";
import type { Redemption } from "../lib/types";

export function MyRewards() {
  const { status, redemptions, rewards, isJagath, refresh } = useData();
  const save = useSave();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  const waiting = redemptions.filter((r) => r.status === "claimed");
  const done = redemptions.filter((r) => r.status === "delivered");

  const deliver = async (r: Redemption) => {
    setBusyId(r.id);
    await save(
      async () =>
        must(await supabase.from("redemptions").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", r.id)),
      () => {
        toast.show("Oki done ☺️");
        void refresh("redemptions");
      },
    );
    setBusyId(null);
  };

  const row = (r: Redemption) => {
    const reward = rewards.find((x) => x.id === r.reward_id);
    const name = r.transaction?.label ?? reward?.name ?? "Reward";
    return (
      <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-4 shadow-card">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-soft text-btn">
          <NamedIcon name={reward?.icon ?? "gift"} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-black text-ink break-words">{name}</p>
          <p className="text-sm font-semibold text-muted">
            {r.transaction ? `${fmtPoints(r.transaction.points)}, ` : ""}
            {r.status === "delivered" && r.delivered_at ? `done ${fmtShortDate(r.delivered_at)}` : `got it ${fmtShortDate(r.redeemed_at)}`}
          </p>
        </div>
        {isJagath && r.status === "claimed" ? (
          <Button size="sm" busy={busyId === r.id} onClick={() => void deliver(r)}>
            <CheckCircleIcon size={18} aria-hidden="true" />
            Mark Delivered
          </Button>
        ) : null}
      </li>
    );
  };

  return (
    <>
      <BackLink />
      <PageTitle>My Rewards</PageTitle>

      {status === "loading" ? (
        <LoadingScreen>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-3 h-20" />
          <Skeleton className="mt-2 h-20" />
        </LoadingScreen>
      ) : (
        <>
          <section aria-labelledby="waiting" className="mb-8">
            <h2 id="waiting" className="mb-3 text-xl font-black text-ink">
              Waiting <span className="text-muted tabular-nums">{waiting.length || ""}</span>
            </h2>
            {waiting.length === 0 ? (
              <EmptyState icon={<CheckCircleIcon size={28} aria-hidden="true" />} message={COPY.emptyWaiting} />
            ) : (
              <ul className="flex flex-col gap-2">{waiting.map(row)}</ul>
            )}
          </section>
          <section aria-labelledby="done">
            <h2 id="done" className="mb-3 text-xl font-black text-ink">
              Done
            </h2>
            {done.length === 0 ? (
              <EmptyState icon={<GiftIcon size={28} aria-hidden="true" />} message={COPY.emptyHistory} />
            ) : (
              <ul className="flex flex-col gap-2">{done.map(row)}</ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
