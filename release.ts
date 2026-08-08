// ============================================================
//  Build & package yt-dlp downloader
//    deno task build            → compile + GUI subsystem + icon
//    deno task release 1.0.0    → build + zip siap upload Releases
// ============================================================

const DENO = Deno.execPath();
const ver = (Deno.args[0] || "").replace(/^v/, "");

async function run(cmd: string, args: string[], what: string) {
  console.log("▶ " + what + "…");
  const st = await new Deno.Command(cmd, {
    args, stdout: "inherit", stderr: "inherit",
  }).output();
  if (st.code !== 0) {
    console.error("❌ gagal: " + what);
    Deno.exit(1);
  }
}

// 0. matikan instance yg masih jalan (exe terkunci kalau sedang run)
await new Deno.Command("taskkill", {
  args: ["/F", "/IM", "ytdlp-gui.exe"], stdout: "null", stderr: "null",
}).output();

// 1. compile ke single exe
await run(DENO, [
  "compile", "--no-check", "-A", "--unstable-ffi", "--unstable-raw-imports", "-o", "ytdlp-gui", "app.ts",
], "compile app.ts → ytdlp-gui.exe");

// 2. GUI subsystem (tanpa console sama sekali)
await run(DENO, ["run", "-A", "make-gui.ts", "ytdlp-gui.exe"], "patch GUI subsystem");

// 3. icon + metadata (rcedit kadang kena file lock antivirus → retry)
const rcedit = "tools\\rcedit-x64.exe";
try {
  await Deno.stat(rcedit);
} catch {
  console.error("❌ tools\\rcedit-x64.exe tidak ada — download:");
  console.error("   https://github.com/electron/rcedit/releases");
  Deno.exit(1);
}
const rcArgs = [
  "ytdlp-gui.exe", "--set-icon", "app.ico",
  "--set-version-string", "FileDescription", "yt-dlp downloader",
  "--set-version-string", "ProductName", "yt-dlp downloader",
  "--set-version-string", "InternalName", "ytdlp-downloader",
];
if (ver) {
  rcArgs.push(
    "--set-version-string", "FileVersion", ver,
    "--set-version-string", "ProductVersion", ver,
    "--set-file-version", ver + ".0",
    "--set-product-version", ver + ".0",
  );
}
let ok = false;
for (let i = 1; i <= 4 && !ok; i++) {
  const st = await new Deno.Command(rcedit, {
    args: rcArgs, stdout: "null", stderr: "null",
  }).output();
  ok = st.code === 0;
  if (!ok) {
    console.log("  rcedit gagal (file lock?), coba lagi " + i + "/4…");
    await new Promise((r) => setTimeout(r, 2000));
  }
}
if (!ok) {
  console.error("❌ rcedit gagal terus-menerus");
  Deno.exit(1);
}
console.log("▶ icon + metadata terpasang");

if (!ver) {
  console.log("\n✅ build selesai: ytdlp-gui.exe");
  Deno.exit(0);
}

// 4. zip utk GitHub Releases (bsdtar bawaan Windows)
await Deno.mkdir("dist", { recursive: true });
const zip = "dist/ytdlp-downloader-v" + ver + "-win64.zip";
try { await Deno.remove(zip); } catch { /* belum ada */ }
await run("C:\\Windows\\System32\\tar.exe", [
  "-a", "-c", "-f", zip, "ytdlp-gui.exe", "WebView2Loader.dll",
], "zip → " + zip);

const sz = (await Deno.stat(zip)).size / 1048576;
console.log("\n✅ release siap: " + zip + " (" + sz.toFixed(1) + " MB)");
console.log("   upload: https://github.com/jauhariel/ytdlp-gui/releases/new");
console.log("   tag yg disarankan: v" + ver);
