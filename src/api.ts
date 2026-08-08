// ============================================================
//  HTTP API: endpoint utk UI + router
// ============================================================
import { enc, flog, tryRun } from "./util.ts";
import {
  cfg, Job, jobs, log, Options, pendingLogs, queue, scheduleFlush, snapshot, sseClients, touch,
} from "./state.ts";
import {
  ensureDeps, FFMPEG_LOC, FFMPEG_OK, SETUP, setYtdlpVer, YTDLP_PATH, YTDLP_VER,
} from "./deps.ts";
import { killWindowChild } from "./window.ts";
import { APP_VERSION, REPO, REPO_URL } from "./version.ts";
import { sm } from "./i18n.ts";
import { pump } from "./jobs.ts";
import { PAGE } from "./ui.ts";

// ---------------- API ----------------
async function probeApi(req: Request): Promise<Response> {
  if (!YTDLP_PATH) {
    return json({
      error: SETUP.running
        ? "Tunggu sebentar — yt-dlp sedang didownload otomatis…"
        : "yt-dlp tidak ditemukan. Restart aplikasi untuk auto-download, atau install manual: winget install yt-dlp",
    });
  }
  const body = await req.json().catch(() => ({}));
  const L = body.lang === "en" ? "en" : "id";
  const url = String(body.url || "").trim();
  if (!/^https?:\/\//i.test(url)) return json({ error: sm("badUrl", L) });

  const args = ["--flat-playlist", "-J", "--no-warnings", "--no-colors", "--ignore-errors", url];
  if (body.cookies && body.cookies !== "none") args.push("--cookies-from-browser", body.cookies);
  log(">>> Ambil info: " + url);

  const r = await tryRun(YTDLP_PATH, args);
  if (!r) return json({ error: sm("runFail", L) });
  if (!r.out.trim()) return json({ error: (r.err || sm("noOut", L)).slice(0, 500) });

  let j: any;
  try { j = JSON.parse(r.out); } catch { return json({ error: sm("badJson", L) }); }

  const site = String(j.extractor_key || j.ie_key || "");
  const isYT = /youtube/i.test(site) || /youtube\.com|youtu\.be/.test(url);
  const isYTItem = isYT; // playlist YouTube → extractor_key = "YoutubeTab"
  const isList = !!j.entries;
  const raw = (j.entries ? [...j.entries] : [j]).filter((e: any) => e);
  const items = raw.map((e: any, i: number) => {
    const id = e.id || "";
    const eu = e.url && String(e.url).startsWith("http") ? String(e.url) : "";
    const wu = e.webpage_url && String(e.webpage_url).startsWith("http") ? String(e.webpage_url) : "";
    // video tunggal: WAJIB webpage_url — e.url bisa berisi link CDN langsung
    // (TikTok dkk) yg tokennya cepat kedaluwarsa → 403 saat didownload
    let u = isList ? (eu || wu) : wu;
    if (!u && id && (isYT || /youtube/i.test(String(e.ie_key || "")))) {
      u = "https://www.youtube.com/watch?v=" + id;
    }
    if (!u) u = eu; // fallback terakhir
    // thumbnail: pakai dari JSON (semua situs), fallback tebakan ytimg utk YouTube
    let thumb = "";
    const th = e.thumbnails;
    if (Array.isArray(th) && th.length) thumb = th[th.length - 1].url || "";
    if (!thumb && id && (isYT || /youtube/i.test(String(e.ie_key || "")))) {
      thumb = "https://i.ytimg.com/vi/" + id + "/mqdefault.jpg";
    }
    return {
      id,
      title: e.title || e.description || id || "video",
      url: u,
      duration: e.duration ?? null,
      index: i + 1,
      thumb,
    };
  }).filter((v: any) => v.url);

  if (!items.length) return json({ error: sm("noVid", L) });
  return json({
    title: j.title || items[0].title,
    uploader: j.uploader || j.channel || j.uploader_id || "",
    site: isYT ? "YouTube" : (site ? site.charAt(0).toUpperCase() + site.slice(1) : ""),
    isPlaylist: !!j.entries,
    count: items.length,
    items,
  });
}

async function downloadApi(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const L = body.lang === "en" ? "en" : "id";
  if (!YTDLP_PATH) return json({ error: sm(SETUP.running ? "settingUp" : "noYtdlp", L) });
  const items = Array.isArray(body.items) ? body.items : [];
  const o = body.options as Options;
  if (!items.length) return json({ error: sm("noItems", L) });
  if (!o || !o.outDir) return json({ error: sm("noOutdir", L) });

  cfg.lastOpts = o;
  cfg.lastLang = L;
  cfg.maxConcurrent = Math.min(4, Math.max(1, o.concurrent || 2));
  const total = items.length;
  const added: string[] = [];
  for (const it of items) {
    const job: Job = {
      id: crypto.randomUUID(),
      url: String(it.url),
      title: String(it.title || it.url),
      index: Number(it.index) || 0,
      total,
      status: "queued",
      percent: 0, speed: "", eta: "", msg: "",
    };
    jobs.set(job.id, job);
    queue.push(job.id);
    added.push(job.id);
  }
  pump();
  return json({ ok: true, added: added.length });
}

async function cancelApi(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const job = jobs.get(String(body.id || ""));
  if (!job) return json({ error: "job tidak ada" });
  if (job.status === "queued") {
    const qi = queue.indexOf(job.id);
    if (qi >= 0) queue.splice(qi, 1);
    job.status = "cancelled";
  } else if (job.proc) {
    try { job.proc.kill("SIGTERM"); } catch { /* abaikan */ }
    job.status = "cancelled";
  }
  touch();
  return json({ ok: true });
}

function clearApi(): Response {
  for (const [id, j] of jobs) {
    if (["done", "error", "cancelled"].includes(j.status)) jobs.delete(id);
  }
  touch();
  return json({ ok: true });
}

async function browseApi(): Promise<Response> {
  // owner form TopMost → dialog selalu muncul DI DEPAN window aplikasi
  const ps = `
Add-Type -AssemblyName System.Windows.Forms
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
$owner.ShowInTaskbar = $false
$owner.FormBorderStyle = 'None'
$owner.StartPosition = 'CenterScreen'
$owner.Width = 1
$owner.Height = 1
$owner.Opacity = 0
$owner.Show()
$d = New-Object System.Windows.Forms.FolderBrowserDialog
$d.Description = "Pilih folder tujuan download"
$d.ShowNewFolderButton = $true
$d.AutoUpgradeEnabled = $true
if ($d.ShowDialog($owner) -eq "OK") { Write-Output $d.SelectedPath }
$owner.Close()
$owner.Dispose()
`;
  const r = await tryRun("powershell", ["-NoProfile", "-STA", "-Command", ps]);
  const p = r ? r.out.trim().split(/\r?\n/).pop() || "" : "";
  return json({ path: p });
}

// buka URL di browser default (link repo dkk) — tanpa console window
async function openUrlApi(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const u = String(body.url || "");
  if (/^https?:\/\//i.test(u)) {
    new Deno.Command("rundll32", {
      args: ["url.dll,FileProtocolHandler", u], stdout: "null", stderr: "null",
    }).spawn();
  }
  return json({ ok: true });
}

async function openApi(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const p = String(body.path || "").trim();
  if (p) {
    try { await Deno.mkdir(p, { recursive: true }); } catch { /* abaikan */ }
    new Deno.Command("explorer.exe", { args: [p], stdout: "null", stderr: "null" }).spawn();
  }
  return json({ ok: true });
}

// ---------------- cek update aplikasi (GitHub Releases) ----------------
// hasil di-cache 6 jam supaya tak spam API GitHub
let updateCache: { checked: number; latest: string | null; url: string } | null = null;

function isNewer(a: string, b: string): boolean {
  const pa = a.split(".").map((x) => parseInt(x, 10) || 0);
  const pb = b.split(".").map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

async function checkUpdateApi(): Promise<Response> {
  const now = Date.now();
  if (!updateCache || now - updateCache.checked > 6 * 3600_000) {
    let latest: string | null = null;
    let url = REPO_URL + "/releases";
    try {
      const r = await fetch(
        "https://api.github.com/repos/" + REPO + "/releases/latest",
        {
          headers: {
            "User-Agent": "ytdlp-downloader/" + APP_VERSION,
            Accept: "application/vnd.github+json",
          },
          signal: AbortSignal.timeout(8000),
        },
      );
      if (r.ok) {
        const j = await r.json();
        latest = String(j.tag_name || "").replace(/^v/, "") || null;
        url = String(j.html_url || url);
      } else {
        await r.body?.cancel();
      }
    } catch { /* offline / rate-limit → anggap tak ada update */ }
    updateCache = { checked: now, latest, url };
  }
  const latest = updateCache.latest;
  return json({
    current: APP_VERSION,
    latest,
    update: latest ? isNewer(latest, APP_VERSION) : false,
    url: updateCache.url,
  });
}

async function updateApi(lang = "id"): Promise<Response> {
  if (!YTDLP_PATH) return json({ error: sm("noYtdlp", lang) });
  const r = await tryRun(YTDLP_PATH, ["-U"]);
  const msg = ((r?.out || "") + (r?.err || "")).trim().slice(0, 500);
  const v = await tryRun(YTDLP_PATH, ["--version"]);
  if (v && v.code === 0) setYtdlpVer(v.out.trim());
  return json({ ok: true, msg, version: YTDLP_VER });
}
function json(o: unknown, status = 200): Response {
  return new Response(JSON.stringify(o), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function sse(): Response {
  let ctrl: ReadableStreamDefaultController<Uint8Array>;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      ctrl = c;
      sseClients.add(c);
      c.enqueue(enc.encode("data: " + JSON.stringify(snapshot()) + "\n\n"));
    },
    cancel() { sseClients.delete(ctrl); },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "connection": "keep-alive",
    },
  });
}

// ---------------- router ----------------
export async function handler(req: Request): Promise<Response> {
  const u = new URL(req.url);
  const p = u.pathname;
  if (p === "/") return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8" } });
  if (p === "/api/events") return sse();
  if (p === "/api/version") return json({ version: APP_VERSION });
  if (p === "/api/check-update") return checkUpdateApi();
  if (p === "/api/status") {
    return json({
      ytdlp: !!YTDLP_PATH, version: YTDLP_VER, path: YTDLP_PATH,
      ffmpeg: FFMPEG_OK, setup: SETUP,
      home: Deno.env.get("USERPROFILE") || "",
    });
  }
  if (p === "/api/probe" && req.method === "POST") return probeApi(req);
  if (p === "/api/download" && req.method === "POST") return downloadApi(req);
  if (p === "/api/cancel" && req.method === "POST") return cancelApi(req);
  if (p === "/api/clear" && req.method === "POST") return clearApi();
  if (p === "/api/browse" && req.method === "POST") return browseApi();
  if (p === "/api/open" && req.method === "POST") return openApi(req);
  if (p === "/api/open-url" && req.method === "POST") return openUrlApi(req);
  if (p === "/api/update" && req.method === "POST") {
    const b = await req.json().catch(() => ({}));
    return updateApi(b.lang === "en" ? "en" : "id");
  }
  if (p === "/api/shutdown" && req.method === "POST") {
    setTimeout(() => {
      killWindowChild();
      Deno.exit(0);
    }, 300);
    return json({ ok: true });
  }
  return new Response("not found", { status: 404 });
}
