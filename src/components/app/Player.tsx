import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { useApp } from "@/lib/app-store";
import { getItem, streamUrl } from "@/lib/offline";
import { thumb } from "@/lib/catalog";

export function Player() {
  const { current, play, playQueue } = useApp();
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [paused, setPaused] = useState(true);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const type = current?.kind === "video" ? "video" : "audio";

  useEffect(() => {
    if (!current) return setSrc(null);
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      // Prefer an offline copy (either type), otherwise stream
      const saved = (await getItem(`${current.id}:${type}`).catch(() => undefined)) ?? (await getItem(`${current.id}:${type === "audio" ? "video" : "audio"}`).catch(() => undefined));
      if (cancelled) return;
      if (saved) { url = URL.createObjectURL(saved.blob); setSrc(url); }
      else setSrc(streamUrl(current.id, type));
    })();
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [current, type]);

  const idx = current ? playQueue.findIndex((t) => t.id === current.id) : -1;
  const next = () => { const n = playQueue[idx + 1]; if (n) play(n); };
  const prev = () => { const p = playQueue[idx - 1]; if (p) play(p); else if (ref.current) ref.current.currentTime = 0; };

  useEffect(() => {
    if (!current || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title, artist: current.artist,
      artwork: [{ src: thumb(current.id), sizes: "480x360", type: "image/jpeg" }],
    });
    navigator.mediaSession.setActionHandler("play", () => ref.current?.play());
    navigator.mediaSession.setActionHandler("pause", () => ref.current?.pause());
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("previoustrack", prev);
  });

  if (!current) return null;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="mx-2 mb-2 rounded-2xl border border-border bg-card p-2 shadow-2xl card-glow md:mx-auto md:mb-4 md:max-w-6xl">
      <div className="flex items-center gap-3">
        <div className={type === "video" ? "aspect-video w-36 shrink-0 overflow-hidden rounded-xl bg-background sm:w-48" : "size-12 shrink-0 overflow-hidden rounded-lg"}>
          {src && (
            <video
              key={src}
              ref={ref}
              src={src}
              poster={thumb(current.id)}
              autoPlay
              playsInline
              className="size-full object-cover"
              onPlay={() => setPaused(false)}
              onPause={() => setPaused(true)}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
              onEnded={next}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">{current.title}</p>
          <p className="truncate text-sm text-muted-foreground">{current.artist}</p>
        </div>
        <button onClick={prev} aria-label="Previous" className="hidden rounded-lg p-2 text-muted-foreground hover:text-foreground sm:block"><SkipBack className="size-5" /></button>
        <button onClick={() => (paused ? ref.current?.play() : ref.current?.pause())} aria-label={paused ? "Play" : "Pause"} className="rounded-full bg-primary p-2.5 text-primary-foreground">
          {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
        </button>
        <button onClick={next} aria-label="Next" className="rounded-lg p-2 text-muted-foreground hover:text-foreground"><SkipForward className="size-5" /></button>
        <button onClick={() => play(null)} aria-label="Close player" className="rounded-lg p-2 text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
      </div>
      <div className="mt-2 flex items-center gap-2 px-1 font-mono text-xs text-muted-foreground">
        <span>{fmt(time)}</span>
        <input type="range" min={0} max={dur || 0} step={0.5} value={time} onChange={(e) => { if (ref.current) ref.current.currentTime = Number(e.target.value); }} className="flex-1 accent-primary" aria-label="Seek" />
        <span>{dur ? fmt(dur) : "--:--"}</span>
      </div>
    </div>
  );
}
