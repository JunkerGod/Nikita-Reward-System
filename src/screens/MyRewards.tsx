import { useState } from "react";
import { CalendarHeartIcon, CheckCircleIcon, GiftIcon, TicketIcon } from "@phosphor-icons/react";
import { useData } from "../lib/data";
import { supabase } from "../lib/supabase";
import { must, useSave } from "../lib/save";
import { useToast } from "../components/Toasts";
import { COPY } from "../lib/copy";
import { fmtPoints, fmtShortDate } from "../lib/format";
import { NamedIcon } from "../lib/icons";
import { BackLink, Button, EmptyState, LoadingScreen, PageTitle, Skeleton } from "../components/ui";
import { Sheet } from "../components/Sheet";
import type { Redemption } from "../lib/types";

const dayFmt = new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "short" });
const fmtDay = (d: string) => dayFmt.format(new Date(`${d}T00:00:00`));
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Redeemed rewards as coupons: ready to use, coming up, done. */
export function MyRewards() {
  const { status, redemptions, rewards, isJagath, isNikita, refresh } = useData();
  const save = useSave();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [using, setUsing] = useState<Redemption | null>(null);
  const [when, setWhen] = useState("");

  const ready = redemptions.filter((r) => r.status === "claimed");
  const coming = redemptions
    .filter((r) => r.status === "used")
    .sort((a, b) => (a.scheduled_for ?? "9999").localeCompare(b.scheduled_for ?? "9999"));
  const done = redemptions.filter((r) => r.status === "delivered");

  const nameOf = (r: Redemption) => r.transaction?.label ?? rewards.find((x) => x.id === r.reward_id)?.name ?? "Reward";

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

  const useIt = async () => {
    if (!using) return;
    const r = using;
    setBusyId(r.id);
    await save(
      async () => must(await supabase.rpc("use_coupon", { p_id: r.id, p_date: when || null })),
      () => {
        setUsing(null);
        setWhen("");
        toast.show("Oki he knows ☺️");
        void refresh("redemptions");
      },
    );
    setBusyId(null);
  };

  const ticket = (r: Redemption) => {
    const reward = rewards.find((x) => x.id === r.reward_id);
    const name = nameOf(r);
    return (
      <li key={r.id}>
        <article className={`relative flex overflow-hidden rounded-2xl bg-surface shadow-card`}>
          <div className="flex w-20 shrink-0 flex-col items-center justify-center gap-1 bg-soft p-2 text-btn">
            <NamedIcon name={reward?.icon ?? "gift"} size={30} />
            {r.transaction ? <span className="text-xs font-black tabular-nums text-ink">{fmtPoints(r.transaction.points)}</span> : null}
          </div>
          <div aria-hidden="true" className="relative w-0 border-l-2 border-dashed border-mid">
            <span className="absolute -left-[9px] -top-2 size-4 rounded-full bg-page" />
            <span className="absolute -bottom-2 -left-[9px] size-4 rounded-full bg-page" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
            <div>
              <h3 className="text-lg font-black leading-snug text-ink break-words">{name}</h3>
              <p className="text-sm font-semibold text-muted">
                {r.status === "delivered" && r.delivered_at
                  ? `Done ${fmtShortDate(r.delivered_at)}`
                  : r.status === "used"
                    ? r.scheduled_for
                      ? `Planned for ${fmtDay(r.scheduled_for)}`
                      : `Used ${fmtShortDate(r.used_at ?? r.redeemed_at)}`
                    : `Got it ${fmtShortDate(r.redeemed_at)}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isNikita && r.status === "claimed" ? (
                <Button size="sm" onClick={() => setUsing(r)}>
                  <TicketIcon size={18} aria-hidden="true" />
                  Use It
                </Button>
              ) : null}
              {isJagath && r.status !== "delivered" ? (
                <Button size="sm" variant={r.status === "used" ? "primary" : "secondary"} busy={busyId === r.id} onClick={() => void deliver(r)}>
                  <CheckCircleIcon size={18} aria-hidden="true" />
                  Mark Delivered
                </Button>
              ) : null}
            </div>
          </div>
        </article>
      </li>
    );
  };

  return (
    <>
      <BackLink />
      <PageTitle sub="Ur coupons">My Rewards</PageTitle>

      {status === "loading" ? (
        <LoadingScreen>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-3 h-28" />
          <Skeleton className="mt-2 h-28" />
        </LoadingScreen>
      ) : (
        <>
          {ready.length === 0 && coming.length === 0 ? (
            <EmptyState icon={<CheckCircleIcon size={28} aria-hidden="true" />} message={COPY.emptyWaiting} />
          ) : null}

          {coming.length ? (
            <section aria-labelledby="coming" className="mb-8">
              <h2 id="coming" className="mb-3 flex items-center gap-2 text-xl font-black text-ink">
                <CalendarHeartIcon size={22} className="text-btn" aria-hidden="true" />
                Coming up
              </h2>
              <ul className="flex flex-col gap-3">{coming.map(ticket)}</ul>
            </section>
          ) : null}

          {ready.length ? (
            <section aria-labelledby="ready" className="mb-8">
              <h2 id="ready" className="mb-3 flex items-center gap-2 text-xl font-black text-ink">
                <TicketIcon size={22} className="text-btn" aria-hidden="true" />
                Ready to use
              </h2>
              <ul className="flex flex-col gap-3">{ready.map(ticket)}</ul>
            </section>
          ) : null}

          <section aria-labelledby="done" className="mt-8">
            <h2 id="done" className="mb-3 text-xl font-black text-ink">
              Done
            </h2>
            {done.length === 0 ? (
              <EmptyState icon={<GiftIcon size={28} aria-hidden="true" />} message={COPY.emptyHistory} />
            ) : (
              <ul className="flex flex-col gap-3">{done.map(ticket)}</ul>
            )}
          </section>
        </>
      )}

      <Sheet
        open={!!using}
        onClose={() => setUsing(null)}
        title="Use Coupon"
        description={using ? nameOf(using) : undefined}
        footer={
          <>
            <Button onClick={() => void useIt()} busy={!!using && busyId === using.id}>
              <TicketIcon size={20} aria-hidden="true" />
              Use It
            </Button>
            <Button variant="ghost" onClick={() => setUsing(null)}>
              Cancel
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void useIt();
          }}
          className="flex flex-col gap-2"
        >
          <label htmlFor="coupon-date" className="text-sm font-extrabold text-ink">
            When (optional)
          </label>
          <input
            id="coupon-date"
            name="when"
            type="date"
            min={todayIso()}
            autoComplete="off"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="field bg-surface text-ink"
          />
          <p className="text-xs font-bold text-muted">He gets told straight away</p>
        </form>
      </Sheet>
    </>
  );
}
