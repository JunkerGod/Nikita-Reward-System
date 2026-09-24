// iCloud shared album with "Public Website" turned on: https://www.icloud.com/sharedalbum/#B0aGWZuqDGL4ELY

export interface AlbumPhoto {
  id: string;
  caption: string | null;
  date: string | null;
  by: string | null;
  video: boolean;
  thumb: { url: string; width: number; height: number };
  full: { url: string; width: number; height: number };
}

export interface Album {
  name: string;
  photos: AlbumPhoto[];
}

/** The album token from a shared album link, or null if it isn't one. */
export function parseAlbumToken(link: string): string | null {
  const m = /icloud\.com\/sharedalbum\/(?:[a-z-]+\/)?#([A-Za-z0-9]{10,20})/.exec(link.trim());
  return m ? m[1] : null;
}

export async function fetchAlbum(link: string): Promise<Album> {
  const token = parseAlbumToken(link);
  if (!token) throw new Error("bad_link");
  const res = await fetch(`/api/album?token=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error(`album_${res.status}`);
  return (await res.json()) as Album;
}
