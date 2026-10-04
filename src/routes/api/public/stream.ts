import { createFileRoute } from "@tanstack/react-router";

// Streams YouTube audio/video through our server so it plays in Safari/iPhone and can be saved offline.
const UA =
  "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip";
const cache = new Map<string, { url: string; mime: string; exp: number }>();

async function resolve(id: string, type: "audio" | "video") {
  const key = `${id}:${type}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit;
  const r = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({
      context: {
        client: {
          clientName: "ANDROID_VR", clientVersion: "1.60.19", deviceMake: "Oculus", deviceModel: "Quest 3",
          androidSdkVersion: 32, osName: "Android", osVersion: "12L", hl: "en", gl: "US",
        },
      },
      videoId: id, contentCheckOk: true, racyCheckOk: true,
    }),
  });
  const j: any = await r.json();
  const sd = j?.streamingData ?? {};
  let f: any;
  if (type === "audio") {
    f = (sd.adaptiveFormats ?? [])
      .filter((x: any) => x.url && String(x.mimeType).startsWith("audio/mp4"))
      .sort((a: any, b: any) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
  } else {
    f = (sd.formats ?? []).filter((x: any) => x.url && String(x.mimeType).startsWith("video/mp4")).sort((a: any, b: any) => (b.height ?? 0) - (a.height ?? 0))[0];
  }
  if (!f) throw new Error(j?.playabilityStatus?.reason || "No playable stream");
  const out = { url: f.url as string, mime: String(f.mimeType).split(";")[0]!, exp: Date.now() + 60 * 60_000 };
  cache.set(key, out);
  return out;
}

export const Route = createFileRoute("/api/public/stream")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const id = u.searchParams.get("id") ?? "";
        const type = u.searchParams.get("type") === "video" ? "video" : "audio";
        if (!/^[\w-]{11}$/.test(id)) return new Response("Bad id", { status: 400 });
        try {
          const s = await resolve(id, type);
          const range = request.headers.get("range") ?? "bytes=0-";
          let up = await fetch(s.url, { headers: { Range: range, "User-Agent": UA } });
          if (up.status === 403) {
            cache.delete(`${id}:${type}`);
            const s2 = await resolve(id, type);
            up = await fetch(s2.url, { headers: { Range: range, "User-Agent": UA } });
          }
          const h = new Headers();
          for (const k of ["content-length", "content-range", "accept-ranges"]) {
            const v = up.headers.get(k);
            if (v) h.set(k, v);
          }
          h.set("content-type", s.mime);
          h.set("accept-ranges", "bytes");
          h.set("cache-control", "no-store");
          return new Response(up.body, { status: up.status, headers: h });
        } catch (e) {
          return new Response(String((e as Error).message), { status: 502 });
        }
      },
    },
  },
});
