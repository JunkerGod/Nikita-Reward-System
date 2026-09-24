import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { IconContext } from "@phosphor-icons/react";
import { supabase } from "./lib/supabase";
import { RouterProvider, useRouter } from "./lib/router";
import { DataProvider, useData } from "./lib/data";
import { gsap, useGSAP, FULL, REDUCE, prefersReducedMotion } from "./lib/motion";
import { ToastProvider } from "./components/Toasts";
import { ConfettiProvider } from "./confetti/Confetti";
import { TabBar } from "./components/TabBar";
import { OfflineBanner } from "./components/OfflineBanner";
import { ErrorState, LoadingScreen, Skeleton } from "./components/ui";
import { Replays } from "./components/Replays";
import { Login } from "./screens/Login";
import { Home } from "./screens/Home";
import { AddPoints } from "./screens/AddPoints";
import { Shop } from "./screens/Shop";
import { Chart } from "./screens/Chart";
import { More } from "./screens/More";
import { History } from "./screens/History";
import { MyRewards } from "./screens/MyRewards";
import { Settings } from "./screens/Settings";
import { NotFound } from "./screens/NotFound";

export function App() {
  return (
    // One icon weight everywhere.
    <IconContext.Provider value={{ weight: "fill" }}>
      <RouterProvider>
        <ToastProvider>
          <ConfettiProvider>
            <AuthGate />
          </ConfettiProvider>
        </ToastProvider>
      </RouterProvider>
    </IconContext.Provider>
  );
}

function AuthGate() {
  // undefined while the saved session is being read from this device.
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <LoadingScreen>
        <div className="mx-auto max-w-xl px-4 pt-10">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="mt-6 h-40" />
        </div>
      </LoadingScreen>
    );
  }
  if (!session) return <Login />;
  return (
    <DataProvider key={session.user.id} session={session}>
      <Shell />
    </DataProvider>
  );
}

function Shell() {
  const { path } = useRouter();
  const { status, reload } = useData();
  const main = useRef<HTMLElement>(null);
  const firstPath = useRef(path);

  usePressFeedback();

  // Screen change: a quick fade and slide, then focus the new page title.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(FULL, () => {
        gsap.fromTo(main.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out", clearProps: "transform" });
      });
      mm.add(REDUCE, () => {
        gsap.fromTo(main.current, { opacity: 0 }, { opacity: 1, duration: 0.15 });
      });
      if (path !== firstPath.current) {
        firstPath.current = "";
        document.getElementById("page-title")?.focus({ preventScroll: true });
      }
    },
    { dependencies: [path], revertOnUpdate: true },
  );

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-btn px-5 py-3 font-extrabold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <OfflineBanner />
      <main
        id="main"
        ref={main}
        className="mx-auto min-h-[100dvh] w-full max-w-xl px-4"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 20px)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 108px)",
          paddingLeft: "max(16px, env(safe-area-inset-left))",
          paddingRight: "max(16px, env(safe-area-inset-right))",
        }}
      >
        {status === "error" ? <ErrorState onRetry={reload} /> : <Screen path={path} />}
      </main>
      <TabBar />
      {status === "ready" ? <Replays /> : null}
    </>
  );
}

function Screen({ path }: { path: string }) {
  switch (path) {
    case "/":
      return <Home />;
    case "/add":
      return <AddPoints />;
    case "/shop":
      return <Shop />;
    case "/chart":
      return <Chart />;
    case "/more":
      return <More />;
    case "/history":
      return <History />;
    case "/my-rewards":
      return <MyRewards />;
    case "/settings":
      return <Settings />;
    default:
      return <NotFound />;
  }
}

/** Buttons and links with the .press class scale to 0.98 while pressed. */
function usePressFeedback() {
  useGSAP((_ctx, contextSafe) => {
    const onDown = contextSafe!((e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>(".press");
      if (!el || el.matches(":disabled") || prefersReducedMotion()) return;
      gsap.to(el, { scale: 0.98, duration: 0.08, ease: "power2.out", overwrite: "auto" });
      const onUp = contextSafe!(() => {
        gsap.to(el, { scale: 1, duration: 0.18, ease: "back.out(3)", overwrite: "auto", clearProps: "scale" });
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    });
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  });
}
