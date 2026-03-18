"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── confirmBooking ──────────────────────────────────────────────────────────
// Server Action untuk mengubah status booking menjadi CONFIRMED.
// Hanya host (pemilik event type) yang boleh mengkonfirmasi booking.
export async function confirmBooking(bookingId: string) {
  // Ambil session user yang sedang login
  const session = await auth();
  let userId = (session?.user as { id?: string } | undefined)?.id;

  // Fallback: cari userId dari email jika belum tersedia di token JWT
  if (!userId && session?.user?.email) {
    const u = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    userId = u?.id;
  }

  if (!session || !userId) throw new Error("Anda harus login terlebih dahulu.");

  // Cari booking dan pastikan milik user ini (melalui relasi eventType → userId)
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, eventType: { userId } },
    select: { id: true, status: true },
  });

  if (!booking) throw new Error("Booking tidak ditemukan.");
  if (booking.status !== "PENDING") throw new Error("Hanya booking PENDING yang bisa dikonfirmasi.");

  // Update status menjadi CONFIRMED
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CONFIRMED" },
  });

  // Refresh halaman bookings agar status terbaru muncul
  revalidatePath("/dashboard/bookings");
  return { success: true };
}

// ─── cancelBooking ───────────────────────────────────────────────────────────
// Server Action untuk membatalkan booking (ubah status ke CANCELLED).
// Bisa dipanggil untuk booking PENDING maupun CONFIRMED.
export async function cancelBooking(bookingId: string) {
  // Ambil session user yang sedang login
  const session = await auth();
  let userId = (session?.user as { id?: string } | undefined)?.id;

  // Fallback: cari userId dari email jika belum tersedia di token JWT
  if (!userId && session?.user?.email) {
    const u = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    userId = u?.id;
  }

  if (!session || !userId) throw new Error("Anda harus login terlebih dahulu.");

  // Cari booking dan pastikan milik user ini
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, eventType: { userId } },
    select: { id: true, status: true },
  });

  if (!booking) throw new Error("Booking tidak ditemukan.");
  if (booking.status === "CANCELLED") throw new Error("Booking sudah dibatalkan.");

  // Update status menjadi CANCELLED
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  // Refresh halaman bookings agar status terbaru muncul
  revalidatePath("/dashboard/bookings");
  return { success: true };
}
