import { CalendarCheck, Clock3, MapPin, Video } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";

type ConfirmedPageProps = {
  params: {
    username: string;
    eventTypeId: string;
  };
  searchParams: {
    id?: string;
  };
};

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const PLATFORM_LABELS: Record<string, string> = {
  ZOOM: "Zoom",
  GOOGLE_MEET: "Google Meet",
  JITSI: "Jitsi",
  OTHER: "Online",
};

function formatWIB(utcDate: Date) {
  // Konversi UTC ke WIB (+7 jam)
  const wibMs = utcDate.getTime() + 7 * 60 * 60 * 1000;
  const wib = new Date(wibMs);
  const day = DAY_NAMES[wib.getUTCDay()];
  const date = wib.getUTCDate();
  const month = MONTH_NAMES[wib.getUTCMonth()];
  const year = wib.getUTCFullYear();
  const h = wib.getUTCHours().toString().padStart(2, "0");
  const m = wib.getUTCMinutes().toString().padStart(2, "0");
  return { day, dateStr: `${date} ${month} ${year}`, time: `${h}:${m}` };
}

export default async function ConfirmedPage({ params, searchParams }: ConfirmedPageProps) {
  const { username, eventTypeId } = params;
  const bookingId = searchParams.id;

  if (!bookingId) notFound();

  // Ambil data booking beserta event type-nya
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      inviteeName: true,
      inviteeEmail: true,
      startTime: true,
      endTime: true,
      eventType: {
        select: {
          id: true,
          title: true,
          duration: true,
          locationType: true,
          platform: true,
          locationDetails: true,
          user: {
            select: { name: true },
          },
        },
      },
    },
  });

  // Pastikan booking ini milik event type dan username yang benar
  if (
    !booking ||
    booking.eventType.id !== eventTypeId
  ) {
    notFound();
  }

  const { day, dateStr, time } = formatWIB(booking.startTime);
  const { time: endTime } = formatWIB(booking.endTime);

  const locationLabel =
    booking.eventType.locationType === "ONLINE"
      ? (PLATFORM_LABELS[booking.eventType.platform ?? ""] ?? "Online")
      : (booking.eventType.locationDetails ?? "Offline");

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-16 sm:px-6">
      <div className="mx-auto w-full max-w-lg">
        {/* Ikon sukses */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CalendarCheck className="h-10 w-10 text-emerald-600" />
          </div>
        </div>

        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-stone-900">Booking Dikonfirmasi!</h1>
          <p className="mt-2 leading-relaxed text-stone-500">
            Hei <span className="font-semibold text-stone-700">{booking.inviteeName}</span>, jadwal
            Anda sudah tercatat. Sampai jumpa!
          </p>
        </div>

        {/* Detail kartu booking */}
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          {/* Header kartu */}
          <div className="border-b border-stone-100 bg-emerald-50 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Detail Pertemuan
            </p>
            <p className="mt-1 text-lg font-bold text-stone-900">{booking.eventType.title}</p>
          </div>

          {/* Body kartu */}
          <div className="space-y-4 px-6 py-5">
            {/* Tanggal & waktu */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100">
                <Clock3 className="h-4 w-4 text-stone-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Waktu
                </p>
                <p className="mt-0.5 font-semibold text-stone-900">{day}, {dateStr}</p>
                <p className="text-sm text-stone-600">
                  {time} – {endTime} WIB
                </p>
              </div>
            </div>

            {/* Lokasi */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100">
                {booking.eventType.locationType === "ONLINE" ? (
                  <Video className="h-4 w-4 text-stone-600" />
                ) : (
                  <MapPin className="h-4 w-4 text-stone-600" />
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  {booking.eventType.locationType === "ONLINE" ? "Platform" : "Lokasi"}
                </p>
                <p className="mt-0.5 font-semibold text-stone-900">{locationLabel}</p>
                {booking.eventType.locationType === "ONLINE" && (
                  <p className="text-sm text-stone-500">Link akan dikirimkan sebelum pertemuan</p>
                )}
              </div>
            </div>

            {/* Dengan siapa */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100">
                <CalendarCheck className="h-4 w-4 text-stone-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                  Dengan
                </p>
                <p className="mt-0.5 font-semibold text-stone-900">
                  {booking.eventType.user.name ?? username}
                </p>
              </div>
            </div>
          </div>

          {/* Email info */}
          <div className="border-t border-stone-100 bg-stone-50 px-6 py-4">
            <p className="text-sm text-stone-500">
              Konfirmasi akan dikirim ke{" "}
              <span className="font-medium text-stone-700">{booking.inviteeEmail}</span>
            </p>
          </div>
        </div>

        {/* Tombol kembali ke profil */}
        <div className="mt-6 text-center">
          <Button asChild variant="outline" className="border-stone-200">
            <Link href={`/${username}`}>Kembali ke profil</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
