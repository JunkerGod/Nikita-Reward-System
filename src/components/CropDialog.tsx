import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon } from "@phosphor-icons/react";
import { Sheet } from "./Sheet";
import { Button } from "./ui";
import { Draggable, gsap, useGSAP } from "../lib/motion";

// The oval frame and the saved sticker share the same size: 240 x 300 with a 10px white border.
const W = 240;
const H = 300;
const BORDER = 10;

/**
 * Crop step for face photos: drag and zoom the photo inside an oval frame, then save a
 * transparent PNG sticker with a white border (the same style as nikita-face.png).
 */
export function CropDialog({
  file,
  title,
  onCancel,
  onSave,
}: {
  file: File | null;
  title: string;
  onCancel: () => void;
  onSave: (png: Blob) => Promise<boolean>;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const drag = useRef<Draggable | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    setNatural(null);
    setZoom(1);
    setError(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const base = natural ? Math.max(W / natural.w, H / natural.h) : 1;
  const dw = natural ? natural.w * base * zoom : W;
  const dh = natural ? natural.h * base * zoom : H;
  const limits = { minX: -(dw - W) / 2, maxX: (dw - W) / 2, minY: -(dh - H) / 2, maxY: (dh - H) / 2 };

  const { contextSafe } = useGSAP(
    () => {
      if (!natural || !img.current) return;
      const [d] = Draggable.create(img.current, { type: "x,y", bounds: limits });
      drag.current = d;
      img.current.style.touchAction = "none";
      return () => {
        d.kill();
        drag.current = null;
      };
    },
    { dependencies: [natural], revertOnUpdate: true },
  );

  // Zooming keeps the photo inside the frame.
  useEffect(() => {
    const el = img.current;
    if (!el || !natural) return;
    const x = gsap.utils.clamp(limits.minX, limits.maxX, Number(gsap.getProperty(el, "x")));
    const y = gsap.utils.clamp(limits.minY, limits.maxY, Number(gsap.getProperty(el, "y")));
    gsap.set(el, { x, y });
    drag.current?.applyBounds(limits);
    drag.current?.update();
  }, [zoom, natural]);

  const nudge = contextSafe((dx: number, dy: number) => {
    const el = img.current;
    if (!el) return;
    gsap.set(el, {
      x: gsap.utils.clamp(limits.minX, limits.maxX, Number(gsap.getProperty(el, "x")) + dx),
      y: gsap.utils.clamp(limits.minY, limits.maxY, Number(gsap.getProperty(el, "y")) + dy),
    });
    drag.current?.update();
  });

  const onKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 10;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const m = moves[e.key];
    if (m) {
      e.preventDefault();
      nudge(m[0], m[1]);
    } else if (e.key === "+" || e.key === "=") {
      setZoom((z) => Math.min(4, z + 0.1));
    } else if (e.key === "-") {
      setZoom((z) => Math.max(1, z - 0.1));
    }
  };

  const save = async () => {
    const el = img.current;
    if (!el || !natural) return;
    setBusy(true);
    setError(null);
    try {
      const x = Number(gsap.getProperty(el, "x"));
      const y = Number(gsap.getProperty(el, "y"));
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, W / 2, H / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, W / 2 - BORDER, H / 2 - BORDER, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(el, (W - dw) / 2 + x, (H - dh) / 2 + y, dw, dh);
      ctx.restore();
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not make the sticker");
      const ok = await onSave(blob);
      if (!ok) setError("Ugh that didnt save, try again");
    } catch (e) {
      console.error(e);
      setError("Ugh that photo didnt work, try another one");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={!!file}
      onClose={onCancel}
      title={title}
      description="Drag the photo to fit the oval"
      closeLabel="Cancel"
      footer={
        <>
          <Button onClick={() => void save()} busy={busy} disabled={!natural}>
            Save Photo
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <div
          ref={frame}
          tabIndex={0}
          role="group"
          aria-label="Photo position, use the arrow keys to move it and plus or minus to zoom"
          onKeyDown={onKey}
          className="relative overflow-hidden rounded-2xl bg-soft"
          style={{ width: W, height: H }}
        >
          {src ? (
            <img
              ref={img}
              src={src}
              alt="Photo being cropped"
              width={Math.round(dw)}
              height={Math.round(dh)}
              draggable={false}
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              onError={() => setError("Ugh that photo didnt work, try another one")}
              className="absolute max-w-none cursor-grab select-none"
              style={{ width: dw, height: dh, left: (W - dw) / 2, top: (H - dh) / 2 }}
            />
          ) : null}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[50%]"
            style={{ border: `${BORDER}px solid #fff`, boxShadow: "0 0 0 400px rgb(255 245 248 / 0.78)" }}
          />
        </div>

        <div className="flex w-full max-w-xs items-center gap-3">
          <MagnifyingGlassMinusIcon size={22} className="shrink-0 text-muted" aria-hidden="true" />
          <label htmlFor="crop-zoom" className="sr-only">
            Zoom
          </label>
          <input
            id="crop-zoom"
            name="zoom"
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-btn"
          />
          <MagnifyingGlassPlusIcon size={22} className="shrink-0 text-muted" aria-hidden="true" />
        </div>
        {error ? (
          <p role="alert" className="text-sm font-bold text-btn">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
