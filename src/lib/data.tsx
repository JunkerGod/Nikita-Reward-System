import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { FACES_BUCKET, supabase } from "./supabase";
import { must } from "./save";
import type {
  Activity,
  Appeal,
  BehaviourLevel,
  FacePhoto,
  PhotoKind,
  Profile,
  Redemption,
  Reward,
  Seen,
  SpecialDay,
  Stats,
  Streak,
  Transaction,
  Wish,
} from "./types";

export type LoadStatus = "loading" | "ready" | "error";

interface DataState {
  profiles: Profile[];
  stats: Stats | null;
  recent: Transaction[];
  rewards: Reward[];
  activities: Activity[];
  wishes: Wish[];
  levels: BehaviourLevel[];
  redemptions: Redemption[];
  photos: FacePhoto[];
  seen: Seen | null;
  appeals: Appeal[];
  specialDays: SpecialDay[];
  settings: Record<string, string | null>;
  streak: Streak;
}

const EMPTY: DataState = {
  profiles: [],
  stats: null,
  recent: [],
  rewards: [],
  activities: [],
  wishes: [],
  levels: [],
  redemptions: [],
  photos: [],
  seen: null,
  appeals: [],
  specialDays: [],
  settings: {},
  streak: { current_streak: 0, best_streak: 0 },
};

type Part =
  | "profiles"
  | "stats"
  | "recent"
  | "rewards"
  | "activities"
  | "wishes"
  | "levels"
  | "redemptions"
  | "photos"
  | "seen"
  | "appeals"
  | "specialDays"
  | "settings"
  | "streak";

export interface RealtimeEvent {
  table: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  record: Record<string, unknown>;
}

interface DataValue extends DataState {
  status: LoadStatus;
  me: Profile | null;
  nikita: Profile | null;
  jagath: Profile | null;
  isNikita: boolean;
  isJagath: boolean;
  /** Bumps whenever transactions change, so paged lists can refetch. */
  txVersion: number;
  reload: () => void;
  refresh: (...parts: Part[]) => Promise<void>;
  onRealtime: (fn: (e: RealtimeEvent) => void) => () => void;
  photosOf: (kind: PhotoKind) => FacePhoto[];
}

const DataContext = createContext<DataValue | null>(null);

const SIGNED_URL_SECONDS = 60 * 60 * 24;

async function fetchPart(part: Part, userId: string): Promise<Partial<DataState>> {
  switch (part) {
    case "profiles":
      return { profiles: must(await supabase.from("profiles").select("id,name,role,goal_reward_id")) as Profile[] };
    case "stats": {
      const rows = must(await supabase.rpc("get_stats")) as Stats[];
      return { stats: rows[0] ?? { balance: 0, total_earned: 0, total_spent: 0, week_earned: 0 } };
    }
    case "recent":
      return {
        recent: must(
          await supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(5),
        ) as Transaction[],
      };
    case "rewards":
      return {
        rewards: must(await supabase.from("rewards").select("*").order("created_at", { ascending: false })) as Reward[],
      };
    case "activities":
      return {
        activities: must(
          await supabase.from("activities").select("*").order("points", { ascending: true }).order("name"),
        ) as Activity[],
      };
    case "wishes":
      return {
        wishes: must(await supabase.from("wishes").select("*").order("created_at", { ascending: false }).limit(100)) as Wish[],
      };
    case "levels":
      return {
        levels: must(
          await supabase.from("behaviour_levels").select("*").order("created_at", { ascending: false }).limit(200),
        ) as BehaviourLevel[],
      };
    case "redemptions":
      return {
        redemptions: must(
          await supabase
            .from("redemptions")
            .select("*, transaction:transactions(label,points)")
            .order("redeemed_at", { ascending: false })
            .limit(200),
        ) as Redemption[],
      };
    case "photos": {
      const rows = must(
        await supabase.from("face_photos").select("*").order("created_at", { ascending: false }),
      ) as Omit<FacePhoto, "url">[];
      if (rows.length === 0) return { photos: [] };
      const signed = must(
        await supabase.storage.from(FACES_BUCKET).createSignedUrls(
          rows.map((r) => r.storage_path),
          SIGNED_URL_SECONDS,
        ),
      );
      const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      return { photos: rows.map((r) => ({ ...r, url: byPath.get(r.storage_path) ?? null })) };
    }
    case "appeals":
      return {
        appeals: must(await supabase.from("appeals").select("*").order("created_at", { ascending: false }).limit(50)) as Appeal[],
      };
    case "specialDays":
      return {
        specialDays: must(await supabase.from("special_days").select("*").order("month").order("day")) as SpecialDay[],
      };
    case "settings": {
      const rows = must(await supabase.from("app_settings").select("key,value")) as { key: string; value: string | null }[];
      return { settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) };
    }
    case "streak": {
      const rows = must(await supabase.rpc("streak_info")) as Streak[];
      return { streak: rows[0] ?? { current_streak: 0, best_streak: 0 } };
    }
    case "seen": {
      const row = must(await supabase.from("seen").select("*").eq("user_id", userId).maybeSingle()) as Seen | null;
      if (row) return { seen: row };
      // First visit on this account: start from now so old history doesn't replay.
      const now = new Date().toISOString();
      const created = must(
        await supabase
          .from("seen")
          .upsert({ user_id: userId, last_seen_transaction_at: now, last_seen_behaviour_at: now })
          .select()
          .single(),
      ) as Seen;
      return { seen: created };
    }
  }
}

const ALL_PARTS: Part[] = [
  "profiles",
  "stats",
  "recent",
  "rewards",
  "activities",
  "wishes",
  "levels",
  "redemptions",
  "photos",
  "seen",
  "appeals",
  "specialDays",
  "settings",
  "streak",
];

const TABLE_PARTS: Record<string, Part[]> = {
  transactions: ["stats", "recent", "redemptions", "streak"],
  rewards: ["rewards", "profiles"],
  wishes: ["wishes"],
  behaviour_levels: ["levels"],
  redemptions: ["redemptions"],
  profiles: ["profiles"],
  activities: ["activities"],
  face_photos: ["photos"],
  appeals: ["appeals"],
  special_days: ["specialDays"],
  app_settings: ["settings"],
};

export function DataProvider({ session, children }: { session: Session; children: ReactNode }) {
  const userId = session.user.id;
  const [state, setState] = useState<DataState>(EMPTY);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [txVersion, setTxVersion] = useState(0);
  const [loadKey, setLoadKey] = useState(0);
  const listeners = useRef(new Set<(e: RealtimeEvent) => void>());

  const refresh = useCallback(
    async (...parts: Part[]) => {
      const results = await Promise.all(parts.map((p) => fetchPart(p, userId)));
      setState((s) => Object.assign({}, s, ...results));
    },
    [userId],
  );

  // Initial load (and "tap to try again").
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    refresh(...ALL_PARTS)
      .then(() => !cancelled && setStatus("ready"))
      .catch((e) => {
        console.error(e);
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [refresh, loadKey]);

  // Live sync: any change on the other phone refetches the affected data.
  useEffect(() => {
    const pending = new Set<Part>();
    let timer: number | undefined;
    const flush = () => {
      const parts = [...pending];
      pending.clear();
      refresh(...parts).catch(console.error);
    };

    const channel = supabase.channel("app-changes");
    for (const table of Object.keys(TABLE_PARTS)) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        for (const p of TABLE_PARTS[table]) pending.add(p);
        if (table === "transactions") setTxVersion((v) => v + 1);
        window.clearTimeout(timer);
        timer = window.setTimeout(flush, 120);
        const evt: RealtimeEvent = {
          table,
          eventType: payload.eventType as RealtimeEvent["eventType"],
          record: (payload.new ?? {}) as Record<string, unknown>,
        };
        listeners.current.forEach((fn) => fn(evt));
      });
    }
    channel.subscribe();

    // Coming back to the app (or back online) catches anything realtime missed.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refresh(...ALL_PARTS.filter((p) => p !== "seen"))
          .then(() => setTxVersion((v) => v + 1))
          .catch(console.error);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const onRealtime = useCallback((fn: (e: RealtimeEvent) => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const value = useMemo<DataValue>(() => {
    const me = state.profiles.find((p) => p.id === userId) ?? null;
    const nikita = state.profiles.find((p) => p.role === "nikita") ?? null;
    const jagath = state.profiles.find((p) => p.role === "jagath") ?? null;
    return {
      ...state,
      status: status === "ready" && !me ? "error" : status,
      me,
      nikita,
      jagath,
      isNikita: me?.role === "nikita",
      isJagath: me?.role === "jagath",
      txVersion,
      reload: () => setLoadKey((k) => k + 1),
      refresh: async (...parts: Part[]) => {
        await refresh(...parts);
        if (parts.includes("stats")) setTxVersion((v) => v + 1);
      },
      onRealtime,
      photosOf: (kind: PhotoKind) => state.photos.filter((p) => p.kind === kind && p.url),
    };
  }, [state, status, userId, txVersion, refresh, onRealtime]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData outside DataProvider");
  return ctx;
}

/** Current behaviour level: the newest row, or Good Boy if nothing is set yet. */
export function currentLevel(levels: BehaviourLevel[]) {
  return levels[0]?.level ?? "good_boy";
}
