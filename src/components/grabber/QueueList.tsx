import { CheckCircle2, Download, Loader2, Trash2, AlertCircle, Clock } from "lucide-react";
import { formatSize, type QueueItem } from "@/lib/grabber";
import { cn } from "@/lib/utils";

interface QueueListProps {
  items: QueueItem[];
  onRemove: (id: string) => void;
  onClearDone: () => void;
}

const STATUS_LABEL: Record<QueueItem["status"], string> = {
  queued: "Queued",
  downloading: "Downloading",
  processing: "Processing",
  done: "Complete",
  error: "Failed",
};

export function QueueList({ items, onRemove, onClearDone }: QueueListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
        <Download className="mb-3 size-8 text-muted-foreground/50" />
        <p className="font-display text-sm font-medium text-muted-foreground">Your download queue is empty</p>
        <p className="mt-1 text-xs text-muted-foreground/70">Paste a link above to get started</p>
      </div>
    );
  }

  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Queue · {items.length}
        </h2>
        {doneCount > 0 && (
          <button
            onClick={onClearDone}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear completed ({doneCount})
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="group rounded-xl border border-border bg-card p-4 card-glow transition-colors"
          >
            <div className="flex items-start gap-3">
              <StatusIcon status={item.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium text-card-foreground">{item.title}</p>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-xs",
                      item.status === "done" && "text-success",
                      item.status === "error" && "text-destructive",
                      (item.status === "queued" || item.status === "downloading" || item.status === "processing") &&
                        "text-muted-foreground",
                    )}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                  {item.source.label} · {item.format.label} · {formatSize(item.format.sizeMb)}
                </p>

                {(item.status === "downloading" || item.status === "processing") && (
                  <div className="mt-3">
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn(
                          "h-full rounded-full transition-[width] duration-300",
                          item.status === "downloading" ? "bg-primary progress-stripes" : "bg-success",
                        )}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between font-mono text-xs text-muted-foreground">
                      <span>{item.progress.toFixed(0)}%</span>
                      {item.status === "downloading" && <span>{item.speedMbps.toFixed(1)} MB/s</span>}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => onRemove(item.id)}
                aria-label="Remove from queue"
                className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusIcon({ status }: { status: QueueItem["status"] }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />;
    case "error":
      return <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />;
    case "downloading":
    case "processing":
      return <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-primary" />;
    default:
      return <Clock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />;
  }
}
