"use server";

import prisma from "@/lib/prisma";

// Server Action untuk menyimpan booking baru yang dibuat oleh tamu (guest).
// Tidak memerlukan autentikasi karena tamu tidak punya akun.
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

  // Pastikan event type masih aktif
  const eventType = await prisma.eventType.findFirst({
    where: { id: eventTypeId, isActive: true },
    select: { duration: true },
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

  return { success: true, bookingId: booking.id };
}
