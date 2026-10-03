import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AUDIO_FORMATS, VIDEO_FORMATS, detectSource, type FormatOption, type MediaMode, type QueueItem } from "./grabber";
import type { Track } from "./catalog";

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

interface Item extends QueueItem { jobId?: string; error?: string; fileUrl?: string }

interface Ctx {
  settings: Settings;
  updateSettings: (p: Partial<Settings>) => void;
  current: Track | null;
  play: (t: Track | null) => void;
  queue: Item[];
  enqueue: (url: string, title: string, format: FormatOption) => void;
  remove: (id: string) => void;
  clearDone: () => void;
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
    setQueue((q) => [{ id, url, title, source, format, status: server ? "downloading" : "queued", progress: 0, speedMbps: 0, addedAt: Date.now() }, ...q]);
    if (!server) return;
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

  // Demo mode engine (no server configured)
  useEffect(() => {
    const t = setInterval(() => {
      setQueue((items) => {
        const ai = items.findIndex((i) => !i.jobId && i.status === "processing");
        if (ai !== -1) return items.map((i, k) => (k === ai ? { ...i, status: "done" } : i));
        const di = items.findIndex((i) => i.status === "downloading" && !settingsRef.current.serverUrl);
        if (di !== -1) {
          return items.map((i, k) => {
            if (k !== di) return i;
            const p = i.progress + 3 + Math.random() * 7;
            return p >= 100 ? { ...i, status: "processing", progress: 100 } : { ...i, progress: p, speedMbps: 4 + Math.random() * 18 };
          });
        }
        const qi = items.findIndex((i) => i.status === "queued");
        if (qi === -1) return items;
        return items.map((i, k) => (k === qi ? { ...i, status: "downloading" } : i));
      });
    }, 350);
    return () => clearInterval(t);
  }, []);

  return (
    <AppCtx.Provider
      value={{
        settings, updateSettings, current, play: setCurrent, queue, enqueue,
        remove: (id) => setQueue((q) => q.filter((i) => i.id !== id)),
        clearDone: () => setQueue((q) => q.filter((i) => i.status !== "done")),
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}
