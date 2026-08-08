# yt-dlp downloader

GUI desktop untuk yt-dlp — download video/audio. · Desktop GUI for yt-dlp — download video/audio.

**[🇮🇩 Bahasa Indonesia](#-bahasa-indonesia) · [🇬🇧 English](#-english)**

## ⬇️ Download / Unduh

**[Download the latest version from the Releases page →](https://github.com/jauhariel/ytdlp-gui/releases/latest)**

Download the zip, extract, double-click `ytdlp-gui.exe` — no installation needed.
Download zip-nya, extract, double-click `ytdlp-gui.exe` — langsung pakai, tanpa install apa pun.

---

## 🇮🇩 Bahasa Indonesia

Aplikasi **desktop native** untuk download playlist/video YouTube pakai yt-dlp. Tampil sebagai jendela aplikasi sendiri (WebView2) — **tanpa jendela terminal, tanpa browser**. Semua proses latar (yt-dlp, ffmpeg, dll) menumpang di satu console tersembunyi, jadi tidak ada jendela console yang muncul kapan pun.

### Cara Pakai

**Double-click `ytdlp-gui.exe`** (atau shortcut "yt-dlp downloader" di Desktop). Jendela aplikasi langsung kebuka. Tutup via tombol **✖** jendela atau tombol **✖ Keluar** di aplikasi — semua proses otomatis ikut berhenti.

### Distribusi ke User Lain

User cukup download **`ytdlp-gui.exe`** saja → double-click → langsung pakai:

- yt-dlp & FFmpeg otomatis didownload ke folder `bin/` saat pertama jalan (ada banner progress)
- `WebView2Loader.dll` otomatis didownload kalau belum ada (butuh internet, yang memang dibutuhkan YouTube)
- Tidak perlu install apa pun. Zip-kan exe kalau mau dibagikan (jadi ~35MB).

### Fitur

| Fitur | Keterangan |
|---|---|
| 🌐 Multi-situs | YouTube, TikTok, Instagram, X/Twitter, Facebook, Vimeo, Twitch, SoundCloud, Bilibili, Archive.org, dll (semua yg didukung yt-dlp) |
| 📋 Playlist & video satuan | Tempel URL playlist → semua video terdaftar, bisa centang mau download yg mana |
| 🎬 Mode Video | Pilihan resolusi 360p – 4K, format MP4/MKV/WebM, opsi codec H.264 |
| 🎵 Mode Audio | MP3 / M4A / OPUS / FLAC / WAV, pilihan bitrate s/d 320kbps |
| 🔢 Nomor urut otomatis | Nama file rapi sesuai urutan playlist (`01 - judul.mp4`) |
| 🖼 Embed | Thumbnail (album art) & metadata |
| 💬 Subtitle | Download / tempel ke video, pilih bahasa (default: id,en) |
| ✂ SponsorBlock | Potong segmen sponsor otomatis |
| 🍪 Cookies browser | Untuk video member/age-restricted (Chrome/Edge/Firefox) |
| ⚡ Multi-download | S/d 4 download bersamaan + batas kecepatan opsional |
| 📊 Progress real-time | Persen, kecepatan, ETA per video + log lengkap |
| 🔄 Update yt-dlp | Tombol update langsung dari aplikasi |
| 📦 Auto-download | yt-dlp & FFmpeg otomatis didownload ke folder `bin/` kalau belum ada (portable, bisa dicopy ke PC lain) |
| 🌗 Dark/Light mode | Toggle tema di header, tersimpan otomatis |
| 🌍 Dwibahasa | Antarmuka Indonesia / English |
| 🔔 Cek update | Notifikasi otomatis kalau ada versi baru di GitHub Releases |

### Struktur File

```
ytdlp/
├── ytdlp-gui.exe      ← aplikasi utama (double-click ini)
├── WebView2Loader.dll ← komponen window native
├── YTDLP-GUI.bat      ← launcher alternatif
├── app.ts             ← entry point (boot + jendela)
├── src/
│   ├── api.ts         ← endpoint HTTP + router
│   ├── jobs.ts        ← mesin download (argumen yt-dlp, retry, pengaman audio)
│   ├── deps.ts        ← deteksi & auto-download yt-dlp + ffmpeg
│   ├── state.ts       ← state antrean + broadcast SSE ke UI
│   ├── i18n.ts        ← pesan server dwibahasa (ID/EN)
│   ├── ui.ts          ← rakitan PAGE dari ui/ (di-embed ke exe)
│   ├── util.ts        ← helper umum (path, log, proses)
│   └── window.ts      ← WebView2 native + anti-console
├── ui/
│   ├── index.html     ← markup UI
│   ├── style.css      ← styling UI
│   └── app.js         ← logic frontend
├── app.ico            ← icon aplikasi
├── release.ts         ← tool build & paket rilis (deno task build/release)
├── make-gui.ts        ← tool build (ubah exe jadi GUI subsystem)
├── make-icon.ps1      ← generator app.ico
├── tools/rcedit-x64.exe  ← tool pasang icon ke exe (build only; tidak di-repo —
│                             download: https://github.com/electron/rcedit/releases)
└── ytdlp-gui.log      ← log aplikasi (muncul saat app jalan)
```

### Modifikasi / Rebuild

Butuh [Deno](https://deno.land):

```bash
# jalanin dari source (mode debug, pakai jendela native)
deno run -A --no-check --unstable-ffi --unstable-raw-imports app.ts
# atau singkatnya:
deno task dev

# mode browser (tanpa window native)
set YTDLP_GUI_NO_WEBVIEW=1 && deno task dev

# compile ulang jadi exe desktop (sekali jalan)
deno task build            # compile + GUI subsystem + icon → ytdlp-gui.exe

# bikin paket release (zip siap upload ke GitHub Releases)
deno task release 1.0.0    # → dist/ytdlp-downloader-v1.0.0-win64.zip
```

<details><summary>Langkah manual (tanpa task)</summary>

```bash
deno compile --no-check -A --unstable-ffi --unstable-raw-imports -o ytdlp-gui app.ts
deno run -A make-gui.ts ytdlp-gui.exe   # ubah jadi GUI subsystem (tanpa console bawaan)
tools\rcedit-x64.exe ytdlp-gui.exe --set-icon app.ico   # pasang icon aplikasi
```
</details>

> `app.ico` digenerate ulang via `powershell -File make-icon.ps1` kalau mau ganti icon.

> Cara kerja anti-terminal: exe GUI subsystem (zero console sejak lahir), lalu app
> membuat SATU console tersembunyi via `AllocConsole`+`SW_HIDE`. Semua anak proses
> console (yt-dlp, ffmpeg, powershell, tar) menumpang di situ → tak pernah bikin
> jendela terminal baru.

### Catatan

- **Auto-download komponen**: pas pertama dibuka, aplikasi cek yt-dlp & FFmpeg. Kalau belum ada, otomatis didownload ke folder `bin/` di sebelah exe (ada banner progress di aplikasi). Folder `ytdlp/` jadi bisa dicopy ke USB/PC lain dan langsung jalan.
- Default folder tujuan: `Downloads\yt-dlp` (bisa diubah, tersimpan otomatis)
- Kalau kena "Sign in to confirm you're not a bot" → pilih cookies browser di opsi
- Pengaturan terakhir otomatis tersimpan
- Kalau ada masalah, cek file `ytdlp-gui.log`
- Kalau WebView2 tidak tersedia di PC lain, otomatis fallback buka via browser (app-mode)
- **Cara update aplikasi**: kalau ada versi baru, muncul tombol hijau di header → klik → download zip terbaru dari Releases → timpa `ytdlp-gui.exe` lama

---

## 🇬🇧 English

A **native desktop** app for downloading YouTube playlists/videos with yt-dlp. It runs in its own app window (WebView2) — **no terminal window, no browser tab**. All background processes (yt-dlp, ffmpeg, etc.) share a single hidden console, so no console window ever pops up.

### Usage

**Double-click `ytdlp-gui.exe`** (or the "yt-dlp downloader" Desktop shortcut). The app window opens right away. Close it via the window **✖** button or the **✖ Quit** button in the app — all processes stop automatically.

### Distributing to Other Users

Users only need to download **`ytdlp-gui.exe`** → double-click → ready to use:

- yt-dlp & FFmpeg are auto-downloaded into the `bin/` folder on first run (with a progress banner)
- `WebView2Loader.dll` is auto-downloaded if missing (requires internet, which YouTube needs anyway)
- Nothing to install. Zip the exe if you want to share it (~35MB zipped).

### Features

| Feature | Description |
|---|---|
| 🌐 Multi-site | YouTube, TikTok, Instagram, X/Twitter, Facebook, Vimeo, Twitch, SoundCloud, Bilibili, Archive.org, etc. (everything yt-dlp supports) |
| 📋 Playlists & single videos | Paste a playlist URL → all videos listed, tick the ones you want |
| 🎬 Video mode | 360p – 4K resolution picker, MP4/MKV/WebM, optional H.264 codec |
| 🎵 Audio mode | MP3 / M4A / OPUS / FLAC / WAV, bitrate up to 320kbps |
| 🔢 Auto numbering | Clean filenames following playlist order (`01 - title.mp4`) |
| 🖼 Embedding | Thumbnail (album art) & metadata |
| 💬 Subtitles | Download / embed into video, language picker (default: id,en) |
| ✂ SponsorBlock | Automatically cut sponsor segments |
| 🍪 Browser cookies | For members-only/age-restricted videos (Chrome/Edge/Firefox) |
| ⚡ Multi-download | Up to 4 concurrent downloads + optional speed limit |
| 📊 Real-time progress | Percent, speed, ETA per video + full log |
| 🔄 yt-dlp updates | Update button right in the app |
| 📦 Auto-download | yt-dlp & FFmpeg auto-download into `bin/` when missing (portable — copy the folder to another PC and it just works) |
| 🌗 Dark/Light mode | Theme toggle in the header, saved automatically |
| 🌍 Bilingual | Indonesian / English interface |
| 🔔 Update check | Automatic notification when a new version hits GitHub Releases |

### File Structure

```
ytdlp/
├── ytdlp-gui.exe      ← main app (double-click this)
├── WebView2Loader.dll ← native window component
├── YTDLP-GUI.bat      ← alternative launcher
├── app.ts             ← entry point (boot + window)
├── src/
│   ├── api.ts         ← HTTP endpoints + router
│   ├── jobs.ts        ← download engine (yt-dlp args, retry, audio safety net)
│   ├── deps.ts        ← yt-dlp + ffmpeg detection & auto-download
│   ├── state.ts       ← queue state + SSE broadcast to UI
│   ├── i18n.ts        ← bilingual server messages (ID/EN)
│   ├── ui.ts          ← assembles PAGE from ui/ (embedded into the exe)
│   ├── util.ts        ← shared helpers (paths, logging, processes)
│   └── window.ts      ← native WebView2 + anti-console
├── ui/
│   ├── index.html     ← UI markup
│   ├── style.css      ← UI styling
│   └── app.js         ← frontend logic
├── app.ico            ← app icon
├── release.ts         ← build & release packaging tool (deno task build/release)
├── make-gui.ts        ← build tool (converts exe to GUI subsystem)
├── make-icon.ps1      ← app.ico generator
├── tools/rcedit-x64.exe  ← exe icon tool (build only; not in repo —
│                             download: https://github.com/electron/rcedit/releases)
└── ytdlp-gui.log      ← app log (created while running)
```

### Modify / Rebuild

Requires [Deno](https://deno.land):

```bash
# run from source (debug mode, native window)
deno run -A --no-check --unstable-ffi --unstable-raw-imports app.ts
# or simply:
deno task dev

# browser mode (no native window)
set YTDLP_GUI_NO_WEBVIEW=1 && deno task dev

# rebuild the desktop exe (single command)
deno task build            # compile + GUI subsystem + icon → ytdlp-gui.exe

# build a release package (zip ready for GitHub Releases)
deno task release 1.0.0    # → dist/ytdlp-downloader-v1.0.0-win64.zip
```

<details><summary>Manual steps (without tasks)</summary>

```bash
deno compile --no-check -A --unstable-ffi --unstable-raw-imports -o ytdlp-gui app.ts
deno run -A make-gui.ts ytdlp-gui.exe   # convert to GUI subsystem (no console)
tools\rcedit-x64.exe ytdlp-gui.exe --set-icon app.ico   # apply app icon
```
</details>

> Regenerate `app.ico` via `powershell -File make-icon.ps1` if you want a different icon.

> How the no-terminal trick works: the exe is GUI subsystem (zero console from birth),
> then the app creates ONE hidden console via `AllocConsole`+`SW_HIDE`. Every console
> child process (yt-dlp, ffmpeg, powershell, tar) attaches to it → never opens a
> new terminal window.

### Notes

- **Component auto-download**: on first launch the app checks for yt-dlp & FFmpeg. If missing, they're downloaded into the `bin/` folder next to the exe (progress banner in the app). The whole `ytdlp/` folder can be copied to a USB/another PC and works as-is.
- Default download folder: `Downloads\yt-dlp` (changeable, saved automatically)
- If you hit "Sign in to confirm you're not a bot" → pick browser cookies in the options
- Your last settings are saved automatically
- If something goes wrong, check the `ytdlp-gui.log` file
- If WebView2 is unavailable on another PC, it falls back to browser app-mode automatically
- **How to update the app**: when a new version is out, a green button appears in the header → click it → download the latest zip from Releases → replace the old `ytdlp-gui.exe`
