import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useToast } from "../components/Toasts";
import { COPY } from "./copy";

/** Turn a Supabase `{ data, error }` result into a value or a thrown error. */
export function must<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}

function errorText(e: unknown) {
  if (!e || typeof e !== "object") return String(e ?? "");
  const o = e as { message?: string; details?: string; hint?: string };
  return `${o.message ?? ""} ${o.details ?? ""} ${o.hint ?? ""}`;
}

/** Errors with a specific meaning get their own message and no retry. */
function knownMessage(e: unknown): string | null {
  const text = errorText(e);
  if (text.includes("balance_negative")) return COPY.balanceNegative;
  if (text.includes("not_enough_points")) return COPY.notEnoughPoints;
  if (text.includes("reward_not_found")) return COPY.rewardGone;
  return null;
}

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

function waitForOnline() {
  return new Promise<void>((resolve) => {
    const on = () => {
      window.removeEventListener("online", on);
      resolve();
    };
    window.addEventListener("online", on);
  });
}

/**
 * Run a save. Offline: wait until the phone is back online, then save.
 * Failed: show a toast that retries when tapped. Forms keep what was typed
 * until this resolves true.
 */
export function useSave() {
  const toast = useToast();
  return useCallback(
    <T,>(run: () => Promise<T>, onSuccess?: (value: T) => void): Promise<boolean> => {
      const attempt = async (): Promise<boolean> => {
        if (!navigator.onLine) {
          toast.show(COPY.offline, { duration: 4000 });
          await waitForOnline();
        }
        try {
          const value = await run();
          onSuccess?.(value);
          return true;
        } catch (e) {
          console.error(e);
          const known = knownMessage(e);
          if (known) {
            toast.show(known, { duration: 4000 });
            return false;
          }
          if (!navigator.onLine) return attempt();
          toast.show(COPY.saveFailed, { action: () => void attempt() });
          return false;
        }
      };
      return attempt();
    },
    [toast],
  );
}

/** Warn before the page is closed or reloaded while a form has unsaved typing. */
export function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}
