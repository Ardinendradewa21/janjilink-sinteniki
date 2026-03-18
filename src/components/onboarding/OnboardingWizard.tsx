"use client";

// ─── OnboardingWizard ─────────────────────────────────────────────────────────
// Komponen wizard 3 langkah untuk onboarding user baru.
// Step 1: Profil (nama + slug URL)
// Step 2: Jam Kerja (ketersediaan per hari)
// Step 3: Event Pertama (template meeting)
//
// Pola state:
//   - currentStep: 1 | 2 | 3 — langkah yang sedang ditampilkan
//   - error: pesan error dari server action
//   - isPending: apakah server action sedang dieksekusi (disable tombol)
//   - avail: state 7 hari ketersediaan (dikontrol dari sini karena form-nya dinamis)
//
// Setelah step 3 berhasil, wizard memanggil completeOnboarding() yang menandai
// onboardingCompleted = true di DB lalu redirect ke /dashboard.

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle2, ChevronRight, Loader2, User, Zap } from "lucide-react";

import {
  completeOnboarding,
  saveAvailabilityStep,
  saveEventStep,
  saveProfileStep,
} from "@/server/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DurationPicker } from "@/components/ui/DurationPicker";

// ─── Konstanta ─────────────────────────────────────────────────────────────────

// Label hari dalam Bahasa Indonesia, indeks sesuai JS Date.getDay() (0 = Minggu)
const DAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

// Default ketersediaan: Senin–Sabtu aktif 09:00–17:00, Minggu libur.
// Indeks 0 = Minggu sesuai dayOfWeek di skema Prisma.
const DEFAULT_AVAIL = [
  { isActive: false, start: "09:00", end: "17:00" }, // Minggu
  { isActive: true, start: "09:00", end: "17:00" },  // Senin
  { isActive: true, start: "09:00", end: "17:00" },  // Selasa
  { isActive: true, start: "09:00", end: "17:00" },  // Rabu
  { isActive: true, start: "09:00", end: "17:00" },  // Kamis
  { isActive: true, start: "09:00", end: "17:00" },  // Jumat
  { isActive: true, start: "09:00", end: "17:00" },  // Sabtu
];

// Konfigurasi tiap step: ikon, judul, deskripsi
const STEPS = [
  {
    icon: User,
    label: "Profil",
    title: "Halo! Perkenalkan diri kamu",
    desc: "Nama dan link unikmu — ini yang akan dilihat tamu saat membuat janji.",
  },
  {
    icon: Calendar,
    label: "Jam Kerja",
    title: "Kapan kamu bisa ditemui?",
    desc: "Atur hari dan jam kerja default-mu. Bisa diubah kapan saja nanti.",
  },
  {
    icon: Zap,
    label: "Event",
    title: "Buat event pertamamu",
    desc: "Template meeting yang akan kamu tawarkan ke tamu.",
  },
];

// ─── Animasi Framer Motion ────────────────────────────────────────────────────
// Slide dari kanan saat masuk, ke kiri saat keluar — efek "wizard melangkah maju"
const slideVariants = {
  enter: { x: 40, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -40, opacity: 0 },
};

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  initialName: string;   // Nama user saat ini (dari DB) untuk pre-fill input nama
  initialSlug: string;   // Slug saat ini — dikosongkan jika masih berupa CUID default
}

// ─── Komponen Utama ────────────────────────────────────────────────────────────
export function OnboardingWizard({ initialName, initialSlug }: Props) {
  // State wizard
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);

  // useTransition agar UI tidak freeze saat menunggu server action
  const [isPending, startTransition] = useTransition();

  // State ketersediaan: array 7 hari yang dikontrol secara lokal.
  // Tidak memakai FormData biasa karena nilai dicontrol via state (toggle + input jam).
  const [avail, setAvail] = useState(DEFAULT_AVAIL);

  // Preview slug diupdate real-time saat user mengetik
  const [slugPreview, setSlugPreview] = useState(initialSlug);

  // ─── Fungsi toggle + update availability ───────────────────────────────────
  function toggleDay(index: number) {
    setAvail((prev) =>
      prev.map((d, i) => (i === index ? { ...d, isActive: !d.isActive } : d))
    );
  }

  function updateTime(index: number, field: "start" | "end", value: string) {
    setAvail((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  }

  // ─── Handler slug input ─────────────────────────────────────────────────────
  // Normalisasi otomatis: ubah ke lowercase, hapus karakter selain huruf/angka/strip
  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    const clean = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")   // hapus karakter tidak valid
      .replace(/--+/g, "-");         // strip ganda → single strip
    setSlugPreview(clean);
    e.target.value = clean;
  }

  // ─── Submit Step 1: Profil ─────────────────────────────────────────────────
  function handleStep1(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveProfileStep(null, formData);
      if (result && "error" in result) {
        setError(result.error);
      } else {
        setCurrentStep(2);
      }
    });
  }

  // ─── Submit Step 2: Ketersediaan ───────────────────────────────────────────
  // FormData dibangun manual dari state `avail` karena input waktu dikontrol via state,
  // bukan langsung dari elemen form DOM (sehingga new FormData(e.target) tidak cukup).
  function handleStep2(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    avail.forEach((day, i) => {
      if (day.isActive) formData.set(`day_${i}_active`, "on");
      formData.set(`day_${i}_start`, day.start);
      formData.set(`day_${i}_end`, day.end);
    });

    startTransition(async () => {
      const result = await saveAvailabilityStep(null, formData);
      if (result && "error" in result) {
        setError(result.error);
      } else {
        setCurrentStep(3);
      }
    });
  }

  // ─── Submit Step 3: Event + Complete ──────────────────────────────────────
  // Setelah event berhasil dibuat, panggil completeOnboarding() yang akan
  // mengupdate DB dan redirect ke /dashboard via NEXT_REDIRECT.
  function handleStep3(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveEventStep(null, formData);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      // completeOnboarding() melempar NEXT_REDIRECT — Next.js menanganinya sebagai navigasi
      await completeOnboarding();
    });
  }

  // ─── Render Indikator Progress ─────────────────────────────────────────────
  const stepIndex = currentStep - 1; // 0-based untuk array STEPS

  return (
    <div className="w-full max-w-lg">
      {/* ── Header Wizard ── */}
      <div className="mb-8 text-center">
        <p className="text-sm font-medium text-emerald-600">
          Langkah {currentStep} dari {STEPS.length}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-stone-900 sm:text-3xl">
          {STEPS[stepIndex].title}
        </h1>
        <p className="mt-2 text-sm text-stone-500">{STEPS[stepIndex].desc}</p>
      </div>

      {/* ── Progress Bar ── */}
      {/* Tiga lingkaran yang terhubung garis — menunjukkan posisi user dalam wizard */}
      <div className="mb-8 flex items-center justify-center gap-0">
        {STEPS.map((step, i) => {
          const StepIcon = step.icon;
          const isCompleted = i < stepIndex;
          const isCurrent = i === stepIndex;

          return (
            <div key={i} className="flex items-center">
              {/* Garis penghubung antar step (tidak ada di step pertama) */}
              {i > 0 && (
                <div
                  className={`h-0.5 w-12 transition-colors duration-500 sm:w-16 ${
                    i <= stepIndex ? "bg-emerald-500" : "bg-stone-200"
                  }`}
                />
              )}

              {/* Lingkaran step */}
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  isCompleted
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : isCurrent
                      ? "border-emerald-500 bg-white text-emerald-600 shadow-sm shadow-emerald-100"
                      : "border-stone-200 bg-white text-stone-300"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <StepIcon className="h-4 w-4" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Panel Konten Step (Animated) ── */}
      {/* AnimatePresence + key memastikan animasi berjalan setiap ganti step */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="p-6 sm:p-8"
          >
            {/* Error global dari server action */}
            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* ────────────────── STEP 1: PROFIL ────────────────── */}
            {currentStep === 1 && (
              <form onSubmit={handleStep1} className="space-y-5">
                {/* Nama Tampilan */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium text-stone-700">
                    Nama Tampilan
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Budi Santoso"
                    defaultValue={initialName}
                    disabled={isPending}
                    className="border-stone-200 focus-visible:ring-emerald-500"
                    required
                  />
                  <p className="text-xs text-stone-400">
                    Nama ini yang dilihat tamu di halaman booking kamu.
                  </p>
                </div>

                {/* Link Publik (slug) */}
                <div className="space-y-1.5">
                  <Label htmlFor="slug" className="text-sm font-medium text-stone-700">
                    Link Publikmu
                  </Label>
                  {/* Prefix URL non-interaktif + input slug dalam satu baris */}
                  <div className="flex items-center overflow-hidden rounded-lg border border-stone-200 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1">
                    <span className="select-none border-r border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-400">
                      janjilink.com/
                    </span>
                    <input
                      id="slug"
                      name="slug"
                      type="text"
                      placeholder="nama-kamu"
                      value={slugPreview}
                      onChange={handleSlugChange}
                      disabled={isPending}
                      className="flex-1 bg-transparent px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-300"
                      required
                    />
                  </div>
                  <p className="text-xs text-stone-400">
                    3–30 karakter, huruf kecil dan angka, boleh pakai strip (-).
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Lanjut
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* ────────────────── STEP 2: JAM KERJA ────────────────── */}
            {currentStep === 2 && (
              <form onSubmit={handleStep2} className="space-y-4">
                {/* Tabel hari + toggle + jam */}
                <div className="space-y-2">
                  {DAYS.map((dayName, i) => {
                    const day = avail[i];
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                          day.isActive ? "bg-emerald-50/60" : "bg-stone-50"
                        }`}
                      >
                        {/* Toggle checkbox — styling kustom agar terlihat seperti chip */}
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={day.isActive}
                            onChange={() => toggleDay(i)}
                            disabled={isPending}
                          />
                          {/* Tombol toggle visual */}
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                              day.isActive
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-stone-300 bg-white"
                            }`}
                          >
                            {day.isActive && (
                              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          {/* Nama hari — lebar tetap agar kolom jam rata */}
                          <span className={`w-16 text-sm font-medium ${day.isActive ? "text-stone-800" : "text-stone-400"}`}>
                            {dayName}
                          </span>
                        </label>

                        {/* Input jam — hanya tampil saat hari aktif */}
                        {day.isActive ? (
                          <div className="ml-auto flex items-center gap-1.5 text-sm text-stone-600">
                            <input
                              type="time"
                              value={day.start}
                              onChange={(e) => updateTime(i, "start", e.target.value)}
                              disabled={isPending}
                              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <span className="text-stone-400">–</span>
                            <input
                              type="time"
                              value={day.end}
                              onChange={(e) => updateTime(i, "end", e.target.value)}
                              disabled={isPending}
                              className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        ) : (
                          <span className="ml-auto text-xs text-stone-300">Libur</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-stone-400">
                  Semua waktu dalam WIB (UTC+7). Bisa diubah kapan saja di menu Ketersediaan.
                </p>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Lanjut
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* ────────────────── STEP 3: EVENT PERTAMA ────────────────── */}
            {currentStep === 3 && (
              <form onSubmit={handleStep3} className="space-y-5">
                {/* Nama Event */}
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-sm font-medium text-stone-700">
                    Nama Event
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Meeting 30 Menit"
                    defaultValue="Meeting 30 Menit"
                    disabled={isPending}
                    className="border-stone-200 focus-visible:ring-emerald-500"
                    required
                  />
                </div>

                {/* Durasi — menggunakan DurationPicker dengan preset */}
                {/* DurationPicker menyertakan hidden input name="duration" secara otomatis */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-stone-700">Durasi</Label>
                  <DurationPicker name="duration" defaultValue={30} />
                </div>

                {/* Tipe Lokasi */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-stone-700">Tipe Meeting</Label>
                  {/* Radio group styling sebagai tombol */}
                  <div className="flex gap-2">
                    {[
                      { value: "ONLINE", label: "Online (Virtual)" },
                      { value: "OFFLINE", label: "Tatap Muka" },
                    ].map(({ value, label }) => (
                      <label key={value} className="flex-1 cursor-pointer">
                        <input
                          type="radio"
                          name="locationType"
                          value={value}
                          defaultChecked={value === "ONLINE"}
                          className="peer sr-only"
                          disabled={isPending}
                        />
                        <span className="flex items-center justify-center rounded-xl border-2 border-stone-200 bg-stone-50 py-2.5 text-sm font-medium text-stone-600 transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tombol Selesai */}
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Masuk ke Dashboard
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Catatan Kaki ── */}
      <p className="mt-4 text-center text-xs text-stone-400">
        Semua pengaturan bisa diubah kapan saja di dashboard.
      </p>
    </div>
  );
}
