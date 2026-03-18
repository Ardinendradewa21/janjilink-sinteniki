"use client";

// ─── ExportSummaryButton ──────────────────────────────────────────────────────
// Tombol untuk menyalin ringkasan meeting ke clipboard sebagai teks plain.
//
// Ringkasan berisi:
//  • Info booking: nama tamu, event, waktu
//  • Catatan meeting
//  • Daftar action items dengan status selesai/belum
//
// Dipanggil dari halaman detail meeting (server component).
// Data di-pass sebagai props agar tidak perlu fetch ulang di client.

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

// Format tanggal + jam untuk tampilan di ringkasan teks
function formatDateWIB(utcDate: Date): string {
  const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  const wibMs = utcDate.getTime() + 7 * 60 * 60 * 1000;
  const wib = new Date(wibMs);

  const day = DAY_NAMES[wib.getUTCDay()];
  const date = `${wib.getUTCDate()} ${MONTH_NAMES[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`;
  const time = `${wib.getUTCHours().toString().padStart(2, "0")}:${wib.getUTCMinutes().toString().padStart(2, "0")}`;

  return `${day}, ${date} pukul ${time} WIB`;
}

interface ExportSummaryButtonProps {
  booking: {
    inviteeName: string;
    startTime: Date;
    endTime: Date;
    eventType: { title: string };
  };
  noteContent: string;
  actionItems: { text: string; isDone: boolean }[];
}

export function ExportSummaryButton({
  booking,
  noteContent,
  actionItems,
}: ExportSummaryButtonProps) {
  // State "Disalin!" sementara setelah klik
  const [copied, setCopied] = useState(false);

  function handleExport() {
    // ─── Bangun teks ringkasan ────────────────────────────────────────────────
    // Format plain-text yang bisa langsung ditempel ke WA, email, atau Notion.
    const lines: string[] = [
      "📋 RINGKASAN MEETING",
      "═══════════════════════════════════",
      "",
      `👤 Tamu     : ${booking.inviteeName}`,
      `📌 Event    : ${booking.eventType.title}`,
      `🕐 Waktu    : ${formatDateWIB(booking.startTime)}`,
      "",
      "📝 CATATAN",
      "───────────────────────────────────",
      noteContent || "(belum ada catatan)",
      "",
    ];

    // Tambah bagian action items hanya jika ada
    if (actionItems.length > 0) {
      lines.push("✅ ACTION ITEMS");
      lines.push("───────────────────────────────────");
      actionItems.forEach((item) => {
        // [x] = selesai, [ ] = belum
        lines.push(`${item.isDone ? "[x]" : "[ ]"} ${item.text}`);
      });
    } else {
      lines.push("✅ ACTION ITEMS");
      lines.push("───────────────────────────────────");
      lines.push("(belum ada action item)");
    }

    lines.push("");
    lines.push(`Generated oleh JanjiLink`);

    const summaryText = lines.join("\n");

    // Salin ke clipboard — fallback jika API tidak tersedia
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(summaryText)
        .then(() => {
          setCopied(true);
          toast.success("Ringkasan berhasil disalin ke clipboard!");
          setTimeout(() => setCopied(false), 2500);
        })
        .catch(() => toast.error("Gagal menyalin ke clipboard"));
    }
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-emerald-300 hover:text-emerald-700"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
      {copied ? "Disalin!" : "Salin Ringkasan"}
    </button>
  );
}
