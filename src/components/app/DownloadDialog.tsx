import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { FormatPicker } from "@/components/grabber/FormatPicker";
import { findFormat, useApp } from "@/lib/app-store";
import type { MediaMode } from "@/lib/grabber";
import { toast } from "sonner";

export function DownloadDialog({ target, onClose }: { target: { url: string; title: string } | null; onClose: () => void }) {
  const { settings, updateSettings, enqueue } = useApp();
  const [mode, setMode] = useState<MediaMode>(settings.defaultMode);
  const [format, setFormat] = useState(findFormat(settings.audioFormatId));
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    if (!target) return;
    setMode(settings.defaultMode);
    setFormat(findFormat(settings.defaultMode === "audio" ? settings.audioFormatId : settings.videoFormatId));
  }, [target, settings]);

  const confirm = () => {
    if (!target) return;
    enqueue(target.url, target.title, format);
    if (remember)
      updateSettings({ defaultMode: mode, ...(mode === "audio" ? { audioFormatId: format.id } : { videoFormatId: format.id }) });
    toast.success(`Added "${target.title}" to downloads`);
    onClose();
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{target?.title}</DialogTitle>
        </DialogHeader>
        <FormatPicker
          mode={mode}
          selected={format}
          onModeChange={(m) => {
            setMode(m);
            setFormat(findFormat(m === "audio" ? settings.audioFormatId : settings.videoFormatId));
          }}
          onSelect={setFormat}
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
          Remember this choice for next time
        </label>
        <button onClick={confirm} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-display text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/30 hover:brightness-110">
          <Download className="size-4" /> Download
        </button>
      </DialogContent>
    </Dialog>
  );
}

/** Returns a function that downloads immediately with saved settings, or opens the picker. */
export function useDownloadAction() {
  const { settings, enqueue } = useApp();
  const [target, setTarget] = useState<{ url: string; title: string } | null>(null);
  const start = (url: string, title: string) => {
    if (settings.askEachTime) return setTarget({ url, title });
    const f = findFormat(settings.defaultMode === "audio" ? settings.audioFormatId : settings.videoFormatId);
    enqueue(url, title, f);
    toast.success(`Downloading "${title}" as ${f.label}`);
  };
  const dialog = <DownloadDialog target={target} onClose={() => setTarget(null)} />;
  return { start, dialog };
}
