import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AUDIO_FORMATS, VIDEO_FORMATS, detectSource, type FormatOption, type MediaMode, type QueueItem } from "./grabber";
import { parseYouTubeId, type Track } from "./catalog";
import { deleteItem, fetchMedia, listItems, saveItem, type SavedItem } from "./offline";

export interface Settings {
  serverUrl: string;
  defaultMode: MediaMode;
  videoFormatId: string;
  audioFormatId: string;
  askEachTime: boolean;
}

const DEFAULTS: Settings = { serverUrl: "", defaultMode: "audio", videoFormatId: "mp4-1080", audioFormatId: "mp3-320", askEachTime: true };
const KEY = "ytg-settings-v1";

export const findFormat = (id: string): FormatOption =>
  [...VIDEO_FORMATS, ...AUDIO_FORMATS].find((f) => f.id === id) ?? AUDIO_FORMATS[0]!;

interface Item extends QueueItem { jobId?: string; error?: string | undefined; fileUrl?: string }

interface Ctx {
  settings: Settings;
  updateSettings: (p: Partial<Settings>) => void;
  current: Track | null;
  play: (t: Track | null) => void;
  queue: Item[];
  enqueue: (url: string, title: string, format: FormatOption) => void;
  remove: (id: string) => void;
  clearDone: () => void;
  library: Omit<SavedItem, "blob">[];
  removeSaved: (key: string) => void;
  playQueue: Track[];
  setPlayQueue: (t: Track[]) => void;
}

const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
};

const audioQ = (f: FormatOption) => (f.quality === "128k" ? 5 : 10);
const height = (f: FormatOption) => Number(f.quality.match(/\d+/)?.[0]) || undefined;

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [current, setCurrent] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Item[]>([]);
  const [library, setLibrary] = useState<Omit<SavedItem, "blob">[]>([]);
  const [playQueue, setPlayQueue] = useState<Track[]>([]);
  const refreshLib = useCallback(() => {
    listItems().then((l) => setLibrary(l.map(({ blob: _b, ...r }) => r).sort((a, b) => b.savedAt - a.savedAt))).catch(() => {});
  }, []);
  useEffect(refreshLib, [refreshLib]);
  const counter = useRef(0);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const updateSettings = useCallback((p: Partial<Settings>) => {
    setSettings((s) => {
      const n = { ...s, ...p };
      localStorage.setItem(KEY, JSON.stringify(n));
      return n;
    });
  }, []);

  const patch = (id: string, p: Partial<Item>) => setQueue((q) => q.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const enqueue = useCallback((url: string, title: string, format: FormatOption) => {
    const source = detectSource(url);
    if (!source) return;
    counter.current += 1;
    const id = `q-${counter.current}`;
    const server = settingsRef.current.serverUrl.replace(/\/$/, "");
    if (!server) {
      // Built-in download: stream through our server and save on this device
      const vid = parseYouTubeId(url);
      setQueue((q) => [{ id, url, title, source, format, status: vid ? "downloading" : "error", error: vid ? undefined : "Not a YouTube link", progress: 0, speedMbps: 0, addedAt: Date.now() }, ...q]);
      if (!vid) return;
      const type = format.mode === "audio" ? "audio" : "video";
      const [artist, ...rest] = title.split(" — ");
      const t0 = Date.now();
      fetchMedia(vid, type, (p) => patch(id, { progress: p }))
        .then(async (blob) => {
          patch(id, { status: "processing", speedMbps: blob.size / 1e6 / ((Date.now() - t0) / 1000) * 8 });
          await saveItem({ key: `${vid}:${type}`, id: vid, title: rest.length ? rest.join(" — ") : title, artist: rest.length ? artist! : "", type, blob, savedAt: Date.now() });
          patch(id, { status: "done", progress: 100 });
          refreshLib();
        })
        .catch((e) => patch(id, { status: "error", error: String(e.message || e) }));
      return;
    }
    setQueue((q) => [{ id, url, title, source, format, status: "downloading", progress: 0, speedMbps: 0, addedAt: Date.now() }, ...q]);
    // Real download through the yt-dlp server
    fetch(`${server}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, mode: format.mode, ext: format.ext, height: height(format), audioQuality: audioQ(format) }),
    })
      .then((r) => r.json())
      .then((job) => {
        if (!job.id) throw new Error(job.error || "Server refused the download");
        const poll = setInterval(async () => {
          try {
            const j = await (await fetch(`${server}/api/jobs/${job.id}`)).json();
            const speed = parseFloat(j.speed) || 0;
            patch(id, { status: j.status, progress: j.progress, speedMbps: speed, title: j.title || title });
            if (j.status === "done") {
              clearInterval(poll);
              const fileUrl = `${server}/api/jobs/${job.id}/file`;
              patch(id, { fileUrl });
              const a = document.createElement("a");
              a.href = fileUrl;
              a.click();
            } else if (j.status === "error") {
              clearInterval(poll);
              patch(id, { error: j.error });
            }
          } catch {
            clearInterval(poll);
            patch(id, { status: "error", error: "Lost connection to download server" });
          }
        }, 1000);
      })
      .catch((e) => patch(id, { status: "error", error: String(e.message || e) }));
  }, []);

  return (
    <AppCtx.Provider
      value={{
        settings, updateSettings, current, play: setCurrent, queue, enqueue,
        remove: (id) => setQueue((q) => q.filter((i) => i.id !== id)),
        clearDone: () => setQueue((q) => q.filter((i) => i.status !== "done")),
        library, playQueue, setPlayQueue,
        removeSaved: (key) => { deleteItem(key).then(refreshLib); },
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}
