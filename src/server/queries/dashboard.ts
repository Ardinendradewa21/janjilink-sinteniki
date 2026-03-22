// ─── Server Queries: Dashboard ────────────────────────────────────────────────
// Query untuk halaman utama dashboard (/dashboard).
//
// Dipisahkan dari halaman agar:
//  - Halaman utama hanya berisi logika layout dan props ke komponen
//  - Query bisa diubah/di-cache tanpa menyentuh JSX halaman
//
// Lihat juga: src/server/queries/bookings.ts, src/server/queries/analytics.ts

import prisma from "@/lib/prisma";

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

// ─── getSettingsData ──────────────────────────────────────────────────────────
// Mengambil data profil user untuk halaman pengaturan.
export async function getSettingsData(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      slug: true,
      // Nomor WA host — opsional, ditampilkan di form pengaturan
      waNumber: true,
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
