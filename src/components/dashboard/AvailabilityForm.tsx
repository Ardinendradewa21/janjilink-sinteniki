"use client";

import { Loader2, Save } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { saveAvailability } from "@/server/actions/availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

// ─── Nama hari dalam Bahasa Indonesia ────────────────────────────────────────
const DAY_LABELS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// ─── Tipe data satu baris hari yang diterima dari server ─────────────────────
type DayData = {
  dayOfWeek: number;  // 0=Minggu, 1=Senin, ..., 6=Sabtu
  isActive: boolean;
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
};

type AvailabilityFormProps = {
  // Data ketersediaan 7 hari dari database (atau default jika belum diatur)
  initialDays: DayData[];
};

// ─── AvailabilityForm ────────────────────────────────────────────────────────
// Form client component untuk mengatur jam ketersediaan per hari.
// Menampilkan 7 baris (Minggu–Sabtu), masing-masing dengan toggle + jam mulai/selesai.
// Menggunakan useActionState (React 19) untuk submit ke server action.
export function AvailabilityForm({ initialDays }: AvailabilityFormProps) {
  const [state, formAction, isPending] = useActionState(saveAvailability, null);

  // State lokal untuk toggle aktif/nonaktif per hari (agar input waktu bisa di-disable)
  const [activeDays, setActiveDays] = useState<boolean[]>(
    initialDays.map((d) => d.isActive),
  );

  // Ref untuk melacak toast duplikat
  const prevStateRef = useRef(state);

  // Tampilkan toast saat action berhasil/gagal
  useEffect(() => {
    if (state === prevStateRef.current) return;
    prevStateRef.current = state;
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  // Handler untuk toggle switch per hari
  const handleToggle = (index: number, checked: boolean) => {
    setActiveDays((prev) => {
      const next = [...prev];
      next[index] = checked;
      return next;
    });
  };

  return (
    <form action={formAction} className="space-y-6">
      {/* Pesan error dari server action */}
      {state?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </div>
      )}

      {/* Pesan sukses dari server action */}
      {state?.success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {state.success}
        </div>
      )}

      {/* Daftar 7 hari, masing-masing satu baris */}
      <div className="space-y-3">
        {initialDays.map((day, index) => (
          <div
            key={day.dayOfWeek}
            className={`flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center ${
              activeDays[index]
                ? "border-stone-200 bg-white"
                : "border-stone-100 bg-stone-50"
            }`}
          >
            {/* Kolom 1: Toggle switch + nama hari */}
            <div className="flex items-center gap-3 sm:w-40">
              {/* Hidden input untuk mengirim status aktif ke formData */}
              {/* Tanpa ini, checkbox yang tidak dicentang tidak dikirim oleh browser */}
              <input type="hidden" name={`day_${index}_active`} value="off" />
              <Switch
                name={`day_${index}_active`}
                checked={activeDays[index]}
                onCheckedChange={(checked) => handleToggle(index, checked)}
                disabled={isPending}
                value="on"
              />
              <span
                className={`text-sm font-medium ${
                  activeDays[index] ? "text-stone-900" : "text-stone-400"
                }`}
              >
                {DAY_LABELS[day.dayOfWeek]}
              </span>
            </div>

            {/* Kolom 2: Input jam mulai dan selesai (disabled jika hari nonaktif) */}
            {activeDays[index] ? (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  name={`day_${index}_start`}
                  defaultValue={day.startTime}
                  disabled={isPending}
                  className="w-32 border-stone-200 text-sm focus-visible:ring-emerald-500"
                />
                <span className="text-sm text-stone-400">sampai</span>
                <Input
                  type="time"
                  name={`day_${index}_end`}
                  defaultValue={day.endTime}
                  disabled={isPending}
                  className="w-32 border-stone-200 text-sm focus-visible:ring-emerald-500"
                />
              </div>
            ) : (
              // Tampilkan teks "Tidak tersedia" jika hari dinonaktifkan
              <p className="text-sm text-stone-400">Tidak tersedia</p>
            )}
          </div>
        ))}
      </div>

      {/* Tombol simpan */}
      <Button
        type="submit"
        disabled={isPending}
        className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Menyimpan...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Simpan Ketersediaan
          </>
        )}
      </Button>
    </form>
  );
}
