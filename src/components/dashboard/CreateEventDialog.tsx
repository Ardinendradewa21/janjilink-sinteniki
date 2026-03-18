"use client";

import { Globe2, Link2, Loader2, Plus, Projector, Video } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { createEventType } from "@/server/actions/event";
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

// ─── Tipe lokasi yang didukung ────────────────────────────────────────────────
type LocationTypeValue = "ONLINE" | "OFFLINE";

// ─── CreateEventDialog ───────────────────────────────────────────────────────
// Dialog untuk membuat event type baru dari dashboard host.
//
// Alur:
// 1. User klik tombol "Create New Event" → dialog terbuka
// 2. User isi form (judul, deskripsi, durasi, tipe lokasi, platform/lokasi)
// 3. Submit → panggil server action createEventType(formData)
// 4. Jika berhasil → dialog tutup + dashboard di-refresh (via revalidatePath)
// 5. Jika error → tampilkan pesan error di dalam dialog
//
// Komponen ini menggunakan useTransition untuk mencegah UI freeze saat menunggu
// respons server action (operasi async ke database Prisma).
export function CreateEventDialog() {
  const formRef = useRef<HTMLFormElement>(null);

  // Kontrol buka/tutup dialog
  const [open, setOpen] = useState(false);

  // isPending = true saat server action sedang berjalan (form & tombol di-disable)
  const [isPending, startTransition] = useTransition();

  // Pesan error dari server action (validasi gagal, dsb)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State tipe lokasi: dikontrol secara lokal karena mempengaruhi
  // bagian kondisional form (ONLINE → platform picker, OFFLINE → place search)
  const [selectedLocationType, setSelectedLocationType] =
    useState<LocationTypeValue>("ONLINE");

  // State platform meeting (hanya relevan saat locationType === "ONLINE")
  const [selectedPlatform, setSelectedPlatform] = useState<string | undefined>(
    "GOOGLE_MEET",
  );

  // ─── handleSubmit ───────────────────────────────────────────────────────
  // Mengambil data dari form HTML via FormData, menambahkan nilai dari
  // komponen yang dikontrol secara React (locationType, platform),
  // lalu mengirimkan ke server action createEventType.
  //
  // Mengapa tidak pakai form action langsung?
  // Karena beberapa nilai (locationType, platform) dikontrol via useState
  // — tidak otomatis masuk ke native FormData. Harus di-set manual.
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    // Ambil semua input dari form HTML (termasuk hidden input dari DurationPicker)
    const formData = new FormData(event.currentTarget);

    // Override nilai locationType dengan state React (lebih reliable daripada select native)
    formData.set("locationType", selectedLocationType);

    // Platform hanya relevan untuk ONLINE — hapus jika OFFLINE agar tidak salah kirim
    if (selectedLocationType === "ONLINE" && selectedPlatform) {
      formData.set("platform", selectedPlatform);
    } else {
      formData.delete("platform");
    }

    startTransition(async () => {
      try {
        const result = await createEventType(formData);

        if (result?.success) {
          // Reset form ke state awal setelah berhasil
          formRef.current?.reset();
          setSelectedLocationType("ONLINE");
          setSelectedPlatform("GOOGLE_MEET");
          setOpen(false);
        }
      } catch (error) {
        // Tampilkan pesan error dari server (misal: "Judul minimal 3 karakter")
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat membuat event.",
        );
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Blokir tutup dialog saat sedang loading untuk cegah state inconsistent
        if (!isPending) {
          setOpen(nextOpen);
          // Reset error dan state saat dialog ditutup
          if (!nextOpen) {
            setErrorMessage(null);
            setSelectedLocationType("ONLINE");
            setSelectedPlatform("GOOGLE_MEET");
          }
        }
      }}
    >
      {/* Tombol pemicu dialog */}
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600">
          <Plus className="h-4 w-4" />
          Create New Event
        </Button>
      </DialogTrigger>

      <DialogContent className="border-stone-200 bg-white sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-stone-900">Buat Event Type Baru</DialogTitle>
          <DialogDescription className="text-stone-500">
            Isi detail event yang ingin ditampilkan di halaman booking Anda.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} className="space-y-4" onSubmit={handleSubmit}>
          {/* ─── Judul event ────────────────────────────────────────────────
              Wajib diisi, minimal 3 karakter (divalidasi di server action). */}
          <div className="space-y-2">
            <label htmlFor="create-title" className="text-sm font-medium text-stone-900">
              Judul
            </label>
            <Input
              id="create-title"
              name="title"
              placeholder="Contoh: Konsultasi 30 Menit"
              required
              disabled={isPending}
              className="border-stone-200 text-stone-900 placeholder:text-stone-400 focus-visible:ring-emerald-600"
            />
          </div>

          {/* ─── Deskripsi event (opsional) ───────────────────────────────
              Ditampilkan di halaman booking publik sebagai keterangan event. */}
          <div className="space-y-2">
            <label htmlFor="create-desc" className="text-sm font-medium text-stone-900">
              Deskripsi
              <span className="ml-1.5 text-xs font-normal text-stone-400">(opsional)</span>
            </label>
            <Textarea
              id="create-desc"
              name="description"
              placeholder="Jelaskan tujuan dan agenda meeting ini..."
              disabled={isPending}
              className="min-h-20 border-stone-200 text-stone-900 placeholder:text-stone-400 focus-visible:ring-emerald-600"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* ─── Durasi meeting ───────────────────────────────────────────
                Menggunakan DurationPicker (pill buttons + opsi custom).
                Nilai dikirim ke server via hidden input bernama "duration". */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-900">Durasi</label>
              <DurationPicker name="duration" defaultValue={30} disabled={isPending} />
            </div>

            {/* ─── Tipe lokasi ──────────────────────────────────────────────
                Mengontrol section kondisional di bawah:
                - ONLINE  → pilih platform + input link
                - OFFLINE → PlaceAutocomplete untuk cari lokasi */}
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

          {/* ─── Section kondisional: ONLINE ─────────────────────────────────
              Tampil saat user memilih tipe lokasi ONLINE.
              User pilih platform meeting + opsional isi link langsung. */}
          {selectedLocationType === "ONLINE" ? (
            <div className="space-y-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
              {/* Pilih platform: Google Meet, Zoom, Jitsi, atau Lainnya */}
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

              {/* Input link meeting langsung (opsional) */}
              <div className="space-y-2">
                <label htmlFor="create-link" className="text-sm font-medium text-stone-900">
                  Link Meeting
                  <span className="ml-1.5 text-xs font-normal text-stone-400">(opsional)</span>
                </label>
                <Input
                  id="create-link"
                  name="locationDetails"
                  placeholder="https://meet.google.com/xxx-yyyy-zzz"
                  disabled={isPending}
                  className="border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus-visible:ring-emerald-600"
                />
              </div>
            </div>
          ) : (
            /* ─── Section kondisional: OFFLINE ─────────────────────────────
               Tampil saat user memilih tipe lokasi OFFLINE.
               Menggunakan PlaceAutocomplete yang terhubung ke Nominatim API. */
            <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-900">
                  Lokasi Meeting
                </label>
                {/* PlaceAutocomplete mengelola pencarian + hidden input secara internal.
                    Nilai yang dikirim ke server adalah alamat lengkap pilihan user. */}
                <PlaceAutocomplete
                  name="locationDetails"
                  disabled={isPending}
                  placeholder="Ketik nama tempat, contoh: Kopi Kenangan..."
                />
              </div>
              <p className="text-xs text-stone-400">
                Cari nama coffee shop, restoran, kantor, atau gedung di seluruh Indonesia.
              </p>
            </div>
          )}

          {/* Pesan error dari server action (jika ada) */}
          {errorMessage && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          {/* Tombol submit */}
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
                "Simpan Event"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
