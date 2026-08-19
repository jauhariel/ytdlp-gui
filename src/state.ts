// ============================================================
//  state bersama: antrean job, broadcast SSE ke UI
// ============================================================
import { enc, flog } from "./util.ts";
import { SETUP } from "./deps.ts";

// ---------------- manajemen job ----------------
export interface Job {
  id: string;
  url: string;
  title: string;
  index: number;
  total: number;
  status: "queued" | "downloading" | "processing" | "done" | "error" | "cancelled";
  percent: number;
  speed: string;
  eta: string;
  msg: string;
  proc?: Deno.ChildProcess;
  outFile?: string;
  forceAvc?: boolean; // dipaksa pakai format h264 gabungan (fallback tak bersuara)
}

export interface Options {
  mode: "video" | "audio";
  res: string;            // "best" | "2160" | "1440" | "1080" | "720" | "480" | "360"
  container: string;      // mp4 | mkv | webm
  h264: boolean;
  audioFormat: string;    // mp3 | m4a | opus | flac | wav
  audioQuality: string;   // best | 320K | 256K | 192K | 128K
  numbering: boolean;
  embedThumb: boolean;
  embedMeta: boolean;
  subs: boolean;
  subLangs: string;
  embedSubs: boolean;
  sponsor: boolean;
  cookies: string;        // none | auto | chrome | edge | firefox
  rate: string;           // "" | "5M" dst
  concurrent: number;
  outDir: string;
}

export const jobs = new Map<string, Job>();
export const queue: string[] = [];
export const cfg = {
  running: 0,
  maxConcurrent: 2,
  lastOpts: null as Options | null,
  lastLang: "id",
  cookies: "none" as string, // sumber cookies hasil deteksi otomatis dari probe terakhir
};

// ---------------- SSE broadcast ----------------
export const sseClients = new Set<ReadableStreamDefaultController<Uint8Array>>();
export let pendingLogs: string[] = [];
let dirty = false;
let flushTimer: number | null = null;

export function snapshot() {
  const arr = [...jobs.values()].map((j) => {
    const { proc, ...rest } = j;
    return rest;
  });
  return { type: "jobs", jobs: arr, running: cfg.running, queued: queue.length, setup: SETUP };
}

function flush() {
  flushTimer = null;
  if (!dirty && pendingLogs.length === 0) return;
  const msgs: string[] = [];
  if (pendingLogs.length) {
    msgs.push("data: " + JSON.stringify({ type: "log", lines: pendingLogs }) + "\n\n");
    pendingLogs = [];
  }
  if (dirty) {
    msgs.push("data: " + JSON.stringify(snapshot()) + "\n\n");
    dirty = false;
  }
  const data = enc.encode(msgs.join(""));
  for (const c of sseClients) {
    try { c.enqueue(data); } catch { sseClients.delete(c); }
  }
}

export function scheduleFlush() {
  if (flushTimer === null) flushTimer = setTimeout(flush, 250) as unknown as number;
}

export function log(line: string) {
  pendingLogs.push(line);
  if (pendingLogs.length > 500) pendingLogs = pendingLogs.slice(-400);
  if (line.startsWith(">>>")) flog(line); // event penting ikut tercatat di file
  scheduleFlush();
}

export function touch() {
  dirty = true;
  scheduleFlush();
}
