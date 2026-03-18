// ─── Halaman Detail Meeting ────────────────────────────────────────────────────
// Route: /dashboard/bookings/[id]
//
// Menampilkan semua informasi satu booking + fitur meeting layer:
//  1. Info booking (tamu, event, waktu, status)
//  2. MeetingNotes — textarea catatan dengan autosave
//  3. ActionItems — checklist tindakan yang disepakati
//  4. ExportSummaryButton — salin ringkasan ke clipboard
//
// Halaman ini adalah server component. Data di-fetch di server,
// lalu di-pass ke client components (MeetingNotes, ActionItems, Export).
// Pemisahan ini penting: server component tidak bisa pakai hooks React,
// sedangkan client component tidak bisa langsung query Prisma.

import { ArrowLeft, Clock3, Mail, MapPin, Phone, Video } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MeetingNotes } from "@/components/dashboard/MeetingNotes";
import { ActionItems } from "@/components/dashboard/ActionItems";
import { ExportSummaryButton } from "@/components/dashboard/ExportSummaryButton";

// ─── Konstanta untuk format tanggal ──────────────────────────────────────────
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];
const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Konversi UTC dari DB ke objek waktu WIB untuk ditampilkan
function formatWIB(utcDate: Date) {
  const wibMs = utcDate.getTime() + 7 * 60 * 60 * 1000;
  const wib = new Date(wibMs);
  return {
    day: DAY_NAMES[wib.getUTCDay()],
    date: `${wib.getUTCDate()} ${MONTH_NAMES[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`,
    time: `${wib.getUTCHours().toString().padStart(2, "0")}:${wib.getUTCMinutes().toString().padStart(2, "0")}`,
  };
}

// Warna badge status booking
const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:   { bg: "bg-amber-100",   text: "text-amber-700",   label: "Menunggu" },
  CONFIRMED: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Dikonfirmasi" },
  CANCELLED: { bg: "bg-red-100",     text: "text-red-700",     label: "Dibatalkan" },
};

// ─── Props halaman (params dari URL) ─────────────────────────────────────────
interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: Props) {
  // Resolve dynamic route params (Next.js 15+ async params)
  const { id } = await params;

  // Verifikasi session login
  const session = await auth();
  let userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId && session?.user?.email) {
    const u = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    userId = u?.id;
  }
  if (!userId) redirect("/login");

  // ─── Fetch booking + semua relasi yang dibutuhkan ─────────────────────────
  // Include: eventType (untuk verifikasi kepemilikan + info tampilan),
  //          meetingNote (catatan yang sudah ada), actionItems (daftar tindakan)
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      eventType: {
        select: {
          title: true,
          duration: true,
          locationType: true,
          platform: true,
          locationDetails: true,
          // userId dipakai untuk memverifikasi kepemilikan
          userId: true,
        },
      },
      meetingNote: { select: { content: true } },
      actionItems: {
        orderBy: { order: "asc" },
        select: { id: true, text: true, isDone: true, order: true },
      },
    },
  });

  // 404 jika booking tidak ditemukan
  if (!booking) notFound();

  // Pastikan booking ini benar-benar milik user yang login
  // Jika bukan, kembalikan ke daftar booking (bukan 404, agar tidak bocor info)
  if (booking.eventType.userId !== userId) redirect("/dashboard/bookings");

  const { day, date, time } = formatWIB(booking.startTime);
  const { time: endTime } = formatWIB(booking.endTime);
  const statusStyle = STATUS_STYLES[booking.status] ?? STATUS_STYLES.PENDING;

  return (
    <div className="space-y-6">
      {/* ── Navigasi balik ──────────────────────────────────────────────── */}
      <Link
        href="/dashboard/bookings"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Kembali ke daftar booking
      </Link>

      {/* ── Kartu info booking ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        {/* Header: nama tamu + badge status */}
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

        {/* Detail: waktu + lokasi */}
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
      {/* Section ini hanya aktif jika meeting sudah dikonfirmasi/selesai.
          Untuk PENDING/CANCELLED, tampilkan pesan informatif saja. */}
      {booking.status === "CANCELLED" ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-8 text-center">
          <p className="text-sm text-stone-400">
            Meeting ini dibatalkan. Catatan tidak tersedia.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Catatan Meeting ─────────────────────────────────────── */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            {/* MeetingNotes: client component dengan autosave */}
            <MeetingNotes
              bookingId={booking.id}
              initialContent={booking.meetingNote?.content ?? ""}
            />
          </div>

          {/* ── Action Items ────────────────────────────────────────── */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            {/* ActionItems: client component dengan optimistic updates */}
            <ActionItems
              bookingId={booking.id}
              initialItems={booking.actionItems}
            />
          </div>
        </div>
      )}

      {/* ── Tombol export ringkasan ──────────────────────────────────── */}
      {/* Hanya tampil jika meeting tidak dibatalkan */}
      {booking.status !== "CANCELLED" && (
        <div className="flex justify-end">
          <ExportSummaryButton
            booking={{
              inviteeName: booking.inviteeName,
              startTime: booking.startTime,
              endTime: booking.endTime,
              eventType: { title: booking.eventType.title },
            }}
            noteContent={booking.meetingNote?.content ?? ""}
            actionItems={booking.actionItems}
          />
        </div>
      )}
    </div>
  );
}
