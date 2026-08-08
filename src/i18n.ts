// ============================================================
//  pesan server dwibahasa (ID/EN)
// ============================================================

// ---------------- pesan server dwibahasa ----------------
export const SRV: Record<string, Record<string, string>> = {
  id: {
    badUrl: "URL tidak valid",
    runFail: "Gagal menjalankan yt-dlp",
    noOut: "Tidak ada hasil",
    badJson: "Gagal membaca hasil yt-dlp",
    noVid: "Tidak ada video ditemukan",
    settingUp: "Setup masih berjalan, tunggu sebentar…",
    noYtdlp: "yt-dlp tidak ditemukan",
    noItems: "Tidak ada item dipilih",
    noOutdir: "Folder tujuan belum diisi",
    retry: "Coba ulang {0}/{1}…",
    noAudio: "Hasil tak bersuara — ganti format {0}/{1}…",
    fmtHint: " — coba resolusi 'Terbaik', atau aktifkan Cookies browser kalau videonya perlu login",
  },
  en: {
    badUrl: "Invalid URL",
    runFail: "Failed to run yt-dlp",
    noOut: "No output",
    badJson: "Failed to parse yt-dlp output",
    noVid: "No videos found",
    settingUp: "Setup still running, please wait…",
    noYtdlp: "yt-dlp not found",
    noItems: "No items selected",
    noOutdir: "Destination folder is empty",
    retry: "Retrying {0}/{1}…",
    noAudio: "No audio in result — switching format {0}/{1}…",
    fmtHint: " — try 'Best' resolution, or enable browser cookies if the video needs login",
  },
};
export function sm(key: string, lang: string, ...args: (string | number)[]): string {
  let s = (SRV[lang] && SRV[lang][key]) || SRV.en[key] || key;
  args.forEach((a, i) => { s = s.replace("{" + i + "}", String(a)); });
  return s;
}
