// ============================================================
//  util umum: encoding, path, log ke file, helper proses
// ============================================================

export const enc = new TextEncoder();
export const dec = new TextDecoder();
export function appDir(): string {
  const exe = Deno.execPath();
  if (!/deno\.exe$/i.test(exe)) return dirOf(exe);
  // jalan dari source: pakai lokasi ENTRY (app.ts), bukan file modul ini
  try {
    const u = new URL(Deno.mainModule);
    const p = decodeURIComponent(u.pathname).replace(/\//g, "\\").replace(/^\\(?=[A-Za-z]:)/, "");
    return dirOf(p);
  } catch {
    return Deno.cwd();
  }
}
export const BIN_DIR = appDir() + "\\bin";
const LOG_FILE = appDir() + "\\ytdlp-gui.log";
let logChain: Promise<unknown> = Promise.resolve();
export function flog(m: string) {
  console.log(m);
  logChain = logChain.then(() => Deno.writeTextFile(LOG_FILE, m + "\n", { append: true }).catch(() => {}));
}
export async function resetLogFile() {
  try {
    const s = await Deno.stat(LOG_FILE);
    if (s.size > 1024 * 1024) await Deno.writeTextFile(LOG_FILE, "");
  } catch { /* belum ada */ }
}

// ---------------- util proses ----------------
export async function tryRun(path: string, args: string[]) {
  try {
    const c = new Deno.Command(path, { args, stdout: "piped", stderr: "piped" });
    const o = await c.output();
    return { code: o.code, out: dec.decode(o.stdout), err: dec.decode(o.stderr) };
  } catch {
    return null;
  }
}

export async function findFile(dir: string, name: string, depth: number): Promise<string | null> {
  if (depth < 0) return null;
  try {
    for await (const e of Deno.readDir(dir)) {
      const p = dir + "\\" + e.name;
      if (e.isFile && e.name.toLowerCase() === name) return p;
      if (e.isDirectory) {
        const r = await findFile(p, name, depth - 1);
        if (r) return r;
      }
    }
  } catch { /* abaikan */ }
  return null;
}

export function dirOf(p: string) {
  const i = Math.max(p.lastIndexOf("\\"), p.lastIndexOf("/"));
  return i > 0 ? p.slice(0, i) : p;
}

// ---------------- baca output per-baris ----------------
export async function readLines(stream: ReadableStream<Uint8Array>, cb: (l: string) => void) {
  const reader = stream.getReader();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      cb(buf.slice(0, i).replace(/\r$/, ""));
      buf = buf.slice(i + 1);
    }
  }
  if (buf.trim()) cb(buf);
}
export function pad(n: number, w: number) {
  return String(n).padStart(w, "0");
}

// ---------------- jalankan job ----------------
export function humanSpeed(bps: number): string {
  if (!bps || isNaN(bps)) return "";
  const u = ["B/s", "KB/s", "MB/s", "GB/s"];
  let i = 0;
  while (bps >= 1024 && i < u.length - 1) { bps /= 1024; i++; }
  return bps.toFixed(1) + " " + u[i];
}

export function humanEta(sec: number): string {
  if (!sec || isNaN(sec)) return "";
  sec = Math.round(sec);
  const m = Math.floor(sec / 60), s = sec % 60;
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}:${pad(m % 60, 2)}:${pad(s, 2)}` : `${m}:${pad(s, 2)}`;
}
