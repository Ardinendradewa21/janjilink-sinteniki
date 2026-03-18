"use client";

import { Globe2, Link2, Loader2, Pencil, Projector, Video } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateEventType } from "@/server/actions/event";
import { DurationPicker } from "@/components/ui/DurationPicker";
import { PlaceAutocomplete } from "@/components/ui/PlaceAutocomplete";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ─── Props ───────────────────────────────────────────────────────────────────
// Data event type saat ini, di-pass dari EventTypeCard untuk mengisi default values.
type EditEventDialogProps = {
  id: string;
  title: string;
  description: string | null;
  duration: number;
  locationType: "ONLINE" | "OFFLINE";
  platform: string | null;
  locationDetails: string | null;
};

type LocationTypeValue = "ONLINE" | "OFFLINE";

// ─── EditEventDialog ─────────────────────────────────────────────────────────
// Dialog client component untuk mengedit event type yang sudah ada.
// Mirip dengan CreateEventDialog, tapi semua field sudah terisi nilai saat ini.
// Dipanggil dari dropdown menu di EventTypeCard.
export function EditEventDialog({
  id,
  title,
  description,
  duration,
  locationType,
  platform,
  locationDetails,
}: EditEventDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State lokal untuk select yang perlu dikontrol (locationType + platform)
  const [selectedLocationType, setSelectedLocationType] =
    useState<LocationTypeValue>(locationType);
  const [selectedPlatform, setSelectedPlatform] = useState<string | undefined>(
    platform ?? "GOOGLE_MEET",
  );

  // Submit form ke server action updateEventType
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);

    // Sertakan id event type yang akan diupdate
    formData.set("id", id);
    // Pastikan nilai select terset di payload form
    formData.set("locationType", selectedLocationType);
    if (selectedLocationType === "ONLINE" && selectedPlatform) {
      formData.set("platform", selectedPlatform);
    } else {
      formData.delete("platform");
    }

    startTransition(async () => {
      try {
        const result = await updateEventType(formData);
        if (result?.success) {
          setOpen(false);
          toast.success("Event berhasil diperbarui.");
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Gagal memperbarui event.",
        );
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) {
          setOpen(nextOpen);
          if (!nextOpen) {
            // Reset state saat dialog ditutup
            setErrorMessage(null);
            setSelectedLocationType(locationType);
            setSelectedPlatform(platform ?? "GOOGLE_MEET");
          }
        }
      }}
    >
      {/* Trigger: tombol edit di dropdown EventTypeCard */}
      <DialogTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-stone-700 outline-none hover:bg-stone-100 cursor-pointer">
          <Pencil className="h-4 w-4" />
          Edit event
        </button>
      </DialogTrigger>

      <DialogContent className="border-stone-200 bg-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-stone-900">Edit Event Type</DialogTitle>
          <DialogDescription className="text-stone-500">
            Ubah detail event yang sudah ada.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} className="space-y-4" onSubmit={handleSubmit}>
          {/* Input judul event */}
          <div className="space-y-2">
            <label htmlFor={`edit-title-${id}`} className="text-sm font-medium text-stone-900">
              Judul
            </label>
            <Input
              id={`edit-title-${id}`}
              name="title"
              defaultValue={title}
              required
              disabled={isPending}
              className="border-stone-200 text-stone-900 placeholder:text-stone-400 focus-visible:ring-emerald-600"
            />
          </div>

          {/* Input deskripsi event (opsional) */}
          <div className="space-y-2">
            <label htmlFor={`edit-desc-${id}`} className="text-sm font-medium text-stone-900">
              Deskripsi
            </label>
            <Textarea
              id={`edit-desc-${id}`}
              name="description"
              defaultValue={description ?? ""}
              disabled={isPending}
              className="min-h-24 border-stone-200 text-stone-900 placeholder:text-stone-400 focus-visible:ring-emerald-600"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* ─── Durasi meeting ──────────────────────────────────────────
                Gunakan DurationPicker dengan defaultValue dari data event saat ini.
                Penting: defaultValue di-pass agar tombol preset yang sesuai aktif. */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-900">Durasi</label>
              <DurationPicker
                name="duration"
                defaultValue={duration}
                disabled={isPending}
              />
            </div>

            {/* Select tipe lokasi (Online/Offline) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-900">Tipe Lokasi</label>
              <Select
                name="locationType"
                value={selectedLocationType}
                onValueChange={(v) => setSelectedLocationType(v as LocationTypeValue)}
                disabled={isPending}
              >
                <SelectTrigger className="w-full border-stone-200 text-stone-900 focus:ring-emerald-600">
                  <SelectValue placeholder="Pilih lokasi" />
                </SelectTrigger>
                <SelectContent className="border-stone-200 bg-white text-stone-900">
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="OFFLINE">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Blok kondisional berdasarkan tipe lokasi */}
          {selectedLocationType === "ONLINE" ? (
            <div className="space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
              {/* Select platform meeting online */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-900">Pilih Platform</label>
                <Select
                  name="platform"
                  value={selectedPlatform}
                  onValueChange={setSelectedPlatform}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full border-stone-200 bg-white text-stone-900 focus:ring-emerald-600">
                    <SelectValue placeholder="Pilih platform meeting" />
                  </SelectTrigger>
                  <SelectContent className="border-stone-200 bg-white text-stone-900">
                    <SelectItem value="GOOGLE_MEET">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-emerald-600" />
                        Google Meet
                      </div>
                    </SelectItem>
                    <SelectItem value="ZOOM">
                      <div className="flex items-center gap-2">
                        <Projector className="h-4 w-4 text-emerald-600" />
                        Zoom
                      </div>
                    </SelectItem>
                    <SelectItem value="JITSI">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-emerald-600" />
                        Jitsi Meet
                      </div>
                    </SelectItem>
                    <SelectItem value="OTHER">
                      <div className="flex items-center gap-2">
                        <Globe2 className="h-4 w-4 text-emerald-600" />
                        Lainnya
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Input link meeting (opsional) */}
              <div className="space-y-2">
                <label htmlFor={`edit-link-${id}`} className="text-sm font-medium text-stone-900">
                  Link Meeting (Opsional)
                </label>
                <Input
                  id={`edit-link-${id}`}
                  name="locationDetails"
                  defaultValue={locationDetails ?? ""}
                  disabled={isPending}
                  placeholder="https://meet.google.com/..."
                  className="border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus-visible:ring-emerald-600"
                />
              </div>
            </div>
          ) : (
            /* ─── Section OFFLINE: PlaceAutocomplete ────────────────────────
               defaultValue diisi dengan locationDetails yang sudah tersimpan di DB.
               Jika user tidak mengubah, nilai lama tetap terkirim. */
            <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-900">Lokasi Meeting</label>
                <PlaceAutocomplete
                  name="locationDetails"
                  defaultValue={locationDetails ?? ""}
                  disabled={isPending}
                  placeholder="Ketik nama tempat, contoh: Kopi Kenangan..."
                />
              </div>
              <p className="text-xs text-stone-400">
                Cari nama coffee shop, restoran, kantor, atau gedung di seluruh Indonesia.
              </p>
            </div>
          )}

          {/* Pesan error inline */}
          {errorMessage && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          {/* Tombol simpan perubahan */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
