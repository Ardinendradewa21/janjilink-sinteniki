"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Tipe Return untuk useActionState ────────────────────────────────────────
type AvailabilityState = { error?: string; success?: string } | null;

// ─── Tipe data satu baris hari ────────────────────────────────────────────────
// Representasi ketersediaan satu hari yang dikirim dari form.
type DaySlot = {
  dayOfWeek: number;  // 0=Minggu, 1=Senin, ..., 6=Sabtu
  isActive: boolean;  // Apakah hari ini tersedia
  startTime: string;  // Format "HH:MM", misal "09:00"
  endTime: string;    // Format "HH:MM", misal "17:00"
};

// ─── saveAvailability ────────────────────────────────────────────────────────
// Server Action untuk menyimpan pengaturan ketersediaan 7 hari sekaligus.
// Dipanggil dari halaman /dashboard/availability melalui useActionState.
// Strategi: hapus semua record lama, insert ulang 7 record baru (replace all).
export async function saveAvailability(
  _prevState: AvailabilityState,
  formData: FormData,
): Promise<AvailabilityState> {
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

  if (!session || !userId) {
    return { error: "Anda harus login terlebih dahulu." };
  }

  // Parse data 7 hari dari formData.
  // Setiap hari dikirim sebagai: day_0_active, day_0_start, day_0_end, dst.
  const days: DaySlot[] = [];

  for (let i = 0; i < 7; i++) {
    const isActive = formData.get(`day_${i}_active`) === "on";
    const startTime = (formData.get(`day_${i}_start`) as string | null) ?? "09:00";
    const endTime = (formData.get(`day_${i}_end`) as string | null) ?? "17:00";

    // Validasi format waktu HH:MM
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return { error: `Format waktu hari ke-${i} tidak valid. Gunakan HH:MM.` };
    }

    // Validasi jam mulai harus sebelum jam selesai (jika hari aktif)
    if (isActive && startTime >= endTime) {
      return { error: `Jam mulai harus sebelum jam selesai untuk hari yang aktif.` };
    }

    days.push({ dayOfWeek: i, isActive, startTime, endTime });
  }

  // Hapus semua record ketersediaan lama milik user ini
  await prisma.availability.deleteMany({ where: { userId } });

  // Insert 7 record baru (satu per hari dalam seminggu)
  await prisma.availability.createMany({
    data: days.map((d) => ({
      userId,
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime,
      endTime: d.endTime,
      isActive: d.isActive,
    })),
  });

  // Refresh cache agar slot API membaca data terbaru
  revalidatePath("/dashboard/availability");

  return { success: "Ketersediaan berhasil disimpan." };
}
