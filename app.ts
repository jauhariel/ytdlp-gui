// ============================================================
//  yt-dlp downloader — entry point
//  GUI desktop utk yt-dlp: server lokal + jendela WebView2 native
// ============================================================
import { flog, resetLogFile } from "./src/util.ts";
import {
  ensureDeps, FFMPEG_LOC, FFMPEG_OK, findBinaries, YTDLP_PATH, YTDLP_VER,
} from "./src/deps.ts";
import { handler } from "./src/api.ts";
import {
  openBrowser, openNativeWindow, setupHiddenConsole, windowMode,
} from "./src/window.ts";

// mode anak: proses ini hanya jadi jendela native
if (Deno.args[0] === "--window") {
  setupHiddenConsole();
  try {
    await windowMode(Deno.args[1]);
  } catch (e) {
    console.error("webview error: " + e);
    Deno.exit(1);
  }
  Deno.exit(0);
}

setupHiddenConsole(); // HARUS sebelum spawn anak proses apa pun
await resetLogFile();
flog("=== yt-dlp downloader mulai " + new Date().toLocaleString() + " ===");
await findBinaries();
const server = Deno.serve({ port: 0, hostname: "127.0.0.1" }, handler);
const port = (server.addr as Deno.NetAddr).port;
const appUrl = "http://127.0.0.1:" + port + "/";
flog("yt-dlp downloader berjalan di " + appUrl);
flog("yt-dlp : " + (YTDLP_PATH ? YTDLP_VER + " (" + YTDLP_PATH + ")" : "TIDAK DITEMUKAN"));
flog("ffmpeg : " + (FFMPEG_OK ? (FFMPEG_LOC || "PATH") : "belum ada (akan di-download otomatis)"));
if (!YTDLP_PATH || !FFMPEG_OK) ensureDeps(); // auto-download di background
// prioritas: jendela native (aplikasi desktop); fallback: browser app-mode
let opened = false;
if (Deno.env.get("YTDLP_GUI_NO_WEBVIEW") !== "1") opened = await openNativeWindow(appUrl);
if (!opened) await openBrowser(appUrl);
await server.finished;
