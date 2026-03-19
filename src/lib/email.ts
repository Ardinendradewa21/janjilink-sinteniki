// ─── Email Client & Sender ─────────────────────────────────────────────────
// File ini bertanggung jawab untuk semua pengiriman email dari JanjiLink.
//
// Menggunakan Resend (resend.com) — layanan email transaksional gratis
// hingga 3.000 email/bulan, tanpa kartu kredit.
//
// Cara kerja:
//   1. Buat instance Resend sekali (singleton) pakai API key dari .env
//   2. Setiap fungsi di bawah memanggil resend.emails.send() dengan
//      template HTML yang sesuai
//   3. Fungsi-fungsi ini dipanggil dari server actions (booking.ts, booking-manage.ts)
//
// Penting: file ini HANYA boleh diimpor dari server-side code (server actions,
// route handlers, server components) karena RESEND_API_KEY tidak boleh
// terekspos ke browser.

import { Resend } from "resend";
import {
  buildBookingRequestGuestEmail,
  buildBookingRequestHostEmail,
  buildBookingConfirmedEmail,
  buildBookingCancelledEmail,
  // Re-export tipe agar server actions bisa import dari satu tempat saja
  type BookingEmailData,
} from "@/emails/templates";

// Re-export tipe supaya server actions tidak perlu tahu file templates
export type { BookingEmailData };

// ─── Instance Resend ─────────────────────────────────────────────────────────
// Dibuat sekali dan di-reuse. API key diambil dari environment variable.
// Jika RESEND_API_KEY tidak ada (misal: environment lokal tanpa .env),
// Resend akan tetap bisa diinstansiasi tapi pengiriman akan gagal —
// ini aman karena error akan di-catch dan di-log, tidak crash aplikasi.
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Alamat Pengirim ─────────────────────────────────────────────────────────
// Untuk development: pakai domain bawaan Resend (onboarding@resend.dev).
// Untuk production: ganti dengan email domain sendiri yang sudah diverifikasi
// di dashboard Resend, misal: noreply@janjilink.com
const FROM_EMAIL = "JanjiLink <onboarding@resend.dev>";

// ─── URL Aplikasi ─────────────────────────────────────────────────────────────
// Digunakan untuk membuat link di dalam email (misal: link ke dashboard).
// Di development ini http://localhost:3000, di production ganti ke URL asli.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ─── sendBookingRequestEmails ─────────────────────────────────────────────────
// Dikirim saat tamu baru selesai mengisi form booking (status: PENDING).
// Mengirim DUA email sekaligus:
//   1. Ke TAMU: konfirmasi bahwa permintaan sudah diterima, sedang menunggu host
//   2. Ke HOST: notifikasi ada booking baru yang perlu dikonfirmasi
//
// Menggunakan Promise.allSettled agar:
//   - Kedua email dikirim secara paralel (lebih cepat)
//   - Jika satu gagal, yang lain tetap terkirim (tidak saling memblokir)
export async function sendBookingRequestEmails(data: BookingEmailData) {
  const [guestResult, hostResult] = await Promise.allSettled([
    // Email 1: ke tamu
    resend.emails.send({
      from: FROM_EMAIL,
      to: data.inviteeEmail,
      subject: `Permintaan booking Anda kepada ${data.hostName} sedang diproses`,
      html: buildBookingRequestGuestEmail(data, APP_URL),
    }),
    // Email 2: ke host
    resend.emails.send({
      from: FROM_EMAIL,
      to: data.hostEmail,
      subject: `Booking baru dari ${data.inviteeName} — perlu dikonfirmasi`,
      html: buildBookingRequestHostEmail(data, APP_URL),
    }),
  ]);

  // Log error jika ada yang gagal, tapi tidak throw
  // (booking tetap tersimpan di DB meski email gagal)
  if (guestResult.status === "rejected") {
    console.error("[Email] Gagal kirim ke tamu:", guestResult.reason);
  }
  if (hostResult.status === "rejected") {
    console.error("[Email] Gagal kirim ke host:", hostResult.reason);
  }
}

// ─── sendBookingConfirmedEmail ────────────────────────────────────────────────
// Dikirim ke TAMU saat host mengkonfirmasi booking (status: PENDING → CONFIRMED).
// Berisi detail jadwal lengkap + informasi lokasi/platform.
export async function sendBookingConfirmedEmail(data: BookingEmailData) {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: data.inviteeEmail,
    subject: `Booking dikonfirmasi! ${data.eventTitle} dengan ${data.hostName}`,
    html: buildBookingConfirmedEmail(data, APP_URL),
  });

  if (error) {
    console.error("[Email] Gagal kirim konfirmasi ke tamu:", error);
  }
}

// ─── sendBookingCancelledEmail ────────────────────────────────────────────────
// Dikirim ke TAMU saat booking dibatalkan (oleh host atau sistem).
// Memberitahu tamu bahwa jadwal dibatalkan dan menyarankan booking ulang.
export async function sendBookingCancelledEmail(data: BookingEmailData) {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: data.inviteeEmail,
    subject: `Booking Anda dengan ${data.hostName} telah dibatalkan`,
    html: buildBookingCancelledEmail(data, APP_URL),
  });

  if (error) {
    console.error("[Email] Gagal kirim notifikasi batal ke tamu:", error);
  }
}
