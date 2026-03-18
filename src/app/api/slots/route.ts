import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ─── GET /api/slots ──────────────────────────────────────────────────────────
// Endpoint publik untuk mengambil daftar slot waktu tersedia pada tanggal tertentu.
// Query params: username (slug), eventTypeId, date (YYYY-MM-DD)
// Response: { slots: ["09:00", "09:30", ...] } dalam format WIB.
//
// Urutan logika:
// 1. Cari user berdasarkan slug
// 2. Cek event type milik user ini dan masih aktif
// 3. Ambil data Availability dari DB untuk hari tsb → fallback ke default jika belum diatur
// 4. Generate semua slot dari jam buka ke jam tutup sesuai durasi event
// 5. Filter slot yang sudah dipesan (booking status != CANCELLED)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  const eventTypeId = searchParams.get("eventTypeId");
  const date = searchParams.get("date"); // format: YYYY-MM-DD

  // Validasi parameter wajib
  if (!username || !eventTypeId || !date) {
    return NextResponse.json({ error: "Parameter tidak lengkap." }, { status: 400 });
  }

  // Validasi format tanggal YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Format tanggal tidak valid." }, { status: 400 });
  }

  const [yearStr, monthStr, dayStr] = date.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  // Cari user berdasarkan slug (URL publik)
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ slug: username }, { email: { startsWith: `${username}@` } }],
    },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
  }

  // Pastikan event type milik user ini dan masih aktif
  const eventType = await prisma.eventType.findFirst({
    where: { id: eventTypeId, userId: user.id, isActive: true },
    select: { duration: true },
  });

  if (!eventType) {
    return NextResponse.json({ error: "Event type tidak ditemukan." }, { status: 404 });
  }

  // ─── Hitung hari dalam seminggu ─────────────────────────────────────────
  // new Date(year, month-1, day) → lokal, cukup untuk getDay() karena tidak ada operasi UTC
  const targetDate = new Date(year, month - 1, day);
  const dayOfWeek = targetDate.getDay(); // 0=Minggu, 1=Senin, ..., 6=Sabtu

  // ─── Baca ketersediaan dari database ────────────────────────────────────
  // Cari record Availability untuk hari ini milik user ini
  const availability = await prisma.availability.findFirst({
    where: { userId: user.id, dayOfWeek },
    select: { isActive: true, startTime: true, endTime: true },
  });

  // Tentukan jam buka/tutup dan apakah hari ini tersedia:
  // - Jika ada data di DB → gunakan data tersebut (user sudah atur di /dashboard/availability)
  // - Jika belum ada data → fallback default: Senin-Sabtu 09:00-17:00, Minggu libur
  let isAvailable: boolean;
  let startTimeStr: string;
  let endTimeStr: string;

  if (availability) {
    // Gunakan pengaturan ketersediaan yang sudah disimpan user
    isAvailable = availability.isActive;
    startTimeStr = availability.startTime;
    endTimeStr = availability.endTime;
  } else {
    // Default: Minggu (dayOfWeek===0) libur, hari lain 09:00-17:00
    isAvailable = dayOfWeek !== 0;
    startTimeStr = "09:00";
    endTimeStr = "17:00";
  }

  // Jika hari tidak tersedia, langsung kembalikan array kosong
  if (!isAvailable) {
    return NextResponse.json({ slots: [] });
  }

  // ─── Generate semua slot waktu ──────────────────────────────────────────
  // Hasilkan daftar slot dari jam buka sampai jam tutup berdasarkan durasi event
  const [startHour, startMin] = startTimeStr.split(":").map(Number);
  const [endHour, endMin] = endTimeStr.split(":").map(Number);

  const slots: string[] = [];
  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Loop: tambah slot selama masih ada cukup waktu untuk 1 sesi lagi
  while (currentMinutes + eventType.duration <= endMinutes) {
    const h = Math.floor(currentMinutes / 60).toString().padStart(2, "0");
    const m = (currentMinutes % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    currentMinutes += eventType.duration;
  }

  // ─── Filter slot yang sudah dipesan ─────────────────────────────────────
  // Ambil booking pada tanggal tersebut (konversi WIB midnight ke UTC untuk query DB)
  const startOfDayWIB = new Date(`${date}T00:00:00+07:00`);
  const endOfDayWIB = new Date(`${date}T23:59:59+07:00`);

  const existingBookings = await prisma.booking.findMany({
    where: {
      eventTypeId,
      // Hanya booking yang belum dibatalkan yang mengunci slot
      status: { not: "CANCELLED" },
      startTime: {
        gte: startOfDayWIB,
        lte: endOfDayWIB,
      },
    },
    select: { startTime: true },
  });

  // Konversi startTime booking dari UTC ke WIB agar bisa dibandingkan dengan slot string
  const bookedTimes = new Set(
    existingBookings.map((b) => {
      // Tambahkan offset WIB (+7 jam) lalu baca jam:menit UTC sebagai representasi WIB
      const wibMs = b.startTime.getTime() + 7 * 60 * 60 * 1000;
      const wibDate = new Date(wibMs);
      const h = wibDate.getUTCHours().toString().padStart(2, "0");
      const m = wibDate.getUTCMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    }),
  );

  // Kembalikan hanya slot yang belum dipesan
  const availableSlots = slots.filter((s) => !bookedTimes.has(s));

  return NextResponse.json({ slots: availableSlots });
}
