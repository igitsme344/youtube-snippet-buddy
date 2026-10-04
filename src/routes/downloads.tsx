import { createFileRoute } from "@tanstack/react-router";
import { Music, Play, Share, Trash2, Video } from "lucide-react";
import { getItem } from "@/lib/offline";
import { thumb } from "@/lib/catalog";
import { AppShell } from "@/components/app/AppShell";
import { QueueList } from "@/components/grabber/QueueList";
import { useApp } from "@/lib/app-store";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Downloads — Grabber.fm" },
      { name: "description", content: "Track your music and video downloads with live progress." },
      { property: "og:title", content: "Downloads — Grabber.fm" },
      { property: "og:description", content: "Live download queue for your music and videos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DownloadsPage,
});

function DownloadsPage() {
  const { queue, remove, clearDone, library, removeSaved, play, setPlayQueue } = useApp();
  const errors = queue.filter((i) => i.error);
  const tracks = library.map((l) => ({ id: l.id, title: l.title, artist: l.artist, kind: l.type === "video" ? ("video" as const) : ("music" as const) }));
  const exportFile = async (key: string, name: string) => {
    const it = await getItem(key);
    if (!it) return;
    const file = new File([it.blob], `${name}.${it.type === "audio" ? "m4a" : "mp4"}`, { type: it.blob.type });
    if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file] }).catch(() => {});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
  };
  return (
    <AppShell>
      <h2 className="font-display text-xl font-bold">On this device</h2>
      <p className="mb-4 text-sm text-muted-foreground">Saved inside the app, so they play offline and from the lock screen.</p>
      {library.length === 0 && <p className="mb-6 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">Nothing saved yet. Tap the download button on any song, video or playlist.</p>}
      <ul className="mb-8 divide-y divide-border rounded-2xl border border-border bg-card">
        {library.map((l, i) => (
          <li key={l.key} className="flex items-center gap-3 p-2.5">
            <button onClick={() => { setPlayQueue(tracks); play(tracks[i]!); }} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <img src={thumb(l.id)} alt="" className="aspect-video w-20 rounded-md object-cover" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{l.title}</span>
                <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">{l.type === "audio" ? <Music className="size-3" /> : <Video className="size-3" />}{l.artist || (l.type === "audio" ? "Audio" : "Video")}</span>
              </span>
            </button>
            <button onClick={() => { setPlayQueue(tracks); play(tracks[i]!); }} aria-label="Play" className="rounded-lg p-2 text-muted-foreground hover:text-primary"><Play className="size-4" /></button>
            <button onClick={() => exportFile(l.key, l.title)} aria-label="Save to Files" className="rounded-lg p-2 text-muted-foreground hover:text-primary"><Share className="size-4" /></button>
            <button onClick={() => removeSaved(l.key)} aria-label="Delete" className="rounded-lg p-2 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>
      {errors.map((e) => (
        <p key={e.id} className="mb-2 rounded-xl bg-destructive/15 p-3 text-sm text-destructive">{e.title}: {e.error}</p>
      ))}
      <QueueList items={queue} onRemove={remove} onClearDone={clearDone} />
    </AppShell>
  );
}
