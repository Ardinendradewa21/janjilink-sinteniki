// ─── Date Utilities ───────────────────────────────────────────────────────────
// Fungsi dan konstanta bersama untuk formatting tanggal dan waktu.
//
// Masalah yang diselesaikan:
// `MONTH_NAMES`, `DAY_NAMES`, dan `formatWIB` didefinisikan ulang di 6+ file
// berbeda — dashboard/bookings, dashboard/bookings/[id], confirmed page,
// BookingCalendar, ExportSummaryButton, analytics query.
// Ini menyebabkan inkonsistensi format dan susah diubah kalau ada kebutuhan baru.
//
// Solusi: satu sumber kebenaran di sini, semua file import dari sini.
//
// Timezone convention: DB menyimpan UTC, tampilan selalu WIB (UTC+7).

// ─── Nama Bulan ───────────────────────────────────────────────────────────────
// Format pendek: untuk dashboard (hemat tempat)
export const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

// Format panjang: untuk halaman publik (konfirmasi booking, kalender)
export const MONTH_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// ─── Nama Hari ────────────────────────────────────────────────────────────────
// Format pendek: untuk dashboard
export const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Format panjang: untuk halaman publik
export const DAY_FULL = [
  "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu",
];

// ─── toWIB ────────────────────────────────────────────────────────────────────
// Mengkonversi Date UTC ke Date yang merepresentasikan waktu WIB.
// Cara: tambah 7 jam (7 * 60 * 60 * 1000 ms) ke nilai timestamp UTC.
// Hasilnya bukan "zona waktu WIB yang sebenarnya" — melainkan Date UTC yang
// nilainya sudah digeser 7 jam, lalu dibaca dengan metode getUTC* agar tidak
// terpengaruh locale sistem operasi.
export function toWIB(utcDate: Date): Date {
  return new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
}

// ─── formatWIBShort ───────────────────────────────────────────────────────────
// Format singkat untuk tampilan di dashboard.
// Contoh output: { day: "Sen", date: "18 Mar 2026", time: "09:00" }
export function formatWIBShort(utcDate: Date): {
  day: string;
  date: string;
  time: string;
} {
  const wib = toWIB(utcDate);
  return {
    day: DAY_SHORT[wib.getUTCDay()],
    date: `${wib.getUTCDate()} ${MONTH_SHORT[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`,
    time: `${String(wib.getUTCHours()).padStart(2, "0")}:${String(wib.getUTCMinutes()).padStart(2, "0")}`,
  };
}

// ─── formatWIBFull ────────────────────────────────────────────────────────────
// Format lengkap untuk halaman publik (konfirmasi booking, export summary).
// Contoh output: { day: "Senin", dateStr: "18 Maret 2026", time: "09:00" }
export function formatWIBFull(utcDate: Date): {
  day: string;
  dateStr: string;
  time: string;
} {
  const wib = toWIB(utcDate);
  return {
    day: DAY_FULL[wib.getUTCDay()],
    dateStr: `${wib.getUTCDate()} ${MONTH_FULL[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`,
    time: `${String(wib.getUTCHours()).padStart(2, "0")}:${String(wib.getUTCMinutes()).padStart(2, "0")}`,
  };
}

// ─── formatWIBSummary ─────────────────────────────────────────────────────────
// Format satu baris untuk export ringkasan (dipakai di ExportSummaryButton).
// Contoh output: "Senin, 18 Maret 2026 pukul 09:00 WIB"
export function formatWIBSummary(utcDate: Date): string {
  const { day, dateStr, time } = formatWIBFull(utcDate);
  return `${day}, ${dateStr} pukul ${time} WIB`;
}
