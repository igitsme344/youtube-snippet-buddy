import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Play } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { useDownloadAction } from "@/components/app/DownloadDialog";
import { getPlaylist } from "@/lib/search.functions";
import { findFormat, useApp } from "@/lib/app-store";
import { thumb, watchUrl } from "@/lib/catalog";

export const Route = createFileRoute("/playlist/$id")({
  head: () => ({
    meta: [
      { title: "Playlist — Grabber.fm" },
      { name: "description", content: "Play every track in a YouTube or YouTube Music playlist, or download them all." },
      { property: "og:title", content: "Playlist — Grabber.fm" },
      { property: "og:description", content: "Stream or download a whole playlist." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlaylistPage,
});

function PlaylistPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getPlaylist);
  const q = useQuery({ queryKey: ["playlist", id], queryFn: () => fn({ data: { id } }) });
  const { play, setPlayQueue, enqueue, settings } = useApp();
  const { start, dialog } = useDownloadAction();
  const tracks = q.data?.tracks ?? [];

  const playFrom = (i: number) => { setPlayQueue(tracks); play(tracks[i]!); };
  const downloadAll = () => {
    const f = findFormat(settings.audioFormatId);
    const fmt = f.mode === "audio" ? f : findFormat("mp3-320");
    tracks.forEach((t) => enqueue(watchUrl(t), `${t.artist} — ${t.title}`, fmt));
    toast.success(`Downloading ${tracks.length} songs to this device`);
  };

  return (
    <AppShell>
      {dialog}
      {q.isLoading && <p className="text-sm text-muted-foreground">Loading playlist…</p>}
      {q.isError && <p className="text-sm text-destructive">Couldn't load this playlist.</p>}
      {q.data && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Playlist · {tracks.length} tracks</p>
              <h1 className="font-display text-2xl font-bold">{q.data.title}</h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => playFrom(0)} disabled={!tracks.length} className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold"><Play className="size-4" /> Play all</button>
              <button onClick={downloadAll} disabled={!tracks.length} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Download className="size-4" /> Download all</button>
            </div>
          </div>
          <ol className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
            {tracks.map((t, i) => (
              <li key={t.id} className="flex items-center gap-3 p-2.5">
                <button onClick={() => playFrom(i)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <img src={thumb(t.id)} alt="" loading="lazy" className="aspect-video w-20 rounded-md object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{t.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{t.artist}</span>
                  </span>
                </button>
                <button onClick={() => start(watchUrl(t), `${t.artist} — ${t.title}`)} aria-label={`Download ${t.title}`} className="rounded-lg p-2 text-muted-foreground hover:text-primary"><Download className="size-4" /></button>
              </li>
            ))}
          </ol>
        </>
      )}
    </AppShell>
  );
}
