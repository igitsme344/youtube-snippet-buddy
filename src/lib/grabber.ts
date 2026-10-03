export type SourceKind =
  | "youtube-video"
  | "youtube-playlist"
  | "youtube-music"
  | "vimeo"
  | "tiktok"
  | "instagram"
  | "soundcloud"
  | "twitter"
  | "generic";

export type MediaMode = "video" | "audio";

export interface DetectedSource {
  kind: SourceKind;
  label: string;
  isPlaylist: boolean;
  host: string;
}

export interface FormatOption {
  id: string;
  label: string;
  ext: string;
  mode: MediaMode;
  quality: string;
  sizeMb: number;
}

export interface QueueItem {
  id: string;
  url: string;
  title: string;
  source: DetectedSource;
  format: FormatOption;
  status: "queued" | "downloading" | "processing" | "done" | "error";
  progress: number;
  speedMbps: number;
  addedAt: number;
}

const SOURCE_PATTERNS: Array<{ kind: SourceKind; label: string; test: (u: URL) => boolean }> = [
  {
    kind: "youtube-music",
    label: "YouTube Music",
    test: (u) => u.hostname.includes("music.youtube.com"),
  },
  {
    kind: "youtube-playlist",
    label: "YouTube Playlist",
    test: (u) =>
      (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) &&
      (u.searchParams.has("list") || u.pathname.startsWith("/playlist")),
  },
  {
    kind: "youtube-video",
    label: "YouTube Video",
    test: (u) => u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be"),
  },
  { kind: "vimeo", label: "Vimeo", test: (u) => u.hostname.includes("vimeo.com") },
  { kind: "tiktok", label: "TikTok", test: (u) => u.hostname.includes("tiktok.com") },
  { kind: "instagram", label: "Instagram", test: (u) => u.hostname.includes("instagram.com") },
  { kind: "soundcloud", label: "SoundCloud", test: (u) => u.hostname.includes("soundcloud.com") },
  {
    kind: "twitter",
    label: "X / Twitter",
    test: (u) => u.hostname.includes("twitter.com") || u.hostname.includes("x.com"),
  },
];

export function detectSource(rawUrl: string): DetectedSource | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  for (const pattern of SOURCE_PATTERNS) {
    if (pattern.test(url)) {
      return {
        kind: pattern.kind,
        label: pattern.label,
        isPlaylist: pattern.kind === "youtube-playlist",
        host: url.hostname.replace(/^www\./, ""),
      };
    }
  }
  return { kind: "generic", label: "Web Media", isPlaylist: false, host: url.hostname };
}

export const VIDEO_FORMATS: FormatOption[] = [
  { id: "mp4-2160", label: "MP4 · 4K", ext: "mp4", mode: "video", quality: "2160p", sizeMb: 1480 },
  { id: "mp4-1080", label: "MP4 · Full HD", ext: "mp4", mode: "video", quality: "1080p", sizeMb: 320 },
  { id: "mp4-720", label: "MP4 · HD", ext: "mp4", mode: "video", quality: "720p", sizeMb: 145 },
  { id: "mkv-1080", label: "MKV · Full HD", ext: "mkv", mode: "video", quality: "1080p", sizeMb: 335 },
  { id: "webm-1080", label: "WebM · Full HD", ext: "webm", mode: "video", quality: "1080p", sizeMb: 290 },
  { id: "gif-480", label: "GIF · Animated", ext: "gif", mode: "video", quality: "480p", sizeMb: 38 },
];

export const AUDIO_FORMATS: FormatOption[] = [
  { id: "mp3-320", label: "MP3 · 320 kbps", ext: "mp3", mode: "audio", quality: "320k", sizeMb: 9.6 },
  { id: "mp3-128", label: "MP3 · 128 kbps", ext: "mp3", mode: "audio", quality: "128k", sizeMb: 3.8 },
  { id: "m4a-256", label: "M4A · 256 kbps", ext: "m4a", mode: "audio", quality: "256k", sizeMb: 7.7 },
  { id: "flac", label: "FLAC · Lossless", ext: "flac", mode: "audio", quality: "lossless", sizeMb: 28 },
  { id: "wav", label: "WAV · Studio", ext: "wav", mode: "audio", quality: "pcm", sizeMb: 41 },
];

const TITLE_FRAGMENTS = [
  "Midnight Signals",
  "Live Session",
  "Official Video",
  "Extended Mix",
  "Behind the Scenes",
  "Remastered",
  "Full Stream",
  "Director's Cut",
];

export function mockTitleFor(url: string, source: DetectedSource): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) hash = (hash * 31 + url.charCodeAt(i)) >>> 0;
  const fragment = TITLE_FRAGMENTS[hash % TITLE_FRAGMENTS.length]!;
  const slug = new URL(url).pathname
    .split("/")
    .filter(Boolean)
    .pop()
    ?.replace(/[-_]+/g, " ")
    .slice(0, 42);
  const base = slug && slug.length > 3 ? slug : fragment;
  const titled = base.charAt(0).toUpperCase() + base.slice(1);
  return source.isPlaylist ? `${titled} — Playlist` : titled;
}

export function formatSize(mb: number): string {
  return mb >= 1000 ? `${(mb / 1000).toFixed(2)} GB` : `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}
