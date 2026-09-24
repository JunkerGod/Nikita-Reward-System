import { HeartBreakIcon, HeartIcon } from "@phosphor-icons/react";
import type { PhotoKind } from "../lib/types";

/**
 * A face sticker: the uploaded cutout, or the placeholder for that kind of photo.
 * Width is fixed; height follows the 4:5 sticker shape.
 */
export function FaceSticker({
  src,
  kind,
  width = 72,
  alt = "",
  className = "",
}: {
  src?: string | null;
  kind: PhotoKind;
  width?: number;
  alt?: string;
  className?: string;
}) {
  const height = Math.round(width * 1.25);
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        draggable={false}
        className={`sticker-shadow pointer-events-none select-none object-contain ${className}`}
        style={{ width, height }}
      />
    );
  }
  return <PlaceholderSticker kind={kind} width={width} label={alt} className={className} />;
}

export function PlaceholderSticker({
  kind,
  width = 72,
  label = "",
  className = "",
}: {
  kind: PhotoKind;
  width?: number;
  label?: string;
  className?: string;
}) {
  const height = Math.round(width * 1.25);
  const border = Math.max(3, Math.round(width / 18));
  const common = `sticker-shadow flex shrink-0 select-none items-center justify-center rounded-[50%] ${className}`;
  const style = { width, height, borderWidth: border };

  if (kind === "jagath") {
    return (
      <div role={label ? "img" : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true} className={`${common} border-white bg-mid`} style={style}>
        <span className="font-black text-ink" style={{ fontSize: Math.round(width * 0.3) }} aria-hidden="true">
          Jag
        </span>
      </div>
    );
  }
  if (kind === "nikita_sad") {
    return (
      <div role={label ? "img" : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true} className={`${common} border-white bg-[#DCE6F2] text-[#4F74A8]`} style={style}>
        <HeartBreakIcon size={Math.round(width * 0.45)} aria-hidden="true" />
      </div>
    );
  }
  return (
    <div role={label ? "img" : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true} className={`${common} border-white bg-soft text-btn`} style={style}>
      <HeartIcon size={Math.round(width * 0.45)} aria-hidden="true" />
    </div>
  );
}
