import { CalendarHeartIcon, CaretRightIcon, ConfettiIcon, FireIcon, SparkleIcon } from "@phosphor-icons/react";
import { useData } from "../lib/data";
import { Link } from "../lib/router";
import { celebrationText, daysUntil, isToday, nextOccurrence, prettyName, upcoming } from "../lib/specialDays";
import { FaceSticker } from "./FaceSticker";

const monthFmt = new Intl.DateTimeFormat("en-AU", { month: "long" });
const dateFmt = new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long" });

/** Flame + days in a row, shown on the balance card. */
export function StreakChip() {
  const { streak } = useData();
  const n = streak.current_streak;
  if (n < 1) return null;
  return (
    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-sm font-black text-ink shadow-card">
      <FireIcon size={18} className="text-btn" aria-hidden="true" />
      {n} day streak
    </p>
  );
}

/** Big banner on a special day itself. */
export function SpecialDayBanner() {
  const { specialDays, me, photosOf } = useData();
  if (!me) return null;
  const today = specialDays.filter((d) => isToday(d));
  if (!today.length) return null;
  return (
    <>
      {today.map((sd) => {
        const t = celebrationText(sd, me.role);
        const face =
          sd.kind === "birthday_jagath" ? photosOf("jagath")[0]?.url : photosOf("nikita_happy")[0]?.url;
        return (
          <section
            key={sd.id}
            aria-label={prettyName(sd.name)}
            className="relative mb-4 overflow-hidden rounded-2xl bg-btn px-5 py-5 text-white shadow-pop"
          >
            <ConfettiIcon size={28} aria-hidden="true" />
            <p className="mt-2 max-w-[75%] text-2xl font-black leading-tight text-balance">{t.title}</p>
            <p className="mt-1 max-w-[75%] text-base font-bold">{t.sub}</p>
            <FaceSticker
              src={face}
              kind={sd.kind === "birthday_jagath" ? "jagath" : "nikita_happy"}
              width={72}
              className="absolute -right-1 bottom-2 -rotate-6"
            />
          </section>
        );
      })}
    </>
  );
}

/** Countdown to the next special day (tomorrow onwards). */
export function CountdownCard() {
  const { specialDays } = useData();
  const next = upcoming(specialDays).find((d) => !isToday(d));
  if (!next) return null;
  const n = daysUntil(next);
  return (
    <Link
      href="/stats"
      className="press mt-4 flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-card transition-colors duration-150 hover:bg-[#fffafc]"
    >
      <span className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-soft text-ink">
        <span className="text-2xl font-black leading-none tabular-nums">{n}</span>
        <span className="text-[11px] font-extrabold">{n === 1 ? "day" : "days"}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold text-muted">{n === 1 ? "Tomorrow" : "Coming up"}</span>
        <span className="block font-black text-ink break-words">{prettyName(next.name)}</span>
        <span className="block text-sm font-semibold text-muted">{dateFmt.format(nextOccurrence(next))}</span>
      </span>
      <CalendarHeartIcon size={24} className="shrink-0 text-btn" aria-hidden="true" />
    </Link>
  );
}

/** First week of each month: last month's recap is ready. */
export function RecapCard() {
  const now = new Date();
  if (now.getDate() > 7) return null;
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const key = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}`;
  return (
    <Link
      href={`/recap?month=${key}`}
      className="press mt-4 flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-card ring-2 ring-soft transition-colors duration-150 hover:bg-[#fffafc]"
    >
      <SparkleIcon size={26} className="shrink-0 text-btn" aria-hidden="true" />
      <span className="min-w-0 flex-1 font-extrabold text-ink">Ur {monthFmt.format(last)} recap is ready {"☺️"}</span>
      <CaretRightIcon size={20} className="shrink-0 text-muted" aria-hidden="true" />
    </Link>
  );
}
