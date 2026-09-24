import { useRef, useState, type FormEvent } from "react";
import { HeartIcon } from "@phosphor-icons/react";
import { supabase, usernameToEmail } from "../lib/supabase";
import { Button } from "../components/ui";
import { COPY } from "../lib/copy";

export function Login() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!username) {
      setError("Type ur username");
      userRef.current?.focus();
      return;
    }
    if (!password) {
      setError("Type ur password");
      passRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
    setBusy(false);
    if (err) {
      const offline = !navigator.onLine || err.name === "AuthRetryableFetchError" || err.status === 0;
      setError(offline ? COPY.noInternetLogin : COPY.wrongPassword);
      passRef.current?.focus();
      passRef.current?.select();
    }
  };

  return (
    <main
      className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-4"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 24px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
    >
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-soft text-btn shadow-card">
          <HeartIcon size={44} aria-hidden="true" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-ink" translate="no">
          Nikita&rsquo;s Rewards
        </h1>
        <p className="mt-2 text-base font-semibold text-muted">Hiii, log in to start</p>
      </div>

      <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-2xl bg-surface p-5 shadow-card">
        <div className="flex flex-col gap-2">
          <label htmlFor="username" className="text-sm font-extrabold text-ink">
            Username
          </label>
          <input
            ref={userRef}
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            placeholder="nikita…"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            className="field"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-extrabold text-ink">
            Password
          </label>
          <input
            ref={passRef}
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "login-error" : undefined}
            className="field"
          />
        </div>
        <p id="login-error" role="alert" aria-live="polite" className="min-h-5 text-sm font-bold text-btn">
          {error}
        </p>
        <Button type="submit" size="lg" busy={busy} busyLabel="Logging In…">
          Log In
        </Button>
      </form>
    </main>
  );
}
