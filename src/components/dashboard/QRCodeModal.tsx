"use client";

// ─── QRCodeModal ──────────────────────────────────────────────────────────────
// Modal yang menampilkan QR code untuk sebuah event type.
//
// Cara kerja:
//   1. Render QR code dari URL booking event menggunakan qrcode.react
//   2. Tombol "Bagikan" → Web Share API (native share sheet HP)
//      Fallback: copy ke clipboard jika browser tidak support Share API
//   3. Tombol "Unduh" → convert SVG ke Canvas → download PNG
//
// Use case utama (dari JANJILINK_CONTEXT.md):
//   "Tempel QR ini di tempat usahamu. Scan = booking langsung."
//   → UMKM salon, bengkel, fotografer bisa pasang QR di meja/dinding.

import { Download, QrCode, Share2 } from "lucide-react";
import { useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type QRCodeModalProps = {
  // URL booking event yang di-encode ke dalam QR
  eventUrl: string;
  // Nama event untuk label download dan share
  eventTitle: string;
  // Trigger bisa berupa tombol atau item dropdown — dikirim dari luar
  trigger?: React.ReactNode;
};

export function QRCodeModal({ eventUrl, eventTitle, trigger }: QRCodeModalProps) {
  // Ref ke element SVG untuk proses download PNG
  const svgRef = useRef<SVGSVGElement>(null);

  // ─── handleShare ────────────────────────────────────────────────────────
  // Pakai Web Share API jika tersedia (mobile browser mendukung ini).
  // Akan membuka native share sheet: WA, IG, Line, dll.
  // Jika tidak tersedia (desktop), fallback ke copy ke clipboard.
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Booking ${eventTitle}`,
          text: `Scan QR ini atau buka link untuk booking langsung:\n${eventUrl}`,
          url: eventUrl,
        });
      } catch {
        // User membatalkan share — bukan error nyata, tidak perlu toast
      }
    } else {
      // Fallback: copy URL ke clipboard
      await navigator.clipboard.writeText(eventUrl);
      toast.success("Link berhasil disalin ke clipboard.");
    }
  }, [eventUrl, eventTitle]);

  // ─── handleDownload ──────────────────────────────────────────────────────
  // Download QR code sebagai file PNG.
  //
  // Alur konversi:
  //   SVG element (DOM) → serialize ke string XML
  //   → Blob URL → gambar <img>
  //   → draw ke Canvas (untuk resize + tambah margin putih)
  //   → Canvas → PNG data URL → anchor download
  //
  // Margin putih diperlukan karena scanner QR lebih akurat dengan
  // area kosong (quiet zone) di sekitar kode.
  const handleDownload = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      const padding = 24; // margin putih di setiap sisi (px)
      const size = img.width + padding * 2;

      // Canvas dengan background putih + QR di tengah
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, padding, padding, img.width, img.height);

      // Trigger download
      const link = document.createElement("a");
      link.download = `qr-${eventTitle.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [svgRef, eventTitle]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          // Default trigger: tombol icon QR
          <Button variant="outline" size="sm" className="gap-2">
            <QrCode className="h-4 w-4" />
            QR Code
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="border-stone-200 bg-white sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-stone-900">QR Code Booking</DialogTitle>
          <DialogDescription className="text-stone-500">
            Tempel di tempat usahamu. Scan = booking langsung.
          </DialogDescription>
        </DialogHeader>

        {/* Area QR Code ────────────────────────────────────────────────────
            Background putih + border untuk mudah di-scan.
            Size 220px: cukup besar untuk scan dari jarak normal. */}
        <div className="flex flex-col items-center gap-5 py-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <QRCodeSVG
              ref={svgRef}
              value={eventUrl}
              size={220}
              // Level koreksi H: tahan terhadap kerusakan hingga 30%
              // Berguna jika QR dicetak di tempat yang kadang kotor/terlipat
              level="H"
              // Logo JanjiLink di tengah QR (image setting)
              bgColor="#ffffff"
              fgColor="#1c1917" // stone-900
            />
          </div>

          {/* URL singkat di bawah QR agar bisa diketik manual jika perlu */}
          <p className="max-w-full break-all text-center text-xs text-stone-400">
            {eventUrl}
          </p>

          {/* Tombol aksi: Share + Download */}
          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              onClick={handleDownload}
              className="flex-1 gap-2 border-stone-200"
            >
              <Download className="h-4 w-4" />
              Unduh PNG
            </Button>
            <Button
              onClick={handleShare}
              className="flex-1 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Share2 className="h-4 w-4" />
              Bagikan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
