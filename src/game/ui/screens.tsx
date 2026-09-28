import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CheckIcon,
  GearIcon,
  HeartIcon,
  LockSimpleIcon,
  PlayIcon,
  QuestionIcon,
  ShoppingBagIcon,
  SparkleIcon,
  StarIcon,
  TShirtIcon,
  XIcon,
} from "@phosphor-icons/react";
import { gsap, useGSAP, prefersReducedMotion } from "../../lib/motion";
import { OUTFITS, type Look, type OutfitKey } from "../art/people";
import { LEVELS } from "../levels";
import { emptyLevel, type GameSave, type GameSettings } from "../save";
import type { Upgrades } from "../engine/world";
import { ItemArt, PersonArt } from "./art";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

export function GButton({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled,
  autoFocus,
  label,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "soft" | "ghost";
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      autoFocus={autoFocus}
      aria-label={label}
      className={cx(
        "press inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-base font-extrabold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-btn text-white shadow-pop hover:bg-btn-hover",
        variant === "soft" && "bg-white text-btn ring-2 ring-soft hover:bg-[#fff0f5]",
        variant === "ghost" && "text-ink hover:bg-white/60",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** A full-screen menu page over the soft pink background. */
export function MenuPage({ title, onBack, children, wide = false }: { title: string; onBack: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain" style={{ padding: "max(12px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))" }}>
      <div className={cx("mx-auto flex w-full flex-col gap-4", wide ? "max-w-3xl" : "max-w-xl")}>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onBack} aria-label="Back" className="press flex size-11 items-center justify-center rounded-full bg-white text-btn shadow-card">
            <ArrowLeftIcon size={22} aria-hidden="true" />
          </button>
          <h2 className="text-2xl font-black text-ink">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Pop({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (prefersReducedMotion()) {
      gsap.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      return;
    }
    gsap.fromTo(ref.current, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(1.8)" });
  });
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

export function TitleScreen({
  save,
  onPlay,
  onNav,
  onExit,
}: {
  save: GameSave;
  onPlay: () => void;
  onNav: (s: "map" | "shop" | "album" | "wardrobe" | "settings" | "how") => void;
  onExit: () => void;
}) {
  const doneCount = LEVELS.filter((l) => save.levels[l.id]?.done).length;
  const stars = Object.values(save.levels).reduce((n, l) => n + l.stars.filter(Boolean).length, 0);
  const items: { key: "map" | "shop" | "album" | "wardrobe" | "settings" | "how"; label: string; icon: ReactNode }[] = [
    { key: "map", label: "Dates", icon: <BookOpenIcon size={20} aria-hidden="true" /> },
    { key: "shop", label: "Shop", icon: <ShoppingBagIcon size={20} aria-hidden="true" /> },
    { key: "album", label: "Keepsakes", icon: <SparkleIcon size={20} aria-hidden="true" /> },
    { key: "wardrobe", label: "Outfits", icon: <TShirtIcon size={20} aria-hidden="true" /> },
    { key: "how", label: "How to play", icon: <QuestionIcon size={20} aria-hidden="true" /> },
    { key: "settings", label: "Settings", icon: <GearIcon size={20} aria-hidden="true" /> },
  ];
  return (
    <div className="absolute inset-0 overflow-y-auto overscroll-contain">
      <button
        type="button"
        onClick={onExit}
        aria-label="Back to the app"
        className="press absolute z-10 flex size-11 items-center justify-center rounded-full bg-white/90 text-btn shadow-card"
        style={{ top: "max(12px, env(safe-area-inset-top))", left: "max(12px, env(safe-area-inset-left))" }}
      >
        <XIcon size={22} aria-hidden="true" />
      </button>
      <div className="flex min-h-full flex-col items-center justify-center gap-3 px-4 py-6 landscape:flex-row landscape:gap-8">
        <div className="flex items-end justify-center gap-1">
          <PersonArt look={OUTFITS.nikita.home} height={190} pose="wave" happy />
          <PersonArt look={OUTFITS.jagath.home} height={206} flip happy />
        </div>
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <h1 className="font-script text-6xl leading-none text-btn drop-shadow-sm">Nikita&rsquo;s Adventure</h1>
          <p className="text-sm font-bold text-muted">
            7 dates, played backwards &middot; {doneCount}/7 done &middot; {stars}/21 stars &middot; {save.bank} roses
          </p>
          <GButton onClick={onPlay} className="min-h-14 w-64 text-lg" autoFocus>
            <PlayIcon size={22} aria-hidden="true" />
            {doneCount === 0 ? "Play" : doneCount === 7 ? "Play Again" : "Continue"}
          </GButton>
          <div className="grid w-80 grid-cols-2 gap-2">
            {items.map((it) => (
              <GButton key={it.key} variant="soft" onClick={() => onNav(it.key)} className="whitespace-nowrap px-3 text-sm">
                {it.icon}
                {it.label}
              </GButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// How to play
// ---------------------------------------------------------------------------

export function HowTo({ touch, onDone }: { touch: boolean; onDone: () => void }) {
  const rows: [string, string][] = touch
    ? [
        ["Move", "Hold the arrows, u can slide ur thumb between them"],
        ["Jump", "Tap the big pink button, hold it to jump higher"],
        ["Hide", "Hold the down button behind a pillar, bin or plant"],
        ["Call Jagath", "Tap the heart once a level, he heals u and points to the keepsake"],
      ]
    : [
        ["Move", "Arrow keys or A and D"],
        ["Jump", "Space, W or up. Hold to jump higher"],
        ["Hide", "Hold down or S behind a pillar, bin or plant"],
        ["Call Jagath", "E or Shift once a level, he heals u and points to the keepsake"],
      ];
  return (
    <MenuPage title="How to play" onBack={onDone}>
      <div className="rounded-3xl bg-white p-5 shadow-card">
        <p className="mb-4 text-base font-bold text-ink">
          Every level is one of our dates, starting from the newest. Get to Jagath at the end of each one ☺️
        </p>
        <dl className="flex flex-col gap-3">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <dt className="w-28 shrink-0 font-black text-btn">{k}</dt>
              <dd className="font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card">
          <ItemArt id="rose" size={40} />
          <ItemArt id="lily" size={40} />
          <p className="text-sm font-bold text-ink">Roses are 1, lilies are 5. Spend them in the shop on upgrades</p>
        </div>
        <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card">
          <ItemArt id="boba" size={44} />
          <p className="text-sm font-bold text-ink">Each date hides a keepsake, and a secret somewhere tricky</p>
        </div>
        <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card">
          <ItemArt id="chai" size={40} />
          <ItemArt id="yochi" size={40} />
          <p className="text-sm font-bold text-ink">Ur favourites give boosts: chai is speed, Yo-Chi freezes everyone, flan is bouncy, KFC is a power meal</p>
        </div>
        <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card">
          <StarIcon size={36} weight="fill" className="shrink-0 text-[#f5b82e]" aria-hidden="true" />
          <p className="text-sm font-bold text-ink">3 stars a date: the keepsake, every flower and no hits. Stars unlock love notes</p>
        </div>
      </div>
      <GButton onClick={onDone} className="self-center">
        Lets go
      </GButton>
    </MenuPage>
  );
}

// ---------------------------------------------------------------------------
// Dates (level select)
// ---------------------------------------------------------------------------

export function LevelMap({ save, onPlay, onBack }: { save: GameSave; onPlay: (id: number) => void; onBack: () => void }) {
  return (
    <MenuPage title="Our dates" onBack={onBack} wide>
      <p className="-mt-2 text-sm font-bold text-muted">Newest first, all the way back to where it started</p>
      <ol className="grid gap-3 sm:grid-cols-2">
        {LEVELS.map((l, i) => {
          const p = save.levels[l.id] ?? emptyLevel();
          const open = i === 0 || save.levels[LEVELS[i - 1].id]?.done;
          return (
            <li key={l.id}>
              <button
                type="button"
                disabled={!open}
                onClick={() => onPlay(l.id)}
                className="press flex w-full items-center gap-3 rounded-3xl bg-white p-3 text-left shadow-card transition-colors duration-150 hover:bg-[#fffafc] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-soft">
                  {open ? <ItemArt id={l.final ? "heart" : l.keepsake.id} size={56} locked={!p.keepsake && !p.done} /> : <LockSimpleIcon size={28} className="text-muted" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black uppercase tracking-wide text-btn">
                    Level {l.id} &middot; {l.date}
                  </span>
                  <span className="block text-lg font-black leading-tight text-ink">{l.place}</span>
                  <span className="block text-sm font-semibold text-muted">{open ? l.blurb : "Finish the date before to unlock"}</span>
                </span>
                <span className="flex flex-col items-center gap-1">
                  <span className="flex" aria-label={`${p.stars.filter(Boolean).length} of 3 stars`}>
                    {p.stars.map((s, k) => (
                      <StarIcon key={k} size={18} weight="fill" className={s ? "text-[#f5b82e]" : "text-[#eadde3]"} aria-hidden="true" />
                    ))}
                  </span>
                  {p.secret ? <ItemArt id={l.secret.id} size={22} /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </MenuPage>
  );
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------

export interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  owned: (u: Upgrades) => boolean;
  apply: (u: Upgrades) => Upgrades;
  available: (u: Upgrades) => boolean;
}

export const SHOP: ShopItem[] = [
  { id: "heart1", name: "Extra heart", desc: "Start every date with 4 hearts", cost: 40, owned: (u) => u.hearts >= 1, apply: (u) => ({ ...u, hearts: 1 }), available: () => true },
  { id: "heart2", name: "Another heart", desc: "5 hearts, basically unstoppable", cost: 90, owned: (u) => u.hearts >= 2, apply: (u) => ({ ...u, hearts: 2 }), available: (u) => u.hearts >= 1 },
  { id: "double", name: "Double jump", desc: "Tap jump again in the air", cost: 60, owned: (u) => u.doubleJump, apply: (u) => ({ ...u, doubleJump: true }), available: () => true },
  { id: "magnet", name: "Flower magnet", desc: "Roses and lilies float to u", cost: 50, owned: (u) => u.magnet, apply: (u) => ({ ...u, magnet: true }), available: () => true },
  { id: "long", name: "Longer boosts", desc: "Chai, Yo-Chi and the rest last 50% longer", cost: 70, owned: (u) => u.longBoosts, apply: (u) => ({ ...u, longBoosts: true }), available: () => true },
  { id: "calls", name: "Jagath on speed dial", desc: "Call him twice every date", cost: 80, owned: (u) => u.calls >= 2, apply: (u) => ({ ...u, calls: 2 }), available: () => true },
];

export function Shop({ save, onBuy, onBack, jag }: { save: GameSave; onBuy: (item: ShopItem) => void; onBack: () => void; jag: Look }) {
  const left = SHOP.filter((i) => !i.owned(save.up)).length;
  return (
    <MenuPage title="Jagath's shop" onBack={onBack}>
      <div className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card">
        <PersonArt look={jag} height={84} pose="hi" happy />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-ink">{left ? "What do u want bean" : "U bought everything hehe"}</p>
          <p className="mt-1 flex items-center gap-1 text-lg font-black text-btn">
            <ItemArt id="rose" size={26} />
            {save.bank} roses
          </p>
        </div>
      </div>
      <ul className="flex flex-col gap-3">
        {SHOP.map((it) => {
          const owned = it.owned(save.up);
          const can = !owned && it.available(save.up) && save.bank >= it.cost;
          return (
            <li key={it.id} className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-black text-ink">{it.name}</p>
                <p className="text-sm font-semibold text-muted">{!it.available(save.up) && !owned ? "Buy the first heart first" : it.desc}</p>
              </div>
              {owned ? (
                <span className="flex items-center gap-1 rounded-full bg-soft px-4 py-2 text-sm font-black text-btn">
                  <CheckIcon size={16} aria-hidden="true" /> Got it
                </span>
              ) : (
                <GButton onClick={() => onBuy(it)} disabled={!can} className="shrink-0 tabular-nums" label={`Buy ${it.name} for ${it.cost} roses`}>
                  {it.cost}
                  <ItemArt id="rose" size={20} />
                </GButton>
              )}
            </li>
          );
        })}
      </ul>
    </MenuPage>
  );
}

// ---------------------------------------------------------------------------
// Keepsakes and love notes
// ---------------------------------------------------------------------------

export const LOVE_NOTES = [
  "U da best bean",
  "I still think abt the first time u said i olive u 🫒",
  "U js a bebe n im keeping u",
  "Dont let the bed smiskis bite 💤",
  "Ur my favourite person to sit on a train with",
  "If u say so. I do say so hehe",
  "U found everything. Now come find me irl hehe",
];

export function Album({ save, onBack, onRealStrip }: { save: GameSave; onBack: () => void; onRealStrip: () => void }) {
  const stars = Object.values(save.levels).reduce((n, l) => n + l.stars.filter(Boolean).length, 0);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <MenuPage title="Keepsakes" onBack={onBack} wide>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LEVELS.flatMap((l) => {
          const p = save.levels[l.id] ?? emptyLevel();
          const entries = [
            { key: `k${l.id}`, got: l.final ? p.done : p.keepsake, item: l.final ? ("heart" as const) : l.keepsake.id, name: l.keepsake.name, note: l.keepsake.note, date: l.date, strip: l.keepsake.id === "strip" },
            { key: `s${l.id}`, got: p.secret, item: l.secret.id, name: l.secret.name, note: l.secret.note, date: l.date, strip: false },
          ];
          return entries.map((e) => (
            <li key={e.key}>
              <button
                type="button"
                disabled={!e.got}
                onClick={() => setOpen(open === e.key ? null : e.key)}
                aria-expanded={open === e.key}
                className="press flex w-full flex-col items-center gap-1 rounded-3xl bg-white p-3 text-center shadow-card disabled:cursor-default"
              >
                <ItemArt id={e.item} size={84} locked={!e.got} />
                <span className="text-sm font-black text-ink">{e.got ? e.name : "???"}</span>
                <span className="text-xs font-bold text-muted">{e.date}</span>
                {open === e.key ? <span className="mt-1 text-sm font-semibold text-ink">{e.note}</span> : null}
              </button>
              {open === e.key && e.strip ? (
                <GButton variant="soft" onClick={onRealStrip} className="mt-2 w-full text-sm">
                  See the real one
                </GButton>
              ) : null}
            </li>
          ));
        })}
      </ul>
      <section aria-labelledby="notes" className="rounded-3xl bg-white p-4 shadow-card">
        <h3 id="notes" className="mb-2 flex items-center gap-2 text-lg font-black text-ink">
          <HeartIcon size={20} className="text-btn" aria-hidden="true" /> Love notes
          <span className="text-sm font-bold text-muted">({stars}/21 stars)</span>
        </h3>
        <ol className="flex flex-col gap-2">
          {LOVE_NOTES.map((n, i) => {
            const need = (i + 1) * 3;
            return (
              <li key={i} className={cx("rounded-2xl px-3 py-2 text-sm font-bold", stars >= need ? "bg-soft text-ink" : "bg-[#f6eef1] text-muted")}>
                {stars >= need ? n : `Unlocks at ${need} stars`}
              </li>
            );
          })}
        </ol>
      </section>
    </MenuPage>
  );
}

// ---------------------------------------------------------------------------
// Outfits
// ---------------------------------------------------------------------------

const OUTFIT_NAMES: Record<OutfitKey, string> = {
  home: "Black hoodie",
  sep13: "Penrith, 13 Sep",
  aug: "School uniform",
  jul26: "Double date, 26 Jul",
  jul17: "Rooftop, 17 Jul",
  jul16: "Flowers day, 16 Jul",
  jul9: "First date, 9 Jul",
};
const OUTFIT_LEVEL: Partial<Record<OutfitKey, number>> = { sep13: 1, aug: 2, jul26: 4, jul17: 5, jul16: 6, jul9: 7 };

export function Wardrobe({ save, onPick, onBack }: { save: GameSave; onPick: (o: "auto" | OutfitKey) => void; onBack: () => void }) {
  const keys = Object.keys(OUTFITS.nikita) as OutfitKey[];
  return (
    <MenuPage title="Outfits" onBack={onBack} wide>
      <button
        type="button"
        onClick={() => onPick("auto")}
        aria-pressed={save.outfit === "auto"}
        className={cx("press rounded-3xl bg-white p-4 text-left shadow-card", save.outfit === "auto" && "ring-4 ring-btn")}
      >
        <span className="block text-lg font-black text-ink">What she wore that day</span>
        <span className="block text-sm font-semibold text-muted">Each date uses her real outfit from that day</span>
      </button>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {keys.map((k) => {
          const lvl = OUTFIT_LEVEL[k];
          const got = !lvl || save.levels[lvl]?.done;
          return (
            <li key={k}>
              <button
                type="button"
                disabled={!got}
                onClick={() => onPick(k)}
                aria-pressed={save.outfit === k}
                className={cx("press flex w-full flex-col items-center gap-1 rounded-3xl bg-white p-2 shadow-card disabled:opacity-50", save.outfit === k && "ring-4 ring-btn")}
              >
                <PersonArt look={OUTFITS.nikita[k]} height={110} />
                <span className="text-xs font-black text-ink">{got ? OUTFIT_NAMES[k] : `Finish level ${lvl}`}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </MenuPage>
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function SettingsPage({ settings, onChange, onBack, onReset, onHow }: { settings: GameSettings; onChange: (s: GameSettings) => void; onBack: () => void; onReset: () => void; onHow: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const row = "flex items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-card";
  return (
    <MenuPage title="Settings" onBack={onBack}>
      <label className={row}>
        <span className="font-extrabold text-ink">Music</span>
        <input type="range" min={0} max={1} step={0.05} value={settings.music} onChange={(e) => onChange({ ...settings, music: Number(e.target.value) })} className="w-40 accent-[#c92f6d]" />
      </label>
      <label className={row}>
        <span className="font-extrabold text-ink">Sound effects</span>
        <input type="range" min={0} max={1} step={0.05} value={settings.sfx} onChange={(e) => onChange({ ...settings, sfx: Number(e.target.value) })} className="w-40 accent-[#c92f6d]" />
      </label>
      <label className={row}>
        <span className="font-extrabold text-ink">Vibration</span>
        <input type="checkbox" className="switch" checked={settings.vibrate} onChange={(e) => onChange({ ...settings, vibrate: e.target.checked })} />
      </label>
      <label className={row}>
        <span className="font-extrabold text-ink">Buttons on the left for jumping</span>
        <input type="checkbox" className="switch" checked={settings.lefty} onChange={(e) => onChange({ ...settings, lefty: e.target.checked })} />
      </label>
      <div className={row} role="radiogroup" aria-label="Button size">
        <span className="font-extrabold text-ink">Button size</span>
        <div className="flex gap-1">
          {(["s", "m", "l"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={settings.buttons === s}
              onClick={() => onChange({ ...settings, buttons: s })}
              className={cx("press size-11 rounded-full text-sm font-black uppercase", settings.buttons === s ? "bg-btn text-white" : "bg-soft text-btn")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <GButton variant="soft" onClick={onHow}>
        How to play
      </GButton>
      {confirm ? (
        <div className="flex flex-col gap-2 rounded-3xl bg-white p-4 shadow-card">
          <p className="font-bold text-ink">Start the game over? Stars, roses, upgrades and keepsakes go. App points u already got stay</p>
          <div className="flex gap-2">
            <GButton onClick={onReset}>Yes, Start Over</GButton>
            <GButton variant="soft" onClick={() => setConfirm(false)}>
              Keep It
            </GButton>
          </div>
        </div>
      ) : (
        <GButton variant="ghost" onClick={() => setConfirm(true)} className="self-center text-sm text-muted">
          Start over
        </GButton>
      )}
    </MenuPage>
  );
}

// ---------------------------------------------------------------------------
// Real photo strip (private storage)
// ---------------------------------------------------------------------------

export function RealPhoto({ url, onClose }: { url: string | null; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-ink/70 p-4" role="dialog" aria-modal="true" aria-label="Our Hamafilm strips" onClick={onClose}>
      <Pop className="flex max-h-full flex-col items-center gap-3">
        {url ? <img src={url} alt="Our Hamafilm photo strips" className="max-h-[75dvh] w-auto rounded-2xl shadow-pop" /> : <p className="font-bold text-white">Loading…</p>}
        <GButton variant="soft" onClick={onClose}>
          Close
        </GButton>
      </Pop>
    </div>
  );
}
