// ─── Server Queries: Dashboard ────────────────────────────────────────────────
// Query untuk halaman utama dashboard (/dashboard).
//
// Dipisahkan dari halaman agar:
//  - Halaman utama hanya berisi logika layout dan props ke komponen
//  - Query bisa diubah/di-cache tanpa menyentuh JSX halaman
//
// Lihat juga: src/server/queries/bookings.ts, src/server/queries/analytics.ts

import prisma from "@/lib/prisma";
import { toWIB } from "@/lib/date";

// ─── Tipe Data ────────────────────────────────────────────────────────────────
export type DashboardEventType = {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  locationType: "ONLINE" | "OFFLINE";
  platform: string | null;
  locationDetails: string | null;
  isActive: boolean;
};

// ─── getDashboardData ─────────────────────────────────────────────────────────
// Mengambil semua event type milik user DAN slug-nya dalam satu panggilan.
// Dua query dijalankan paralel dengan Promise.all agar lebih cepat
// dibandingkan sequential (await satu per satu).
export async function getDashboardData(userId: string): Promise<{
  eventTypes: DashboardEventType[];
  slug: string;
}> {
  // Jalankan kedua query secara bersamaan, bukan satu per satu
  const [eventTypes, userRecord] = await Promise.all([
    prisma.eventType.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        locationType: true,
        platform: true,
        locationDetails: true,
        isActive: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { slug: true },
    }),
  ]);

  return {
    eventTypes: eventTypes as DashboardEventType[],
    // Fallback ke string kosong jika slug tidak ditemukan (seharusnya tidak terjadi)
    slug: userRecord?.slug ?? "",
  };
}

// ─── getDashboardStats ────────────────────────────────────────────────────────
// Quick stats untuk strip angka di atas dashboard:
//   todayCount  — booking hari ini (WIB), status bukan CANCELLED
//   weekCount   — booking minggu ini (Senin–sekarang, WIB), status bukan CANCELLED
//   pendingCount — booking menunggu konfirmasi (status PENDING, semua waktu)
export async function getDashboardStats(userId: string): Promise<{
  todayCount: number;
  weekCount: number;
  pendingCount: number;
}> {
  const now = new Date();
  // Shift ke WIB agar operasi getUTC* membaca nilai waktu WIB
  const wib = toWIB(now);

  // Batas awal hari ini dalam WIB → konversi ke UTC untuk query Prisma
  const todayStartWib = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
  const todayStartUtc = new Date(todayStartWib.getTime() - 7 * 60 * 60 * 1000);
  const tomorrowUtc   = new Date(todayStartUtc.getTime() + 24 * 60 * 60 * 1000);

  // Batas awal Senin minggu ini dalam WIB
  const dow = wib.getUTCDay(); // 0=Min, 1=Sen, ..., 6=Sab
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const weekStartWib = new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() - daysFromMon));
  const weekStartUtc = new Date(weekStartWib.getTime() - 7 * 60 * 60 * 1000);

  const [todayCount, weekCount, pendingCount] = await Promise.all([
    prisma.booking.count({
      where: {
        eventType: { userId },
        startTime: { gte: todayStartUtc, lt: tomorrowUtc },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.booking.count({
      where: {
        eventType: { userId },
        startTime: { gte: weekStartUtc },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.booking.count({
      where: { eventType: { userId }, status: "PENDING" },
    }),
  ]);

  return { todayCount, weekCount, pendingCount };
}

// ─── getSettingsData ──────────────────────────────────────────────────────────
// Mengambil data profil user untuk halaman pengaturan.
// Return type ditulis eksplisit karena Prisma Client belum di-generate ulang
// untuk field bio/useCaseType yang baru ditambahkan.
export async function getSettingsData(userId: string): Promise<{
  name: string;
  email: string;
  slug: string;
  waNumber: string | null;
  bio: string | null;
} | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma.user.findUnique as any)({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      slug: true,
      waNumber: true,
      bio: true,
    },
  });
}

// ─── getAvailabilityData ──────────────────────────────────────────────────────
// Mengambil data ketersediaan user dari DB.
// Mengembalikan array kosong (bukan null) jika belum pernah diatur.
export async function getAvailabilityData(userId: string) {
  return prisma.availability.findMany({
    where: { userId },
    orderBy: { dayOfWeek: "asc" },
    select: {
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      isActive: true,
    },
  });
}
