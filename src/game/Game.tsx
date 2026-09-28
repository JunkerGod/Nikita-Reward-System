import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useData } from "../lib/data";
import { useRouter } from "../lib/router";
import { supabase } from "../lib/supabase";
import { FACES_BUCKET } from "../lib/supabase";
import { LoadingScreen, Skeleton } from "../components/ui";
import { OUTFITS, type Look, type OutfitKey } from "./art/people";
import { Audio } from "./engine/audio";
import { Input } from "./engine/input";
import { Sprites } from "./engine/sprites";
import { World, type LevelResult } from "./engine/world";
import { drawHud } from "./engine/hud";
import { LEVELS } from "./levels";
import { claimRewards, emptyLevel, emptySave, flushSave, loadSave, loadSettings, storeSave, storeSettings, type GameSave, type GameSettings } from "./save";
import type { Collectible, LevelDef, Line } from "./types";
import { Album, HowTo, LevelMap, RealPhoto, SettingsPage, Shop, TitleScreen, Wardrobe, type ShopItem } from "./ui/screens";
import { Chat, Complete, Credits, GameToast, LevelIntro, Pause, PauseCorner, PickupPopup, TouchControls } from "./ui/play";
import "./game.css";

type Screen = "title" | "map" | "shop" | "album" | "wardrobe" | "settings" | "how" | "play";

type Overlay =
  | null
  | { k: "chat"; lines: Line[]; heading: string; done: () => void }
  | { k: "pickup"; kind: "keepsake" | "secret" | "final"; item: Collectible; done: () => void }
  | { k: "pause" }
  | { k: "how" }
  | { k: "settings" }
  | { k: "complete"; result: LevelResult; stars: [boolean, boolean, boolean]; best: number | null; newBest: boolean }
  | { k: "credits" };

const STRIP_PATH = "game/hamafilm-strip.jpg";

function useIsTouch() {
  const [touch, setTouch] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  useEffect(() => {
    const m = window.matchMedia("(pointer: coarse)");
    const on = () => setTouch(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return touch;
}

function useViewport() {
  const [v, setV] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setV({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    window.visualViewport?.addEventListener("resize", on);
    return () => {
      window.removeEventListener("resize", on);
      window.visualViewport?.removeEventListener("resize", on);
    };
  }, []);
  return v;
}

export default function Game() {
  const { me, isNikita } = useData();
  const { navigate } = useRouter();
  const uid = me?.id ?? "anon";
  const [save, setSaveState] = useState<GameSave | null>(null);
  const [settings, setSettingsState] = useState<GameSettings>(loadSettings);
  const [screen, setScreen] = useState<Screen>("title");
  const [back, setBack] = useState<Screen>("title");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [level, setLevel] = useState<LevelDef | null>(null);
  const [introKey, setIntroKey] = useState(0);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [calls, setCalls] = useState(0);
  const [cinematic, setCinematic] = useState(false);
  const [strip, setStrip] = useState<{ open: boolean; url: string | null }>({ open: false, url: null });
  const touch = useIsTouch();
  const vp = useViewport();
  const portrait = vp.h > vp.w;

  const engine = useMemo(() => ({ audio: new Audio(), input: new Input(), sprites: new Sprites() }), []);
  const worldRef = useRef<World | null>(null);
  const overlayRef = useRef<Overlay>(null);
  overlayRef.current = overlay;
  const saveRef = useRef<GameSave | null>(null);
  saveRef.current = save;

  // ---- load
  useEffect(() => {
    let off = false;
    void loadSave(uid).then(async (s) => {
      if (off) return;
      setSaveState(s);
      if (isNikita && s.pending.length) {
        const r = await claimRewards(s);
        if (!off) setSaveState(r.save);
        storeSave(uid, r.save);
      }
    });
    return () => {
      off = true;
    };
  }, [uid, isNikita]);

  useEffect(() => {
    const { audio, input } = engine;
    audio.musicVolume = settings.music;
    audio.sfxVolume = settings.sfx;
    audio.applyVolumes();
    return () => void input;
  }, [settings, engine]);

  useEffect(() => {
    const { audio, input } = engine;
    const unlock = () => audio.unlock();
    input.attach();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      input.dispose();
      audio.dispose();
    };
  }, [engine]);

  const setSave = useCallback(
    (fn: (s: GameSave) => GameSave) => {
      setSaveState((prev) => {
        if (!prev) return prev;
        const next = { ...fn(prev), updatedAt: new Date().toISOString() };
        storeSave(uid, next);
        return next;
      });
    },
    [uid],
  );

  const setSettings = (s: GameSettings) => {
    setSettingsState(s);
    storeSettings(s);
  };

  const showToast = useCallback((text: string) => setToast({ text, id: Date.now() }), []);

  // ---- music for menus
  useEffect(() => {
    if (screen !== "play") engine.audio.playMusic("title");
  }, [screen, engine]);

  // ---- pause when the app goes to the background
  useEffect(() => {
    const on = () => {
      if (document.hidden) {
        engine.audio.suspend();
        engine.input.clear();
        if (screen === "play" && !overlayRef.current) setOverlay({ k: "pause" });
      } else engine.audio.resume();
    };
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, [screen, engine]);

  useEffect(() => {
    const w = worldRef.current;
    if (w) w.paused = overlay !== null;
    engine.input.clear();
  }, [overlay, engine]);

  // ---- levels
  const looksFor = useCallback((def: LevelDef, s: GameSave): { n: Look; j: Look } => {
    const key: OutfitKey = s.outfit === "auto" ? def.outfit : s.outfit;
    return { n: OUTFITS.nikita[key], j: OUTFITS.jagath[def.outfit] };
  }, []);

  const finishLevel = useCallback(
    (def: LevelDef, result: LevelResult) => {
      const s = saveRef.current ?? emptySave();
      const prev = s.levels[def.id] ?? emptyLevel();
      const keepsake = def.final ? true : result.keepsake;
      const stars: [boolean, boolean, boolean] = [keepsake, result.flowers >= result.flowersTotal, result.hits === 0];
      const merged: [boolean, boolean, boolean] = [prev.stars[0] || stars[0], prev.stars[1] || stars[1], prev.stars[2] || stars[2]];
      const newBest = prev.best === null || result.time < prev.best;
      const pending = [...s.pending];
      if (!prev.done) pending.push({ key: `game:clear:${def.id}`, note: `Cleared ${def.place.split(",")[0]}` });
      merged.forEach((st, i) => {
        if (st && !prev.stars[i]) pending.push({ key: `game:star:${def.id}:${i + 1}`, note: `New star on ${def.place.split(",")[0]}` });
      });
      if (def.final && !s.finished) pending.push({ key: "game:finish", note: "Finished the whole game ☺️" });
      const next: GameSave = {
        ...s,
        bank: s.bank + result.flowers,
        finished: s.finished || !!def.final,
        levels: {
          ...s.levels,
          [def.id]: { done: true, stars: merged, best: newBest ? result.time : prev.best, keepsake: prev.keepsake || keepsake, secret: prev.secret || result.secret },
        },
        pending,
        updatedAt: new Date().toISOString(),
      };
      setSaveState(next);
      flushSave(uid, next);
      setPoints(null);
      if (isNikita && next.pending.length) {
        void claimRewards(next).then((r) => {
          setPoints(r.points);
          setSaveState((cur) => {
            const merged2 = { ...(cur ?? next), pending: r.save.pending, updatedAt: new Date().toISOString() };
            storeSave(uid, merged2);
            return merged2;
          });
        });
      }
      return { stars, best: newBest ? result.time : prev.best, newBest };
    },
    [uid, isNikita],
  );

  const startLevel = useCallback(
    (id: number) => {
      const s = saveRef.current;
      const def = LEVELS.find((l) => l.id === id);
      if (!s || !def) return;
      const { audio, input, sprites } = engine;
      audio.unlock();
      const looks = looksFor(def, s);
      const heading = `${def.short} · ${def.place.split(",")[0]}`;
      const w: World = new World(def, looks.n, looks.j, s.up, sprites, audio, input, {
        story: (st, done) => {
          if (import.meta.env.DEV && (window as unknown as { __skip?: boolean }).__skip) return done();
          setOverlay({ k: "chat", lines: st.lines, heading, done: () => (setOverlay(null), done()) });
        },
        pickup: (kind, item, done) => setOverlay({ k: "pickup", kind, item, done: () => (setOverlay(null), done()) }),
        arrive: (result) =>
          setOverlay({
            k: "chat",
            lines: def.outro,
            heading,
            done: () => {
              if (def.final) {
                setOverlay({
                  k: "pickup",
                  kind: "final",
                  item: def.keepsake,
                  done: () => {
                    setOverlay(null);
                    audio.playMusic("ending");
                    setCinematic(true);
                    w.startKiss();
                    window.setTimeout(() => {
                      audio.play("win");
                      finishLevel(def, result);
                      setOverlay({ k: "credits" });
                    }, 7000);
                  },
                });
              } else {
                audio.play("win");
                const r = finishLevel(def, result);
                setOverlay({ k: "complete", result, ...r });
              }
            },
          }),
        toast: showToast,
        sfx: (x) => audio.play(x),
        vibrate: (ms) => {
          if (settingsRef.current.vibrate) navigator.vibrate?.(ms);
        },
      });
      worldRef.current = w;
      setCinematic(false);
      if (import.meta.env.DEV) (window as unknown as { __world: World }).__world = w;
      setLevel(def);
      setCalls(w.callsLeft);
      setOverlay(null);
      setScreen("play");
      setIntroKey((k) => k + 1);
      audio.playMusic(def.song);
    },
    [engine, looksFor, finishLevel, showToast],
  );
  if (import.meta.env.DEV) (window as unknown as { __start: (id: number) => void }).__start = startLevel;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const nextLevelId = (s: GameSave) => LEVELS.find((l) => !s.levels[l.id]?.done)?.id ?? 1;

  const onPlay = () => {
    if (!save) return;
    if (!save.seenHow) {
      setSave((s) => ({ ...s, seenHow: true }));
      setBack("play");
      setScreen("how");
      return;
    }
    startLevel(nextLevelId(save));
  };

  const quitToMenu = () => {
    worldRef.current = null;
    setOverlay(null);
    setLevel(null);
    setScreen("title");
  };

  const buy = (item: ShopItem) => {
    engine.audio.play("buy");
    setSave((s) => (s.bank >= item.cost ? { ...s, bank: s.bank - item.cost, up: item.apply(s.up) } : s));
  };

  const openStrip = async () => {
    setStrip({ open: true, url: null });
    const { data } = await supabase.storage.from(FACES_BUCKET).createSignedUrl(STRIP_PATH, 3600);
    setStrip({ open: true, url: data?.signedUrl ?? null });
  };

  if (!save) {
    return (
      <div className="game-root">
        <LoadingScreen>
          <div className="mx-auto max-w-md p-6">
            <Skeleton className="h-14 w-72" />
            <Skeleton className="mt-6 h-48" />
          </div>
        </LoadingScreen>
      </div>
    );
  }

  const exit = () => {
    flushSave(uid, save);
    engine.audio.stopMusic();
    navigate("/more");
  };

  const click = () => engine.audio.play("click");
  // portrait: a squarish game view on top and the controls underneath, like a Game Boy
  const deckH = Math.max(170, vp.h - vp.w * 1.05);
  const deck = screen === "play" && touch && portrait;

  return (
    <div className="game-root" onPointerDownCapture={() => engine.audio.unlock()}>
      {screen === "play" && level ? (
        <div className="absolute inset-0 flex flex-col bg-ink">
          <div className="relative min-h-0 flex-1">
            <Stage world={worldRef} engine={engine} onPause={() => setOverlay({ k: "pause" })} overlayRef={overlayRef} onCalls={setCalls} />
            <LevelIntro key={introKey} level={level} />
            {toast ? <GameToast key={toast.id} text={toast.text} id={toast.id} /> : null}
            {cinematic ? null : touch && !portrait ? (
              <TouchControls input={engine.input} size={settings.buttons} lefty={settings.lefty} calls={calls} layout="overlay" onPause={() => setOverlay({ k: "pause" })} />
            ) : (
              <PauseCorner onPause={() => setOverlay({ k: "pause" })} />
            )}
          </div>
          {deck ? (
            <div className="shrink-0 bg-gradient-to-b from-[#ffe3ec] to-[#ffd6e4]" style={{ height: deckH }}>
              <TouchControls input={engine.input} size={settings.buttons} lefty={settings.lefty} calls={calls} layout="deck" onPause={() => setOverlay({ k: "pause" })} />
            </div>
          ) : null}
          {overlay?.k === "chat" ? <Chat lines={overlay.lines} looks={looksFor(level, save)} heading={overlay.heading} audio={engine.audio} onDone={overlay.done} /> : null}
          {overlay?.k === "pickup" ? <PickupPopup kind={overlay.kind} item={overlay.item} level={level} jag={looksFor(level, save).j} onDone={overlay.done} /> : null}
          {overlay?.k === "pause" ? (
            <Pause
              onResume={() => setOverlay(null)}
              onRestart={() => startLevel(level.id)}
              onHow={() => setOverlay({ k: "how" })}
              onSettings={() => setOverlay({ k: "settings" })}
              onQuit={quitToMenu}
            />
          ) : null}
          {overlay?.k === "how" ? (
            <div className="absolute inset-0 z-30 bg-page">
              <HowTo touch={touch} onDone={() => setOverlay({ k: "pause" })} />
            </div>
          ) : null}
          {overlay?.k === "settings" ? (
            <div className="absolute inset-0 z-30 bg-page">
              <SettingsPage settings={settings} onChange={setSettings} onBack={() => setOverlay({ k: "pause" })} onReset={() => undefined} onHow={() => setOverlay({ k: "how" })} />
            </div>
          ) : null}
          {overlay?.k === "complete" ? (
            <Complete
              level={level}
              result={overlay.result}
              stars={overlay.stars}
              best={overlay.best}
              newBest={overlay.newBest}
              points={points}
              hasNext={level.id < LEVELS.length}
              onNext={() => startLevel(level.id + 1)}
              onReplay={() => startLevel(level.id)}
              onShop={() => {
                quitToMenu();
                setBack("title");
                setScreen("shop");
              }}
              onMenu={quitToMenu}
            />
          ) : null}
          {overlay?.k === "credits" ? <Credits points={points} onAgain={() => startLevel(1)} onMenu={quitToMenu} /> : null}
        </div>
      ) : (
        <div className="absolute inset-0 game-menu-bg">
          {screen === "title" ? (
            <TitleScreen
              save={save}
              onPlay={() => {
                click();
                onPlay();
              }}
              onNav={(s) => {
                click();
                setBack("title");
                setScreen(s);
              }}
              onExit={exit}
            />
          ) : null}
          {screen === "how" ? (
            <HowTo
              touch={touch}
              onDone={() => {
                if (back === "play") startLevel(nextLevelId(save));
                else setScreen("title");
              }}
            />
          ) : null}
          {screen === "map" ? <LevelMap save={save} onPlay={startLevel} onBack={() => setScreen("title")} /> : null}
          {screen === "shop" ? <Shop save={save} onBuy={buy} onBack={() => setScreen("title")} jag={OUTFITS.jagath.home} /> : null}
          {screen === "album" ? <Album save={save} onBack={() => setScreen("title")} onRealStrip={() => void openStrip()} /> : null}
          {screen === "wardrobe" ? (
            <Wardrobe
              save={save}
              onPick={(o) => {
                click();
                setSave((s) => ({ ...s, outfit: o }));
              }}
              onBack={() => setScreen("title")}
            />
          ) : null}
          {screen === "settings" ? (
            <SettingsPage
              settings={settings}
              onChange={setSettings}
              onBack={() => setScreen("title")}
              onHow={() => setScreen("how")}
              onReset={() => {
                const fresh = { ...emptySave(), seenHow: true, updatedAt: new Date().toISOString() };
                setSaveState(fresh);
                flushSave(uid, fresh);
                setScreen("title");
                showToast("Oki fresh start");
              }}
            />
          ) : null}
          {strip.open ? <RealPhoto url={strip.url} onClose={() => setStrip({ open: false, url: null })} /> : null}
          {toast ? <GameToast key={toast.id} text={toast.text} id={toast.id} /> : null}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The canvas and the frame loop
// ---------------------------------------------------------------------------

function Stage({
  world,
  engine,
  onPause,
  overlayRef,
  onCalls,
}: {
  world: React.RefObject<World | null>;
  engine: { audio: Audio; input: Input; sprites: Sprites };
  onPause: () => void;
  overlayRef: React.RefObject<Overlay>;
  onCalls: (n: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const safe = useRef<HTMLDivElement>(null);
  const pauseRef = useRef(onPause);
  pauseRef.current = onPause;
  const callsRef = useRef(onCalls);
  callsRef.current = onCalls;

  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext("2d", { alpha: false })!;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const low = (nav.hardwareConcurrency ?? 8) < 4 || (nav.deviceMemory ?? 8) <= 2;
    let raf = 0;
    let last = performance.now();
    let lastCalls = -1;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = world.current;
      if (!w) return;
      const { input, sprites } = engine;
      input.poll();
      if (input.pressed("pause") && !overlayRef.current) pauseRef.current();
      w.update(dt);
      if (w.callsLeft !== lastCalls) {
        lastCalls = w.callsLeft;
        callsRef.current(w.callsLeft);
      }
      const rect = c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2);
      const cw = Math.max(1, Math.round(rect.width * dpr));
      const ch = Math.max(1, Math.round(rect.height * dpr));
      if (c.width !== cw || c.height !== ch) {
        c.width = cw;
        c.height = ch;
      }
      // how many CSS pixels one world unit takes: about 300 units tall, at least 400 wide
      let scale = rect.height / 300;
      if (rect.width / scale < 400) scale = rect.width / 400;
      scale = Math.min(scale, 2.6);
      const px = scale * dpr;
      sprites.setScale(px);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingQuality = "high";
      w.render(ctx, px, cw, ch);
      const st = safe.current ? getComputedStyle(safe.current) : null;
      if (!w.cinematic) drawHud(ctx, w, sprites, dpr, cw, st ? parseFloat(st.paddingTop) * dpr : 0, st ? parseFloat(st.paddingLeft) * dpr : 0);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [world, engine, overlayRef]);

  return (
    <>
      <canvas ref={canvas} className="absolute inset-0 size-full" role="img" aria-label="Nikita's Adventure" />
      <div ref={safe} aria-hidden="true" className="pointer-events-none invisible absolute" style={{ paddingTop: "env(safe-area-inset-top)", paddingLeft: "env(safe-area-inset-left)" }} />
    </>
  );
}
