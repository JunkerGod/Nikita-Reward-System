import { useEffect, useState } from "react";
import { BellIcon, BellSlashIcon, XCircleIcon } from "@phosphor-icons/react";
import { pushState, sendTestPush, turnOffPush, turnOnPush, type PushState } from "../lib/push";
import { useToast } from "./Toasts";
import { Button, IconButton } from "./ui";
import { useData } from "../lib/data";

function usePushState() {
  const [state, setState] = useState<PushState | null>(null);
  useEffect(() => {
    let alive = true;
    pushState()
      .then((s) => alive && setState(s))
      .catch(() => alive && setState("unsupported"));
    return () => {
      alive = false;
    };
  }, []);
  return [state, setState] as const;
}

const HELP: Partial<Record<PushState, string>> = {
  "needs-install": "On iPhone, add the app to ur Home Screen first (Share, then Add to Home Screen), then open it from there",
  unsupported: "This browser cant do notifications, try Safari or Chrome",
  denied: "Notifications are blocked. Turn them on for this app in ur phone settings",
};

/** Settings section: turn notifications on or off for this phone and send a test. */
export function NotificationSettings() {
  const [state, setState] = usePushState();
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { isNikita } = useData();

  const run = async (fn: () => Promise<PushState | void>, done?: string) => {
    setBusy(true);
    try {
      const next = await fn();
      if (next) setState(next);
      if (done) toast.show(done);
    } catch (e) {
      console.error(e);
      toast.show("Ugh that didnt work, try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="notifications" className="mt-10">
      <h2 id="notifications" className="mb-1 text-xl font-black text-ink">
        Notifications
      </h2>
      <p className="mb-3 text-sm font-semibold text-muted">
        {isNikita ? "Get a buzz when he adds points or makes an appeal" : "Get a buzz when she moves u, redeems or wishes"}
      </p>
      <div className="rounded-2xl bg-surface p-4 shadow-card" aria-live="polite">
        {state === null ? (
          <p className="text-sm font-bold text-muted">Checking…</p>
        ) : state === "on" ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="flex w-full items-center gap-2 font-extrabold text-ink">
              <BellIcon size={20} className="text-btn" aria-hidden="true" />
              On for this phone
            </p>
            <Button size="sm" busy={busy} onClick={() => void run(sendTestPush, "Oki sent, check ur phone")}>
              Send Test
            </Button>
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void run(turnOffPush, "Oki turned off")}>
              <BellSlashIcon size={18} aria-hidden="true" />
              Turn Off
            </Button>
          </div>
        ) : state === "off" ? (
          <Button busy={busy} busyLabel="Turning On…" onClick={() => void run(turnOnPush, "Oki notifications on ☺️")}>
            <BellIcon size={20} aria-hidden="true" />
            Turn On Notifications
          </Button>
        ) : (
          <p className="text-sm font-bold text-ink">{HELP[state]}</p>
        )}
      </div>
    </section>
  );
}

const DISMISS_KEY = "notif-prompt-dismissed";

/** A one-time card on Home suggesting notifications. */
export function NotificationPrompt() {
  const [state, setState] = usePushState();
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  if (hidden || (state !== "off" && state !== "needs-install")) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Not saved; it just shows again next time.
    }
  };

  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl bg-surface p-4 shadow-card">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-soft text-btn">
        <BellIcon size={22} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-extrabold text-ink">Want a buzz when stuff happens</p>
        {state === "needs-install" ? (
          <p className="text-sm font-semibold text-muted">{HELP["needs-install"]}</p>
        ) : (
          <Button
            size="sm"
            className="mt-2"
            busy={busy}
            busyLabel="Turning On…"
            onClick={async () => {
              setBusy(true);
              try {
                const next = await turnOnPush();
                setState(next);
                if (next === "on") toast.show("Oki notifications on ☺️");
              } catch (e) {
                console.error(e);
                toast.show("Ugh that didnt work, try again from Settings");
              } finally {
                setBusy(false);
              }
            }}
          >
            Turn On Notifications
          </Button>
        )}
      </div>
      <IconButton label="Hide this" onClick={dismiss} className="-mr-2 -mt-2">
        <XCircleIcon size={22} aria-hidden="true" />
      </IconButton>
    </div>
  );
}
