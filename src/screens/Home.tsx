import { CaretRightIcon, PlusCircleIcon, StorefrontIcon, TargetIcon } from "@phosphor-icons/react";
import { currentLevel, useData } from "../lib/data";
import { COPY, greeting } from "../lib/copy";
import { levelDef } from "../lib/levels";
import { fmtPoints } from "../lib/format";
import { NamedIcon } from "../lib/icons";
import { Link } from "../lib/router";
import { AnimatedNumber, ButtonLink, Card, EmptyState, LoadingScreen, PageTitle, ProgressBar, Skeleton } from "../components/ui";
import { FaceSticker } from "../components/FaceSticker";
import { TransactionRow } from "../components/TransactionRow";
import { CountdownCard, RecapCard, SpecialDayBanner, StreakChip } from "../components/HomeExtras";
import { AppealHomeCard } from "../components/Appeals";
import { NotificationPrompt } from "../components/Notifications";

export function Home() {
  const { status, me, isNikita, nikita, stats, rewards, levels, recent, profiles, photosOf } = useData();

  if (status === "loading" || !me) {
    return (
      <LoadingScreen>
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-6 h-36" />
        <Skeleton className="mt-4 h-28" />
        <Skeleton className="mt-4 h-24" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Skeleton className="h-14 rounded-full" />
          <Skeleton className="h-14 rounded-full" />
        </div>
        <Skeleton className="mt-8 h-16" />
        <Skeleton className="mt-2 h-16" />
      </LoadingScreen>
    );
  }

  const balance = stats?.balance ?? 0;
  const goal = rewards.find((r) => r.id === nikita?.goal_reward_id && r.active) ?? null;
  const level = levelDef(currentLevel(levels));
  const happy = photosOf("nikita_happy")[0]?.url ?? null;

  return (
    <>
      <PageTitle>{greeting(me.name, isNikita)}</PageTitle>

      <SpecialDayBanner />

      <section aria-label="Points" className="relative overflow-hidden rounded-2xl bg-soft px-5 py-6 shadow-card">
        <p className="text-base font-extrabold text-ink">{isNikita ? COPY.balanceLabel : "Nikita’s points"}</p>
        <p className="mt-1 text-[64px] font-black leading-none tracking-tight text-ink">
          <AnimatedNumber value={balance} />
        </p>
        <StreakChip />
        <FaceSticker src={happy} kind="nikita_happy" width={84} className="absolute -right-1 bottom-2 rotate-6" />
      </section>

      <AppealHomeCard />
      <NotificationPrompt />

      <Card className="mt-4">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-muted">
          <TargetIcon size={18} aria-hidden="true" />
          Saving for
        </h2>
        {goal ? (
          <div className="mt-2">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-soft text-btn">
                <NamedIcon name={goal.icon} size={24} />
              </span>
              <p className="min-w-0 flex-1 text-lg font-black text-ink break-words">{goal.name}</p>
              <span className="shrink-0 text-sm font-extrabold text-muted tabular-nums">{fmtPoints(goal.price)}</span>
            </div>
            <div className="mt-3">
              <ProgressBar value={balance / goal.price} label={`Progress to ${goal.name}`} />
            </div>
            <p className="mt-2 text-sm font-extrabold text-btn">
              {balance >= goal.price ? COPY.goalReached : COPY.notEnough(goal.price - balance)}
            </p>
          </div>
        ) : isNikita ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-base font-bold text-ink">Pick something to save for</p>
            <ButtonLink href="/shop" variant="secondary" size="sm">
              Pick A Goal
            </ButtonLink>
          </div>
        ) : (
          <p className="mt-2 text-base font-bold text-ink">She hasnt picked one yet</p>
        )}
      </Card>

      <Link
        href="/chart"
        className="press mt-4 flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-card transition-colors duration-150 hover:bg-[#fffafc]"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-muted">{isNikita ? "Jagath is on" : "Ur on"}</p>
          <p className="font-script text-[40px] leading-[1.25]" style={{ color: level.color }}>
            {level.label}
          </p>
        </div>
        <span className="sr-only">Open the Behaviour Chart</span>
        <CaretRightIcon size={22} className="shrink-0 text-muted" aria-hidden="true" />
      </Link>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <ButtonLink href="/add" size="lg" className="px-3 text-base">
          <PlusCircleIcon size={22} aria-hidden="true" />
          Add Points
        </ButtonLink>
        <ButtonLink href="/shop" size="lg" variant="secondary" className="px-3 text-base">
          <StorefrontIcon size={22} aria-hidden="true" />
          Reward Shop
        </ButtonLink>
      </div>

      <RecapCard />
      <CountdownCard />

      <section aria-labelledby="latest" className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="latest" className="text-xl font-black text-ink">
            Latest
          </h2>
          {recent.length ? (
            <Link href="/history" className="rounded-full px-2 py-1 text-sm font-extrabold text-btn underline-offset-4 hover:underline">
              See All
            </Link>
          ) : null}
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={<PlusCircleIcon size={28} aria-hidden="true" />} message={COPY.emptyHistory} />
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} profiles={profiles} showDate />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
