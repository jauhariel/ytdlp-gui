// ============================================================
//  jendela: console tersembunyi, WebView2 native, fallback browser
// ============================================================
import { appDir, flog } from "./util.ts";

// ---------------- console tersembunyi ----------------
// Exe ini GUI-subsystem (tanpa console bawaan). Di sini kita buat SATU console
// yang langsung disembunyikan. Semua anak proses console (yt-dlp, ffmpeg,
// powershell, tar) otomatis "numpang" di console hidden ini → tidak ada
// jendela terminal yang muncul sama sekali, kapan pun.
export function setupHiddenConsole() {
  try {
    const k = Deno.dlopen("kernel32.dll", {
      AllocConsole: { parameters: [], result: "i32" },
      GetConsoleWindow: { parameters: [], result: "pointer" },
    });
    const created = Number(k.symbols.AllocConsole()); // 0 kalau sudah punya console (mis. jalan dari terminal)
    if (created !== 0) {
      const hwnd = k.symbols.GetConsoleWindow();
      if (hwnd) {
        const u = Deno.dlopen("user32.dll", {
          ShowWindow: { parameters: ["pointer", "i32"], result: "i32" },
        });
        u.symbols.ShowWindow(hwnd, 0); // SW_HIDE
        u.close();
      }
    }
    k.close();
  } catch { /* abaikan */ }
}

// ---------------- buka jendela app ----------------
export async function openBrowser(url: string) {
  const edge = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  for (const p of edge) {
    try {
      await Deno.stat(p);
      new Deno.Command(p, { args: ["--app=" + url], stdout: "null", stderr: "null" }).spawn();
      return;
    } catch { /* lanjut */ }
  }
  new Deno.Command("cmd", { args: ["/c", "start", "", url], stdout: "null", stderr: "null" }).spawn();
}

// ---------------- jendela native (proses anak) ----------------
export async function windowMode(url: string) {
  const { Webview } = await import("jsr:@webview/webview");
  const w = new Webview();
  w.title = "yt-dlp downloader";
  w.size = { width: 1120, height: 820, hint: 0 };
  try { w.size = { width: 540, height: 620, hint: 1 } as never; } catch { /* ukuran minimum */ }
  w.navigate(url);
  w.run(); // blokir sampai jendela ditutup
}

let windowChild: Deno.ChildProcess | null = null;

export async function openNativeWindow(url: string): Promise<boolean> {
  try {
    const exe = Deno.execPath();
    const isDeno = /deno\.exe$/i.test(exe);
    const args = isDeno
      ? ["run", "-A", "--no-check", "--unstable-ffi", "--unstable-raw-imports", appDir() + "\\app.ts", "--window", url]
      : ["--window", url];
    const child = new Deno.Command(exe, { args, stdout: "null", stderr: "null" }).spawn();
    windowChild = child;
    // kalau anak mati < 4 detik → webview gagal → fallback ke browser
    const diedEarly = await Promise.race([
      child.status.then(() => true),
      new Promise((r) => setTimeout(() => r(false), 4000)),
    ]);
    if (diedEarly) {
      windowChild = null;
      flog("Jendela native gagal dibuka, fallback ke browser.");
      return false;
    }
    // jendela ditutup user → matikan server
    child.status.then(() => {
      flog("Jendela ditutup, aplikasi berhenti.");
      Deno.exit(0);
    });
    return true;
  } catch (e) {
    flog("Gagal buka jendela native: " + e);
    return false;
  }
}

// bunuh proses jendela anak (dipakai saat shutdown dari UI)
export function killWindowChild() {
  try { windowChild?.kill("SIGTERM"); } catch { /* abaikan */ }
}
