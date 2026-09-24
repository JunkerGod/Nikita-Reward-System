import type { ReactNode } from "react";
import { useData } from "../lib/data";
import {
  averagePerWeek,
  bestDay,
  busiestWeekday,
  earnedSum,
  levelSummary,
  pointsPerWeek,
  spentSum,
  topActivities,
  topRewards,
  useAllTransactions,
} from "../lib/stats";
import { daysSince, daysUntil, nextOccurrence, prettyName, upcoming } from "../lib/specialDays";
import { BADGES, badgeContext, longestRuns } from "../lib/badges";
import { fmtNumber } from "../lib/format";
import { BackLink, ErrorState, LoadingScreen, PageTitle, Skeleton } from "../components/ui";
import { BarChart, LevelShare, StatTile } from "../components/charts";
import { BadgeMedal } from "../components/BadgeDialog";

const shortDate = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });
const longDate = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric" });

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="mb-3 text-xl font-black text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Stats() {
  const data = useData();
  const { status, specialDays, stats, streak, levels, appeals, wishes, redemptions } = data;
  const { rows, error, retry } = useAllTransactions();

  if (status === "loading" || (!rows && !error)) {
    return (
      <>
        <BackLink />
        <PageTitle>Us, in Numbers</PageTitle>
        <LoadingScreen>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="mt-8 h-52" />
        </LoadingScreen>
      </>
    );
  }
  if (error || !rows) {
    return (
      <>
        <BackLink />
        <PageTitle>Us, in Numbers</PageTitle>
        <ErrorState onRetry={retry} />
      </>
    );
  }

  const byKind = (k: string) => specialDays.find((d) => d.kind === k);
  const firstTalk = byKind("first_talk");
  const talked = daysSince(firstTalk);
  const dated = daysSince(byKind("first_date"));
  const together = daysSince(byKind("anniversary"));

  const weeks = pointsPerWeek(rows);
  const best = bestDay(rows);
  const favActivity = topActivities(rows, 1)[0];
  const favReward = topRewards(rows, 1)[0];
  const lvl = levelSummary(levels);
  const runs = longestRuns(levels);
  const ctx = badgeContext(data);
  const unlocked = BADGES.filter((b) => b.value(ctx) >= b.target);

  return (
    <>
      <BackLink />
      <PageTitle sub="All the cute numbers">Us, in Numbers</PageTitle>

      <Section id="stats-us" title="Us">
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            className="col-span-2 bg-soft"
            label="Since we first talked"
            value={talked !== null ? `${fmtNumber(talked)} days` : "Add the year"}
            sub={firstTalk?.year ? longDate.format(new Date(firstTalk.year, firstTalk.month - 1, firstTalk.day)) : "In Settings, Special days"}
          />
          <StatTile label="Together" value={together !== null ? `${fmtNumber(together)} days` : "Soon"} sub="Since our anniversary" />
          <StatTile label="Since our first date" value={dated !== null ? `${fmtNumber(dated)} days` : "Soon"} />
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {upcoming(specialDays).map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3 shadow-card">
              <span className="min-w-0">
                <span className="block font-extrabold text-ink break-words">{prettyName(d.name)}</span>
                <span className="block text-sm font-semibold text-muted">{shortDate.format(nextOccurrence(d))}</span>
              </span>
              <span className="shrink-0 text-right text-lg font-black text-btn tabular-nums">
                {daysUntil(d) === 0 ? "Today" : `${daysUntil(d)} days`}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="stats-points" title="Points">
        <div className="grid grid-cols-2 gap-3">
          <StatTile className="col-span-2" label="Earned all time" value={`${fmtNumber(earnedSum(rows))} pts`} sub={`${fmtNumber(stats?.balance ?? 0)} left to spend`} />
          <StatTile label="Spent on rewards" value={fmtNumber(spentSum(rows))} />
          <StatTile label="Average a week" value={fmtNumber(averagePerWeek(rows))} />
          <StatTile label="Best day" value={best ? `+${fmtNumber(best.value)}` : "None yet"} sub={best ? shortDate.format(best.date) : undefined} />
          <StatTile label="Busiest day" value={busiestWeekday(rows) ?? "None yet"} />
          <StatTile className="col-span-2" label="Favourite thing to do" value={favActivity?.label ?? "Nothing yet"} sub={favActivity ? `${favActivity.count} time${favActivity.count === 1 ? "" : "s"}` : undefined} />
        </div>
        <div className="mt-3">
          <BarChart
            title="Points each week"
            bars={weeks.map((w, i) => ({
              label: `Week of ${shortDate.format(w.start)}`,
              tick: i % 3 === 0 || i === weeks.length - 1 ? shortDate.format(w.start) : undefined,
              value: w.value,
            }))}
          />
        </div>
      </Section>

      <Section id="stats-streaks" title="Streaks">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Current streak" value={`${streak.current_streak} days`} />
          <StatTile label="Best streak" value={`${streak.best_streak} days`} />
        </div>
      </Section>

      <Section id="stats-chart" title="Behaviour Chart">
        <LevelShare share={lvl.share} />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatTile label="Longest Good Boy run" value={`${runs.bestDays.good_boy ?? 0} days`} />
          <StatTile label="Moves up / down" value={`${lvl.up} / ${lvl.down}`} />
          <StatTile label="Appeals won" value={appeals.filter((a) => a.status === "accepted").length} />
          <StatTile label="Appeals denied" value={appeals.filter((a) => a.status === "denied").length} />
        </div>
      </Section>

      <Section id="stats-rewards" title="Rewards">
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Rewards got" value={redemptions.length} />
          <StatTile label="Wishes granted" value={wishes.filter((w) => w.status === "added").length} />
          <StatTile className="col-span-2" label="Favourite reward" value={favReward?.label ?? "None yet"} sub={favReward ? `${favReward.count} time${favReward.count === 1 ? "" : "s"}` : undefined} />
        </div>
      </Section>

      <Section id="stats-badges" title={`Badges ${unlocked.length}/${BADGES.length}`}>
        <ul className="grid grid-cols-3 gap-3">
          {BADGES.map((b) => {
            const v = b.value(ctx);
            const got = v >= b.target;
            return (
              <li key={b.id} className="flex flex-col items-center gap-2 rounded-2xl bg-surface p-3 text-center shadow-card">
                <BadgeMedal badge={b} locked={!got} size={52} />
                <span className="text-sm font-black leading-tight text-ink">{b.title}</span>
                <span className="text-xs font-semibold leading-tight text-muted">
                  {got ? b.hint : `${fmtNumber(Math.min(v, b.target))}/${fmtNumber(b.target)}`}
                </span>
                <span className="sr-only">{got ? "Unlocked" : "Locked"}</span>
              </li>
            );
          })}
        </ul>
      </Section>
    </>
  );
}
