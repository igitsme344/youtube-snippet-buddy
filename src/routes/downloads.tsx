import { createFileRoute, Link } from "@tanstack/react-router";
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
  const { queue, remove, clearDone, settings } = useApp();
  const errors = queue.filter((i) => i.error);
  return (
    <AppShell>
      {!settings.serverUrl && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Demo mode: no download server connected yet, so downloads are simulated.{" "}
          <Link to="/settings" className="text-primary underline">Connect one in Settings</Link>.
        </div>
      )}
      {errors.map((e) => (
        <p key={e.id} className="mb-2 rounded-xl bg-destructive/15 p-3 text-sm text-destructive">{e.title}: {e.error}</p>
      ))}
      <QueueList items={queue} onRemove={remove} onClearDone={clearDone} />
    </AppShell>
  );
}
