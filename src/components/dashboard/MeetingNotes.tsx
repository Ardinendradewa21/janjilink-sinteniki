"use client";

// ─── MeetingNotes ─────────────────────────────────────────────────────────────
// Komponen textarea untuk catatan pasca-meeting.
//
// Fitur utama:
//  • Autosave: catatan disimpan otomatis saat user berpindah fokus (onBlur),
//    bukan saat setiap ketikan — mengurangi request yang tidak perlu.
//  • Indikator status: menampilkan "Menyimpan...", "Tersimpan ✓", atau pesan error
//    agar user tahu apakah catatan sudah aman tersimpan.
//  • Skip save jika isi tidak berubah: menghindari request kosong ke server.
//
// Props:
//  • bookingId  — ID booking yang catatan ini miliknya
//  • initialContent — isi catatan yang sudah ada di DB (dari server component parent)

import { useTransition, useState, useRef } from "react";
import { saveMeetingNote } from "@/server/actions/meeting";

interface MeetingNotesProps {
  bookingId: string;
  initialContent: string;
}

export function MeetingNotes({ bookingId, initialContent }: MeetingNotesProps) {
  // Isi textarea, diinisialisasi dari data yang sudah ada di DB
  const [content, setContent] = useState(initialContent);

  // useTransition: menandai server action sedang berjalan tanpa memblokir UI
  const [isSaving, startSaving] = useTransition();

  // Status terakhir simpan: null = belum, true = sukses, string = pesan error
  const [saveStatus, setSaveStatus] = useState<null | "saved" | string>(null);

  // Ref untuk menyimpan nilai terakhir yang berhasil tersimpan ke server,
  // dipakai agar tidak re-save jika isi belum berubah sejak save terakhir.
  const lastSavedRef = useRef(initialContent);

  // ─── handleBlur ────────────────────────────────────────────────────────────
  // Dipanggil saat user klik di luar textarea (kehilangan fokus).
  // Jika isi sama dengan yang sudah tersimpan sebelumnya, skip save.
  function handleBlur() {
    if (content === lastSavedRef.current) return;

    startSaving(async () => {
      setSaveStatus(null);
      const result = await saveMeetingNote(bookingId, content);

      if (result.error) {
        setSaveStatus(result.error);
      } else {
        // Update ref ke nilai terbaru yang sudah tersimpan
        lastSavedRef.current = content;
        setSaveStatus("saved");
        // Reset indicator setelah 3 detik agar tidak mengganggu
        setTimeout(() => setSaveStatus(null), 3000);
      }
    });
  }

  return (
    <div className="space-y-2">
      {/* Label dan indikator status save */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-stone-700">
          Catatan Meeting
        </label>

        {/* Indikator: hanya muncul saat menyimpan atau baru selesai */}
        {isSaving && (
          <span className="text-xs text-stone-400">Menyimpan...</span>
        )}
        {!isSaving && saveStatus === "saved" && (
          <span className="text-xs text-emerald-600">Tersimpan ✓</span>
        )}
        {!isSaving && saveStatus && saveStatus !== "saved" && (
          <span className="text-xs text-red-500">{saveStatus}</span>
        )}
      </div>

      {/* Textarea catatan — autosave onBlur */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        placeholder="Tulis ringkasan diskusi, keputusan yang diambil, atau hal penting dari meeting ini..."
        rows={6}
        className="w-full resize-y rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
        disabled={isSaving}
      />

      <p className="text-xs text-stone-400">
        Catatan disimpan otomatis saat kamu klik di luar kotak ini.
      </p>
    </div>
  );
}
