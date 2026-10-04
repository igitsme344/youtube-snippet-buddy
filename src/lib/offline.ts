// On-device storage for downloaded songs/videos (IndexedDB) so they play offline.
export interface SavedItem {
  key: string; // `${id}:${type}`
  id: string;
  title: string;
  artist: string;
  type: "audio" | "video";
  blob: Blob;
  savedAt: number;
}

const DB = "grabber-offline";
const STORE = "items";

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "key" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((res, rej) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
export const saveItem = (i: SavedItem) => tx("readwrite", (s) => s.put(i));
export const getItem = (key: string) => tx<SavedItem | undefined>("readonly", (s) => s.get(key));
export const listItems = () => tx<SavedItem[]>("readonly", (s) => s.getAll());
export const deleteItem = (key: string) => tx("readwrite", (s) => s.delete(key));

export const streamUrl = (id: string, type: "audio" | "video") => `/api/public/stream?id=${id}&type=${type}`;

/** Downloads a stream in chunks (works around YouTube throttling) and reports progress 0-100. */
export async function fetchMedia(id: string, type: "audio" | "video", onProgress: (p: number) => void): Promise<Blob> {
  const CHUNK = 4 * 1024 * 1024;
  const parts: BlobPart[] = [];
  let start = 0;
  let total = Infinity;
  let mime = type === "audio" ? "audio/mp4" : "video/mp4";
  while (start < total) {
    const end = start + CHUNK - 1;
    const r = await fetch(streamUrl(id, type), { headers: { Range: `bytes=${start}-${end}` } });
    if (!r.ok) throw new Error((await r.text()) || `Download failed (${r.status})`);
    mime = r.headers.get("content-type") || mime;
    const cr = r.headers.get("content-range");
    const buf = await r.arrayBuffer();
    parts.push(buf);
    if (cr) total = Number(cr.split("/")[1]) || start + buf.byteLength;
    else total = start + buf.byteLength;
    start += buf.byteLength;
    if (buf.byteLength === 0) break;
    onProgress(Math.min(100, (start / total) * 100));
  }
  return new Blob(parts, { type: mime });
}
