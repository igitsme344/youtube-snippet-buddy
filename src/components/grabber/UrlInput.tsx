import { Link2, ListVideo, ClipboardPaste, X } from "lucide-react";
import type { DetectedSource } from "@/lib/grabber";

interface UrlInputProps {
  value: string;
  detected: DetectedSource | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function UrlInput({ value, detected, onChange, onSubmit }: UrlInputProps) {
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text);
    } catch {
      // clipboard permission denied — user can paste manually
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            placeholder="Paste a YouTube, Vimeo, TikTok, SoundCloud… link"
            className="h-13 w-full rounded-xl border border-input bg-secondary/60 py-4 pl-11 pr-10 font-mono text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/60"
          />
          {value && (
            <button
              onClick={() => onChange("")}
              aria-label="Clear link"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <button
          onClick={handlePaste}
          className="flex items-center gap-2 rounded-xl border border-input bg-secondary/60 px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
        >
          <ClipboardPaste className="size-4" />
          <span className="hidden sm:inline">Paste</span>
        </button>
      </div>

      {detected && (
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary animate-pulse-dot" />
            {detected.label} detected
          </span>
          {detected.isPlaylist && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-accent-foreground">
              <ListVideo className="size-3.5" />
              Playlist — all items will be queued
            </span>
          )}
          <span className="truncate font-mono text-xs text-muted-foreground">{detected.host}</span>
        </div>
      )}
    </div>
  );
}
