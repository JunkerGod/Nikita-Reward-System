import { CaretLeftIcon, CaretRightIcon, SparkleIcon } from "@phosphor-icons/react";
import { useData } from "../lib/data";
import { Link, useHref, useRouter } from "../lib/router";
import { activeDays, bestDay, earnedSum, inMonth, levelSummary, pointsPerDay, spentSum, topActivities, useAllTransactions } from "../lib/stats";
import { fmtNumber } from "../lib/format";
import { LEVELS } from "../lib/levels";
import { prettyName } from "../lib/specialDays";
import { BackLink, EmptyState, ErrorState, LoadingScreen, PageTitle, Skeleton } from "../components/ui";
import { BarChart, LevelShare, StatTile } from "../components/charts";

const monthFmt = new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" });
const shortDate = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });
const keyOf = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, "0")}`;

export function Recap() {
  const { levels, specialDays, appeals, redemptions } = useData();
  const { search } = useRouter();
  const href = useHref();
  const { rows, error, retry } = useAllTransactions();

  const now = new Date();
  const m = /^(\d{4})-(\d{2})$/.exec(search.get("month") ?? "");
  const year = m ? Number(m[1]) : now.getFullYear();
  const month = m ? Number(m[2]) - 1 : now.getMonth();
  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const isFuture = next > now;
  const title = monthFmt.format(new Date(year, month, 1));

  const nav = (
    <nav aria-label="Months" className="mb-5 flex items-center justify-between gap-2">
      <Link href={href({ month: keyOf(prev.getFullYear(), prev.getMonth()) })} replace className="press inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-sm font-extrabold text-btn hover:bg-soft/60">
        <CaretLeftIcon size={18} aria-hidden="true" />
        {monthFmt.format(prev).split(" ")[0]}
      </Link>
      {!isFuture ? (
        <Link href={href({ month: keyOf(next.getFullYear(), next.getMonth()) })} replace className="press inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-sm font-extrabold text-btn hover:bg-soft/60">
          {monthFmt.format(next).split(" ")[0]}
          <CaretRightIcon size={18} aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );

  if (!rows && !error) {
    return (
      <>
        <BackLink />
        <PageTitle>{title}</PageTitle>
        <LoadingScreen>
          <Skeleton className="h-32" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="mt-6 h-52" />
        </LoadingScreen>
      </>
    );
  }
  if (error || !rows) {
    return (
      <>
        <BackLink />
        <PageTitle>{title}</PageTitle>
        <ErrorState onRetry={retry} />
      </>
    );
  }

  const monthTx = inMonth(rows, year, month);
  const lastTx = inMonth(rows, prev.getFullYear(), prev.getMonth());
  const earned = earnedSum(monthTx);
  const lastEarned = earnedSum(lastTx);
  const change = lastEarned ? Math.round(((earned - lastEarned) / lastEarned) * 100) : null;
  const best = bestDay(monthTx);
  const tops = topActivities(monthTx, 3);
  const start = new Date(year, month, 1);
  const end = new Date(Math.min(next.getTime(), now.getTime()));
  const lvl = levelSummary(levels, start, end);
  const mostly = [...lvl.share].sort((a, b) => b.pct - a.pct)[0];
  const got = redemptions.filter((r) => {
    const d = new Date(r.redeemed_at);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const appealsIn = appeals.filter((a) => {
    const d = new Date(a.created_at);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const days = pointsPerDay(rows, year, month);
  const specials = specialDays.filter((d) => d.month === month + 1);

  return (
    <>
      <BackLink />
      <PageTitle sub="Monthly recap">{title}</PageTitle>
      {nav}

      {monthTx.length === 0 && appealsIn.length === 0 ? (
        <EmptyState icon={<SparkleIcon size={28} aria-hidden="true" />} message="Nothing this month yet :(" />
      ) : (
        <>
          <section aria-label="Summary" className="rounded-2xl bg-soft p-5 shadow-card">
            <p className="text-base font-extrabold text-ink">Points earned</p>
            <p className="text-[56px] font-black leading-none text-ink tabular-nums">{fmtNumber(earned)}</p>
            {change !== null ? (
              <p className="mt-2 text-sm font-extrabold text-ink">
                {change >= 0 ? `+${change}%` : `${change}%`} vs {monthFmt.format(prev).split(" ")[0]}
              </p>
            ) : null}
          </section>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <StatTile label="Spent" value={fmtNumber(spentSum(monthTx))} />
            <StatTile label="Days with points" value={activeDays(monthTx)} />
            <StatTile label="Best day" value={best ? `+${fmtNumber(best.value)}` : "None"} sub={best ? shortDate.format(best.date) : undefined} />
            <StatTile label="Rewards got" value={got.length} />
          </div>

          <div className="mt-6">
            <BarChart
              title="Points each day"
              bars={days.map((d, i) => ({
                label: shortDate.format(d.start),
                tick: i === 0 || (i + 1) % 7 === 0 ? String(i + 1) : undefined,
                value: d.value,
              }))}
            />
          </div>

          {tops.length ? (
            <section aria-labelledby="recap-top" className="mt-6">
              <h2 id="recap-top" className="mb-3 text-xl font-black text-ink">
                Top things she did
              </h2>
              <ol className="flex flex-col gap-2">
                {tops.map((t, i) => (
                  <li key={t.label} className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-card">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-black text-btn">{i + 1}</span>
                    <span className="min-w-0 flex-1 font-extrabold text-ink break-words">{t.label}</span>
                    <span className="shrink-0 text-sm font-bold text-muted">{t.count}x</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section aria-labelledby="recap-chart" className="mt-6">
            <h2 id="recap-chart" className="mb-1 text-xl font-black text-ink">
              Behaviour Chart
            </h2>
            <p className="mb-3 text-sm font-semibold text-muted">
              Mostly {LEVELS.find((l) => l.id === mostly.id)?.label}, moved up {lvl.up} and down {lvl.down}
              {appealsIn.length ? `, ${appealsIn.length} appeal${appealsIn.length === 1 ? "" : "s"}` : ""}
            </p>
            <LevelShare share={lvl.share} />
          </section>

          {specials.length ? (
            <section aria-labelledby="recap-special" className="mt-6">
              <h2 id="recap-special" className="mb-3 text-xl font-black text-ink">
                Special days
              </h2>
              <ul className="flex flex-col gap-2">
                {specials.map((d) => (
                  <li key={d.id} className="rounded-2xl bg-surface px-4 py-3 font-extrabold text-ink shadow-card">
                    {prettyName(d.name)}, {shortDate.format(new Date(year, d.month - 1, d.day))}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </>
  );
}
