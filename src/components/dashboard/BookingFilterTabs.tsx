"use client";

// ─── BookingFilterTabs ────────────────────────────────────────────────────────
// Client component untuk filter booking berdasarkan status.
// Menerima semua data dari server, filtering dilakukan di sisi client (tanpa re-fetch).
//
// Tab filter: Semua / Menunggu / Dikonfirmasi / Dibatalkan
// Di dalam setiap tab, booking tetap dikelompokkan: Mendatang & Selesai.

import { useState } from "react";
import { CalendarX2, Clock3, Mail, MapPin, NotebookPen, Phone, Video } from "lucide-react";
import Link from "next/link";
import { formatWIBShort } from "@/lib/date";
import { BookingActions } from "@/components/dashboard/BookingActions";
import { type BookingListItem } from "@/server/queries/bookings";

// ─── Konstanta ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:   { bg: "bg-amber-100",   text: "text-amber-700",   label: "Menunggu"     },
  CONFIRMED: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Dikonfirmasi" },
  CANCELLED: { bg: "bg-red-100",     text: "text-red-700",     label: "Dibatalkan"   },
};

type FilterKey = "ALL" | "PENDING" | "CONFIRMED" | "CANCELLED";

const TABS: { key: FilterKey; label: string }[] = [
  { key: "ALL",       label: "Semua"       },
  { key: "PENDING",   label: "Menunggu"    },
  { key: "CONFIRMED", label: "Dikonfirmasi"},
  { key: "CANCELLED", label: "Dibatalkan"  },
];

// ─── BookingFilterTabs ────────────────────────────────────────────────────────

export function BookingFilterTabs({ bookings }: { bookings: BookingListItem[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");

  const filtered =
    activeFilter === "ALL"
      ? bookings
      : bookings.filter((b) => b.status === activeFilter);

  const now = new Date();
  const upcoming = filtered.filter((b) => b.startTime >= now);
  const past     = filtered.filter((b) => b.startTime <  now);

  // Hitung jumlah per status untuk label badge
  const counts: Record<FilterKey, number> = {
    ALL:       bookings.length,
    PENDING:   bookings.filter((b) => b.status === "PENDING").length,
    CONFIRMED: bookings.filter((b) => b.status === "CONFIRMED").length,
    CANCELLED: bookings.filter((b) => b.status === "CANCELLED").length,
  };

  return (
    <div className="space-y-5">
      {/* ─── Tab Bar ──────────────────────────────────────────────────────────── */}
      <div className="scrollbar-none flex gap-1 overflow-x-auto rounded-xl border border-stone-200 bg-white p-1.5 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`tap-scale flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === tab.key
                ? "bg-stone-900 text-white"
                : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none ${
                  activeFilter === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-stone-100 text-stone-500"
                }`}
              >
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Konten Filter ────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center shadow-sm">
          <CalendarX2 className="mb-4 h-10 w-10 text-stone-300" />
          <p className="text-lg font-semibold text-stone-900">Tidak ada booking</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">
            {activeFilter === "ALL"
              ? "Booking dari tamu akan muncul di sini setelah mereka mengisi jadwal."
              : `Tidak ada booking dengan status "${TABS.find((t) => t.key === activeFilter)?.label}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <BookingGroup title="Mendatang" bookings={upcoming} variant="upcoming" />
          )}
          {past.length > 0 && (
            <BookingGroup title="Selesai" bookings={past} variant="past" />
          )}
        </div>
      )}
    </div>
  );
}

// ─── BookingGroup ─────────────────────────────────────────────────────────────

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

function BookingCard({
  booking,
  isPast,
}: {
  booking: BookingListItem;
  isPast: boolean;
}) {
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

          {/* Tombol konfirmasi/batal — tampil berdasarkan STATUS, bukan waktu */}
          {booking.status !== "CANCELLED" && (
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
          {booking.inviteeEmail && (
            <a
              href={`mailto:${booking.inviteeEmail}`}
              className="flex items-center gap-2 text-stone-600 hover:text-emerald-700"
            >
              <Mail className="h-3.5 w-3.5 shrink-0 text-stone-400" />
              <span className="max-w-45 truncate">{booking.inviteeEmail}</span>
            </a>
          )}
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
