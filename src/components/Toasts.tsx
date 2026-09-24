import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { gsap, useGSAP, FULL } from "../lib/motion";

interface Toast {
  id: number;
  message: string;
  action?: () => void;
  duration: number;
}

interface ToastApi {
  show: (message: string, opts?: { action?: () => void; duration?: number }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const show = useCallback<ToastApi["show"]>(
    (message, opts) => {
      const id = nextId.current++;
      const duration = opts?.duration ?? (opts?.action ? 8000 : 2600);
      // Replace any toast with the same text so retries don't stack up.
      setToasts((t) => [...t.filter((x) => x.message !== message).slice(-2), { id, message, action: opts?.action, duration }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 z-[60] flex flex-col items-center gap-2 px-4"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(FULL, () => {
        gsap.from(ref.current, { y: 16, opacity: 0, scale: 0.96, duration: 0.25, ease: "back.out(2)" });
      });
    },
    { scope: ref },
  );

  const base =
    "pointer-events-auto flex max-w-sm items-center gap-2 rounded-full bg-ink px-5 py-3 text-[15px] font-bold text-white shadow-pop break-words";

  return (
    <div ref={ref}>
      {toast.action ? (
        <button
          type="button"
          className={`${base} transition-transform duration-100 hover:bg-[#5c2b40] focus-visible:outline-offset-4 active:scale-[0.98]`}
          onClick={() => {
            toast.action?.();
            onDone();
          }}
        >
          <ArrowCounterClockwiseIcon size={18} aria-hidden="true" />
          <span>{toast.message}</span>
        </button>
      ) : (
        <div className={base}>{toast.message}</div>
      )}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast outside ToastProvider");
  return ctx;
}
