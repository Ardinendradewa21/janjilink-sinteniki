import { CalendarX2, Clock3, Mail, MapPin, Phone, Video, NotebookPen } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { BookingActions } from "@/components/dashboard/BookingActions";

// ─── Konstanta nama bulan dan hari dalam Bahasa Indonesia ────────────────────
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// ─── formatWIB ──────────────────────────────────────────────────────────────
// Mengkonversi waktu UTC dari database ke format WIB (UTC+7) untuk ditampilkan.
function formatWIB(utcDate: Date) {
  const wibMs = utcDate.getTime() + 7 * 60 * 60 * 1000;
  const wib = new Date(wibMs);
  return {
    day: DAY_NAMES[wib.getUTCDay()],
    date: `${wib.getUTCDate()} ${MONTH_NAMES[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`,
    time: `${wib.getUTCHours().toString().padStart(2, "0")}:${wib.getUTCMinutes().toString().padStart(2, "0")}`,
  };
}

// ─── Warna badge berdasarkan status booking ──────────────────────────────────
// PENDING: kuning (menunggu), CONFIRMED: hijau (dikonfirmasi), CANCELLED: merah (batal)
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-amber-100", text: "text-amber-700", label: "Menunggu" },
  CONFIRMED: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Dikonfirmasi" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700", label: "Dibatalkan" },
};

// ─── DashboardBookingsPage ───────────────────────────────────────────────────
// Halaman daftar semua booking milik host, dikelompokkan: Mendatang & Selesai.
// Setiap booking menampilkan info tamu, waktu, status, dan tombol aksi.
// Route: /dashboard/bookings
export default async function DashboardBookingsPage() {
  // Pastikan user sudah login
  const session = await auth();
  if (!session) redirect("/");

  // Ambil userId dari session (dengan fallback email lookup)
  let userId = (session.user as { id?: string } | undefined)?.id;
  if (!userId && session.user?.email) {
    const u = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    userId = u?.id;
  }
  if (!userId) redirect("/");

  const now = new Date();

  // Ambil semua booking milik user ini, termasuk status dan info event type
  const bookings = await prisma.booking.findMany({
    where: {
      eventType: { userId },
    },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      inviteeName: true,
      inviteeEmail: true,
      inviteeWa: true,
      // Status booking: PENDING, CONFIRMED, atau CANCELLED
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
  });

  // Pisahkan booking mendatang dan yang sudah lewat
  const upcoming = bookings.filter((b) => b.startTime >= now);
  const past = bookings.filter((b) => b.startTime < now);

  return (
    <section className="space-y-6">
      {/* Header halaman */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xl font-semibold text-stone-900">Semua Booking</p>
        <p className="mt-1 text-sm text-stone-500">
          {upcoming.length} mendatang · {past.length} selesai
        </p>
      </div>

      {bookings.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Grup booking mendatang */}
          {upcoming.length > 0 && (
            <BookingGroup title="Mendatang" bookings={upcoming} variant="upcoming" />
          )}
          {/* Grup booking yang sudah lewat */}
          {past.length > 0 && (
            <BookingGroup title="Selesai" bookings={past} variant="past" />
          )}
        </>
      )}
    </section>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────────────
// Tampilan kosong saat belum ada booking sama sekali.
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center shadow-sm">
      <CalendarX2 className="mb-4 h-10 w-10 text-stone-300" />
      <p className="text-lg font-semibold text-stone-900">Belum ada booking</p>
      <p className="mt-2 text-sm leading-relaxed text-stone-500">
        Booking dari tamu akan muncul di sini setelah mereka mengisi jadwal.
      </p>
    </div>
  );
}

// ─── Tipe data booking untuk komponen ────────────────────────────────────────
type BookingItem = {
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

// ─── BookingGroup ────────────────────────────────────────────────────────────
// Kelompokkan booking berdasarkan kategori (Mendatang / Selesai).
function BookingGroup({
  title,
  bookings,
  variant,
}: {
  title: string;
  bookings: BookingItem[];
  variant: "upcoming" | "past";
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">{title}</h2>
      {bookings.map((b) => (
        <BookingCard key={b.id} booking={b} isPast={variant === "past"} />
      ))}
    </div>
  );
}

// ─── BookingCard ─────────────────────────────────────────────────────────────
// Kartu individual untuk setiap booking.
// Menampilkan: nama tamu, event title, waktu WIB, lokasi, status badge, + tombol aksi.
function BookingCard({ booking, isPast }: { booking: BookingItem; isPast: boolean }) {
  const { day, date, time } = formatWIB(booking.startTime);
  const { time: endTime } = formatWIB(booking.endTime);

  // Ambil style badge berdasarkan status booking
  const statusStyle = STATUS_STYLES[booking.status] ?? STATUS_STYLES.PENDING;

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
        isPast ? "border-stone-200 opacity-70" : "border-stone-200"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Kolom kiri: info tamu + event */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* Dot hijau hanya untuk booking mendatang yang belum dibatalkan */}
            {!isPast && booking.status !== "CANCELLED" && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            )}
            <p className="truncate font-semibold text-stone-900">{booking.inviteeName}</p>
            {/* Badge status booking (Menunggu / Dikonfirmasi / Dibatalkan) */}
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
            >
              {statusStyle.label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-stone-500">{booking.eventType.title}</p>

          {/* Waktu dan lokasi */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-sm text-stone-600">
              <Clock3 className="h-3.5 w-3.5 text-stone-400" />
              {day}, {date} · {time}–{endTime} WIB
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-stone-600">
              {booking.eventType.locationType === "ONLINE" ? (
                <Video className="h-3.5 w-3.5 text-stone-400" />
              ) : (
                <MapPin className="h-3.5 w-3.5 text-stone-400" />
              )}
              {booking.eventType.locationType === "ONLINE" ? "Online" : "Offline"}
            </span>
          </div>

          {/* Tombol aksi: Konfirmasi / Batalkan (hanya untuk booking mendatang) */}
          {!isPast && (
            <div className="mt-3">
              <BookingActions bookingId={booking.id} status={booking.status} />
            </div>
          )}

          {/* Link ke halaman catatan + action items meeting.
              Tampil di semua booking (mendatang maupun selesai) kecuali CANCELLED. */}
          {booking.status !== "CANCELLED" && (
            <div className="mt-2">
              <Link
                href={`/dashboard/bookings/${booking.id}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 transition-colors hover:text-emerald-700"
              >
                <NotebookPen className="h-3.5 w-3.5" />
                Catatan &amp; Action Items
              </Link>
            </div>
          )}
        </div>

        {/* Kolom kanan: kontak tamu (email + WhatsApp) */}
        <div className="shrink-0 space-y-1.5 text-sm">
          <a
            href={`mailto:${booking.inviteeEmail}`}
            className="flex items-center gap-2 text-stone-600 hover:text-emerald-700"
          >
            <Mail className="h-3.5 w-3.5 shrink-0 text-stone-400" />
            <span className="max-w-45 truncate">{booking.inviteeEmail}</span>
          </a>
          {booking.inviteeWa && (
            <a
              href={`https://wa.me/${booking.inviteeWa.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-stone-600 hover:text-emerald-700"
            >
              <Phone className="h-3.5 w-3.5 shrink-0 text-stone-400" />
              <span>{booking.inviteeWa}</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
