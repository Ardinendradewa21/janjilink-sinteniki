// ─── Server Queries: Analytics ────────────────────────────────────────────────
// Kumpulan query Prisma untuk menghasilkan data statistik dashboard analytics.
// Semua query hanya baca (SELECT), tidak ada mutasi data.
// Digunakan oleh halaman /dashboard/analytics (server component).

import prisma from "@/lib/prisma";

// ─── Tipe data yang dikembalikan ──────────────────────────────────────────────

export type MonthlyBooking = {
  // Format "YYYY-MM", contoh "2026-03"
  month: string;
  // Label tampilan, contoh "Mar 2026"
  label: string;
  total: number;
  confirmed: number;
  cancelled: number;
};

export type EventTypeStats = {
  id: string;
  title: string;
  total: number;
  confirmed: number;
  cancelled: number;
};

export type HourStats = {
  // Jam dalam format HH, contoh "09", "14"
  hour: string;
  count: number;
};

export type AnalyticsData = {
  // Total booking sepanjang waktu
  totalBookings: number;
  // Jumlah booking bulan ini
  bookingsThisMonth: number;
  // Completion rate: CONFIRMED / (total - CANCELLED) * 100
  completionRate: number;
  // Booking per bulan (6 bulan terakhir, untuk grafik batang)
  monthly: MonthlyBooking[];
  // Performa per event type
  byEventType: EventTypeStats[];
  // Jam paling populer untuk booking (top 5)
  peakHours: HourStats[];
};

// ─── Nama bulan dalam Bahasa Indonesia ───────────────────────────────────────
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

// ─── getAnalytics ─────────────────────────────────────────────────────────────
// Mengambil semua data analitik untuk satu user.
// Dipanggil dari server component halaman analytics.
export async function getAnalytics(userId: string): Promise<AnalyticsData> {
  // Ambil semua booking milik user ini sekaligus dengan satu query.
  // Lebih efisien daripada banyak query terpisah.
  const bookings = await prisma.booking.findMany({
    where: {
      eventType: { userId },
    },
    select: {
      id: true,
      status: true,
      startTime: true,
      eventTypeId: true,
      eventType: {
        select: { title: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const now = new Date();

  // ─── Hitung total dan booking bulan ini ─────────────────────────────────────
  const totalBookings = bookings.length;

  // Bulan ini dalam WIB: bandingkan tahun dan bulan kalender WIB
  const nowWib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const bookingsThisMonth = bookings.filter((b) => {
    const bWib = new Date(b.startTime.getTime() + 7 * 60 * 60 * 1000);
    return (
      bWib.getUTCFullYear() === nowWib.getUTCFullYear() &&
      bWib.getUTCMonth() === nowWib.getUTCMonth()
    );
  }).length;

  // ─── Hitung completion rate ──────────────────────────────────────────────────
  // Definisi: dari booking yang tidak dibatalkan, berapa persen yang dikonfirmasi?
  // Booking PENDING belum dihitung sebagai gagal, jadi kita fokus pada
  // yang sudah punya keputusan final: CONFIRMED vs CANCELLED.
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
  const cancelled = bookings.filter((b) => b.status === "CANCELLED").length;
  const decided = confirmed + cancelled;
  const completionRate = decided > 0 ? Math.round((confirmed / decided) * 100) : 0;

  // ─── Booking per bulan (6 bulan terakhir) ───────────────────────────────────
  // Buat array 6 bulan mundur dari bulan ini, lalu isi dengan data booking.
  const monthly: MonthlyBooking[] = [];
  for (let i = 5; i >= 0; i--) {
    // Hitung tahun dan bulan target (dalam UTC karena JS Date month adalah 0-indexed)
    const target = new Date(
      Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth() - i, 1)
    );
    const year = target.getUTCFullYear();
    const month = target.getUTCMonth(); // 0-indexed

    // Format key "YYYY-MM" untuk grouping
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    const label = `${MONTH_LABELS[month]} ${year}`;

    // Filter booking yang jatuh di bulan dan tahun ini (dalam WIB)
    const inMonth = bookings.filter((b) => {
      const bWib = new Date(b.startTime.getTime() + 7 * 60 * 60 * 1000);
      return bWib.getUTCFullYear() === year && bWib.getUTCMonth() === month;
    });

    monthly.push({
      month: key,
      label,
      total: inMonth.length,
      confirmed: inMonth.filter((b) => b.status === "CONFIRMED").length,
      cancelled: inMonth.filter((b) => b.status === "CANCELLED").length,
    });
  }

  // ─── Performa per event type ─────────────────────────────────────────────────
  // Kelompokkan booking berdasarkan eventTypeId, hitung total + status.
  const eventMap = new Map<string, EventTypeStats>();
  for (const b of bookings) {
    const existing = eventMap.get(b.eventTypeId);
    if (existing) {
      existing.total += 1;
      if (b.status === "CONFIRMED") existing.confirmed += 1;
      if (b.status === "CANCELLED") existing.cancelled += 1;
    } else {
      eventMap.set(b.eventTypeId, {
        id: b.eventTypeId,
        title: b.eventType.title,
        total: 1,
        confirmed: b.status === "CONFIRMED" ? 1 : 0,
        cancelled: b.status === "CANCELLED" ? 1 : 0,
      });
    }
  }
  // Urutkan dari yang paling banyak booking
  const byEventType = Array.from(eventMap.values()).sort(
    (a, b) => b.total - a.total
  );

  // ─── Jam paling populer (peak hours) ────────────────────────────────────────
  // Hitung berapa kali setiap jam (WIB) muncul di seluruh booking.
  // Hanya booking CONFIRMED dan PENDING yang dihitung (bukan CANCELLED).
  const hourMap = new Map<number, number>();
  for (const b of bookings) {
    if (b.status === "CANCELLED") continue;
    const bWib = new Date(b.startTime.getTime() + 7 * 60 * 60 * 1000);
    const hour = bWib.getUTCHours();
    hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
  }
  // Ambil 5 jam teratas, urutkan jam kecil ke besar
  const peakHours = Array.from(hourMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .sort((a, b) => a[0] - b[0])
    .map(([hour, count]) => ({
      hour: `${String(hour).padStart(2, "0")}:00`,
      count,
    }));

  return {
    totalBookings,
    bookingsThisMonth,
    completionRate,
    monthly,
    byEventType,
    peakHours,
  };
}
