import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { Switch } from "@/components/ui/switch";
import { FormatPicker } from "@/components/grabber/FormatPicker";
import { findFormat, useApp } from "@/lib/app-store";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Grabber.fm" },
      { name: "description", content: "Choose default download quality and connect your download server." },
      { property: "og:title", content: "Settings — Grabber.fm" },
      { property: "og:description", content: "Default quality presets and download server settings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const [server, setServer] = useState(settings.serverUrl);
  const mode = settings.defaultMode;
  const selected = findFormat(mode === "audio" ? settings.audioFormatId : settings.videoFormatId);

  const test = async () => {
    const url = server.trim().replace(/\/$/, "");
    if (!url) { updateSettings({ serverUrl: "" }); toast("Server removed. Demo mode is on."); return; }
    try {
      const r = await fetch(`${url}/api/health`);
      if (!r.ok) throw new Error();
      updateSettings({ serverUrl: url });
      toast.success("Connected to download server");
    } catch {
      toast.error("Couldn't reach that server");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5 card-glow">
          <h2 className="font-display text-lg font-bold">Default download quality</h2>
          <p className="mb-4 text-sm text-muted-foreground">Saved on this device and used every time you download.</p>
          <FormatPicker
            mode={mode}
            selected={selected}
            onModeChange={(m) => updateSettings({ defaultMode: m })}
            onSelect={(f) => updateSettings(f.mode === "audio" ? { audioFormatId: f.id } : { videoFormatId: f.id })}
          />
          <label className="mt-5 flex items-center justify-between gap-4">
            <span>
              <span className="block font-medium">Ask every time</span>
              <span className="text-sm text-muted-foreground">Turn off to download instantly with your defaults.</span>
            </span>
            <Switch checked={settings.askEachTime} onCheckedChange={(v) => updateSettings({ askEachTime: v })} />
          </label>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 card-glow">
          <h2 className="font-display text-lg font-bold">Download server</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Real downloads use the original YT Grabber yt-dlp engine, running on your own computer or server. Leave this empty for demo mode.
          </p>
          <div className="flex gap-2">
            <input value={server} onChange={(e) => setServer(e.target.value)} placeholder="http://192.168.1.10:8787" className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:ring-2 ring-primary/40" />
            <button onClick={test} className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Save</button>
          </div>
          <p className="mt-2 font-mono text-xs text-muted-foreground">Status: {settings.serverUrl ? `connected to ${settings.serverUrl}` : "demo mode"}</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <h2 className="mb-1 font-display text-lg font-bold text-foreground">Install the app</h2>
          On iPhone, tap Share then "Add to Home Screen" in Safari. On Android, open the Chrome menu and tap "Install app".
        </section>
      </div>
    </AppShell>
  );
}
