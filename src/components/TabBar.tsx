import { ChartBarIcon, DotsThreeCircleIcon, HouseIcon, PlusCircleIcon, StorefrontIcon, type Icon } from "@phosphor-icons/react";
import { Link, useRouter } from "../lib/router";

const TABS: { href: string; label: string; icon: Icon; match: string[] }[] = [
  { href: "/", label: "Home", icon: HouseIcon, match: ["/"] },
  { href: "/add", label: "Add", icon: PlusCircleIcon, match: ["/add"] },
  { href: "/shop", label: "Shop", icon: StorefrontIcon, match: ["/shop"] },
  { href: "/chart", label: "Chart", icon: ChartBarIcon, match: ["/chart"] },
  { href: "/more", label: "More", icon: DotsThreeCircleIcon, match: ["/more", "/history", "/my-rewards", "/settings"] },
];

export function TabBar() {
  const { path } = useRouter();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-soft bg-surface/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5 px-1" style={{ paddingLeft: "max(4px, env(safe-area-inset-left))", paddingRight: "max(4px, env(safe-area-inset-right))" }}>
        {TABS.map((tab) => {
          const active = tab.match.includes(path);
          const IconCmp = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`press flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-extrabold transition-colors duration-150 ${
                  active ? "text-btn" : "text-muted hover:text-ink"
                }`}
              >
                <span className={`flex h-8 w-12 items-center justify-center rounded-full ${active ? "bg-soft" : ""}`}>
                  <IconCmp size={24} aria-hidden="true" />
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
