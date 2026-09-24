import { useEffect, useState } from "react";
import { ArrowSquareOutIcon, CaretLeftIcon, CaretRightIcon, ImagesIcon, PlayIcon } from "@phosphor-icons/react";
import { useData } from "../lib/data";
import { fetchAlbum, parseAlbumLink, type Album } from "../lib/album";
import { useHref, useRouter } from "../lib/router";
import { BackLink, ButtonLink, EmptyState, ErrorState, IconButton, LoadingScreen, PageTitle, Skeleton, buttonClass } from "../components/ui";
import { Sheet } from "../components/Sheet";

const dateFmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric" });

/** Photo memories from our iCloud shared album. */
export function Memories() {
  const { settings, status } = useData();
  const link = settings.icloud_album ?? "";
  const { search, navigate } = useRouter();
  const href = useHref();
  const [album, setAlbum] = useState<Album | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [retry, setRetry] = useState(0);

  const [loadingMore, setLoadingMore] = useState(false);

  // First page shows as soon as it arrives; the rest keep loading in the background.
  useEffect(() => {
    if (!parseAlbumLink(link)) return;
    let cancelled = false;
    setState("loading");
    (async () => {
      try {
        let page = await fetchAlbum(link);
        if (cancelled) return;
        setAlbum(page);
        setState("ready");
        let all = page.photos;
        for (let i = 0; page.next && i < 10; i++) {
          setLoadingMore(true);
          page = await fetchAlbum(link, page.next);
          if (cancelled) return;
          all = [...all, ...page.photos];
          setAlbum({ ...page, photos: all });
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setState((s) => (s === "ready" ? s : "error"));
      } finally {
        if (!cancelled) setLoadingMore(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [link, retry]);

  const openId = search.get("photo");
  const photos = album?.photos ?? [];
  const openIdx = photos.findIndex((p) => p.id === openId);
  const open = openIdx >= 0 ? photos[openIdx] : null;
  const go = (i: number) => navigate(href({ photo: photos[(i + photos.length) % photos.length].id }), { replace: true });

  const openInPhotos = link ? (
    <a href={link} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
      <ArrowSquareOutIcon size={18} aria-hidden="true" />
      Open in Photos
    </a>
  ) : null;

  return (
    <>
      <BackLink />
      <PageTitle sub={album ? `${album.name}, ${photos.length}${loadingMore ? "+" : ""} photos` : "Our shared album"}>Memories</PageTitle>

      {status === "loading" ? (
        <LoadingScreen>
          <GridSkeleton />
        </LoadingScreen>
      ) : !parseAlbumLink(link) ? (
        <EmptyState icon={<ImagesIcon size={28} aria-hidden="true" />} message="No album linked yet">
          <p className="max-w-xs text-sm font-semibold text-muted">
            In Photos, open ur shared album, tap the people icon, tap Copy Album Link, then paste it in Settings
          </p>
          <ButtonLink href="/settings" size="sm">
            Link Album
          </ButtonLink>
        </EmptyState>
      ) : state === "loading" || state === "idle" ? (
        <LoadingScreen>
          <GridSkeleton />
        </LoadingScreen>
      ) : state === "error" ? (
        <div className="flex flex-col items-center gap-3">
          <ErrorState
            onRetry={() => setRetry((r) => r + 1)}
            message="Cant load the album rn. Check anyone with the link can still see it in Photos, then try again"
          />
          {openInPhotos}
        </div>
      ) : photos.length === 0 ? (
        <EmptyState icon={<ImagesIcon size={28} aria-hidden="true" />} message="The album is empty :(">
          {openInPhotos}
        </EmptyState>
      ) : (
        <>
          <div className="mb-3 flex justify-end">{openInPhotos}</div>
          <ul className="grid grid-cols-3 gap-1.5">
            {photos.map((p, i) => (
              <li key={p.id} className="cv-auto" style={{ containIntrinsicSize: "auto 120px" }}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  className="press relative block aspect-square w-full overflow-hidden rounded-xl bg-soft"
                  aria-label={p.caption ? `Open photo: ${p.caption}` : `Open photo ${i + 1}`}
                >
                  <img
                    src={p.thumb.url}
                    alt=""
                    width={p.thumb.width}
                    height={p.thumb.height}
                    loading={i < 9 ? "eager" : "lazy"}
                    decoding="async"
                    className="size-full object-cover"
                  />
                  {p.video ? (
                    <span className="absolute bottom-1 right-1 rounded-full bg-ink/80 p-1 text-white">
                      <PlayIcon size={14} aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Sheet
        open={!!open}
        onClose={() => navigate(href({ photo: null }), { replace: true })}
        variant="center"
        title={open?.caption ?? (open?.video ? "Video" : "Memory")}
        description={
          open ? [open.date ? dateFmt.format(new Date(open.date)) : null, open.by ? `by ${open.by}` : null].filter(Boolean).join(", ") : undefined
        }
      >
        {open ? (
          <div className="flex flex-col items-center gap-3 pb-2">
            {open.video && open.videoUrl ? (
              <video
                key={open.id}
                src={open.videoUrl}
                poster={open.full.url}
                controls
                playsInline
                preload="metadata"
                width={open.full.width || undefined}
                height={open.full.height || undefined}
                className="max-h-[60dvh] w-auto max-w-full rounded-xl bg-ink"
              />
            ) : (
              <img
                key={open.id}
                src={open.full.url}
                alt={open.caption ?? "Photo from our album"}
                width={open.full.width || open.thumb.width}
                height={open.full.height || open.thumb.height}
                // Browsers that can't show HEIC fall back to the smaller JPEG.
                onError={(e) => {
                  if (e.currentTarget.src !== open.thumb.url) e.currentTarget.src = open.thumb.url;
                }}
                className="max-h-[60dvh] w-auto max-w-full rounded-xl object-contain"
              />
            )}
            {open.video && !open.videoUrl ? <p className="text-sm font-bold text-muted">Its a video, open it in Photos to play</p> : null}
            <div className="flex items-center gap-2">
              <IconButton label="Previous photo" onClick={() => go(openIdx - 1)}>
                <CaretLeftIcon size={22} aria-hidden="true" />
              </IconButton>
              <span className="text-sm font-bold text-muted tabular-nums">
                {openIdx + 1} / {photos.length}
              </span>
              <IconButton label="Next photo" onClick={() => go(openIdx + 1)}>
                <CaretRightIcon size={22} aria-hidden="true" />
              </IconButton>
            </div>
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {Array.from({ length: 12 }, (_, i) => (
        <Skeleton key={i} className="aspect-square rounded-xl" />
      ))}
    </div>
  );
}
