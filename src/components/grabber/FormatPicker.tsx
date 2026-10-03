import { Film, Music4, Check } from "lucide-react";
import { AUDIO_FORMATS, VIDEO_FORMATS, formatSize, type FormatOption, type MediaMode } from "@/lib/grabber";
import { cn } from "@/lib/utils";

interface FormatPickerProps {
  mode: MediaMode;
  selected: FormatOption;
  onModeChange: (mode: MediaMode) => void;
  onSelect: (format: FormatOption) => void;
}

export function FormatPicker({ mode, selected, onModeChange, onSelect }: FormatPickerProps) {
  const formats = mode === "video" ? VIDEO_FORMATS : AUDIO_FORMATS;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary/60 p-1">
        {(
          [
            { id: "video", label: "Video", icon: Film },
            { id: "audio", label: "Audio", icon: Music4 },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onModeChange(id)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all",
              mode === id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {formats.map((format) => {
          const active = selected.id === format.id;
          return (
            <button
              key={format.id}
              onClick={() => onSelect(format)}
              className={cn(
                "group relative rounded-xl border p-3 text-left transition-all",
                active
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-input hover:bg-accent/50",
              )}
            >
              {active && (
                <span className="absolute right-2 top-2 rounded-full bg-primary p-0.5 text-primary-foreground">
                  <Check className="size-3" />
                </span>
              )}
              <div className={cn("font-display text-sm font-semibold", active ? "text-primary" : "text-foreground")}>
                {format.label}
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                .{format.ext} · ~{formatSize(format.sizeMb)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
