// ============================================================
//  mesin download: bangun argumen yt-dlp & jalankan job
// ============================================================
import { dec, humanEta, humanSpeed, pad, readLines } from "./util.ts";
import { cfg, Job, jobs, log, Options, queue, scheduleFlush, touch } from "./state.ts";
import { FFMPEG_LOC, YTDLP_PATH } from "./deps.ts";
import { sm } from "./i18n.ts";

function buildArgs(job: Job, o: Options): string[] {
  const args = [
    "--newline", "--no-playlist", "--no-warnings", "--no-colors",
    "--windows-filenames", "--encoding", "utf-8",
    "--progress-template",
    "download:[PG]%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s",
  ];
  if (FFMPEG_LOC) args.push("--ffmpeg-location", FFMPEG_LOC);

  if (o.mode === "audio") {
    // PENTING: file sementara (pra-konversi) HARUS di folder temp terpisah
    // (lihat -P temp di bawah). Kalau tidak, yt-dlp mengira video yg sudah
    // selesai (judul.mp4) adalah bahan mentah, lalu menghapusnya!
    // selector: utamakan audio-murni (vcodec=none), lalu gabungan h264 (dijamin
    // ada aac asli) — bytevc1/h265 TikTok suka bohong soal audio.
    args.push("-f", "ba[vcodec=none]/ba[vcodec^=avc1]/ba[vcodec^=h264]/b[vcodec^=avc1]/b[vcodec^=h264]/ba/b");
    args.push("-x", "--audio-format", o.audioFormat);
    if (o.audioQuality !== "best") args.push("--audio-quality", o.audioQuality);
  } else {
    // rantai fallback: makin ke kanan makin longgar — ujungnya /b dijamin match.
    // filter width<=R utk video PORTRAIT (mis. TikTok 720x1280 — "720p" itu lebarnya).
    // fallback b[vcodec^=avc1]: format gabungan h264 hampir selalu bersuara
    // (bytevc1/h265 TikTok sering bisu walau metadata ngaku aac).
    // h264 punya 2 nama vcodec: "avc1.xxx" (YouTube dkk) & "h264" (TikTok dkk) —
    // dua2nya harus dicoba karena tiap situs beda penulisan.
    const pick = (tpl: string) =>
      ["vcodec^=avc1", "vcodec^=h264"].map((c) => tpl.split("AVC").join(c)).join("/");
    let f: string;
    if (job.forceAvc) {
      f = pick("b[AVC]") + "/b";
    } else if (o.res === "best") {
      f = o.h264
        ? pick("bv*[AVC]+ba") + "/bv*+ba/" + pick("b[AVC]") + "/b"
        : "bv*+ba/" + pick("b[AVC]") + "/b";
    } else {
      const R = o.res;
      f = o.h264
        ? pick(`bv*[height<=${R}][AVC]+ba`) + "/" + pick(`bv*[width<=${R}][AVC]+ba`) + "/" +
          pick(`bv*[height<=${R}][AVC]+b[height<=${R}][AVC]`) + "/" +
          pick(`bv*[width<=${R}][AVC]+b[width<=${R}][AVC]`) + "/" +
          pick(`b[height<=${R}][AVC]`) + "/" + pick(`b[width<=${R}][AVC]`) + "/" +
          pick("b[AVC]") + "/bv*+ba/b"
        // catatan: di situs dgn format gabungan (TikTok/FB), h264 gabungan
        // didahulukan dari yg lain karena dijamin bersuara
        : `bv*[height<=${R}]+ba/bv*[width<=${R}]+ba/` +
          pick(`b[height<=${R}][AVC]`) + "/" + pick(`b[width<=${R}][AVC]`) + "/" +
          `b[height<=${R}]/b[width<=${R}]/bv*+ba/` + pick("b[AVC]") + "/b";
    }
    args.push("-f", f, "--merge-output-format", o.container);
    if (o.subs) {
      args.push("--write-subs", "--sub-langs", o.subLangs || "id,en");
      if (o.embedSubs) args.push("--embed-subs");
    }
  }

  if (o.embedThumb) {
    args.push("--embed-thumbnail");
    if (o.mode === "audio") args.push("--convert-thumbnails", "jpg");
  }
  if (o.embedMeta) args.push("--embed-metadata");
  if (o.sponsor) args.push("--sponsorblock-remove", "default");
  if (o.cookies && o.cookies !== "none") args.push("--cookies-from-browser", o.cookies);
  if (o.rate && /^[0-9]+[KMG]?$/i.test(o.rate)) args.push("--limit-rate", o.rate);

  const w = String(job.total).length > 1 ? String(job.total).length : 2;
  const name = o.numbering && job.total > 1
    ? pad(job.index, w) + " - %(title)s.%(ext)s"
    : "%(title)s.%(ext)s";
  // SEMUA output job masuk folder temp khusus dulu. App akan memindahkan file
  // hasil ke folder tujuan SETELAH download sukses. Ini mencegah yt-dlp
  // "memakan" file yg sudah selesai (mis. download audio sesudah video dgn
  // judul sama: tanpa ini, judul.mp4 dianggap bahan mentah lalu DIHAPUS!).
  args.push("-o", tmpDirOf(o, job) + "\\" + name);
  args.push(job.url);
  return args;
}

function tmpDirOf(o: Options, job: Job): string {
  return o.outDir.replace(/[\\/]+$/, "") + "\\.ytdlp-tmp\\" + job.id;
}

function handleLine(job: Job, line: string) {
  if (!line.trim()) return;
  if (line.startsWith("[PG]")) {
    const p = line.slice(4).split("|");
    const dl = parseFloat(p[0]);
    const total = parseFloat(p[1]) || parseFloat(p[2]);
    const speed = parseFloat(p[3]);
    const eta = parseFloat(p[4]);
    job.status = "downloading";
    if (total > 0) job.percent = Math.min(100, (dl / total) * 100);
    job.speed = humanSpeed(speed);
    job.eta = humanEta(eta);
  } else if (line.startsWith("[download] Destination: ")) {
    const f = line.slice(24).trim();
    if (/\.(mp4|mkv|webm|mov|avi|ts)$/i.test(f)) job.outFile = f;
  } else if (line.includes("Merging formats into \"")) {
    const m = line.match(/Merging formats into "(.+)"/);
    if (m) job.outFile = m[1];
  } else if (line.includes("Moving file")) {
    const m = line.match(/" to "([^"]+)"\s*$/);
    if (m) job.outFile = m[1];
  } else if (
    line.includes("[Merger]") || line.includes("[ExtractAudio]") ||
    line.includes("[VideoConvertor]") || line.includes("[VideoRemuxer]") ||
    line.includes("[EmbedSubtitle]") || line.includes("[ThumbnailsConvertor]") ||
    line.includes("[EmbedThumbnail]") || line.includes("[Metadata]")
  ) {
    job.status = "processing";
    job.percent = 100;
    job.speed = "";
    job.eta = "";
  } else if (line.includes("has already been downloaded")) {
    job.status = "done";
    job.percent = 100;
  } else if (line.startsWith("ERROR")) {
    job.msg = line.replace(/^ERROR:?\s*/, "").slice(0, 300);
  }
  log(line);
  touch();
}

// cek apakah file punya stream audio (pakai ffprobe dari folder ffmpeg)
async function fileHasAudio(path: string): Promise<boolean> {
  // FFMPEG_LOC null = ffmpeg ada di PATH → ffprobe kemungkinan juga di PATH
  const ffprobe = FFMPEG_LOC ? FFMPEG_LOC + "\\ffprobe.exe" : "ffprobe";
  if (FFMPEG_LOC) {
    try { await Deno.stat(ffprobe); } catch { return true; }
  }
  try {
    const p = await new Deno.Command(ffprobe, {
      args: ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", path],
      stdout: "piped", stderr: "null",
    }).output();
    return /audio/i.test(dec.decode(p.stdout));
  } catch {
    return true;
  }
}

async function runJob(job: Job) {
  if (!YTDLP_PATH || !cfg.lastOpts) return;
  cfg.running++;
  job.status = "downloading" as Job["status"];
  job.percent = 0;
  touch();
  log(">>> Mulai: " + job.title);
  try {
    await Deno.mkdir(cfg.lastOpts.outDir, { recursive: true });
  } catch { /* abaikan */ }

  // auto-retry: situs seperti TikTok kadang ngasih anti-bot challenge secara acak.
  // error ekstraksi biasanya beres kalau dicoba lagi.
  const maxTry = 3;
  for (let attempt = 1; attempt <= maxTry; attempt++) {
    if (job.status === "cancelled") break;
    if (attempt > 1) {
      job.status = "downloading" as Job["status"];
      job.percent = 0; job.speed = ""; job.eta = "";
      job.msg = job.forceAvc
        ? sm("noAudio", cfg.lastLang, attempt, maxTry)
        : sm("retry", cfg.lastLang, attempt, maxTry);
      log(">>> " + job.msg + " " + job.title);
      touch();
      await new Promise((r) => setTimeout(r, 2500 * attempt));
      if (job.status === "cancelled") break;
    }

    const args = buildArgs(job, cfg.lastOpts);
    let proc: Deno.ChildProcess;
    try {
      proc = new Deno.Command(YTDLP_PATH, {
        args, stdout: "piped", stderr: "piped",
      }).spawn();
    } catch (e) {
      job.msg = String(e);
      break; // gagal spawn = permanen
    }
    job.proc = proc;
    readLines(proc.stdout, (l) => handleLine(job, l));
    readLines(proc.stderr, (l) => {
      if (l.trim()) { if (l.includes("ERROR")) job.msg = l.slice(0, 300); log("[stderr] " + l); touch(); }
    });

    const st = await proc.status;
    job.proc = undefined;
    // status bisa berubah dari cancelApi (callback lain) — TS tak bisa tahu itu
    if ((job.status as Job["status"]) === "cancelled") break;
    if (st.code === 0) {
      // verifikasi hasil video benar2 ada suaranya (TikTok dkk kadang bohong:
      // metadata bilang ada aac, nyatanya file tanpa stream audio sama sekali)
      if (
        cfg.lastOpts.mode === "video" && !job.forceAvc && attempt < maxTry &&
        job.outFile && !(await fileHasAudio(job.outFile))
      ) {
        log(">>> Hasil tanpa suara, ganti format: " + job.title);
        job.forceAvc = true;
        try { await Deno.remove(job.outFile); } catch { /* abaikan */ }
        job.outFile = undefined;
        continue; // retry dgn format h264 gabungan
      }
      // pindahkan hasil dari temp ke folder tujuan
      const dir = cfg.lastOpts.outDir.replace(/[\\/]+$/, "");
      const tmp = tmpDirOf(cfg.lastOpts, job);
      try {
        for await (const e of Deno.readDir(tmp)) {
          if (!e.isFile || /\.part$/i.test(e.name)) continue;
          const target = dir + "\\" + e.name;
          try { await Deno.remove(target); } catch { /* belum ada */ }
          await Deno.rename(tmp + "\\" + e.name, target);
          job.outFile = target;
        }
      } catch (e) {
        log(">>> Gagal memindahkan hasil: " + e);
      }
      job.status = "done";
      job.percent = 100; job.speed = ""; job.eta = ""; job.msg = "";
      log(">>> Selesai: " + job.title);
      break;
    }
    if (!job.msg) job.msg = "yt-dlp keluar dengan kode " + st.code;
    if (/Requested format is not available/.test(job.msg)) break; // permanen, tak perlu retry
    log(">>> Percobaan " + attempt + " gagal: " + job.title);
  }

  cfg.running--;
  if (job.status !== "done" && job.status !== "cancelled") {
    job.status = "error";
    if (/Requested format is not available/.test(job.msg)) job.msg += sm("fmtHint", cfg.lastLang);
    log(">>> GAGAL: " + job.title + " — " + job.msg);
  }
  // bersihkan folder temp milik job ini (+ induknya kalau sudah kosong)
  try {
    const dir = cfg.lastOpts.outDir.replace(/[\\/]+$/, "");
    await Deno.remove(tmpDirOf(cfg.lastOpts, job), { recursive: true });
    try { await Deno.remove(dir + "\\.ytdlp-tmp"); } catch { /* masih terpakai */ }
  } catch { /* abaikan */ }
  touch();
  pump();
}

export function pump() {
  while (cfg.running < cfg.maxConcurrent && queue.length > 0) {
    const id = queue.shift()!;
    const job = jobs.get(id);
    if (job && job.status === "queued") runJob(job);
  }
  touch();
}
