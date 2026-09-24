// iCloud shared albums that anyone with the link can view. Two link styles:
//   https://photos.icloud.com/shared/album/0bcCsm6jfF-f175hCMkepSkNQ   (iOS 18 and later)
//   https://www.icloud.com/sharedalbum/#B0aGWZuqDGL4ELY               (older "Public Website")

export interface AlbumPhoto {
  id: string;
  caption: string | null;
  date: string | null;
  by: string | null;
  video: boolean;
  thumb: { url: string; width: number; height: number };
  full: { url: string; width: number; height: number };
  videoUrl?: string;
}

export interface Album {
  name: string;
  photos: AlbumPhoto[];
  /** Pass back to get the next page; null when there are no more. */
  next: string | null;
}

export interface AlbumLink {
  type: "share" | "stream";
  token: string;
}

/** Works out which kind of album link this is, or null if it isn't one. */
export function parseAlbumLink(link: string): AlbumLink | null {
  const text = link.trim();
  const share = /icloud\.com\/(?:photos\/)?shared\/album\/([A-Za-z0-9_-]{10,40})/.exec(text);
  if (share) return { type: "share", token: share[1] };
  const stream = /icloud\.com\/sharedalbum\/(?:[a-z-]+\/)?#([A-Za-z0-9]{10,20})/.exec(text);
  if (stream) return { type: "stream", token: stream[1] };
  return null;
}

/** One page of the album (new-style albums come about 100 photos at a time). */
export async function fetchAlbum(link: string, cursor?: string | null): Promise<Album> {
  const parsed = parseAlbumLink(link);
  if (!parsed) throw new Error("bad_link");
  const params = new URLSearchParams({ type: parsed.type, token: parsed.token });
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/album?${params}`);
  if (!res.ok) throw new Error(`album_${res.status}`);
  return (await res.json()) as Album;
}
