import type { Config } from "@netlify/functions";

// Reads an iCloud shared album that has "Public Website" turned on and returns its photos
// with short-lived image URLs. Only talks to Apple's sharedstreams hosts.

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function startHost(token: string) {
  const digits = token[0] === "A" ? token.slice(1, 2) : token.slice(1, 3);
  let partition = 0;
  for (const ch of digits) partition = partition * 62 + BASE62.indexOf(ch);
  return `p${String(partition).padStart(2, "0")}-sharedstreams.icloud.com`;
}

async function post(host: string, token: string, path: string, body: unknown) {
  return fetch(`https://${host}/${token}/sharedstreams/${path}`, {
    method: "POST",
    headers: { "content-type": "text/plain", origin: "https://www.icloud.com" },
    body: JSON.stringify(body),
  });
}

interface Derivative {
  checksum: string;
  width: string | number;
  height: string | number;
  fileSize?: string | number;
}
interface StreamPhoto {
  photoGuid: string;
  caption?: string;
  dateCreated?: string;
  contributorFirstName?: string;
  mediaAssetType?: string;
  derivatives: Record<string, Derivative>;
}

export default async (req: Request) => {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (!/^[A-Za-z0-9]{10,20}$/.test(token)) return Response.json({ error: "bad_token" }, { status: 400 });

  let host = startHost(token);
  let res = await post(host, token, "webstream", { streamCtag: null });
  if (res.status === 330) {
    const redirect = (await res.json().catch(() => ({}))) as Record<string, string>;
    const next = redirect["X-Apple-MMe-Host"];
    if (!next || !/^p\d+-sharedstreams\.icloud\.com$/.test(next)) return Response.json({ error: "bad_redirect" }, { status: 502 });
    host = next;
    res = await post(host, token, "webstream", { streamCtag: null });
  }
  if (!res.ok) return Response.json({ error: "album_unavailable" }, { status: res.status === 404 ? 404 : 502 });

  const stream = (await res.json()) as { streamName?: string; photos?: StreamPhoto[] };
  const photos = (stream.photos ?? []).slice(-400);

  // Look up download URLs for every derivative checksum, in batches.
  const urls: Record<string, string> = {};
  for (let i = 0; i < photos.length; i += 50) {
    const batch = photos.slice(i, i + 50).map((p) => p.photoGuid);
    const r = await post(host, token, "webasseturls", { photoGuids: batch });
    if (!r.ok) continue;
    const data = (await r.json()) as { items?: Record<string, { url_location: string; url_path: string }> };
    for (const [checksum, item] of Object.entries(data.items ?? {})) {
      urls[checksum] = `https://${item.url_location}${item.url_path}`;
    }
  }

  const out = photos
    .map((p) => {
      const ds = Object.values(p.derivatives ?? {})
        .map((d) => ({ checksum: d.checksum, width: Number(d.width), height: Number(d.height) }))
        .filter((d) => urls[d.checksum])
        .sort((a, b) => a.width - b.width);
      if (!ds.length) return null;
      const thumb = ds.find((d) => d.width >= 300) ?? ds[ds.length - 1];
      const full = ds[ds.length - 1];
      return {
        id: p.photoGuid,
        caption: p.caption?.trim() || null,
        date: p.dateCreated ?? null,
        by: p.contributorFirstName ?? null,
        video: p.mediaAssetType === "video",
        thumb: { url: urls[thumb.checksum], width: thumb.width, height: thumb.height },
        full: { url: urls[full.checksum], width: full.width, height: full.height },
      };
    })
    .filter(Boolean)
    .reverse();

  return Response.json(
    { name: stream.streamName ?? "Our album", photos: out },
    { headers: { "cache-control": "private, max-age=600" } },
  );
};

export const config: Config = {
  path: "/api/album",
};
