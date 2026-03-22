import { CalendarCheck, Clock3, MapPin, MessageCircle, Video } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";

type ConfirmedPageProps = {
  // Next.js 16: params dan searchParams keduanya adalah Promise
  params: Promise<{ username: string; eventTypeId: string }>;
  searchParams: Promise<{ id?: string }>;
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
  // Await kedua Promise sekaligus agar tidak sequential
  const [{ username, eventTypeId }, { id: bookingId }] = await Promise.all([
    params,
    searchParams,
  ]);

  // bookingId diambil dari query string ?id=... setelah booking berhasil dibuat
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
            // Ambil juga waNumber untuk tombol deep link WA
            select: { name: true, waNumber: true },
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
        {/* Ikon: warna amber menandakan "sedang menunggu konfirmasi host",
            lebih akurat dari hijau yang biasanya berarti "sudah selesai/dikonfirmasi" */}
        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <CalendarCheck className="h-10 w-10 text-amber-600" />
          </div>
        </div>

        {/* Heading
            PENTING: Status booking saat ini adalah PENDING (menunggu konfirmasi host),
            bukan CONFIRMED. Jadi judul harus jujur — "Permintaan Terkirim",
            bukan "Booking Dikonfirmasi" yang menyesatkan tamu. */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-stone-900">Permintaan Terkirim!</h1>
          <p className="mt-2 leading-relaxed text-stone-500">
            Hei <span className="font-semibold text-stone-700">{booking.inviteeName}</span>,
            permintaan jadwalmu sudah diterima dan sedang menunggu konfirmasi dari host.
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

          {/* Info email: beri tahu tamu bahwa mereka akan dapat email update selanjutnya */}
          <div className="border-t border-stone-100 bg-amber-50 px-6 py-4">
            <p className="text-sm text-amber-700">
              ⏳ Menunggu konfirmasi host. Update akan dikirim ke{" "}
              <span className="font-medium">{booking.inviteeEmail}</span>
            </p>
          </div>
        </div>

        {/* Tombol aksi: WA deep link + kembali ke profil
            Tombol WA hanya tampil jika host mengisi nomor WA di pengaturan profil.
            Deep link wa.me akan membuka WhatsApp langsung ke chat dengan host,
            dengan pesan yang sudah terisi otomatis (tamu tinggal kirim).
            Format nomor: hilangkan semua non-digit, lalu tambah prefix 62 jika belum ada. */}
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {booking.eventType.user.waNumber && (() => {
            // Bersihkan nomor: hapus non-digit, ganti awalan 0 dengan 62
            const digits = booking.eventType.user.waNumber.replace(/\D/g, "");
            const normalized = digits.startsWith("0")
              ? "62" + digits.slice(1)
              : digits.startsWith("62")
              ? digits
              : "62" + digits;

            // Pesan WA yang sudah terisi otomatis — tamu tinggal kirim
            const waText = encodeURIComponent(
              `Halo ${booking.eventType.user.name ?? username}, saya ${booking.inviteeName}. Saya sudah booking "${booking.eventType.title}" pada ${day}, ${dateStr} pukul ${time} WIB. Mohon konfirmasinya ya!`
            );

            return (
              <Button asChild className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                <a
                  href={`https://wa.me/${normalized}?text=${waText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" />
                  Hubungi Host via WhatsApp
                </a>
              </Button>
            );
          })()}

          <Button asChild variant="outline" className="border-stone-200">
            <Link href={`/${username}`}>Kembali ke profil</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
