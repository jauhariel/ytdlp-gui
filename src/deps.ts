// ============================================================
//  dependensi eksternal: deteksi & auto-download yt-dlp + ffmpeg
// ============================================================
import { BIN_DIR, dirOf, findFile, flog, tryRun } from "./util.ts";
import { log, touch } from "./state.ts";

export let YTDLP_PATH: string | null = null;
export let YTDLP_VER = "";
export let FFMPEG_LOC: string | null = null; // folder ffmpeg (kalau tidak ada di PATH)
export let FFMPEG_OK = false;
export const SETUP = { running: false, msg: "", percent: -1, error: "" };
const FORCE_SETUP = Deno.env.get("YTDLP_GUI_FORCE_SETUP") === "1"; // utk testing
export async function findBinaries() {
  if (FORCE_SETUP) return; // simulasi PC bersih (testing)
  // --- yt-dlp ---
  let r = await tryRun("yt-dlp", ["--version"]);
  if (r && r.code === 0) {
    YTDLP_PATH = "yt-dlp";
    YTDLP_VER = r.out.trim();
  } else {
    const la = Deno.env.get("LOCALAPPDATA") || "";
    const pkg = la + "\\Microsoft\\WinGet\\Packages";
    try {
      for await (const e of Deno.readDir(pkg)) {
        if (e.name.toLowerCase().startsWith("yt-dlp.yt-dlp")) {
          const p = pkg + "\\" + e.name + "\\yt-dlp.exe";
          r = await tryRun(p, ["--version"]);
          if (r && r.code === 0) { YTDLP_PATH = p; YTDLP_VER = r.out.trim(); break; }
        }
      }
    } catch { /* abaikan */ }
  }
  // cek bin lokal (hasil auto-download)
  if (!YTDLP_PATH) {
    const p = BIN_DIR + "\\yt-dlp.exe";
    r = await tryRun(p, ["--version"]);
    if (r && r.code === 0) { YTDLP_PATH = p; YTDLP_VER = r.out.trim(); }
  }
  // --- ffmpeg ---
  const f = await tryRun("ffmpeg", ["-version"]);
  if (f && f.code === 0) {
    FFMPEG_LOC = null; // sudah di PATH
    FFMPEG_OK = true;
  } else {
    const la = Deno.env.get("LOCALAPPDATA") || "";
    let found = await findFile(la + "\\Microsoft\\WinGet\\Packages", "ffmpeg.exe", 5);
    if (!found) found = await findFile(BIN_DIR, "ffmpeg.exe", 3);
    if (found) { FFMPEG_LOC = dirOf(found); FFMPEG_OK = true; }
  }
}

// ---------------- auto-download komponen ----------------
async function downloadFile(url: string, dest: string, onp: (done: number, total: number) => void) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error("HTTP " + res.status + " saat download " + url);
  const total = Number(res.headers.get("content-length")) || 0;
  const file = await Deno.open(dest, { write: true, create: true, truncate: true });
  let done = 0;
  try {
    for await (const chunk of res.body) {
      await file.write(chunk);
      done += chunk.length;
      onp(done, total);
    }
  } finally {
    file.close();
  }
}

export async function ensureDeps() {
  SETUP.running = true;
  SETUP.error = "";
  touch();
  try {
    await Deno.mkdir(BIN_DIR, { recursive: true });
    if (!YTDLP_PATH) {
      SETUP.msg = "Download yt-dlp…";
      SETUP.percent = 0;
      touch();
      log(">>> yt-dlp tidak ditemukan, download otomatis…");
      await downloadFile(
        "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe",
        BIN_DIR + "\\yt-dlp.exe",
        (d, t) => { SETUP.percent = t ? (d / t) * 100 : -1; touch(); },
      );
      const r = await tryRun(BIN_DIR + "\\yt-dlp.exe", ["--version"]);
      if (r && r.code === 0) {
        YTDLP_PATH = BIN_DIR + "\\yt-dlp.exe";
        YTDLP_VER = r.out.trim();
        log(">>> yt-dlp v" + YTDLP_VER + " berhasil didownload ke bin/");
      } else {
        throw new Error("yt-dlp gagal dijalankan setelah didownload");
      }
    }
    if (!FFMPEG_OK) {
      SETUP.msg = "Download FFmpeg (~150MB)…";
      SETUP.percent = 0;
      touch();
      log(">>> FFmpeg tidak ditemukan, download otomatis…");
      const zip = BIN_DIR + "\\ffmpeg.zip";
      await downloadFile(
        "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
        zip,
        (d, t) => { SETUP.percent = t ? (d / t) * 100 : -1; touch(); },
      );
      SETUP.msg = "Ekstrak FFmpeg…";
      SETUP.percent = -1;
      touch();
      // pakai bsdtar bawaan Windows (bukan GNU tar Git Bash yg tidak support zip)
      let r = await tryRun("C:\\Windows\\System32\\tar.exe", ["-xf", zip, "-C", BIN_DIR]);
      if (!r || r.code !== 0) {
        // fallback: PowerShell Expand-Archive
        const ps = 'Expand-Archive -LiteralPath "' + zip + '" -DestinationPath "' + BIN_DIR + '" -Force';
        r = await tryRun("powershell", ["-NoProfile", "-Command", ps]);
      }
      await Deno.remove(zip).catch(() => {});
      if (!r || r.code !== 0) throw new Error("Gagal ekstrak FFmpeg");
      const found = await findFile(BIN_DIR, "ffmpeg.exe", 3);
      if (!found) throw new Error("ffmpeg.exe tidak ketemu setelah ekstrak");
      FFMPEG_LOC = dirOf(found);
      FFMPEG_OK = true;
      log(">>> FFmpeg berhasil didownload ke bin/");
    }
    SETUP.running = false;
    SETUP.msg = "";
    SETUP.percent = -1;
  } catch (e) {
    SETUP.running = false;
    SETUP.error = String(e);
    log(">>> Setup otomatis gagal: " + String(e));
  }
  touch();
}

// dipanggil setelah `yt-dlp -U` utk refresh versi yg tampil di UI
export function setYtdlpVer(v: string) {
  YTDLP_VER = v;
}
