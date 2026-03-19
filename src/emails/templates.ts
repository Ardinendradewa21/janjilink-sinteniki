// ─── Template Email HTML ───────────────────────────────────────────────────
// Berisi semua template email JanjiLink dalam format HTML string.
//
// Mengapa HTML string, bukan React Email atau library template lain?
//   - Tidak ada dependensi tambahan
//   - Lebih mudah dipahami dan diedit oleh siapapun
//   - HTML email MEMERLUKAN inline style — CSS eksternal tidak didukung
//     oleh mayoritas email client (Gmail, Outlook, Yahoo)
//
// Konvensi:
//   - Semua style menggunakan inline style (bukan class Tailwind)
//   - Warna utama: #059669 (emerald-600) untuk aksen brand
//   - Layout berbasis <table> karena paling kompatibel lintas email client
//   - Font: Arial, sans-serif (aman di semua sistem)
//
// Cara konversi waktu:
//   DB menyimpan UTC → ditambah 7 jam → ditampilkan sebagai WIB
//   Ini konsisten dengan konvensi di seluruh proyek (lihat src/lib/date.ts)

// ─── Tipe Data ────────────────────────────────────────────────────────────────
// Didefinisikan di sini (bukan di email.ts) agar tidak terjadi circular import:
//   email.ts → templates.ts (untuk fungsi build*)
//   templates.ts → email.ts (untuk tipe) ← ini yang menyebabkan circular dep
// Dengan menaruh tipe di sini, email.ts cukup import dari templates.ts saja.
export type BookingEmailData = {
  inviteeName: string;
  inviteeEmail: string;
  inviteeWa?: string | null;     // nomor WhatsApp tamu (opsional)
  hostName: string;
  hostEmail: string;
  hostSlug: string;              // slug URL host, untuk link "booking ulang"
  eventTitle: string;
  duration: number;              // dalam menit
  startTime: Date;               // UTC — dikonversi ke WIB di template
  endTime: Date;                 // UTC — dikonversi ke WIB di template
  locationType: string;          // "online" atau "offline"
  platform: string | null;
  locationDetails: string | null;
  bookingId: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Nama bulan Indonesia (dipakai untuk format tanggal di email)
const MONTH_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DAY_FULL = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Mengkonversi Date UTC ke representasi WIB untuk ditampilkan di email.
// Menggunakan getUTC* setelah digeser +7 jam agar tidak terpengaruh
// timezone server (server bisa berjalan di timezone manapun).
function formatWIBForEmail(utcDate: Date): { day: string; dateStr: string; time: string } {
  const wib = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
  return {
    day: DAY_FULL[wib.getUTCDay()],
    dateStr: `${wib.getUTCDate()} ${MONTH_FULL[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`,
    time: `${String(wib.getUTCHours()).padStart(2, "0")}:${String(wib.getUTCMinutes()).padStart(2, "0")}`,
  };
}

// Menentukan label lokasi berdasarkan locationType + platform/locationDetails.
// Menggabungkan logika yang sama dengan yang ada di BookingCalendar.
function buildLocationLabel(data: BookingEmailData): string {
  if (data.locationType === "online") {
    return data.platform
      ? `Online via ${data.platform}`
      : "Online (link akan dibagikan)";
  }
  return data.locationDetails || "Offline (detail akan dikonfirmasi)";
}

// ─── Layout Dasar ─────────────────────────────────────────────────────────────
// Semua template email menggunakan wrapper HTML yang sama.
// Menggunakan <table> untuk kompatibilitas maksimum.
function wrapInLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JanjiLink</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header: Logo / Brand -->
          <tr>
            <td style="padding-bottom:24px;text-align:center;">
              <span style="font-size:22px;font-weight:700;color:#059669;letter-spacing:-0.5px;">
                JanjiLink
              </span>
              <span style="font-size:22px;color:#78716c;">.</span>
            </td>
          </tr>

          <!-- Konten utama: card putih -->
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;color:#a8a29e;font-size:12px;line-height:1.6;">
              Email ini dikirim otomatis oleh JanjiLink.<br/>
              Jangan balas email ini.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Blok Detail Jadwal ───────────────────────────────────────────────────────
// Dipakai berulang di beberapa template — satu fungsi untuk menghindari duplikasi.
function buildScheduleBlock(data: BookingEmailData): string {
  const start = formatWIBForEmail(data.startTime);
  const end = formatWIBForEmail(data.endTime);
  const location = buildLocationLabel(data);

  return `
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background-color:#f0fdf4;border-radius:8px;padding:16px;margin:20px 0;">
      <tr>
        <td>
          <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;font-weight:600;
                    text-transform:uppercase;letter-spacing:0.5px;">Detail Jadwal</p>

          <p style="margin:0 0 4px 0;font-size:15px;color:#1c1917;font-weight:600;">
            ${data.eventTitle}
          </p>

          <p style="margin:0 0 2px 0;font-size:14px;color:#44403c;">
            📅 ${start.day}, ${start.dateStr}
          </p>

          <p style="margin:0 0 2px 0;font-size:14px;color:#44403c;">
            🕐 ${start.time} – ${end.time} WIB (${data.duration} menit)
          </p>

          <p style="margin:0;font-size:14px;color:#44403c;">
            📍 ${location}
          </p>
        </td>
      </tr>
    </table>`;
}

// ─── Template 1: Ke Tamu — Booking Diterima (PENDING) ────────────────────────
// Dikirim ke tamu setelah mengisi form booking.
// Pesan: "Permintaan kamu sudah kami terima, sedang menunggu konfirmasi host."
export function buildBookingRequestGuestEmail(data: BookingEmailData, appUrl: string): string {
  return wrapInLayout(`
    <!-- Judul -->
    <h1 style="margin:0 0 8px 0;font-size:20px;color:#1c1917;font-weight:700;">
      Permintaan booking diterima!
    </h1>
    <p style="margin:0 0 20px 0;font-size:15px;color:#57534e;line-height:1.6;">
      Hei <strong>${data.inviteeName}</strong>,<br/>
      Permintaan jadwalmu kepada <strong>${data.hostName}</strong> sudah kami terima
      dan sedang menunggu konfirmasi. Kamu akan mendapat email lagi setelah dikonfirmasi.
    </p>

    <!-- Detail jadwal -->
    ${buildScheduleBlock(data)}

    <!-- Info status -->
    <div style="background-color:#fffbeb;border-left:3px solid #f59e0b;
                border-radius:4px;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
        ⏳ <strong>Menunggu konfirmasi</strong> — Host akan segera mengkonfirmasi jadwalmu.
        Pastikan kamu cek email ini lagi untuk update berikutnya.
      </p>
    </div>

    <!-- Penutup -->
    <p style="margin:0;font-size:14px;color:#78716c;line-height:1.6;">
      Salam,<br/>
      <strong>Tim JanjiLink</strong>
    </p>
  `);
}

// ─── Template 2: Ke Host — Ada Booking Baru (PENDING) ────────────────────────
// Dikirim ke host saat ada booking baru masuk.
// Pesan: "Ada orang yang booking kamu, segera konfirmasi."
export function buildBookingRequestHostEmail(data: BookingEmailData, appUrl: string): string {
  // Link langsung ke halaman detail booking di dashboard
  const bookingUrl = `${appUrl}/dashboard/bookings/${data.bookingId}`;

  return wrapInLayout(`
    <!-- Judul -->
    <h1 style="margin:0 0 8px 0;font-size:20px;color:#1c1917;font-weight:700;">
      Ada booking baru masuk!
    </h1>
    <p style="margin:0 0 20px 0;font-size:15px;color:#57534e;line-height:1.6;">
      Hei <strong>${data.hostName}</strong>,<br/>
      <strong>${data.inviteeName}</strong> (${data.inviteeEmail}) baru saja
      membuat permintaan booking denganmu. Segera konfirmasi agar tamu tahu jadwalnya pasti.
    </p>

    <!-- Detail jadwal -->
    ${buildScheduleBlock(data)}

    <!-- Info kontak tamu -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background-color:#f5f5f4;border-radius:8px;padding:16px;margin-bottom:20px;">
      <tr>
        <td>
          <p style="margin:0 0 6px 0;font-size:13px;color:#6b7280;font-weight:600;
                    text-transform:uppercase;letter-spacing:0.5px;">Kontak Tamu</p>
          <p style="margin:0 0 2px 0;font-size:14px;color:#1c1917;">
            👤 ${data.inviteeName}
          </p>
          <p style="margin:0 0 2px 0;font-size:14px;color:#44403c;">
            ✉️ ${data.inviteeEmail}
          </p>
          ${data.inviteeWa ? `
          <p style="margin:0;font-size:14px;color:#44403c;">
            📱 WA: ${data.inviteeWa}
          </p>` : ""}
        </td>
      </tr>
    </table>

    <!-- Tombol CTA ke dashboard -->
    <div style="text-align:center;margin-bottom:8px;">
      <a href="${bookingUrl}"
        style="display:inline-block;background-color:#059669;color:#ffffff;
               font-size:15px;font-weight:600;text-decoration:none;
               padding:12px 28px;border-radius:8px;">
        Lihat & Konfirmasi Booking →
      </a>
    </div>
  `);
}

// ─── Template 3: Ke Tamu — Booking Dikonfirmasi ───────────────────────────────
// Dikirim ke tamu saat host mengkonfirmasi booking (PENDING → CONFIRMED).
// Pesan: "Jadwalmu sudah pasti! Ini detail lengkapnya."
export function buildBookingConfirmedEmail(data: BookingEmailData, appUrl: string): string {
  const location = buildLocationLabel(data);

  return wrapInLayout(`
    <!-- Judul dengan aksen hijau -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">✅</div>
      <h1 style="margin:0;font-size:22px;color:#059669;font-weight:700;">
        Booking dikonfirmasi!
      </h1>
    </div>

    <p style="margin:0 0 20px 0;font-size:15px;color:#57534e;line-height:1.6;text-align:center;">
      Hei <strong>${data.inviteeName}</strong>, jadwalmu dengan
      <strong>${data.hostName}</strong> sudah dikonfirmasi. Tandai di kalendermu!
    </p>

    <!-- Detail jadwal -->
    ${buildScheduleBlock(data)}

    <!-- Tips persiapan -->
    <div style="background-color:#f0fdf4;border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 8px 0;font-size:13px;color:#6b7280;font-weight:600;
                text-transform:uppercase;letter-spacing:0.5px;">Tips Persiapan</p>
      <ul style="margin:0;padding-left:18px;color:#44403c;font-size:14px;line-height:1.8;">
        ${data.locationType === "online"
          ? `<li>Siapkan koneksi internet yang stabil</li>
             <li>Cek apakah aplikasi ${data.platform || "meeting"} sudah terinstall</li>
             <li>Bergabung 2–3 menit sebelum jadwal mulai</li>`
          : `<li>Catat alamat lokasi: <strong>${location}</strong></li>
             <li>Perkirakan waktu perjalanan</li>
             <li>Konfirmasi lagi jika ada perubahan</li>`}
        <li>Siapkan poin yang ingin didiskusikan</li>
      </ul>
    </div>

    <p style="margin:0;font-size:14px;color:#78716c;line-height:1.6;">
      Sampai jumpa,<br/>
      <strong>${data.hostName}</strong> via <strong>JanjiLink</strong>
    </p>
  `);
}

// ─── Template 4: Ke Tamu — Booking Dibatalkan ────────────────────────────────
// Dikirim ke tamu saat booking dibatalkan (oleh host).
// Pesan: "Sayang sekali, jadwalnya dibatalkan. Kamu bisa booking ulang."
export function buildBookingCancelledEmail(data: BookingEmailData, appUrl: string): string {
  // Link ke halaman publik host agar tamu bisa booking ulang
  const rebookUrl = `${appUrl}/${data.hostSlug}`;
  const start = formatWIBForEmail(data.startTime);

  return wrapInLayout(`
    <!-- Judul -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:40px;margin-bottom:8px;">❌</div>
      <h1 style="margin:0;font-size:20px;color:#1c1917;font-weight:700;">
        Booking dibatalkan
      </h1>
    </div>

    <p style="margin:0 0 20px 0;font-size:15px;color:#57534e;line-height:1.6;">
      Hei <strong>${data.inviteeName}</strong>,<br/>
      Sayangnya jadwal <strong>${data.eventTitle}</strong> bersama
      <strong>${data.hostName}</strong> pada
      <strong>${start.day}, ${start.dateStr} pukul ${start.time} WIB</strong>
      telah dibatalkan.
    </p>

    <!-- Saran booking ulang -->
    <div style="background-color:#fef2f2;border-left:3px solid #ef4444;
                border-radius:4px;padding:12px 16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#7f1d1d;line-height:1.5;">
        Jika kamu masih ingin bertemu, kamu bisa memilih jadwal lain yang tersedia.
      </p>
    </div>

    <!-- Tombol booking ulang -->
    <div style="text-align:center;">
      <a href="${rebookUrl}"
        style="display:inline-block;background-color:#059669;color:#ffffff;
               font-size:15px;font-weight:600;text-decoration:none;
               padding:12px 28px;border-radius:8px;">
        Pilih Jadwal Lain →
      </a>
    </div>

    <p style="margin:24px 0 0 0;font-size:14px;color:#78716c;line-height:1.6;">
      Salam,<br/>
      <strong>Tim JanjiLink</strong>
    </p>
  `);
}
