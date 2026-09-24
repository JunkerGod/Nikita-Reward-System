import { useEffect, useId, useRef, type ReactNode } from "react";
import { XCircleIcon } from "@phosphor-icons/react";
import { gsap, useGSAP, prefersReducedMotion } from "../lib/motion";
import { Button, IconButton } from "./ui";
import { COPY } from "../lib/copy";

/**
 * A bottom sheet built on the native <dialog>: focus is trapped, Escape closes it
 * and the page behind is inert. It animates in and out with GSAP.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeLabel = "Close",
  variant = "sheet",
  className = "",
  lightBackdrop = false,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  variant?: "sheet" | "center";
  className?: string;
  /** A see-through backdrop, so confetti behind the dialog stays visible. */
  lightBackdrop?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const closing = useRef(false);
  const { contextSafe } = useGSAP({ scope: dialog });

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      closing.current = false;
      d.showModal();
      if (prefersReducedMotion()) {
        gsap.fromTo(panel.current, { opacity: 0 }, { opacity: 1, duration: 0.15 });
      } else if (variant === "sheet") {
        gsap.fromTo(panel.current, { yPercent: 100 }, { yPercent: 0, duration: 0.32, ease: "power3.out" });
      } else {
        gsap.fromTo(panel.current, { scale: 0.92, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.28, ease: "back.out(1.8)" });
      }
    } else if (!open && d.open) {
      d.close();
    }
  }, [open, variant]);

  const requestClose = contextSafe(() => {
    if (closing.current) return;
    closing.current = true;
    const done = () => {
      dialog.current?.close();
      onClose();
    };
    if (prefersReducedMotion()) {
      gsap.to(panel.current, { opacity: 0, duration: 0.12, onComplete: done });
    } else if (variant === "sheet") {
      gsap.to(panel.current, { yPercent: 100, duration: 0.22, ease: "power2.in", onComplete: done });
    } else {
      gsap.to(panel.current, { scale: 0.95, opacity: 0, duration: 0.15, onComplete: done });
    }
  });

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) requestClose();
      }}
      className={`sheet-dialog ${variant === "center" ? "sheet-center" : "sheet-bottom"} ${lightBackdrop ? "sheet-light" : ""}`}
    >
      {open ? (
        <div
          ref={panel}
          className={`relative flex max-h-[88dvh] w-full flex-col overflow-hidden bg-surface shadow-pop ${
            variant === "sheet" ? "rounded-t-2xl" : "rounded-2xl"
          } ${className}`}
        >
          <div className="flex items-start gap-3 px-5 pt-5">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-xl font-black text-ink text-balance break-words">
                {title}
              </h2>
              {description ? (
                <div id={descId} className="mt-1 text-[15px] font-semibold text-muted break-words">
                  {description}
                </div>
              ) : null}
            </div>
            <IconButton label={closeLabel} onClick={requestClose} className="-mr-2 -mt-2">
              <XCircleIcon size={22} aria-hidden="true" />
            </IconButton>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 pb-2 pt-4">{children}</div>
          {footer ? (
            <div className="flex flex-col gap-2 px-5 pt-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}>
              {footer}
            </div>
          ) : (
            <div style={{ height: "calc(env(safe-area-inset-bottom) + 12px)" }} />
          )}
        </div>
      ) : null}
    </dialog>
  );
}

/** "Wait u sure" confirmation used before every delete. */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title = COPY.deleteConfirm,
  description,
  confirmLabel = "Delete",
  busy,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
}) {
  return (
    <Sheet
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      variant="center"
      closeLabel="Cancel"
      footer={
        <>
          <Button onClick={onConfirm} busy={busy}>
            {confirmLabel}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </>
      }
    />
  );
}
