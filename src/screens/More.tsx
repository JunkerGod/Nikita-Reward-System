import { CaretRightIcon, ChartLineUpIcon, ClockCounterClockwiseIcon, GearIcon, ImagesIcon, SparkleIcon, TicketIcon, type Icon } from "@phosphor-icons/react";
import { Link } from "../lib/router";
import { PageTitle } from "../components/ui";
import { useData } from "../lib/data";

export function More() {
  const { redemptions } = useData();
  const waiting = redemptions.filter((r) => r.status === "claimed").length;
  const items: { href: string; label: string; hint: string; icon: Icon }[] = [
    { href: "/my-rewards", label: "My Rewards", hint: waiting ? `${waiting} coupon${waiting === 1 ? "" : "s"} ready` : "Ur coupons", icon: TicketIcon },
    { href: "/stats", label: "Us, in Numbers", hint: "Stats, special days and badges", icon: ChartLineUpIcon },
    { href: "/recap", label: "Monthly Recap", hint: "How this month is going", icon: SparkleIcon },
    { href: "/memories", label: "Memories", hint: "Our shared album", icon: ImagesIcon },
    { href: "/history", label: "History", hint: "Every point in and out", icon: ClockCounterClockwiseIcon },
    { href: "/settings", label: "Settings", hint: "Notifications, activities, photos", icon: GearIcon },
  ];
  return (
    <>
      <PageTitle>More</PageTitle>
      <ul className="flex flex-col gap-3">
        {items.map(({ href, label, hint, icon: IconCmp }) => (
          <li key={href}>
            <Link
              href={href}
              className="press flex min-h-16 items-center gap-4 rounded-2xl bg-surface px-4 py-3 shadow-card transition-colors duration-150 hover:bg-[#fffafc]"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-soft text-btn">
                <IconCmp size={24} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-black text-ink">{label}</span>
                <span className="block text-sm font-semibold text-muted">{hint}</span>
              </span>
              <CaretRightIcon size={20} className="text-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
