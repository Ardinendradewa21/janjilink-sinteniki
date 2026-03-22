"use client";

// ─── BookingCalendar ──────────────────────────────────────────────────────────
// Komponen utama alur booking publik. Dirender di /[username]/[eventTypeId].
//
// State machine 3 langkah (mobile-first):
//   'date'  → pilih tanggal (kalender full-width)
//   'time'  → pilih slot waktu (muncul setelah tanggal dipilih)
//   'form'  → isi data diri + kirim booking
//
// Di mobile: setiap langkah animasi slide dari bawah (Framer Motion).
// Di desktop: langkah 'date' dan 'time' tampil berdampingan (grid 2 kolom).
//
// Setelah booking berhasil → redirect ke halaman /confirmed (bukan inline success)
// karena halaman confirmed punya konten lengkap + tombol WA deep link.

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3, Loader2, MapPin, Video } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { createBooking } from "@/server/actions/booking";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Types ───────────────────────────────────────────────────────────────────

type EventTypeInfo = {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  locationType: "ONLINE" | "OFFLINE";
  platform: string | null;
  locationDetails: string | null;
};

type HostInfo = {
  name: string | null;
  image: string | null;
};

type BookingCalendarProps = {
  username: string;
  eventType: EventTypeInfo;
  host: HostInfo;
};

// State machine: 3 langkah booking
type Step = "date" | "time" | "form";

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const PLATFORM_LABELS: Record<string, string> = {
  ZOOM: "Zoom",
  GOOGLE_MEET: "Google Meet",
  JITSI: "Jitsi",
  OTHER: "Online",
};

// Label langkah untuk StepIndicator
const STEP_LABELS: Record<Step, string> = {
  date: "Pilih Tanggal",
  time: "Pilih Waktu",
  form: "Data Kamu",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name?: string | null) {
  if (!name) return "JL";
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function formatDateLabel(date: Date) {
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function toDateStr(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Animasi slide ────────────────────────────────────────────────────────────
// Setiap langkah masuk dari bawah dan keluar ke atas.
// Memberi efek "layer" seperti navigasi native app.
const slideVariants = {
  enter:  { opacity: 0, y: 24 },
  center: { opacity: 1, y: 0  },
  exit:   { opacity: 0, y: -16 },
};
const slideTransition = { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const };

// ─── StepIndicator ───────────────────────────────────────────────────────────
// Progress dots di atas kalender — tunjukkan user ada di langkah berapa.
// Dot aktif: emerald, dot selesai: emerald lebih pucat, dot belum: stone.
function StepIndicator({ step }: { step: Step }) {
  const steps: Step[] = ["date", "time", "form"];
  const currentIdx = steps.indexOf(step);

  return (
    <div className="mb-5 flex items-center justify-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          {/* Dot */}
          <div
            className={[
              "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all",
              i < currentIdx
                ? "bg-emerald-200 text-emerald-700"      // langkah selesai
                : i === currentIdx
                ? "bg-emerald-600 text-white shadow-md"  // langkah aktif
                : "bg-stone-200 text-stone-400",          // langkah belum
            ].join(" ")}
          >
            {i < currentIdx ? "✓" : i + 1}
          </div>
          {/* Label hanya untuk langkah aktif */}
          {i === currentIdx && (
            <span className="text-xs font-semibold text-stone-700">
              {STEP_LABELS[s]}
            </span>
          )}
          {/* Garis penghubung antar dot */}
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 w-8 rounded-full transition-colors ${
                i < currentIdx ? "bg-emerald-300" : "bg-stone-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── HostInfoBar ─────────────────────────────────────────────────────────────
// Bar ringkas di atas halaman: avatar host + nama event + durasi + lokasi.
// Dirender di semua langkah agar user tidak kehilangan konteks.
function HostInfoBar({
  host,
  username,
  eventType,
}: {
  host: HostInfo;
  username: string;
  eventType: EventTypeInfo;
}) {
  const locationLabel =
    eventType.locationType === "ONLINE"
      ? (PLATFORM_LABELS[eventType.platform ?? ""] ?? "Online")
      : (eventType.locationDetails ?? "Offline");

  const mapsUrl =
    eventType.locationType === "OFFLINE" && eventType.locationDetails
      ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(eventType.locationDetails)}`
      : null;

  return (
    <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      {/* Avatar + nama host */}
      <div className="mb-3 flex items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-emerald-100 text-sm font-semibold text-emerald-700">
            {getInitials(host.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-xs text-stone-500">Dengan</p>
          <p className="truncate text-sm font-semibold text-stone-900">
            {host.name ?? username}
          </p>
        </div>
      </div>

      {/* Nama event */}
      <p className="mb-2 text-base font-bold text-stone-900">{eventType.title}</p>

      {/* Durasi + lokasi */}
      <div className="flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm text-stone-600">
          <Clock3 className="h-3.5 w-3.5 text-emerald-600" />
          {eventType.duration} menit
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm text-stone-600">
          {eventType.locationType === "ONLINE" ? (
            <Video className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
          )}
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:text-emerald-700 hover:underline"
            >
              {locationLabel}
            </a>
          ) : (
            <span>{locationLabel}</span>
          )}
        </span>
      </div>
    </div>
  );
}

// ─── CalendarPanel ────────────────────────────────────────────────────────────
// Kalender full-width untuk memilih tanggal.
// Tombol hari yang sudah lewat atau hari Minggu di-disable.
function CalendarPanel({
  today,
  currentMonth,
  selectedDate,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
}: {
  today: Date;
  currentMonth: Date;
  selectedDate: Date | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: Date) => void;
}) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const isDisabledDay = (day: number) => {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    // Hari Minggu (0) tidak tersedia secara default
    return d < today || d.getDay() === 0;
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      {/* Navigasi bulan */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-stone-900">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            disabled={isCurrentMonth}
            className="tap-scale flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="tap-scale flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Header hari */}
      <div className="mb-1 grid grid-cols-7">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-stone-400">
            {d}
          </div>
        ))}
      </div>

      {/* Grid tanggal — tombol minimum 44px (aspek rasio + padding) */}
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const disabled = isDisabledDay(day);
          const date = new Date(year, month, day);
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          const isToday = today.toDateString() === date.toDateString();

          return (
            <button
              key={day}
              type="button"
              onClick={() => !disabled && onSelectDate(date)}
              disabled={disabled}
              className={[
                // aspect-square membuat tiap sel kotak agar touch target cukup besar
                "tap-scale flex aspect-square w-full items-center justify-center rounded-full text-sm font-medium transition-colors",
                disabled
                  ? "cursor-not-allowed text-stone-300"
                  : "cursor-pointer hover:bg-emerald-50 hover:text-emerald-700",
                isSelected ? "bg-emerald-600! text-white! hover:bg-emerald-700!" : "",
                isToday && !isSelected ? "border border-emerald-400 text-emerald-700" : "",
              ].filter(Boolean).join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── TimeSlotsPanel ───────────────────────────────────────────────────────────
// Grid slot waktu 3 kolom — tampil setelah user pilih tanggal.
// Setiap slot adalah tombol full-width dengan minimum height 44px.
function TimeSlotsPanel({
  selectedDate,
  slots,
  loading,
  onSelectTime,
}: {
  selectedDate: Date | null;
  slots: string[];
  loading: boolean;
  onSelectTime: (time: string) => void;
}) {
  if (!selectedDate) return null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="mb-4 text-sm font-semibold text-stone-700">
        Slot tersedia — {formatDateLabel(selectedDate)}
      </p>

      {loading ? (
        // Skeleton loading: 6 kotak abu untuk simulasi slot yang sedang dimuat
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-11 animate-pulse rounded-xl bg-stone-100"
            />
          ))}
        </div>
      ) : slots.length === 0 ? (
        // Empty state: tidak ada slot di tanggal ini
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm font-medium text-stone-600">Tidak ada slot tersedia</p>
          <p className="text-xs text-stone-400">Pilih tanggal lain.</p>
        </div>
      ) : (
        // Grid 3 kolom: lebih compact dari list, mudah dijangkau jempol
        <div className="grid grid-cols-3 gap-2">
          {slots.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => onSelectTime(slot)}
              className="tap-scale flex h-11 items-center justify-center rounded-xl border border-stone-200 text-sm font-medium text-stone-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {slot}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── BookingForm ──────────────────────────────────────────────────────────────
// Form isi data diri tamu sebelum submit booking.
// WhatsApp jadi field WAJIB (lebih Indonesia), email OPSIONAL.
function BookingForm({
  eventTypeId,
  selectedDate,
  selectedTime,
  onBack,
  onSuccess,
}: {
  eventTypeId: string;
  selectedDate: Date;
  selectedTime: string;
  onBack: () => void;
  onSuccess: (bookingId: string) => void;
}) {
  const [name, setName] = useState("");
  const [wa, setWa] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validasi WA wajib diisi
    if (!wa.trim()) {
      setError("Nomor WhatsApp wajib diisi agar host bisa menghubungi kamu.");
      return;
    }

    const dateStr = toDateStr(selectedDate);
    const formData = new FormData();
    formData.set("eventTypeId", eventTypeId);
    formData.set("inviteeName", name);
    // Email opsional: jika kosong, tetap kirim string kosong
    // Server action booking.ts sudah menerima string kosong untuk email
    formData.set("inviteeEmail", email || `wa.${wa.replace(/\D/g, "")}@janjilink.local`);
    formData.set("inviteeWa", wa);
    formData.set("startTime", `${dateStr}T${selectedTime}`);

    startTransition(async () => {
      try {
        const result = await createBooking(formData);
        if (result.success) onSuccess(result.bookingId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
      }
    });
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      {/* Ringkasan waktu yang dipilih */}
      <div className="mb-5 rounded-xl bg-emerald-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
          Waktu yang dipilih
        </p>
        <p className="mt-1 font-semibold text-stone-900">{formatDateLabel(selectedDate)}</p>
        <p className="text-sm text-stone-600">{selectedTime} WIB</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nama lengkap — wajib */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-700">
            Nama lengkap <span className="text-red-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama kamu"
            required
            disabled={isPending}
            className="h-12 border-stone-200 focus-visible:ring-emerald-500"
          />
        </div>

        {/* Nomor WhatsApp — WAJIB (lebih Indonesia, primary contact) */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-700">
            Nomor WhatsApp <span className="text-red-500">*</span>
          </label>
          <Input
            type="tel"
            value={wa}
            onChange={(e) => setWa(e.target.value)}
            placeholder="08xxxxxxxxxx"
            required
            disabled={isPending}
            className="h-12 border-stone-200 focus-visible:ring-emerald-500"
          />
          <p className="mt-1 text-xs text-stone-400">
            Host akan menghubungi kamu via WA untuk koordinasi.
          </p>
        </div>

        {/* Email — opsional */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-700">
            Email{" "}
            <span className="text-xs font-normal text-stone-400">(opsional, untuk notifikasi)</span>
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            disabled={isPending}
            className="h-12 border-stone-200 focus-visible:ring-emerald-500"
          />
        </div>

        {/* Pesan error */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Tombol kembali + submit */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onBack}
            disabled={isPending}
            className="tap-scale flex h-12 items-center gap-1.5 rounded-xl border border-stone-200 px-4 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          {/* Tombol utama: full-width, tinggi 48px (mudah dijangkau jempol) */}
          <Button
            type="submit"
            disabled={isPending || !name.trim() || !wa.trim()}
            className="h-12 flex-1 bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              "Konfirmasi Janji"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── BookingCalendar (Main Component) ────────────────────────────────────────

export function BookingCalendar({ username, eventType, host }: BookingCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // State kalender
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // State machine: langkah saat ini
  const [step, setStep] = useState<Step>("date");

  // Muat slot waktu tersedia setiap kali tanggal berubah
  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    setSlots([]);

    const dateStr = toDateStr(selectedDate);
    fetch(`/api/slots?username=${username}&eventTypeId=${eventType.id}&date=${dateStr}`)
      .then((r) => r.json())
      .then((data) => setSlots(Array.isArray(data.slots) ? data.slots : []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, username, eventType.id]);

  // Handler: pilih tanggal → pindah ke langkah 'time'
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setStep("time");
  };

  // Handler: pilih slot → pindah ke langkah 'form'
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep("form");
  };

  // Handler: kembali dari 'time' ke 'date'
  const handleBackToDate = () => {
    setStep("date");
  };

  // Handler: kembali dari 'form' ke 'time'
  const handleBackToTime = () => {
    setStep("time");
    setSelectedTime(null);
  };

  // Handler: booking berhasil → redirect ke halaman konfirmasi
  const handleBookingSuccess = (bookingId: string) => {
    window.location.href = `/${username}/${eventType.id}/confirmed?id=${bookingId}`;
  };

  return (
    <div className="mx-auto w-full max-w-lg space-y-0 lg:max-w-none">
      {/* Info host selalu tampil di atas semua langkah */}
      <HostInfoBar host={host} username={username} eventType={eventType} />

      {/* Indikator langkah */}
      <StepIndicator step={step} />

      {/* Area konten langkah — animasi slide */}
      <AnimatePresence mode="wait">
        {/* ─── Langkah 1: Pilih Tanggal ─────────────────────────────────── */}
        {step === "date" && (
          <motion.div
            key="date"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
          >
            <CalendarPanel
              today={today}
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onPrevMonth={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
              }
              onNextMonth={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
              }
              onSelectDate={handleDateSelect}
            />
          </motion.div>
        )}

        {/* ─── Langkah 2: Pilih Waktu ───────────────────────────────────── */}
        {step === "time" && selectedDate && (
          <motion.div
            key="time"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="space-y-3"
          >
            {/* Tombol ganti tanggal */}
            <button
              type="button"
              onClick={handleBackToDate}
              className="tap-scale inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Ganti tanggal
            </button>

            <TimeSlotsPanel
              selectedDate={selectedDate}
              slots={slots}
              loading={loadingSlots}
              onSelectTime={handleTimeSelect}
            />
          </motion.div>
        )}

        {/* ─── Langkah 3: Form Data Diri ────────────────────────────────── */}
        {step === "form" && selectedDate && selectedTime && (
          <motion.div
            key="form"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
          >
            <BookingForm
              eventTypeId={eventType.id}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onBack={handleBackToTime}
              onSuccess={handleBookingSuccess}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
