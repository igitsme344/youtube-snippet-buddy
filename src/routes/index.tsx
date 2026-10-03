import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Play, Search } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useDownloadAction } from "@/components/app/DownloadDialog";
import { useApp } from "@/lib/app-store";
import { CATALOG, parseYouTubeId, thumb, watchUrl, type Track } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Grabber.fm — Stream & Download YouTube Music" },
      { name: "description", content: "Browse YouTube and YouTube Music, stream in-app, and download music or video in the quality you choose." },
      { property: "og:title", content: "Grabber.fm — Stream & Download YouTube Music" },
      { property: "og:description", content: "Stream and download music and videos with saved quality presets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrowsePage,
});

type Tab = "music" | "video";

function BrowsePage() {
  const { play } = useApp();
  const { start, dialog } = useDownloadAction();
  const [tab, setTab] = useState<Tab>("music");
  const [q, setQ] = useState("");

  const pastedId = parseYouTubeId(q);
  const pasted: Track | null = pastedId
    ? { id: pastedId, title: "Pasted link", artist: q.includes("music.youtube") ? "YouTube Music" : "YouTube", kind: q.includes("music.youtube") ? "music" : "video" }
    : null;

  const list = useMemo(() => {
    const s = q.toLowerCase().trim();
    return CATALOG.filter((t) => t.kind === tab && (!s || `${t.title} ${t.artist}`.toLowerCase().includes(s)));
  }, [q, tab]);

  return (
    <AppShell>
      {dialog}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search songs, artists, or paste a YouTube link"
          className="w-full rounded-2xl border border-border bg-card py-4 pl-12 pr-4 text-base outline-none ring-primary/40 focus:ring-2"
        />
      </div>

      {pasted && (
        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-primary/40 bg-card p-3 card-glow">
          <img src={thumb(pasted.id)} alt="" className="aspect-video w-32 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold">Link ready</p>
            <p className="truncate text-sm text-muted-foreground">{q}</p>
          </div>
          <button onClick={() => play(pasted)} className="rounded-xl bg-secondary p-3" aria-label="Play"><Play className="size-5" /></button>
          <button onClick={() => start(q.trim(), pasted.title)} className="rounded-xl bg-primary p-3 text-primary-foreground" aria-label="Download"><Download className="size-5" /></button>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        {(["music", "video"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {t === "music" ? "YouTube Music" : "YouTube"}
          </button>
        ))}
      </div>

      <h2 className="mt-6 font-display text-xl font-bold">{tab === "music" ? "Trending songs" : "Popular videos"}</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((t) => (
          <div key={t.id} className="group overflow-hidden rounded-2xl border border-border bg-card">
            <button onClick={() => play(t)} className="relative block aspect-video w-full overflow-hidden">
              <img src={thumb(t.id)} alt={t.title} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />
              <span className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 transition group-hover:opacity-100">
                <Play className="size-10 fill-primary text-primary" />
              </span>
            </button>
            <div className="flex items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.title}</p>
                <p className="truncate text-xs text-muted-foreground">{t.artist}</p>
              </div>
              <button onClick={() => start(watchUrl(t), `${t.artist} — ${t.title}`)} aria-label={`Download ${t.title}`} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-primary">
                <Download className="size-4" />
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No matches. Paste a YouTube link to play or download any video.</p>}
      </div>
    </AppShell>
  );
}
