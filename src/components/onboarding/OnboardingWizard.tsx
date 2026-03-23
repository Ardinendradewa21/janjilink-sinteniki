"use client";

// ─── OnboardingWizard ─────────────────────────────────────────────────────────
// Wizard 4 langkah untuk user baru. Urutan:
//   Step 0: Pilih use case (jenis pengguna)
//   Step 1: Profil — nama, link publik, bio (opsional)
//   Step 2: Jam Kerja — ketersediaan per hari
//   Step 3: Event Pertama — template meeting
//
// Setelah Step 3 berhasil → completeOnboarding() → redirect /dashboard.

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Shapes,
  User,
  Zap,
} from "lucide-react";

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

// Pilihan jenis pengguna (Step 0)
const USE_CASES = [
  { id: "freelancer",    emoji: "💼", label: "Freelancer / Konsultan", desc: "Terima booking dari klien" },
  { id: "educator",     emoji: "🎓", label: "Dosen / Tutor / Guru",   desc: "Jadwal bimbingan & konsultasi" },
  { id: "health",       emoji: "🏥", label: "Tenaga Kesehatan",       desc: "Antrian pasien & konseling" },
  { id: "umkm",         emoji: "🛍️", label: "Usaha Jasa / UMKM",     desc: "Salon, fotografer, bengkel, dll" },
  { id: "organization", emoji: "🤝", label: "Organisasi / Komunitas", desc: "BEM, komunitas, kepanitiaan" },
  { id: "hr",           emoji: "🏢", label: "HR / Rekrutmen",        desc: "Interview dan 1-on-1 karyawan" },
  { id: "other",        emoji: "✨", label: "Lainnya",               desc: "Untuk kebutuhanku sendiri" },
] as const;

// Default nama + durasi event berdasarkan use case (untuk auto-fill Step 3)
const USE_CASE_EVENT_DEFAULTS: Record<string, { title: string; duration: number }> = {
  freelancer:    { title: "Discovery Call 30 Menit", duration: 30 },
  educator:      { title: "Sesi Bimbingan 30 Menit", duration: 30 },
  health:        { title: "Konsultasi 15 Menit",     duration: 15 },
  umkm:          { title: "Konsultasi Layanan 30 Menit", duration: 30 },
  organization:  { title: "Rapat Tim 60 Menit",      duration: 60 },
  hr:            { title: "Interview 45 Menit",       duration: 45 },
  other:         { title: "Meeting 30 Menit",         duration: 30 },
};

// Label hari (indeks = dayOfWeek: 0 = Minggu)
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Default ketersediaan: Senin–Sabtu aktif 09:00–17:00, Minggu libur
const DEFAULT_AVAIL = [
  { isActive: false, start: "09:00", end: "17:00" }, // Minggu
  { isActive: true,  start: "09:00", end: "17:00" }, // Senin
  { isActive: true,  start: "09:00", end: "17:00" }, // Selasa
  { isActive: true,  start: "09:00", end: "17:00" }, // Rabu
  { isActive: true,  start: "09:00", end: "17:00" }, // Kamis
  { isActive: true,  start: "09:00", end: "17:00" }, // Jumat
  { isActive: true,  start: "09:00", end: "17:00" }, // Sabtu
];

// Konfigurasi 4 step untuk progress bar (step 0 = "Jenis", step 1–3 = sisanya)
const STEPS = [
  { icon: Shapes,   label: "Jenis",     title: "Kamu siapa?",                    desc: "Bantu kami menyesuaikan pengalamanmu." },
  { icon: User,     label: "Profil",    title: "Halo! Perkenalkan diri kamu",    desc: "Nama dan link unikmu — ini yang dilihat tamu saat membuat janji." },
  { icon: Calendar, label: "Jam Kerja", title: "Kapan kamu bisa ditemui?",       desc: "Atur hari dan jam kerja default-mu. Bisa diubah kapan saja nanti." },
  { icon: Zap,      label: "Event",     title: "Buat event pertamamu",           desc: "Template meeting yang akan kamu tawarkan ke tamu." },
];

// Animasi slide: maju = dari kanan, mundur = dari kiri
const slideVariants = {
  enter: { x: 40, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -40, opacity: 0 },
};

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  initialName: string;
  initialSlug: string;
}

// ─── Komponen Utama ────────────────────────────────────────────────────────────
export function OnboardingWizard({ initialName, initialSlug }: Props) {
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2 | 3>(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // State use case yang dipilih di Step 0
  const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);

  // State ketersediaan 7 hari (dikontrol lokal untuk Step 2)
  const [avail, setAvail] = useState(DEFAULT_AVAIL);

  // Preview slug real-time
  const [slugPreview, setSlugPreview] = useState(
    // Kosongkan jika slug masih berupa CUID default (panjang 25 char, diawali 'c')
    /^c[a-z0-9]{24}$/.test(initialSlug) ? "" : initialSlug
  );

  // ─── Helpers ketersediaan ────────────────────────────────────────────────────
  function toggleDay(i: number) {
    setAvail((prev) => prev.map((d, idx) => (idx === i ? { ...d, isActive: !d.isActive } : d)));
  }
  function updateTime(i: number, field: "start" | "end", value: string) {
    setAvail((prev) => prev.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)));
  }

  // ─── Handler slug input ──────────────────────────────────────────────────────
  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-");
    setSlugPreview(clean);
    e.target.value = clean;
  }

  // ─── Step 0: pilih use case → langsung ke Step 1 ────────────────────────────
  function handleUseCaseSelect(id: string) {
    setSelectedUseCase(id);
    setCurrentStep(1);
  }

  // ─── Step 1: simpan profil + bio + useCaseType ───────────────────────────────
  function handleStep1(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    // Tambahkan useCaseType dari state (karena dipilih di step terpisah)
    if (selectedUseCase) formData.set("useCaseType", selectedUseCase);
    startTransition(async () => {
      const result = await saveProfileStep(null, formData);
      if (result && "error" in result) {
        setError(result.error);
      } else {
        setCurrentStep(2);
      }
    });
  }

  // ─── Step 2: simpan ketersediaan ─────────────────────────────────────────────
  function handleStep2(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
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

  // ─── Step 3: buat event + selesaikan onboarding ───────────────────────────────
  function handleStep3(e: { preventDefault(): void; currentTarget: HTMLFormElement }) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveEventStep(null, formData);
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      await completeOnboarding();
    });
  }

  // Default event berdasarkan use case terpilih
  const eventDefault = USE_CASE_EVENT_DEFAULTS[selectedUseCase ?? ""] ?? USE_CASE_EVENT_DEFAULTS.other;

  return (
    <div className="w-full max-w-lg">
      {/* ── Header ── */}
      <div className="mb-6 text-center">
        <a href="/" className="text-xl font-bold tracking-tight text-stone-900">
          JanjiLink
        </a>
        {currentStep > 0 && (
          <p className="mt-3 text-sm font-medium text-emerald-600">
            Langkah {currentStep} dari {STEPS.length - 1}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-bold text-stone-900 sm:text-3xl">
          {STEPS[currentStep].title}
        </h1>
        <p className="mt-2 text-sm text-stone-500">{STEPS[currentStep].desc}</p>
      </div>

      {/* ── Progress dots (hanya muncul setelah step 0) ── */}
      {currentStep > 0 && (
        <div className="mb-6 flex items-center justify-center">
          {STEPS.slice(1).map((step, i) => {
            const StepIcon = step.icon;
            const stepNum = i + 1; // 1-based
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;
            return (
              <div key={i} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`h-0.5 w-12 transition-colors duration-500 sm:w-16 ${
                      stepNum <= currentStep ? "bg-emerald-500" : "bg-stone-200"
                    }`}
                  />
                )}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    isCompleted
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : isCurrent
                        ? "border-emerald-500 bg-white text-emerald-600 shadow-sm shadow-emerald-100"
                        : "border-stone-200 bg-white text-stone-300"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <StepIcon className="h-4 w-4" />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Konten Step ── */}
      <div className={`overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm ${currentStep === 0 ? "" : ""}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="p-6 sm:p-8"
          >
            {/* Error banner */}
            {error && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* ── STEP 0: Pilih Use Case ── */}
            {currentStep === 0 && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {USE_CASES.map((uc) => (
                    <button
                      key={uc.id}
                      type="button"
                      onClick={() => handleUseCaseSelect(uc.id)}
                      className="flex items-start gap-3 rounded-xl border-2 border-stone-200 bg-stone-50 px-4 py-3 text-left transition-all hover:border-emerald-400 hover:bg-emerald-50 active:scale-[0.98]"
                    >
                      <span className="mt-0.5 text-2xl leading-none">{uc.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{uc.label}</p>
                        <p className="text-xs text-stone-500">{uc.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP 1: Profil ── */}
            {currentStep === 1 && (
              <form onSubmit={handleStep1} className="space-y-5">
                {/* Nama */}
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm font-medium text-stone-700">Nama Tampilan</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Budi Santoso"
                    defaultValue={initialName}
                    disabled={isPending}
                    className="border-stone-200 focus-visible:ring-emerald-500"
                    required
                  />
                  <p className="text-xs text-stone-400">Nama yang dilihat tamu di halaman booking kamu.</p>
                </div>

                {/* Link publik */}
                <div className="space-y-1.5">
                  <Label htmlFor="slug" className="text-sm font-medium text-stone-700">Link Publikmu</Label>
                  <div className="flex items-center overflow-hidden rounded-xl border border-stone-200 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-offset-1">
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
                  <p className="text-xs text-stone-400">3–30 karakter, huruf kecil dan angka, boleh pakai strip (-).</p>
                </div>

                {/* Bio — opsional */}
                <div className="space-y-1.5">
                  <Label htmlFor="bio" className="text-sm font-medium text-stone-700">
                    Bio singkat <span className="font-normal text-stone-400">(opsional)</span>
                  </Label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={2}
                    placeholder="Contoh: Fotografer wedding profesional, 5 tahun pengalaman di Bandung."
                    disabled={isPending}
                    maxLength={160}
                    className="w-full resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 disabled:opacity-60"
                  />
                  <p className="text-xs text-stone-400">Tampil di halaman profilmu. Maksimal 160 karakter.</p>
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-12 w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Lanjut</span><ChevronRight className="ml-1 h-4 w-4" /></>}
                </Button>
              </form>
            )}

            {/* ── STEP 2: Jam Kerja ── */}
            {currentStep === 2 && (
              <form onSubmit={handleStep2} className="space-y-4">
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
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={day.isActive}
                            onChange={() => toggleDay(i)}
                            disabled={isPending}
                          />
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                              day.isActive ? "border-emerald-500 bg-emerald-500 text-white" : "border-stone-300 bg-white"
                            }`}
                          >
                            {day.isActive && (
                              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span className={`w-16 text-sm font-medium ${day.isActive ? "text-stone-800" : "text-stone-400"}`}>
                            {dayName}
                          </span>
                        </label>
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
                <p className="text-xs text-stone-400">Semua waktu dalam WIB (UTC+7). Bisa diubah kapan saja di menu Ketersediaan.</p>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-12 w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Lanjut</span><ChevronRight className="ml-1 h-4 w-4" /></>}
                </Button>
              </form>
            )}

            {/* ── STEP 3: Event Pertama ── */}
            {currentStep === 3 && (
              <form onSubmit={handleStep3} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-sm font-medium text-stone-700">Nama Event</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Meeting 30 Menit"
                    defaultValue={eventDefault.title}
                    disabled={isPending}
                    className="border-stone-200 focus-visible:ring-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-stone-700">Durasi</Label>
                  <DurationPicker name="duration" defaultValue={eventDefault.duration} />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-stone-700">Tipe Meeting</Label>
                  <div className="flex gap-2">
                    {[
                      { value: "ONLINE",  label: "Online (Virtual)" },
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

                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-12 w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Masuk ke Dashboard 🎉"}
                </Button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="mt-4 text-center text-xs text-stone-400">
        {currentStep === 0
          ? "Bisa diubah kapan saja nanti di pengaturan."
          : "Semua pengaturan bisa diubah kapan saja di dashboard."}
      </p>
    </div>
  );
}
