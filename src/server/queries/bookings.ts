// ─── Server Queries: Bookings ─────────────────────────────────────────────────
// Kumpulan query database untuk data booking.
//
// Mengapa dipisahkan dari page component?
// Sebelumnya query Prisma ditulis langsung di dalam halaman (page.tsx).
// Ini menyebabkan halaman sulit dibaca karena mencampur logika pengambilan data
// dengan logika tampilan. Dengan memisahkannya ke sini:
//   - Halaman bisa fokus pada layout dan rendering
//   - Query bisa dipakai ulang di halaman lain atau diuji secara terpisah
//   - Lebih mudah diganti implementasinya (misal: pindah ke cache atau API lain)
//
// Konvensi penamaan:
//   get* = query read-only (SELECT)
//   Tidak ada mutasi di file ini — mutasi ada di server/actions/

import prisma from "@/lib/prisma";

// ─── Tipe Data ────────────────────────────────────────────────────────────────

// Satu booking lengkap untuk halaman daftar bookings
export type BookingListItem = {
  id: string;
  inviteeName: string;
  inviteeEmail: string;
  inviteeWa: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  startTime: Date;
  endTime: Date;
  eventType: {
    id: string;
    title: string;
    duration: number;
    locationType: string;
    platform: string | null;
  };
};

// Satu booking lengkap untuk halaman detail meeting (termasuk catatan + action items)
export type BookingDetail = {
  id: string;
  inviteeName: string;
  inviteeEmail: string;
  inviteeWa: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  startTime: Date;
  endTime: Date;
  eventType: {
    title: string;
    duration: number;
    locationType: string;
    platform: string | null;
    locationDetails: string | null;
    userId: string;
  };
  meetingNote: { content: string } | null;
  actionItems: {
    id: string;
    text: string;
    isDone: boolean;
    order: number;
  }[];
};

// ─── getBookingsForUser ───────────────────────────────────────────────────────
// Mengambil semua booking milik seorang host, diurutkan dari yang paling awal.
// Digunakan oleh halaman /dashboard/bookings.
export async function getBookingsForUser(userId: string): Promise<BookingListItem[]> {
  return prisma.booking.findMany({
    where: {
      // Filter: hanya booking dari event type milik user ini
      eventType: { userId },
    },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      inviteeName: true,
      inviteeEmail: true,
      inviteeWa: true,
      status: true,
      startTime: true,
      endTime: true,
      eventType: {
        select: {
          id: true,
          title: true,
          duration: true,
          locationType: true,
          platform: true,
        },
      },
    },
  }) as Promise<BookingListItem[]>;
}

// ─── getBookingDetail ─────────────────────────────────────────────────────────
// Mengambil satu booking lengkap beserta catatan meeting dan action items-nya.
// Digunakan oleh halaman /dashboard/bookings/[id].
// Mengembalikan null jika tidak ditemukan.
export async function getBookingDetail(bookingId: string): Promise<BookingDetail | null> {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      eventType: {
        select: {
          title: true,
          duration: true,
          locationType: true,
          platform: true,
          locationDetails: true,
          // userId untuk verifikasi kepemilikan di halaman
          userId: true,
        },
      },
      meetingNote: { select: { content: true } },
      actionItems: {
        orderBy: { order: "asc" },
        select: { id: true, text: true, isDone: true, order: true },
      },
    },
  }) as Promise<BookingDetail | null>;
}
