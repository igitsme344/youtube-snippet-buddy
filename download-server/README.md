# Download server

Uses the same yt-dlp download logic as the original YT Grabber desktop app.
Run it on your computer or a server, then paste its address into the app's Settings.

1. Install Node 18+, [yt-dlp](https://github.com/yt-dlp/yt-dlp) and ffmpeg.
2. `node server.mjs`. It listens on port 8787 by default.
3. In the app: Settings → Download server → `http://<your-ip>:8787`

Environment variables: `PORT`, `DOWNLOAD_DIR`, `YTDLP_PATH`, `ALLOWED_ORIGIN` (set this to your app URL when you publish it).
