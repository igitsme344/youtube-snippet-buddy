import { Link } from "@tanstack/react-router";
import { Compass, Download, Settings, Music2 } from "lucide-react";
import type { ReactNode } from "react";
import { useApp } from "@/lib/app-store";
import { Player } from "./Player";

const NAV = [
  { to: "/", label: "Browse", icon: Compass },
  { to: "/downloads", label: "Downloads", icon: Download },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { queue } = useApp();
  const active = queue.filter((i) => i.status === "downloading" || i.status === "processing" || i.status === "queued").length;
  return (
    <div className="min-h-screen bg-background pb-40 md:pb-28">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
              <Music2 className="size-5 text-primary-foreground" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              Grabber<span className="text-primary text-glow">.fm</span>
            </span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground" activeProps={{ className: "bg-secondary !text-foreground" }}>
                {n.label}
                {n.to === "/downloads" && active > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{active}</span>}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>

      <div className="fixed inset-x-0 bottom-0 z-40">
        <Player />
        <nav className="grid grid-cols-3 border-t border-border bg-background/95 backdrop-blur md:hidden">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="flex flex-col items-center gap-1 py-2.5 text-xs text-muted-foreground" activeProps={{ className: "!text-primary" }}>
              <n.icon className="size-5" />
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
