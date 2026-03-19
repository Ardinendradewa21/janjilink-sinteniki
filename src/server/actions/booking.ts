"use server";

import prisma from "@/lib/prisma";
import { sendBookingRequestEmails } from "@/lib/email";

// Server Action untuk menyimpan booking baru yang dibuat oleh tamu (guest).
// Tidak memerlukan autentikasi karena tamu tidak punya akun.
//
// Alur:
//   1. Validasi input form
//   2. Pastikan event type masih aktif + ambil data host sekaligus (1 query)
//   3. Cek konflik slot waktu
//   4. Simpan booking ke DB (status: PENDING)
//   5. Kirim email notifikasi ke tamu + host (paralel, non-blocking)
export async function createBooking(formData: FormData) {
  const eventTypeId = formData.get("eventTypeId");
  const inviteeName = formData.get("inviteeName");
  const inviteeEmail = formData.get("inviteeEmail");
  const inviteeWa = formData.get("inviteeWa");
  // Format: "YYYY-MM-DDTHH:MM" (waktu lokal WIB, tanpa offset)
  const startTimeStr = formData.get("startTime");

  if (
    typeof eventTypeId !== "string" ||
    typeof inviteeName !== "string" ||
    typeof inviteeEmail !== "string" ||
    typeof startTimeStr !== "string"
  ) {
    throw new Error("Data booking tidak lengkap.");
  }

  const name = inviteeName.trim();
  const email = inviteeEmail.trim();
  const wa = typeof inviteeWa === "string" ? inviteeWa.trim() : "";

  // Validasi input dasar
  if (name.length < 2) throw new Error("Nama minimal 2 karakter.");
  if (!email.includes("@")) throw new Error("Format email tidak valid.");

  // Ambil event type beserta data host dalam satu query.
  // Sebelumnya hanya mengambil `duration`, sekarang perlu nama/email/slug host
  // untuk dimasukkan ke template email notifikasi.
  const eventType = await prisma.eventType.findFirst({
    where: { id: eventTypeId, isActive: true },
    select: {
      duration: true,
      title: true,
      locationType: true,
      platform: true,
      locationDetails: true,
      user: {
        select: { name: true, email: true, slug: true },
      },
    },
  });

  if (!eventType) throw new Error("Event type tidak ditemukan atau sudah tidak aktif.");

  // Konversi waktu WIB ke UTC untuk disimpan ke database.
  // Tambahkan eksplisit offset +07:00 agar tidak bergantung pada timezone server.
  const startTime = new Date(`${startTimeStr}:00+07:00`);

  if (isNaN(startTime.getTime())) throw new Error("Format waktu tidak valid.");

  // Jangan izinkan booking di masa lalu
  if (startTime < new Date()) throw new Error("Tidak bisa booking waktu yang sudah lewat.");

  const endTime = new Date(startTime.getTime() + eventType.duration * 60 * 1000);

  // Cek konflik: slot yang sama tidak boleh dipesan dua kali
  const conflict = await prisma.booking.findFirst({
    where: { eventTypeId, startTime },
  });

  if (conflict) throw new Error("Slot ini sudah dipesan. Silakan pilih waktu lain.");

  // Simpan booking ke database dengan status PENDING (menunggu konfirmasi host)
  const booking = await prisma.booking.create({
    data: {
      inviteeName: name,
      inviteeEmail: email,
      inviteeWa: wa.length > 0 ? wa : null,
      startTime,
      endTime,
      eventTypeId,
    },
  });

  // ─── Kirim Email Notifikasi ────────────────────────────────────────────────
  // Dilakukan SETELAH booking tersimpan di DB supaya data sudah punya ID.
  // Jika email gagal, booking tetap valid — tidak di-rollback.
  // Error hanya di-log di server console, tidak dilempar ke client.
  //
  // sendBookingRequestEmails mengirim 2 email secara paralel:
  //   - Ke TAMU: "Permintaan diterima, menunggu konfirmasi"
  //   - Ke HOST: "Ada booking baru, perlu dikonfirmasi"
  if (eventType.user?.email) {
    await sendBookingRequestEmails({
      inviteeName: name,
      inviteeEmail: email,
      inviteeWa: wa.length > 0 ? wa : null,
      hostName: eventType.user.name || "Host",
      hostEmail: eventType.user.email,
      hostSlug: eventType.user.slug || "",
      eventTitle: eventType.title,
      duration: eventType.duration,
      startTime,
      endTime,
      locationType: eventType.locationType,
      platform: eventType.platform,
      locationDetails: eventType.locationDetails,
      bookingId: booking.id,
    });
  }

  return { success: true, bookingId: booking.id };
}
