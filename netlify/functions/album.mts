import type { Config } from "@netlify/functions";

// Reads an iCloud shared album that anyone with the link can view, and returns its photos
// with short-lived image URLs. Two link styles exist:
//   new (iOS 18+): https://photos.icloud.com/shared/album/<shortGUID>   -> CloudKit share
//   old:           https://www.icloud.com/sharedalbum/#<token>          -> sharedstreams
// Only Apple's iCloud hosts are ever contacted.

interface Photo {
  id: string;
  caption: string | null;
  date: string | null;
  by: string | null;
  video: boolean;
  thumb: { url: string; width: number; height: number };
  full: { url: string; width: number; height: number };
  videoUrl?: string;
}

const MAX_PHOTOS = 400;

// ---------------------------------------------------------------------------
// New style: CloudKit shared collection with anonymous public access
// ---------------------------------------------------------------------------

const CK = "database/1/com.apple.photos.cloud/production";
const ckHeaders = { "content-type": "text/plain", origin: "https://photos.icloud.com" };

type CKValue<T> = { value: T; type?: string };
interface CKRes {
  downloadURL: string;
}
interface CKRecord {
  recordName: string;
  recordType: string;
  fields: Record<string, CKValue<unknown> | undefined>;
}

const field = <T,>(r: CKRecord, name: string) => r.fields[name]?.value as T | undefined;

function resolution(master: CKRecord, prefix: string, filename = `${prefix}.jpg`) {
  const res = field<CKRes>(master, `${prefix}Res`);
  if (!res?.downloadURL) return null;
  return {
    url: res.downloadURL.replace("${f}", filename),
    width: Number(field<number>(master, `${prefix}Width`) ?? 0),
    height: Number(field<number>(master, `${prefix}Height`) ?? 0),
  };
}

const DESIRED_KEYS = [
  "masterRef",
  "assetDate",
  "itemType",
  "resJPEGThumbRes",
  "resJPEGThumbWidth",
  "resJPEGThumbHeight",
  "resJPEGMedRes",
  "resJPEGMedWidth",
  "resJPEGMedHeight",
  "resOriginalRes",
  "resOriginalWidth",
  "resOriginalHeight",
  "resOriginalFileType",
  "resVidMedRes",
  "resVidSmallRes",
];

/** What the app sends back to get the next page: the query marker plus the short-lived access. */
interface ShareCursor {
  marker: string;
  token: string;
  partition: string;
  zoneID: unknown;
  name: string;
}
const encodeCursor = (c: ShareCursor) => Buffer.from(JSON.stringify(c)).toString("base64url");
function decodeCursor(raw: string): ShareCursor | null {
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString()) as ShareCursor;
    return /^https:\/\/p\d+-ckdatabasews\.icloud\.com(:443)?$/.test(c.partition) ? c : null;
  } catch {
    return null;
  }
}

async function resolveShare(shortGUID: string) {
  const res = await fetch(
    `https://ckdatabasews.icloud.com/${CK}/public/records/resolve?remapEnums=true&getCurrentSyncToken=true&sharing_url_key=${encodeURIComponent(shortGUID)}`,
    { method: "POST", headers: ckHeaders, body: JSON.stringify({ shortGUIDs: [{ value: shortGUID }] }) },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: {
      zoneID?: unknown;
      share?: { fields?: Record<string, CKValue<string>> };
      anonymousPublicAccess?: { token: string; databasePartition: string };
    }[];
  };
  const r = data.results?.[0];
  const access = r?.anonymousPublicAccess;
  if (!r?.zoneID || !access?.token || !/^https:\/\/p\d+-ckdatabasews\.icloud\.com(:443)?$/.test(access.databasePartition)) return null;
  return {
    token: access.token,
    partition: access.databasePartition,
    zoneID: r.zoneID,
    name: r.share?.fields?.["cloudkit.title"]?.value || "Our album",
  };
}

/**
 * One page (up to about 100 photos). Apple takes about 5 seconds per page, so pages keep each
 * call well inside the function time limit; the app asks for the next page with `cursor`.
 */
async function loadShare(shortGUID: string, cursorRaw: string | null) {
  const cursor = cursorRaw ? decodeCursor(cursorRaw) : null;
  const access = cursor ?? (await resolveShare(shortGUID));
  if (!access) return null;

  const qs = new URLSearchParams({
    remapEnums: "true",
    getCurrentSyncToken: "true",
    sharing_url_key: shortGUID,
    publicAccessAuthToken: access.token,
  });
  const res = await fetch(`${access.partition}/${CK}/shared/records/query?${qs}`, {
    method: "POST",
    headers: ckHeaders,
    body: JSON.stringify({
      query: {
        recordType: "CPLAssetAndMasterByAssetDateWithoutHiddenOrDeleted",
        filterBy: [{ fieldName: "direction", comparator: "EQUALS", fieldValue: { value: "DESCENDING", type: "STRING" } }],
      },
      zoneID: access.zoneID,
      resultsLimit: 200,
      desiredKeys: DESIRED_KEYS,
      ...(cursor ? { continuationMarker: cursor.marker } : {}),
    }),
  });
  if (!res.ok) return null;
  const page = (await res.json()) as { records?: CKRecord[]; continuationMarker?: string };
  const records = page.records ?? [];

  const masters = new Map(records.filter((x) => x.recordType === "CPLMaster").map((m) => [m.recordName, m]));
  const photos: Photo[] = [];
  for (const asset of records.filter((x) => x.recordType === "CPLAsset")) {
    const master = masters.get(field<{ recordName: string }>(asset, "masterRef")?.recordName ?? "");
    if (!master) continue;
    const thumb = resolution(master, "resJPEGThumb");
    if (!thumb) continue;
    const itemType = String(field<string>(master, "itemType") ?? "");
    const video = /movie|video|mpeg/i.test(itemType);
    // Bigger picture: the medium JPEG, else the original if it's a still image Safari can show.
    const originalType = String(field<string>(master, "resOriginalFileType") ?? "");
    const original = !video && /jpeg|heic|png/i.test(originalType) ? resolution(master, "resOriginal", /heic/i.test(originalType) ? "photo.heic" : "photo.jpg") : null;
    const full = resolution(master, "resJPEGMed") ?? original ?? thumb;
    const vid = video ? (resolution(master, "resVidMed", "video.mov") ?? resolution(master, "resVidSmall", "video.mov")) : null;
    const date = field<number>(asset, "assetDate");
    photos.push({
      id: asset.recordName,
      caption: null,
      date: date ? new Date(date).toISOString() : null,
      by: null,
      video,
      thumb,
      full,
      ...(vid ? { videoUrl: vid.url } : {}),
    });
  }

  const next = page.continuationMarker
    ? encodeCursor({ marker: page.continuationMarker, token: access.token, partition: access.partition, zoneID: access.zoneID, name: access.name })
    : null;
  return { name: access.name, photos, next };
}

// ---------------------------------------------------------------------------
// Old style: sharedstreams web stream
// ---------------------------------------------------------------------------

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

interface StreamPhoto {
  photoGuid: string;
  caption?: string;
  dateCreated?: string;
  contributorFirstName?: string;
  mediaAssetType?: string;
  derivatives: Record<string, { checksum: string; width: string | number; height: string | number }>;
}

async function loadStream(token: string) {
  let host = startHost(token);
  let res = await post(host, token, "webstream", { streamCtag: null });
  if (res.status === 330) {
    const redirect = (await res.json().catch(() => ({}))) as Record<string, string>;
    const next = redirect["X-Apple-MMe-Host"];
    if (!next || !/^p\d+-sharedstreams\.icloud\.com$/.test(next)) return null;
    host = next;
    res = await post(host, token, "webstream", { streamCtag: null });
  }
  if (!res.ok) return null;

  const stream = (await res.json()) as { streamName?: string; photos?: StreamPhoto[] };
  const items = (stream.photos ?? []).slice(-MAX_PHOTOS);
  const urls: Record<string, string> = {};
  for (let i = 0; i < items.length; i += 50) {
    const r = await post(host, token, "webasseturls", { photoGuids: items.slice(i, i + 50).map((p) => p.photoGuid) });
    if (!r.ok) continue;
    const data = (await r.json()) as { items?: Record<string, { url_location: string; url_path: string }> };
    for (const [checksum, item] of Object.entries(data.items ?? {})) urls[checksum] = `https://${item.url_location}${item.url_path}`;
  }

  const photos: Photo[] = [];
  for (const p of [...items].reverse()) {
    const ds = Object.values(p.derivatives ?? {})
      .map((d) => ({ checksum: d.checksum, width: Number(d.width), height: Number(d.height) }))
      .filter((d) => urls[d.checksum])
      .sort((a, b) => a.width - b.width);
    if (!ds.length) continue;
    const thumb = ds.find((d) => d.width >= 300) ?? ds[ds.length - 1];
    const full = ds[ds.length - 1];
    photos.push({
      id: p.photoGuid,
      caption: p.caption?.trim() || null,
      date: p.dateCreated ?? null,
      by: p.contributorFirstName ?? null,
      video: p.mediaAssetType === "video",
      thumb: { url: urls[thumb.checksum], width: thumb.width, height: thumb.height },
      full: { url: urls[full.checksum], width: full.width, height: full.height },
    });
  }
  return { name: stream.streamName ?? "Our album", photos };
}

// ---------------------------------------------------------------------------

export default async (req: Request) => {
  const params = new URL(req.url).searchParams;
  const token = params.get("token") ?? "";
  const cursor = params.get("cursor");
  const type = params.get("type") === "share" ? "share" : "stream";
  const valid = type === "share" ? /^[A-Za-z0-9_-]{10,40}$/.test(token) : /^[A-Za-z0-9]{10,20}$/.test(token);
  if (!valid) return Response.json({ error: "bad_token" }, { status: 400 });

  try {
    const stream = type === "stream" ? await loadStream(token) : null;
    const album = type === "share" ? await loadShare(token, cursor) : stream ? { ...stream, next: null } : null;
    if (!album) return Response.json({ error: "album_unavailable" }, { status: 404 });
    return Response.json(album, { headers: { "cache-control": "private, max-age=600" } });
  } catch (e) {
    console.error("album", e);
    return Response.json({ error: "album_failed" }, { status: 502 });
  }
};

export const config: Config = {
  path: "/api/album",
};
