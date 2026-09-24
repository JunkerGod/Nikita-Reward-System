import { useEffect, useMemo, useState } from "react";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { useData } from "../lib/data";
import { supabase } from "../lib/supabase";
import { must, useSave } from "../lib/save";
import { Link, useHref, useRouter } from "../lib/router";
import { COPY } from "../lib/copy";
import { dayKey, fmtDayHeading, fmtSigned } from "../lib/format";
import { AnimatedNumber, BackLink, Button, EmptyState, ErrorState, LoadingScreen, PageTitle, Skeleton } from "../components/ui";
import { ConfirmDialog } from "../components/Sheet";
import { TransactionRow } from "../components/TransactionRow";
import type { Transaction } from "../lib/types";

const PAGE = 40;
type Filter = "all" | "earned" | "spent";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "earned", label: "Earned" },
  { id: "spent", label: "Spent" },
];

export function History() {
  const { stats, profiles, txVersion, refresh } = useData();
  const { search } = useRouter();
  const href = useHref();
  const save = useSave();
  const filter = (FILTERS.find((f) => f.id === search.get("filter"))?.id ?? "all") as Filter;

  const [pages, setPages] = useState(1);
  const [items, setItems] = useState<Transaction[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setPages(1), [filter]);

  useEffect(() => {
    let cancelled = false;
    const limit = pages * PAGE;
    let q = supabase.from("transactions").select("*").order("created_at", { ascending: false }).range(0, limit - 1);
    if (filter === "earned") q = q.eq("type", "earn");
    if (filter === "spent") q = q.eq("type", "spend");
    q.then(({ data, error }) => {
      if (cancelled) return;
      setLoadingMore(false);
      if (error) {
        console.error(error);
        setState((s) => (s === "ready" ? s : "error"));
        return;
      }
      setItems(data as Transaction[]);
      setHasMore((data?.length ?? 0) === limit);
      setState("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [filter, pages, txVersion, retryKey]);

  const groups = useMemo(() => {
    const out: { key: string; heading: string; items: Transaction[] }[] = [];
    for (const tx of items) {
      const key = dayKey(tx.created_at);
      const last = out[out.length - 1];
      if (last?.key === key) last.items.push(tx);
      else out.push({ key, heading: fmtDayHeading(tx.created_at), items: [tx] });
    }
    return out;
  }, [items]);

  const remove = async () => {
    if (!deleting) return;
    const tx = deleting;
    setBusy(true);
    await save(
      async () => must(await supabase.from("transactions").delete().eq("id", tx.id)),
      () => {
        setDeleting(null);
        setItems((list) => list.filter((x) => x.id !== tx.id));
        void refresh("stats", "recent", "redemptions");
      },
    );
    setBusy(false);
  };

  return (
    <>
      <BackLink />
      <PageTitle>History</PageTitle>

      <dl className="grid grid-cols-3 gap-2">
        {[
          { label: "Earned all time", value: stats?.total_earned ?? 0 },
          { label: "Spent", value: stats?.total_spent ?? 0 },
          { label: "This week", value: stats?.week_earned ?? 0 },
        ].map((s) => (
          <div key={s.label} className="flex flex-col-reverse rounded-2xl bg-surface p-3 shadow-card">
            <dt className="text-xs font-extrabold leading-tight text-muted">{s.label}</dt>
            <dd className="text-2xl font-black text-ink">
              <AnimatedNumber value={s.value} />
            </dd>
          </div>
        ))}
      </dl>

      <nav aria-label="Filter history" className="my-5 flex gap-2">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          return (
            <Link
              key={f.id}
              href={href({ filter: f.id === "all" ? null : f.id })}
              replace
              aria-current={active ? "page" : undefined}
              className={`press inline-flex min-h-10 items-center rounded-full px-4 text-sm font-extrabold transition-colors duration-150 ${
                active ? "bg-btn text-white" : "bg-surface text-ink ring-2 ring-inset ring-soft hover:ring-mid"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {state === "loading" ? (
        <LoadingScreen>
          <Skeleton className="h-5 w-32" />
          <div className="mt-2 flex flex-col gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[72px]" />
            ))}
          </div>
        </LoadingScreen>
      ) : state === "error" ? (
        <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />
      ) : items.length === 0 ? (
        <EmptyState icon={<ClockCounterClockwiseIcon size={28} aria-hidden="true" />} message={COPY.emptyHistory} />
      ) : (
        <>
          {groups.map((g) => {
            const net = g.items.reduce((sum, t) => sum + (t.type === "earn" ? t.points : -t.points), 0);
            return (
              <section key={g.key} aria-label={g.heading} className="cv-auto mb-5">
                <h2 className="mb-2 flex items-baseline justify-between px-1 text-sm font-black text-ink">
                  <span>{g.heading}</span>
                  <span className="tabular-nums text-muted">{fmtSigned(net >= 0 ? "earn" : "spend", Math.abs(net))}</span>
                </h2>
                <ul className="flex flex-col gap-2">
                  {g.items.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} profiles={profiles} onDelete={setDeleting} />
                  ))}
                </ul>
              </section>
            );
          })}
          {hasMore ? (
            <Button
              variant="secondary"
              className="w-full"
              busy={loadingMore}
              busyLabel={COPY.loading}
              onClick={() => {
                setLoadingMore(true);
                setPages((p) => p + 1);
              }}
            >
              Load More
            </Button>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
        busy={busy}
        confirmLabel="Delete Entry"
        description={
          deleting ? (
            <>
              &ldquo;{deleting.label}&rdquo; ({fmtSigned(deleting.type, deleting.points)}) goes away and the balance fixes itself
              {deleting.type === "spend" ? ", and the reward comes off My Rewards" : ""}
            </>
          ) : null
        }
      />
    </>
  );
}
