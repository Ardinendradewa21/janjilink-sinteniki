// ─── Halaman Detail Meeting ────────────────────────────────────────────────────
// Route: /dashboard/bookings/[id]
//
// Menampilkan satu booking lengkap + fitur meeting layer:
//  1. Info booking (tamu, event, waktu, status)
//  2. MeetingNotes — autosave textarea
//  3. ActionItems — checklist optimistic
//  4. ExportSummaryButton — salin ringkasan ke clipboard
//
// Arsitektur:
//  - Server component: fetch data (getRequiredUserId + getBookingDetail)
//  - Client components: MeetingNotes, ActionItems, ExportSummaryButton
//  - formatWIBShort dari shared lib (src/lib/date.ts) — tidak duplikasi

import { ArrowLeft, Clock3, Mail, MapPin, Phone, Video } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getRequiredUserId } from "@/lib/session";
import { formatWIBShort } from "@/lib/date";
import { getBookingDetail } from "@/server/queries/bookings";
import { MeetingNotes } from "@/components/dashboard/MeetingNotes";
import { ActionItems } from "@/components/dashboard/ActionItems";
import { ExportSummaryButton } from "@/components/dashboard/ExportSummaryButton";

// ─── Warna badge status ────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:   { bg: "bg-amber-100",   text: "text-amber-700",   label: "Menunggu"      },
  CONFIRMED: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Dikonfirmasi"  },
  CANCELLED: { bg: "bg-red-100",     text: "text-red-700",     label: "Dibatalkan"    },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;

  const userId  = await getRequiredUserId();

  // Fetch booking lengkap dari query layer — termasuk note + action items
  const booking = await getBookingDetail(id);

  if (!booking) notFound();

  // Pastikan booking ini milik user yang sedang login
  if (booking.eventType.userId !== userId) redirect("/dashboard/bookings");

  const { day, date, time } = formatWIBShort(booking.startTime);
  const { time: endTime }   = formatWIBShort(booking.endTime);
  const statusStyle = STATUS_STYLES[booking.status] ?? STATUS_STYLES.PENDING;

  return (
    <div className="space-y-6">
      {/* Navigasi balik */}
      <Link
        href="/dashboard/bookings"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar booking
      </Link>

      {/* ── Info Booking ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-stone-900">
              {booking.inviteeName}
            </h1>
            <p className="mt-0.5 text-sm text-stone-500">
              {booking.eventType.title} · {booking.eventType.duration} menit
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}
          >
            {statusStyle.label}
          </span>
        </div>

        {/* Waktu + lokasi */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <span className="inline-flex items-center gap-2 text-sm text-stone-600">
            <Clock3 className="h-4 w-4 text-stone-400" />
            {day}, {date} · {time}–{endTime} WIB
          </span>
          <span className="inline-flex items-center gap-2 text-sm text-stone-600">
            {booking.eventType.locationType === "ONLINE" ? (
              <Video className="h-4 w-4 text-stone-400" />
            ) : (
              <MapPin className="h-4 w-4 text-stone-400" />
            )}
            {booking.eventType.locationType === "ONLINE"
              ? (booking.eventType.platform ?? "Online")
              : (booking.eventType.locationDetails ?? "Offline")}
          </span>
        </div>

        {/* Kontak tamu */}
        <div className="mt-4 flex flex-wrap gap-4 border-t border-stone-100 pt-4">
          <a
            href={`mailto:${booking.inviteeEmail}`}
            className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-emerald-700"
          >
            <Mail className="h-4 w-4 text-stone-400" />
            {booking.inviteeEmail}
          </a>
          {booking.inviteeWa && (
            <a
              href={`https://wa.me/${booking.inviteeWa.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-emerald-700"
            >
              <Phone className="h-4 w-4 text-stone-400" />
              {booking.inviteeWa}
            </a>
          )}
        </div>
      </div>

      {/* ── Meeting Layer ────────────────────────────────────────────────── */}
      {booking.status === "CANCELLED" ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-8 text-center">
          <p className="text-sm text-stone-400">
            Meeting ini dibatalkan. Catatan tidak tersedia.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Catatan meeting — client component, autosave onBlur */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <MeetingNotes
              bookingId={booking.id}
              initialContent={booking.meetingNote?.content ?? ""}
            />
          </div>

          {/* Action items — client component, optimistic update */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <ActionItems
              bookingId={booking.id}
              initialItems={booking.actionItems}
            />
          </div>
        </div>
      )}

      {/* Tombol export ringkasan */}
      {booking.status !== "CANCELLED" && (
        <div className="flex justify-end">
          <ExportSummaryButton
            booking={{
              inviteeName: booking.inviteeName,
              startTime:   booking.startTime,
              endTime:     booking.endTime,
              eventType:   { title: booking.eventType.title },
            }}
            noteContent={booking.meetingNote?.content ?? ""}
            actionItems={booking.actionItems}
          />
        </div>
      )}
    </div>
  );
}
