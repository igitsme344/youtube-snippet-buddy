// YT Grabber download server — runs yt-dlp the same way the original desktop app does.
// Requirements: Node 18+, yt-dlp and ffmpeg on PATH (or set YTDLP_PATH).
// Run: node server.mjs   (PORT=8787, DOWNLOAD_DIR=./downloads, ALLOWED_ORIGIN=*)
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PORT = Number(process.env.PORT || 8787);
const DIR = path.resolve(process.env.DOWNLOAD_DIR || "./downloads");
const YTDLP = process.env.YTDLP_PATH || "yt-dlp";
const ORIGIN = process.env.ALLOWED_ORIGIN || "*";
fs.mkdirSync(DIR, { recursive: true });

const jobs = new Map();

// Ported from yt-grabber src/common/YtdplUtils.ts
function audioArgs(ext, audioQuality) {
  return ["--extract-audio", "--audio-format", ext, ...(ext !== "wav" ? ["--embed-thumbnail"] : []), "--audio-quality", String(10 - audioQuality)];
}
function videoArgs(ext, height) {
  const map = { mkv: "webm", mp4: "mp4", webm: "webm", gif: "webm" };
  const e = map[ext] || "mp4";
  const fmt = !height
    ? ["-f", `bv*+ba/b[ext=${e}]`]
    : ["-f", `bv*[height<=${height}][ext=${e}]+ba[ext=m4a]/b[height<=${height}][ext=${e}] / bv*+ba/b`];
  return ext === "mkv" ? [...fmt, "--merge-output-format", "mkv"] : fmt;
}

function startJob({ url, mode, ext, height, audioQuality }) {
  const id = crypto.randomUUID();
  const jobDir = path.join(DIR, id);
  fs.mkdirSync(jobDir);
  const args = [
    ...(mode === "audio" ? audioArgs(ext, audioQuality ?? 10) : videoArgs(ext, height)),
    "--newline", "--progress", "--no-playlist",
    "--extractor-args", "youtube:player_client=default,web_safari",
    "-P", `home:${jobDir}`, "--output", "%(title)s.%(ext)s",
    "--print", "before_dl:TITLE:%(title)s",
    url,
  ];
  const job = { id, status: "downloading", progress: 0, speed: "", title: "", file: null, error: null };
  jobs.set(id, job);
  const proc = spawn(YTDLP, args);
  const onLine = (line) => {
    if (line.startsWith("TITLE:")) job.title = line.slice(6);
    const m = line.match(/\[download\]\s+([\d.]+)%.*?at\s+(\S+)/);
    if (m) { job.progress = Number(m[1]); job.speed = m[2]; }
    if (/\[(ExtractAudio|Merger|VideoConvertor|EmbedThumbnail)\]/.test(line)) job.status = "processing";
  };
  let buf = "";
  const feed = (d) => { buf += d; const lines = buf.split(/\r?\n/); buf = lines.pop(); lines.forEach(onLine); };
  proc.stdout.on("data", feed);
  proc.stderr.on("data", (d) => { job.error = String(d).trim().split("\n").pop(); });
  proc.on("close", (code) => {
    const files = fs.readdirSync(jobDir);
    if (code === 0 && files.length) { job.status = "done"; job.progress = 100; job.file = files[0]; job.error = null; }
    else { job.status = "error"; job.error ||= `yt-dlp exited with ${code}`; }
  });
  proc.on("error", (e) => { job.status = "error"; job.error = e.message; });
  return job;
}

const send = (res, code, body) => {
  res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" });
  res.end(JSON.stringify(body));
};

http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (u.pathname === "/api/health") return send(res, 200, { ok: true });
  if (req.method === "POST" && u.pathname === "/api/jobs") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (!/^https?:\/\//.test(data.url)) return send(res, 400, { error: "Invalid URL" });
        send(res, 201, startJob(data));
      } catch { send(res, 400, { error: "Bad request" }); }
    });
    return;
  }
  const m = u.pathname.match(/^\/api\/jobs\/([\w-]+)(\/file)?$/);
  const job = m && jobs.get(m[1]);
  if (!job) return send(res, 404, { error: "Not found" });
  if (!m[2]) return send(res, 200, job);
  if (job.status !== "done") return send(res, 409, { error: "Not ready" });
  const fp = path.join(DIR, job.id, job.file);
  res.writeHead(200, { "Access-Control-Allow-Origin": ORIGIN, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(job.file)}`, "Content-Length": fs.statSync(fp).size });
  fs.createReadStream(fp).pipe(res);
}).listen(PORT, () => console.log(`Download server on http://localhost:${PORT}`));
