"use client";

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

type Step = "calendar" | "form";

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const PLATFORM_LABELS: Record<string, string> = {
  ZOOM: "Zoom",
  GOOGLE_MEET: "Google Meet",
  JITSI: "Jitsi",
  OTHER: "Online",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name?: string | null) {
  if (!name) return "JL";
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "JL";
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function formatDateLabel(date: Date) {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function toDateStr(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoPanel({
  host,
  username,
  eventType,
  selectedDate,
  selectedTime,
}: {
  host: HostInfo;
  username: string;
  eventType: EventTypeInfo;
  selectedDate: Date | null;
  selectedTime: string | null;
}) {
  // Label lokasi: platform nama untuk online, nama tempat untuk offline
  const locationLabel =
    eventType.locationType === "ONLINE"
      ? (PLATFORM_LABELS[eventType.platform ?? ""] ?? "Online")
      : (eventType.locationDetails ?? "Offline");

  // Buat URL untuk membuka lokasi offline di OpenStreetMap.
  // Kita encode alamat lengkap sebagai parameter query pencarian OSM.
  // Contoh: https://www.openstreetmap.org/search?query=Kopi+Kenangan+Jakarta
  const mapsUrl =
    eventType.locationType === "OFFLINE" && eventType.locationDetails
      ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(eventType.locationDetails)}`
      : null;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 lg:w-72 lg:shrink-0 lg:rounded-none lg:rounded-l-2xl lg:border-0 lg:border-r lg:p-8">
      {/* Profil host: avatar + nama */}
      <div className="mb-6 flex items-center gap-3">
        <Avatar className="h-11 w-11">
          <AvatarImage src={host.image ?? undefined} alt={host.name ?? username} />
          <AvatarFallback className="bg-emerald-100 text-sm font-semibold text-emerald-700">
            {getInitials(host.name)}
          </AvatarFallback>
        </Avatar>
        <p className="text-sm font-medium text-stone-600">{host.name ?? username}</p>
      </div>

      {/* Judul dan deskripsi event */}
      <h1 className="text-xl font-bold leading-tight text-stone-900">{eventType.title}</h1>

      {eventType.description && (
        <p className="mt-2 text-sm leading-relaxed text-stone-500">{eventType.description}</p>
      )}

      <div className="mt-5 space-y-2.5">
        {/* Durasi meeting dalam menit */}
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <Clock3 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{eventType.duration} menit</span>
        </div>

        {/* Lokasi: untuk ONLINE tampilkan nama platform,
            untuk OFFLINE tampilkan nama tempat + link ke OpenStreetMap */}
        <div className="flex items-start gap-2 text-sm text-stone-600">
          {eventType.locationType === "ONLINE" ? (
            <Video className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          )}

          {mapsUrl ? (
            // Jika ada alamat lokasi offline, buat link yang bisa diklik
            // untuk membuka di OpenStreetMap di tab baru
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="leading-snug underline-offset-2 hover:text-emerald-700 hover:underline"
              title="Buka di OpenStreetMap"
            >
              {locationLabel}
            </a>
          ) : (
            <span>{locationLabel}</span>
          )}
        </div>
      </div>

      {/* Waktu terpilih */}
      {selectedDate && selectedTime && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Waktu dipilih
          </p>
          <p className="mt-1.5 font-semibold text-stone-900">{formatDateLabel(selectedDate)}</p>
          <p className="text-sm text-stone-600">{selectedTime} WIB</p>
        </motion.div>
      )}
    </div>
  );
}

// ─── Calendar Panel ───────────────────────────────────────────────────────────

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

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  const isDisabledDay = (day: number) => {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    if (d < today) return true;
    return d.getDay() === 0; // Minggu
  };

  return (
    <div>
      {/* Month navigation */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-stone-900">
          {MONTH_NAMES[month]} {year}
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            disabled={isCurrentMonth}
            className="flex h-8 w-8 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="mb-1 grid grid-cols-7">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-stone-400">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {/* Padding kosong sebelum hari pertama */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const disabled = isDisabledDay(day);
          const date = new Date(year, month, day);
          const isSelected =
            selectedDate?.toDateString() === date.toDateString();
          const isToday = today.toDateString() === date.toDateString();

          return (
            <button
              key={day}
              type="button"
              onClick={() => !disabled && onSelectDate(date)}
              disabled={disabled}
              className={[
                "flex aspect-square w-full items-center justify-center rounded-full text-sm font-medium transition-colors",
                disabled
                  ? "cursor-not-allowed text-stone-300"
                  : "cursor-pointer hover:bg-emerald-50 hover:text-emerald-700",
                isSelected
                  ? "bg-emerald-600! text-white! hover:bg-emerald-700!"
                  : "",
                isToday && !isSelected
                  ? "border border-emerald-400 text-emerald-700"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Time Slot Panel ──────────────────────────────────────────────────────────

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
  if (!selectedDate) {
    return (
      <div className="flex h-full min-h-40 items-center justify-center">
        <p className="text-sm text-stone-400">← Pilih tanggal di kalender</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex h-full min-h-40 flex-col items-center justify-center gap-1">
        <p className="text-sm font-medium text-stone-600">Tidak ada slot tersedia</p>
        <p className="text-xs text-stone-400">Coba pilih tanggal lain.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-stone-700">
        {formatDateLabel(selectedDate)}
      </p>
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {slots.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => onSelectTime(slot)}
            className="w-full rounded-xl border border-stone-200 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 active:scale-[0.98]"
          >
            {slot} WIB
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Booking Form ─────────────────────────────────────────────────────────────

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
  const [email, setEmail] = useState("");
  const [wa, setWa] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const dateStr = toDateStr(selectedDate);
    const startTimeStr = `${dateStr}T${selectedTime}`;

    const formData = new FormData();
    formData.set("eventTypeId", eventTypeId);
    formData.set("inviteeName", name);
    formData.set("inviteeEmail", email);
    formData.set("inviteeWa", wa);
    formData.set("startTime", startTimeStr);

    startTransition(async () => {
      try {
        const result = await createBooking(formData);
        if (result.success) {
          onSuccess(result.bookingId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan. Silakan coba lagi.");
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Ganti waktu
      </button>

      <h2 className="mb-1 text-lg font-bold text-stone-900">Detail Anda</h2>
      <p className="mb-6 text-sm text-stone-500">
        Isi formulir berikut untuk konfirmasi booking.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-700">
            Nama lengkap <span className="text-red-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masukkan nama lengkap Anda"
            required
            disabled={isPending}
            className="border-stone-200 focus-visible:ring-emerald-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-700">
            Alamat email <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            required
            disabled={isPending}
            className="border-stone-200 focus-visible:ring-emerald-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-700">
            Nomor WhatsApp
            <span className="ml-1.5 text-xs font-normal text-stone-400">(opsional, untuk reminder)</span>
          </label>
          <Input
            value={wa}
            onChange={(e) => setWa(e.target.value)}
            placeholder="08xxxxxxxxxx"
            disabled={isPending}
            className="border-stone-200 focus-visible:ring-emerald-500"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isPending || !name.trim() || !email.trim()}
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Memproses...
            </>
          ) : (
            "Konfirmasi Booking"
          )}
        </Button>
      </form>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BookingCalendar({ username, eventType, host }: BookingCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState<Step>("calendar");

  // Muat slot saat tanggal dipilih
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

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setStep("calendar");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep("form");
  };

  const handleBackToCalendar = () => {
    setStep("calendar");
    setSelectedTime(null);
  };

  const handleBookingSuccess = (bookingId: string) => {
    window.location.href = `/${username}/${eventType.id}/confirmed?id=${bookingId}`;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm lg:flex">
      {/* Panel kiri: info event */}
      <InfoPanel
        host={host}
        username={username}
        eventType={eventType}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
      />

      {/* Panel kanan: kalender / form */}
      <div className="flex-1 p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {step === "calendar" && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="grid gap-8 sm:grid-cols-2"
            >
              {/* Kalender */}
              <CalendarPanel
                today={today}
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                onPrevMonth={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
                  )
                }
                onNextMonth={() =>
                  setCurrentMonth(
                    new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
                  )
                }
                onSelectDate={handleDateSelect}
              />

              {/* Time slots */}
              <TimeSlotsPanel
                selectedDate={selectedDate}
                slots={slots}
                loading={loadingSlots}
                onSelectTime={handleTimeSelect}
              />
            </motion.div>
          )}

          {step === "form" && selectedDate && selectedTime && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <BookingForm
                eventTypeId={eventType.id}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onBack={handleBackToCalendar}
                onSuccess={handleBookingSuccess}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
