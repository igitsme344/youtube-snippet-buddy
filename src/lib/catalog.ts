export interface Track {
  id: string; // YouTube video id
  title: string;
  artist: string;
  kind: "music" | "video";
}

export const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const watchUrl = (t: Track) =>
  t.kind === "music" ? `https://music.youtube.com/watch?v=${t.id}` : `https://www.youtube.com/watch?v=${t.id}`;

export const CATALOG: Track[] = [
  { id: "fJ9rUzIMcZQ", title: "Bohemian Rhapsody", artist: "Queen", kind: "music" },
  { id: "JGwWNGJdvx8", title: "Shape of You", artist: "Ed Sheeran", kind: "music" },
  { id: "kJQP7kiw5Fk", title: "Despacito", artist: "Luis Fonsi ft. Daddy Yankee", kind: "music" },
  { id: "OPf0YbXqDm0", title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", kind: "music" },
  { id: "hT_nvWreIhg", title: "Counting Stars", artist: "OneRepublic", kind: "music" },
  { id: "YQHsXMglC9A", title: "Hello", artist: "Adele", kind: "music" },
  { id: "60ItHLz5WEA", title: "Faded", artist: "Alan Walker", kind: "music" },
  { id: "RgKAFK5djSk", title: "See You Again", artist: "Wiz Khalifa ft. Charlie Puth", kind: "music" },
  { id: "dQw4w9WgXcQ", title: "Never Gonna Give You Up", artist: "Rick Astley", kind: "music" },
  { id: "lp-EO5I60KA", title: "Thinking Out Loud", artist: "Ed Sheeran", kind: "music" },
  { id: "9bZkp7q19f0", title: "Gangnam Style", artist: "PSY", kind: "video" },
  { id: "aqz-KE-bpKQ", title: "Big Buck Bunny 4K", artist: "Blender Foundation", kind: "video" },
  { id: "jNQXAC9IVRw", title: "Me at the zoo", artist: "jawed", kind: "video" },
  { id: "CevxZvSJLk8", title: "Roar", artist: "Katy Perry", kind: "video" },
];

export function parseYouTubeId(input: string): string | null {
  try {
    const u = new URL(input.trim());
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v") || u.pathname.split("/shorts/")[1] || null;
  } catch {}
  return null;
}
