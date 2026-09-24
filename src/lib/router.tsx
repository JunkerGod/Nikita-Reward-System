import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

// A tiny history-based router. Every screen, sheet and filter lives in the URL.

interface Location {
  path: string;
  search: URLSearchParams;
}

interface RouterValue extends Location {
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

const read = (): Location => ({
  path: window.location.pathname.replace(/\/+$/, "") || "/",
  search: new URLSearchParams(window.location.search),
});

export function RouterProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState<Location>(read);

  useEffect(() => {
    const onPop = () => setLoc(read());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    const current = window.location.pathname + window.location.search;
    if (to === current) return;
    if (opts?.replace) window.history.replaceState(null, "", to);
    else window.history.pushState(null, "", to);
    const next = read();
    setLoc((prev) => {
      if (prev.path !== next.path) window.scrollTo({ top: 0 });
      return next;
    });
  }, []);

  const value = useMemo(() => ({ ...loc, navigate }), [loc, navigate]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouter outside RouterProvider");
  return ctx;
}

/** Build a URL for the current path with some query params changed (null removes). */
export function useHref() {
  const { path, search } = useRouter();
  return useCallback(
    (params: Record<string, string | null>, toPath = path) => {
      const next = new URLSearchParams(toPath === path ? search : undefined);
      for (const [k, v] of Object.entries(params)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      return qs ? `${toPath}?${qs}` : toPath;
    },
    [path, search],
  );
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; replace?: boolean };

export function Link({ href, replace, onClick, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (rest.target && rest.target !== "_self") return;
    e.preventDefault();
    navigate(href, { replace });
  };
  return <a href={href} onClick={handle} {...rest} />;
}
