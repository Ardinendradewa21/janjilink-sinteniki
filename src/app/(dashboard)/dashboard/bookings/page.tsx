// ─── DashboardBookingsPage ────────────────────────────────────────────────────
// Daftar semua booking milik host, dikelompokkan: Mendatang & Selesai.
// Route: /dashboard/bookings
//
// Pola arsitektur:
//  - getRequiredUserId()    → dari src/lib/session.ts (tidak perlu tulis ulang)
//  - getBookingsForUser()   → dari src/server/queries/bookings.ts (tidak inline)
//  - formatWIBShort()       → dari src/lib/date.ts (tidak duplikasi)
//  - BookingActions         → client component (butuh useTransition)
// Halaman ini sendiri hanya bertanggung jawab untuk layout dan render.

import { CalendarX2, Clock3, Mail, MapPin, NotebookPen, Phone, Video } from "lucide-react";
import Link from "next/link";
import { getRequiredUserId } from "@/lib/session";
import { formatWIBShort } from "@/lib/date";
import { getBookingsForUser, type BookingListItem } from "@/server/queries/bookings";
import { BookingActions } from "@/components/dashboard/BookingActions";

// ─── Warna badge status booking ──────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:   { bg: "bg-amber-100",   text: "text-amber-700",   label: "Menunggu"      },
  CONFIRMED: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Dikonfirmasi"  },
  CANCELLED: { bg: "bg-red-100",     text: "text-red-700",     label: "Dibatalkan"    },
};

export default async function DashboardBookingsPage() {
  const userId = await getRequiredUserId();

  // Ambil semua booking dari query layer — tidak ada Prisma di sini
  const bookings = await getBookingsForUser(userId);

  const now = new Date();
  const upcoming = bookings.filter((b) => b.startTime >= now);
  const past     = bookings.filter((b) => b.startTime <  now);

  return (
    <section className="space-y-6">
      {/* Header */}
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
          {upcoming.length > 0 && (
            <BookingGroup title="Mendatang" bookings={upcoming} variant="upcoming" />
          )}
          {past.length > 0 && (
            <BookingGroup title="Selesai" bookings={past} variant="past" />
          )}
        </>
      )}
    </section>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
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

// ─── BookingGroup ─────────────────────────────────────────────────────────────
// Kelompok booking: "Mendatang" atau "Selesai"
function BookingGroup({
  title,
  bookings,
  variant,
}: {
  title: string;
  bookings: BookingListItem[];
  variant: "upcoming" | "past";
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
        {title}
      </h2>
      {bookings.map((b) => (
        <BookingCard key={b.id} booking={b} isPast={variant === "past"} />
      ))}
    </div>
  );
}

// ─── BookingCard ──────────────────────────────────────────────────────────────
// Kartu individual booking.
// UI dibagi dua kolom: kiri (info + aksi), kanan (kontak tamu).
function BookingCard({
  booking,
  isPast,
}: {
  booking: BookingListItem;
  isPast: boolean;
}) {
  // formatWIBShort dari shared lib — tidak duplikasi di sini
  const { day, date, time } = formatWIBShort(booking.startTime);
  const { time: endTime }   = formatWIBShort(booking.endTime);
  const statusStyle = STATUS_STYLES[booking.status] ?? STATUS_STYLES.PENDING;

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
        isPast ? "border-stone-200 opacity-70" : "border-stone-200"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Kolom kiri: info booking */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {!isPast && booking.status !== "CANCELLED" && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            )}
            <p className="truncate font-semibold text-stone-900">
              {booking.inviteeName}
            </p>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
            >
              {statusStyle.label}
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-stone-500">
            {booking.eventType.title}
          </p>

          {/* Waktu + lokasi */}
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

          {/* Tombol konfirmasi/batal — hanya booking mendatang */}
          {!isPast && (
            <div className="mt-3">
              <BookingActions bookingId={booking.id} status={booking.status} />
            </div>
          )}

          {/* Link ke halaman catatan meeting */}
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

        {/* Kolom kanan: kontak tamu */}
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
