import type { PhotoKind, SpecialDay } from "./types";

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** The next date this special day happens (today counts). */
export function nextOccurrence(sd: SpecialDay, today = new Date()) {
  const t = startOfDay(today);
  let d = new Date(t.getFullYear(), sd.month - 1, sd.day);
  if (d < t) d = new Date(t.getFullYear() + 1, sd.month - 1, sd.day);
  return d;
}

export const daysUntil = (sd: SpecialDay, today = new Date()) =>
  Math.round((nextOccurrence(sd, today).getTime() - startOfDay(today).getTime()) / DAY);

export const isToday = (sd: SpecialDay, today = new Date()) => daysUntil(sd, today) === 0;

/** Whole years since the original date, as of its next occurrence. */
export function yearsAt(sd: SpecialDay, today = new Date()) {
  if (!sd.year) return null;
  return nextOccurrence(sd, today).getFullYear() - sd.year;
}

/** Days since the original date (null if no year is set or it's in the future). */
export function daysSince(sd: SpecialDay | undefined, today = new Date()) {
  if (!sd?.year) return null;
  const start = new Date(sd.year, sd.month - 1, sd.day);
  const diff = Math.round((startOfDay(today).getTime() - start.getTime()) / DAY);
  return diff >= 0 ? diff : null;
}

export function upcoming(days: SpecialDay[], today = new Date()) {
  return [...days].sort((a, b) => daysUntil(a, today) - daysUntil(b, today));
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Banner text for the day itself, in the app's voice. */
export function celebrationText(sd: SpecialDay, me: "jagath" | "nikita", today = new Date()) {
  const years = yearsAt(sd, today);
  switch (sd.kind) {
    case "birthday_nikita":
      return {
        title: me === "nikita" ? "HAPPY BIRTHDAY NIKITAAA \u{1F979}" : "Its Nikita’s birthday ☺️",
        sub: years ? `Nikita turns ${years} today` : "Its her day",
      };
    case "birthday_jagath":
      return {
        title: me === "jagath" ? "HAPPY BIRTHDAY JAGATH ☺️" : "Its Jagath’s birthday ☺️",
        sub: years ? `Jagath turns ${years} today` : "Its his day",
      };
    case "anniversary":
      return { title: "HAPPY ANNIVERSARY \u{1F979}", sub: years ? `${plural(years, "year")} together` : "Happy us day" };
    case "first_talk":
      return { title: "We first talked on this day ☺️", sub: years ? `${plural(years, "year")} ago today` : sd.name };
    case "first_date":
      return { title: "Happy first date day ☺️", sub: years ? `${plural(years, "year")} since our first date` : sd.name };
    default:
      return { title: `${sd.name} ☺️`, sub: "Its today" };
  }
}

/** Whose faces rain down on the day. */
export function celebrationFaces(sd: SpecialDay): PhotoKind[] {
  if (sd.kind === "birthday_jagath") return ["jagath"];
  if (sd.kind === "birthday_nikita") return ["nikita_happy"];
  return ["nikita_happy", "jagath"];
}

/** Names are stored with a straight apostrophe; show a curly one. */
export const prettyName = (name: string) => name.replace(/'/g, "\u2019");
