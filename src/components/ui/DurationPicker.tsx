"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// ─── Definisi preset durasi ──────────────────────────────────────────────────
// Daftar pilihan cepat yang paling umum dipakai untuk meeting.
// Nilai dalam satuan menit — langsung kompatibel dengan field `duration` di database.
const DURATION_PRESETS = [
  { label: "15 mnt", value: 15 },
  { label: "30 mnt", value: 30 },
  { label: "45 mnt", value: 45 },
  { label: "1 jam",  value: 60 },
  { label: "1,5 jam", value: 90 },
  { label: "2 jam",  value: 120 },
];

// ─── Props ───────────────────────────────────────────────────────────────────
type DurationPickerProps = {
  // Nama field yang dikirim ke server action melalui FormData (default: "duration")
  name?: string;
  // Nilai awal saat komponen pertama kali dirender (penting untuk mode edit)
  defaultValue?: number;
  // Disabled saat form sedang di-submit
  disabled?: boolean;
};

// ─── DurationPicker ──────────────────────────────────────────────────────────
// Komponen pemilih durasi dengan tombol preset + opsi custom.
//
// Cara kerja:
// 1. Tampilkan 6 tombol preset (pill buttons)
// 2. Jika user pilih preset → hidden input terisi otomatis dengan nilai preset
// 3. Jika user pilih "Custom" → muncul input angka manual di bawah tombol
// 4. Hidden input bernama `name` (default "duration") yang dikirim ke FormData
//
// Komponen ini sengaja menggunakan hidden input agar kompatibel dengan
// pola `new FormData(form)` yang sudah dipakai di semua dialog.
export function DurationPicker({
  name = "duration",
  defaultValue = 30,
  disabled = false,
}: DurationPickerProps) {
  // Cek apakah nilai default ada di daftar preset atau custom
  const isPreset = DURATION_PRESETS.some((p) => p.value === defaultValue);

  // State: preset yang sedang dipilih, atau "custom" jika user mau angka sendiri
  const [selected, setSelected] = useState<number | "custom">(
    isPreset ? defaultValue : "custom",
  );

  // State: nilai angka untuk mode custom (string agar kompatibel dengan input HTML)
  const [customValue, setCustomValue] = useState(
    !isPreset ? String(defaultValue) : "30",
  );

  // Hitung nilai aktual yang akan dikirim ke server:
  // - Jika preset dipilih → pakai nilai preset
  // - Jika custom → pakai angka dari input text
  const actualValue = selected === "custom" ? customValue : String(selected);

  return (
    <div className="space-y-3">
      {/* ─── Hidden input ────────────────────────────────────────────────────
          Input ini tidak terlihat oleh user, tapi ikut dikirim saat form di-submit.
          Nilai diupdate secara reaktif melalui prop `value` saat user memilih preset/custom. */}
      <input type="hidden" name={name} value={actualValue} />

      {/* ─── Baris tombol preset ─────────────────────────────────────────────
          Setiap tombol merupakan pill button yang mengisi hidden input di atas.
          Tombol yang aktif ditandai dengan warna emerald penuh. */}
      <div className="flex flex-wrap gap-2">
        {DURATION_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button" // type="button" wajib agar tidak trigger submit form
            disabled={disabled}
            onClick={() => setSelected(preset.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
              selected === preset.value
                ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                : "border-stone-200 bg-white text-stone-700 hover:border-emerald-300 hover:text-emerald-700",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {preset.label}
          </button>
        ))}

        {/* ─── Tombol Custom ──────────────────────────────────────────────────
            Memunculkan input angka di bawah saat diklik.
            Aktif saat tidak ada preset yang cocok dengan nilai saat ini. */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setSelected("custom")}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all",
            selected === "custom"
              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
              : "border-stone-200 bg-white text-stone-700 hover:border-emerald-300 hover:text-emerald-700",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          Custom
        </button>
      </div>

      {/* ─── Input angka custom ───────────────────────────────────────────────
          Hanya muncul jika tombol "Custom" aktif.
          Max 480 menit (8 jam) sebagai batas wajar untuk sebuah meeting. */}
      {selected === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={480}
            step={1}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            disabled={disabled}
            placeholder="Masukkan menit"
            className="w-32 border-stone-200 text-stone-900 focus-visible:ring-emerald-500"
          />
          <span className="text-sm text-stone-500">menit</span>
        </div>
      )}
    </div>
  );
}
