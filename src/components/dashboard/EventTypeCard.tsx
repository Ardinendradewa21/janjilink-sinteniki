"use client";

import { ExternalLink, Loader2, MoreVertical, Power, Trash2 } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteEventType, toggleEventType } from "@/server/actions/event";
import { EditEventDialog } from "@/components/dashboard/EditEventDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Props ───────────────────────────────────────────────────────────────────
// Data lengkap event type yang ditampilkan di kartu dashboard.
// platform & locationDetails ditambahkan agar EditEventDialog bisa pre-fill data.
type EventTypeCardProps = {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  locationType: "ONLINE" | "OFFLINE";
  platform: string | null;
  locationDetails: string | null;
  isActive: boolean;
  username: string;
};

// ─── EventTypeCard ───────────────────────────────────────────────────────────
// Kartu event type di dashboard utama.
// Menampilkan info event + dropdown menu (edit, toggle, delete).
// Client component karena butuh useTransition untuk aksi async.
export function EventTypeCard({
  id,
  title,
  description,
  duration,
  locationType,
  platform,
  locationDetails,
  isActive,
  username,
}: EventTypeCardProps) {
  const [isPending, startTransition] = useTransition();

  // Handler toggle aktif/nonaktif event type
  const handleToggle = () => {
    startTransition(async () => {
      try {
        await toggleEventType(id);
        toast.success(isActive ? "Event dinonaktifkan." : "Event diaktifkan.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal mengubah status.");
      }
    });
  };

  // Handler hapus event type (dengan konfirmasi dialog browser)
  const handleDelete = () => {
    if (!confirm(`Hapus "${title}"? Semua booking terkait juga akan dihapus.`)) return;
    startTransition(async () => {
      try {
        await deleteEventType(id);
        toast.success("Event berhasil dihapus.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
      }
    });
  };

  return (
    <div
      className={`relative rounded-xl border bg-white shadow-sm transition-all hover:shadow-md ${
        isActive ? "border-stone-200" : "border-stone-200 opacity-60"
      }`}
    >
      {/* Badge status aktif/nonaktif di pojok kanan atas */}
      <div className="absolute right-3 top-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            isActive
              ? "bg-emerald-100 text-emerald-700"
              : "bg-stone-100 text-stone-500"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-stone-400"}`}
          />
          {isActive ? "Aktif" : "Nonaktif"}
        </span>
      </div>

      {/* Konten utama kartu: judul, deskripsi, badge durasi & lokasi */}
      <div className="p-5 pr-24">
        <p className="font-semibold text-stone-900 leading-tight">{title}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-stone-500">
          {description ?? "Belum ada deskripsi."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
            {duration} menit
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              locationType === "ONLINE"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-lime-100 text-lime-700"
            }`}
          >
            {locationType === "ONLINE" ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Footer: link ke halaman publik + dropdown aksi */}
      <div className="flex items-center justify-between border-t border-stone-100 px-5 py-3">
        {/* Link untuk membuka halaman booking publik di tab baru */}
        <Link
          href={`/${username}/${id}`}
          target="_blank"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 transition-colors hover:text-emerald-700"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Lihat halaman booking
        </Link>

        {/* Dropdown menu: Edit, Toggle, Delete */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={isPending}
              className="h-8 w-8 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreVertical className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Edit event: membuka dialog EditEventDialog */}
            <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
              <EditEventDialog
                id={id}
                title={title}
                description={description}
                duration={duration}
                locationType={locationType}
                platform={platform}
                locationDetails={locationDetails}
              />
            </DropdownMenuItem>
            {/* Toggle aktif/nonaktif */}
            <DropdownMenuItem onClick={handleToggle} className="gap-2 cursor-pointer">
              <Power className="h-4 w-4" />
              {isActive ? "Nonaktifkan" : "Aktifkan"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Hapus event (merah, destruktif) */}
            <DropdownMenuItem
              onClick={handleDelete}
              className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              Hapus event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
