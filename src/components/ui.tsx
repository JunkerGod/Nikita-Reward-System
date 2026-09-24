import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { CaretLeftIcon } from "@phosphor-icons/react";
import { gsap, useGSAP, prefersReducedMotion } from "../lib/motion";
import { Link } from "../lib/router";
import { COPY } from "../lib/copy";
import { fmtNumber } from "../lib/format";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-btn text-white shadow-pop hover:bg-btn-hover disabled:bg-soft disabled:text-muted disabled:shadow-none",
  secondary: "bg-surface text-btn ring-2 ring-inset ring-soft hover:bg-[#fff0f5] hover:ring-mid disabled:text-muted",
  ghost: "bg-transparent text-btn hover:bg-soft/60 disabled:text-muted",
  danger: "bg-surface text-btn ring-2 ring-inset ring-mid hover:bg-[#fff0f5]",
};

const SIZES = { md: "min-h-12", sm: "min-h-10", lg: "min-h-14" };
const PAD = { md: "px-6", sm: "px-4", lg: "px-7" };
const TEXT = { md: "text-base", sm: "text-sm", lg: "text-lg" };

export function buttonClass(variant: Variant = "primary", size: keyof typeof SIZES = "md", extra = "") {
  return [
    "press inline-flex select-none items-center justify-center gap-2 rounded-full font-extrabold whitespace-nowrap",
    "transition-colors duration-150 disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    // Padding and text size passed in `extra` replace the size defaults.
    /(^|\s)px-/.test(extra) ? "" : PAD[size],
    /(^|\s)text-(xs|sm|base|lg|xl)/.test(extra) ? "" : TEXT[size],
    extra,
  ].join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: keyof typeof SIZES;
  busy?: boolean;
  busyLabel?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", busy, busyLabel = "Saving…", className = "", children, type = "button", disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...rest}
    >
      {busy ? busyLabel : children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`press inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-soft/70 hover:text-btn ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl bg-surface p-4 shadow-card ${className}`}>{children}</div>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-2xl bg-soft/70 ${className}`} />;
}

export function LoadingScreen({ children }: { children: ReactNode }) {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        {COPY.loading}
      </span>
      {children}
    </div>
  );
}

export function EmptyState({ icon, message, children }: { icon: ReactNode; message: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-soft px-6 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-soft text-btn">{icon}</div>
      <p className="text-lg font-extrabold text-ink">{message}</p>
      {children}
    </div>
  );
}

export function ErrorState({ onRetry, message = COPY.loadFailed }: { onRetry: () => void; message?: string }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-2xl bg-surface px-6 py-10 text-center shadow-card">
      <p className="text-lg font-extrabold text-ink">{message}</p>
      <Button onClick={onRetry}>Try Again</Button>
    </div>
  );
}

/** A number that tweens to its new value (balance, stats). */
export function AnimatedNumber({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const from = shown.current;
      if (from === value || prefersReducedMotion()) {
        shown.current = value;
        el.textContent = fmtNumber(value);
        return;
      }
      const proxy = { n: from };
      gsap.to(proxy, {
        n: value,
        duration: Math.min(1.2, 0.4 + Math.abs(value - from) / 400),
        ease: "power2.out",
        onUpdate: () => {
          shown.current = Math.round(proxy.n);
          el.textContent = fmtNumber(shown.current);
        },
      });
    },
    { dependencies: [value] },
  );

  return (
    // Text is written by the tween only, so React never fights GSAP over the node.
    <span ref={ref} className={`tabular-nums ${className}`} />
  );
}

/** Progress bar whose fill tweens with scaleX. */
export function ProgressBar({ value, label }: { value: number; label: string }) {
  const fill = useRef<HTMLDivElement>(null);
  const pct = Math.max(0, Math.min(1, value));
  useGSAP(
    () => {
      if (prefersReducedMotion()) gsap.set(fill.current, { scaleX: pct });
      else gsap.to(fill.current, { scaleX: pct, duration: 0.8, ease: "power2.out" });
    },
    { dependencies: [pct] },
  );
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      className="h-3 overflow-hidden rounded-full bg-soft"
    >
      <div ref={fill} className="h-full origin-left scale-x-0 rounded-full bg-btn" />
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-5">
      <h1 id="page-title" tabIndex={-1} className="text-3xl font-black tracking-tight text-ink text-balance">
        {children}
      </h1>
      {sub ? <p className="mt-1 text-[15px] font-semibold text-muted">{sub}</p> : null}
    </header>
  );
}

/** Keeps a text input's character counter. */
export function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={`text-xs font-bold tabular-nums ${value.length > max ? "text-btn" : "text-muted"}`}>
      {value.length}/{max}
    </span>
  );
}

export function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return ref;
}

export function BackLink({ href = "/more", label = "More" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="-ml-2 mb-2 inline-flex min-h-10 items-center gap-1 rounded-full px-2 text-sm font-extrabold text-btn hover:bg-soft/60"
    >
      <CaretLeftIcon size={18} aria-hidden="true" />
      {label}
    </Link>
  );
}
