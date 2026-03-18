"use server";

// ─── Server Actions: Meeting Layer ────────────────────────────────────────────
// Kumpulan fungsi server untuk mengelola catatan meeting (MeetingNote)
// dan daftar tindakan (ActionItem) yang terkait dengan satu booking.
//
// Setiap action memverifikasi kepemilikan sebelum menulis ke database,
// agar host A tidak bisa mengubah data milik host B.

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Helper: ambil userId dari session ───────────────────────────────────────
// Fungsi internal — dipanggil oleh setiap action untuk mendapatkan
// ID user yang sedang login. Throw error jika belum login.
async function getSessionUserId(): Promise<string> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new Error("Belum login");
  return userId;
}

// ─── Helper: verifikasi kepemilikan booking ───────────────────────────────────
// Memastikan booking dengan bookingId benar-benar milik userId.
// Throw error jika tidak ditemukan atau bukan miliknya.
async function verifyBookingOwnership(
  bookingId: string,
  userId: string
): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { eventType: { select: { userId: true } } },
  });

  if (!booking || booking.eventType.userId !== userId) {
    throw new Error("Booking tidak ditemukan atau bukan milik Anda");
  }
}

// ─── saveMeetingNote ──────────────────────────────────────────────────────────
// Menyimpan atau memperbarui catatan meeting untuk satu booking.
// Strategi: upsert — jika belum ada dibuat baru, jika sudah ada diperbarui.
// Dipanggil otomatis saat user blur (meninggalkan) textarea catatan.
export async function saveMeetingNote(
  bookingId: string,
  content: string
): Promise<{ error?: string }> {
  try {
    const userId = await getSessionUserId();
    await verifyBookingOwnership(bookingId, userId);

    // Upsert: buat catatan baru atau timpa catatan yang sudah ada
    await prisma.meetingNote.upsert({
      where: { bookingId },
      update: { content },
      create: { bookingId, content },
    });

    // Invalidasi cache halaman detail meeting agar data terbaru muncul
    revalidatePath(`/dashboard/bookings/${bookingId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal menyimpan catatan" };
  }
}

// ─── addActionItem ────────────────────────────────────────────────────────────
// Menambah satu action item baru ke daftar tindakan suatu booking.
// Order diatur otomatis berdasarkan jumlah item yang sudah ada.
export async function addActionItem(
  bookingId: string,
  text: string
): Promise<{ error?: string; id?: string }> {
  try {
    // Validasi teks tidak kosong
    const trimmed = text.trim();
    if (!trimmed) return { error: "Teks action item tidak boleh kosong" };

    const userId = await getSessionUserId();
    await verifyBookingOwnership(bookingId, userId);

    // Hitung order berdasarkan jumlah item yang sudah ada di booking ini
    const existingCount = await prisma.actionItem.count({
      where: { bookingId },
    });

    const newItem = await prisma.actionItem.create({
      data: {
        bookingId,
        text: trimmed,
        order: existingCount, // item baru ada di paling bawah
      },
    });

    revalidatePath(`/dashboard/bookings/${bookingId}`);
    return { id: newItem.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal menambah action item" };
  }
}

// ─── toggleActionItem ─────────────────────────────────────────────────────────
// Mengubah status selesai/belum dari satu action item.
// Dipanggil saat user klik checkbox di daftar action items.
export async function toggleActionItem(
  id: string,
  isDone: boolean
): Promise<{ error?: string }> {
  try {
    const userId = await getSessionUserId();

    // Ambil action item beserta bookingId-nya untuk verifikasi kepemilikan
    const item = await prisma.actionItem.findUnique({
      where: { id },
      select: { bookingId: true },
    });
    if (!item) return { error: "Action item tidak ditemukan" };

    await verifyBookingOwnership(item.bookingId, userId);

    // Update status isDone sesuai nilai baru dari checkbox
    await prisma.actionItem.update({
      where: { id },
      data: { isDone },
    });

    revalidatePath(`/dashboard/bookings/${item.bookingId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal memperbarui action item" };
  }
}

// ─── deleteActionItem ─────────────────────────────────────────────────────────
// Menghapus satu action item dari database.
// Dipanggil saat user klik tombol hapus (ikon trash) di sebelah item.
export async function deleteActionItem(
  id: string
): Promise<{ error?: string }> {
  try {
    const userId = await getSessionUserId();

    // Ambil action item untuk verifikasi kepemilikan sebelum hapus
    const item = await prisma.actionItem.findUnique({
      where: { id },
      select: { bookingId: true },
    });
    if (!item) return { error: "Action item tidak ditemukan" };

    await verifyBookingOwnership(item.bookingId, userId);

    await prisma.actionItem.delete({ where: { id } });

    revalidatePath(`/dashboard/bookings/${item.bookingId}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal menghapus action item" };
  }
}
