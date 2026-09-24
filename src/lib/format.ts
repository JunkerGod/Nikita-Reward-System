const LOCALE = "en-AU";

const numberFmt = new Intl.NumberFormat(LOCALE);
const dayFmt = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long" });
const dayYearFmt = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: "numeric", minute: "2-digit" });
const relFmt = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

export const fmtNumber = (n: number) => numberFmt.format(n);
export const fmtPoints = (n: number) => `${numberFmt.format(n)} pts`;
export const fmtSigned = (type: "earn" | "spend", n: number) =>
  `${type === "earn" ? "+" : "−"}${numberFmt.format(n)}`;
export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));
export const fmtShortDate = (iso: string) => shortDateFmt.format(new Date(iso));

export function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function fmtDayHeading(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(d) - startOf(today)) / 86_400_000);
  if (diffDays === 0 || diffDays === -1) {
    const word = relFmt.format(diffDays, "day");
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
  return d.getFullYear() === today.getFullYear() ? dayFmt.format(d) : dayYearFmt.format(d);
}

export function isNew(iso: string) {
  return Date.now() - new Date(iso).getTime() < 3 * 86_400_000;
}
