"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { sendBookingConfirmedEmail, sendBookingCancelledEmail } from "@/lib/email";
import { getRequiredUserId } from "@/lib/session";

// ─── confirmBooking ──────────────────────────────────────────────────────────
// Server Action untuk mengubah status booking menjadi CONFIRMED.
// Hanya host (pemilik event type) yang boleh mengkonfirmasi booking.
//
// Setelah konfirmasi berhasil, email otomatis dikirim ke tamu berisi
// detail jadwal lengkap + informasi lokasi/platform.
export async function confirmBooking(bookingId: string) {
  // getSessionUserId sudah menangani auth check + fallback email ke userId
  // (logika ini dipindah ke src/lib/session.ts agar tidak duplikat)
  const userId = await getRequiredUserId();

  // Ambil booking beserta semua data yang dibutuhkan untuk email konfirmasi.
  // Satu query mengambil: validasi kepemilikan + data tamu + data event + data host.
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, eventType: { userId } },
    select: {
      id: true,
      status: true,
      inviteeName: true,
      inviteeEmail: true,
      inviteeWa: true,
      startTime: true,
      endTime: true,
      eventType: {
        select: {
          title: true,
          duration: true,
          locationType: true,
          platform: true,
          locationDetails: true,
          user: {
            select: { name: true, email: true, slug: true },
          },
        },
      },
    },
  });

  if (!booking) throw new Error("Booking tidak ditemukan.");
  if (booking.status !== "PENDING") throw new Error("Hanya booking PENDING yang bisa dikonfirmasi.");

  // Update status menjadi CONFIRMED
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED" },
  });

  // Refresh halaman bookings agar status terbaru muncul di UI
  revalidatePath("/dashboard/bookings");

  // ─── Kirim Email Konfirmasi ke Tamu ───────────────────────────────────────
  // Dilakukan setelah update DB berhasil.
  // Jika email gagal, status booking tetap CONFIRMED — tidak di-rollback.
  if (booking.eventType.user?.email) {
    await sendBookingConfirmedEmail({
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      inviteeWa: booking.inviteeWa,
      hostName: booking.eventType.user.name || "Host",
      hostEmail: booking.eventType.user.email,
      hostSlug: booking.eventType.user.slug || "",
      eventTitle: booking.eventType.title,
      duration: booking.eventType.duration,
      startTime: booking.startTime,
      endTime: booking.endTime,
      locationType: booking.eventType.locationType,
      platform: booking.eventType.platform,
      locationDetails: booking.eventType.locationDetails,
      bookingId: booking.id,
    });
  }

  return { success: true };
}

// ─── cancelBooking ───────────────────────────────────────────────────────────
// Server Action untuk membatalkan booking (ubah status ke CANCELLED).
// Bisa dipanggil untuk booking PENDING maupun CONFIRMED.
//
// Setelah pembatalan berhasil, email otomatis dikirim ke tamu beserta
// link untuk booking ulang di halaman publik host.
export async function cancelBooking(bookingId: string) {
  const userId = await getRequiredUserId();

  // Ambil booking beserta semua data yang dibutuhkan untuk email pembatalan.
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, eventType: { userId } },
    select: {
      id: true,
      status: true,
      inviteeName: true,
      inviteeEmail: true,
      inviteeWa: true,
      startTime: true,
      endTime: true,
      eventType: {
        select: {
          title: true,
          duration: true,
          locationType: true,
          platform: true,
          locationDetails: true,
          user: {
            select: { name: true, email: true, slug: true },
          },
        },
      },
    },
  });

  if (!booking) throw new Error("Booking tidak ditemukan.");
  if (booking.status === "CANCELLED") throw new Error("Booking sudah dibatalkan.");

  // Update status menjadi CANCELLED
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  // Refresh halaman bookings agar status terbaru muncul di UI
  revalidatePath("/dashboard/bookings");

  // ─── Kirim Email Pembatalan ke Tamu ───────────────────────────────────────
  // Email berisi info bahwa jadwal dibatalkan + link untuk booking ulang.
  if (booking.eventType.user?.email) {
    await sendBookingCancelledEmail({
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      inviteeWa: booking.inviteeWa,
      hostName: booking.eventType.user.name || "Host",
      hostEmail: booking.eventType.user.email,
      hostSlug: booking.eventType.user.slug || "",
      eventTitle: booking.eventType.title,
      duration: booking.eventType.duration,
      startTime: booking.startTime,
      endTime: booking.endTime,
      locationType: booking.eventType.locationType,
      platform: booking.eventType.platform,
      locationDetails: booking.eventType.locationDetails,
      bookingId: booking.id,
    });
  }

  return { success: true };
}
