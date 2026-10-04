import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Track } from "./catalog";

const CLIENTS = {
  video: { host: "https://www.youtube.com", clientName: "WEB", clientVersion: "2.20250101.00.00" },
  music: { host: "https://music.youtube.com", clientName: "WEB_REMIX", clientVersion: "1.20250101.01.00" },
} as const;

// Recursively collect renderers by key
function collect(node: unknown, key: string, out: any[] = []): any[] {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) { for (const n of node) collect(n, key, out); return out; }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === key) out.push(v);
    else collect(v, key, out);
  }
  return out;
}
const text = (t: any): string => t?.simpleText ?? (t?.runs ?? []).map((r: any) => r.text).join("") ?? "";

export const searchYouTube = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ q: z.string().min(1).max(200), kind: z.enum(["music", "video"]) }).parse(d))
  .handler(async ({ data }): Promise<Track[]> => {
    const c = CLIENTS[data.kind];
    const body: Record<string, unknown> = {
      context: { client: { clientName: c.clientName, clientVersion: c.clientVersion, hl: "en", gl: "US" } },
      query: data.q,
    };
    // YouTube Music: filter to songs
    if (data.kind === "music") body["params"] = "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D";
    const res = await fetch(`${c.host}/youtubei/v1/search?prettyPrint=false`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: c.host, Referer: `${c.host}/`, "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Search failed (${res.status})`);
    const json = await res.json();
    const seen = new Set<string>();
    const out: Track[] = [];
    if (data.kind === "video") {
      for (const v of collect(json, "videoRenderer")) {
        if (!v?.videoId || seen.has(v.videoId)) continue;
        seen.add(v.videoId);
        out.push({ id: v.videoId, title: text(v.title), artist: text(v.ownerText) || text(v.longBylineText), kind: "video" });
      }
    } else {
      for (const r of collect(json, "musicResponsiveListItemRenderer")) {
        const id = r?.playlistItemData?.videoId ?? r?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const cols = r.flexColumns ?? [];
        const title = text(cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text);
        const runs = cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ?? [];
        const artist = runs.map((x: any) => x.text).join("").split(" • ").filter((s: string) => s !== "Song")[0] ?? "";
        out.push({ id, title, artist, kind: "music" });
      }
    }
    return out.slice(0, 40);
  });

export interface PlaylistInfo { id: string; title: string; author: string; count: string; thumb: string }

const WEB_CTX = { client: { clientName: "WEB", clientVersion: "2.20250101.00.00", hl: "en", gl: "US" } };
const lockupMeta = (l: any) => l?.metadata?.lockupMetadataViewModel;
const firstSrc = (l: any): string =>
  l?.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image?.sources?.[0]?.url ??
  l?.contentImage?.thumbnailViewModel?.image?.sources?.[0]?.url ?? "";

async function yt(path: string, body: Record<string, unknown>) {
  const res = await fetch(`https://www.youtube.com/youtubei/v1/${path}?prettyPrint=false`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context: WEB_CTX, ...body }),
  });
  if (!res.ok) throw new Error(`YouTube request failed (${res.status})`);
  return res.json();
}

export const searchPlaylists = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ q: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }): Promise<PlaylistInfo[]> => {
    const json = await yt("search", { query: data.q, params: "EgIQAw%3D%3D" });
    const out: PlaylistInfo[] = [];
    for (const l of collect(json, "lockupViewModel")) {
      if (l?.contentType !== "LOCKUP_CONTENT_TYPE_PLAYLIST" && l?.contentType !== "LOCKUP_CONTENT_TYPE_ALBUM") continue;
      const m = lockupMeta(l);
      const badge = collect(l, "thumbnailBadgeViewModel")[0]?.text ?? "";
      out.push({
        id: l.contentId,
        title: m?.title?.content ?? "Playlist",
        author: m?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content ?? "",
        count: badge,
        thumb: firstSrc(l),
      });
    }
    return out.slice(0, 30);
  });

export const getPlaylist = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ id: z.string().regex(/^[\w-]{10,64}$/) }).parse(d))
  .handler(async ({ data }): Promise<{ title: string; tracks: Track[] }> => {
    const json = await yt("browse", { browseId: `VL${data.id}` });
    const title = collect(json, "playlistMetadataRenderer")[0]?.title ?? "Playlist";
    const tracks: Track[] = [];
    const seen = new Set<string>();
    for (const l of collect(json, "lockupViewModel")) {
      const id = l?.contentId;
      if (!id || !/^[\w-]{11}$/.test(id) || seen.has(id)) continue;
      seen.add(id);
      const m = lockupMeta(l);
      const artist = m?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content ?? "";
      tracks.push({ id, title: m?.title?.content ?? "", artist, kind: "music" });
    }
    for (const v of collect(json, "playlistVideoRenderer")) {
      if (!v?.videoId || seen.has(v.videoId)) continue;
      seen.add(v.videoId);
      tracks.push({ id: v.videoId, title: text(v.title), artist: text(v.shortBylineText), kind: "music" });
    }
    return { title, tracks };
  });
