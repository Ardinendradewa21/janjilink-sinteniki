"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── CopyLinkButton ─────────────────────────────────────────────────────────
// Tombol kecil untuk menyalin URL publik user ke clipboard.
// Menampilkan ikon centang + toast saat berhasil copy.
// Dipakai di dashboard utama pada bagian "My Link".
export function CopyLinkButton({ slug }: { slug: string }) {
  // State untuk menandai animasi "berhasil copy" selama 2 detik
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Salin full URL ke clipboard browser
      await navigator.clipboard.writeText(`janjilink.com/${slug}`);
      setCopied(true);
      toast.success("Link berhasil dicopy!");

      // Kembalikan ikon ke semula setelah 2 detik
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin link.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
      aria-label="Copy link JanjiLink"
    >
      {/* Tampilkan ikon centang hijau selama 2 detik setelah copy berhasil */}
      {copied ? (
        <Check className="h-4 w-4 text-emerald-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}
