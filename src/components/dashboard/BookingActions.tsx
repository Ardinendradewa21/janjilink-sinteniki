"use client";

import { Check, Loader2, X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { cancelBooking, confirmBooking } from "@/server/actions/booking-manage";
import { Button } from "@/components/ui/button";

type BookingActionsProps = {
  bookingId: string;
  // Status booking saat ini: PENDING, CONFIRMED, atau CANCELLED
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
};

// ─── BookingActions ──────────────────────────────────────────────────────────
// Client component yang menampilkan tombol aksi sesuai status booking:
// - PENDING: tampilkan [Konfirmasi] + [Batalkan]
// - CONFIRMED: tampilkan [Batalkan] saja
// - CANCELLED: tidak ada tombol (sudah final)
// Dipakai di halaman /dashboard/bookings pada setiap kartu booking.
export function BookingActions({ bookingId, status }: BookingActionsProps) {
  const [isPending, startTransition] = useTransition();

  // Handler untuk konfirmasi booking (PENDING → CONFIRMED)
  const handleConfirm = () => {
    startTransition(async () => {
      try {
        await confirmBooking(bookingId);
        toast.success("Booking dikonfirmasi.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal mengkonfirmasi.");
      }
    });
  };

  // Handler untuk membatalkan booking (PENDING/CONFIRMED → CANCELLED)
  const handleCancel = () => {
    if (!confirm("Yakin ingin membatalkan booking ini?")) return;
    startTransition(async () => {
      try {
        await cancelBooking(bookingId);
        toast.success("Booking dibatalkan.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal membatalkan.");
      }
    });
  };

  // Booking yang sudah dibatalkan tidak butuh aksi apapun
  if (status === "CANCELLED") return null;

  return (
    <div className="flex items-center gap-2">
      {/* Tombol konfirmasi: hanya muncul untuk booking PENDING */}
      {status === "PENDING" && (
        <Button
          size="sm"
          disabled={isPending}
          onClick={handleConfirm}
          className="h-7 gap-1.5 bg-emerald-600 px-2.5 text-xs text-white hover:bg-emerald-700"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          Konfirmasi
        </Button>
      )}

      {/* Tombol batalkan: muncul untuk PENDING dan CONFIRMED */}
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={handleCancel}
        className="h-7 gap-1.5 border-red-200 px-2.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <X className="h-3 w-3" />
        )}
        Batalkan
      </Button>
    </div>
  );
}
