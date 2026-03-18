"use client";

import { Loader2, MapPin, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ─── Tipe data satu hasil pencarian ─────────────────────────────────────────
// Ini adalah format yang dikembalikan oleh /api/places/search (proxy Nominatim).
type PlaceResult = {
  placeId: string;   // ID unik dari Nominatim (untuk React key)
  name: string;      // Nama pendek tempat, contoh: "Kopi Kenangan"
  address: string;   // Alamat lengkap, contoh: "Kopi Kenangan, Jl. Sudirman, Jakarta Pusat"
  lat: number;       // Latitude GPS
  lng: number;       // Longitude GPS
};

// ─── Props ───────────────────────────────────────────────────────────────────
type PlaceAutocompleteProps = {
  // Nama field di FormData yang akan dikirim ke server action (default: "locationDetails")
  name?: string;
  // Nilai awal saat mode edit (sudah ada lokasi yang tersimpan di database)
  defaultValue?: string;
  // Disabled saat form sedang di-submit
  disabled?: boolean;
  // Placeholder teks di dalam input
  placeholder?: string;
};

// ─── useDebounce ─────────────────────────────────────────────────────────────
// Custom hook untuk menunda pembaruan nilai selama `ms` milidetik.
//
// Mengapa perlu debounce?
// Tanpa debounce, setiap keystroke user langsung memanggil API Nominatim.
// Untuk kata "Kopi Kenangan Jakarta" (21 karakter), itu 21 request.
// Dengan debounce 500ms, hanya 1 request — dikirim 500ms setelah user berhenti mengetik.
function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // Jadwalkan update nilai setelah `ms` ms
    const timer = setTimeout(() => setDebounced(value), ms);
    // Batalkan jadwal sebelumnya jika value berubah lagi sebelum timer habis
    return () => clearTimeout(timer);
  }, [value, ms]);

  return debounced;
}

// ─── PlaceAutocomplete ────────────────────────────────────────────────────────
// Input pencarian tempat dengan dropdown hasil dari OpenStreetMap/Nominatim.
//
// Alur kerja:
// 1. User ketik nama tempat di input → debounce 500ms
// 2. Setelah 500ms, fetch ke /api/places/search?q={teks}
// 3. API route server kita meneruskan ke Nominatim dengan User-Agent yang valid
// 4. Hasil ditampilkan sebagai dropdown di bawah input
// 5. User klik hasil → nama pendek tampil di input, alamat lengkap masuk hidden input
// 6. Hidden input ikut dikirim ke server action saat form di-submit
//
// Mengapa ada dua nilai (query + selectedValue)?
// - `query` = teks yang tampil di input (nama pendek, mudah dibaca user)
// - `selectedValue` = nilai yang dikirim ke DB (alamat lengkap, lebih informatif)
export function PlaceAutocomplete({
  name = "locationDetails",
  defaultValue = "",
  disabled = false,
  placeholder = "Cari nama tempat atau alamat...",
}: PlaceAutocompleteProps) {
  // Teks yang sedang diketik user di input (yang tampil di layar)
  const [query, setQuery] = useState(defaultValue);

  // Hasil pencarian dari API — array of PlaceResult
  const [results, setResults] = useState<PlaceResult[]>([]);

  // Status loading: true saat sedang menunggu respons dari /api/places/search
  const [loading, setLoading] = useState(false);

  // Nilai akhir yang akan dikirim ke server (alamat lengkap dari Nominatim).
  // Diisi saat user memilih salah satu hasil dari dropdown.
  // Jika user belum memilih, nilai ini sama dengan query (teks bebas).
  const [selectedValue, setSelectedValue] = useState(defaultValue);

  // Apakah dropdown hasil pencarian sedang terbuka
  const [open, setOpen] = useState(false);

  // Ref ke container element untuk deteksi klik di luar komponen
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce query: tunda 500ms setelah user berhenti mengetik sebelum fetch API
  const debouncedQuery = useDebounce(query, 500);

  // ─── Tutup dropdown saat klik di luar komponen ─────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Jika klik berada di luar elemen container, tutup dropdown
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    // Cleanup: hapus event listener saat komponen di-unmount
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── Fetch hasil pencarian saat debouncedQuery berubah ─────────────────
  useEffect(() => {
    // Jangan fetch jika:
    // - Query terlalu pendek (kurang dari 3 karakter)
    // - Query sama dengan nilai yang sudah dipilih (user tidak mengetik ulang)
    if (debouncedQuery.length < 3 || debouncedQuery === selectedValue) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);

    fetch(`/api/places/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data.results) ? data.results : [];
        setResults(list);
        // Buka dropdown hanya jika ada hasil
        setOpen(list.length > 0);
      })
      .catch(() => {
        // Jika API error, kosongkan hasil tapi jangan crash
        setResults([]);
        setOpen(false);
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery, selectedValue]);

  // ─── Handler: user memilih salah satu hasil dropdown ───────────────────
  const handleSelect = (place: PlaceResult) => {
    // Tampilkan nama pendek di input (lebih rapi di UI)
    setQuery(place.name);
    // Simpan alamat lengkap sebagai nilai yang dikirim ke DB
    setSelectedValue(place.address);
    // Tutup dropdown dan bersihkan hasil
    setResults([]);
    setOpen(false);
  };

  // ─── Handler: tombol X untuk menghapus pilihan ─────────────────────────
  const handleClear = () => {
    setQuery("");
    setSelectedValue("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* ─── Hidden input ─────────────────────────────────────────────────
          Menyimpan nilai yang sesungguhnya dikirim ke server action.
          Jika user sudah memilih dari dropdown → berisi alamat lengkap.
          Jika user ketik manual → berisi teks query (fallback teks bebas). */}
      <input
        type="hidden"
        name={name}
        value={selectedValue || query}
      />

      {/* ─── Input yang terlihat user ─────────────────────────────────────
          Ini hanya untuk tampilan — nilainya TIDAK dikirim ke server.
          Yang dikirim adalah hidden input di atas. */}
      <div className="relative">
        {/* Ikon pin lokasi di sisi kiri */}
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // Reset selectedValue agar hidden input tidak mengirim nilai lama
            // saat user mengedit ulang setelah memilih dari dropdown
            setSelectedValue("");
          }}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off" // Matikan autocomplete browser agar tidak bentrok dengan dropdown kita
          className={cn(
            "w-full rounded-md border border-stone-200 bg-white py-2 pl-9 pr-9 text-sm text-stone-900",
            "placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500",
            disabled && "cursor-not-allowed opacity-50",
          )}
        />

        {/* Spinner loading: tampil saat menunggu hasil dari API */}
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-stone-400" />
        )}

        {/* Tombol clear: tampil saat ada teks dan tidak sedang loading */}
        {!loading && query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
            aria-label="Hapus lokasi"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ─── Dropdown hasil pencarian ─────────────────────────────────────
          Muncul di bawah input saat ada hasil dan open=true.
          z-50 agar muncul di atas konten lain dalam dialog. */}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
          {results.map((place) => (
            <button
              key={place.placeId}
              type="button"
              onClick={() => handleSelect(place)}
              className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors hover:bg-stone-50 active:bg-stone-100"
            >
              {/* Baris 1: nama tempat (pendek, bold) */}
              <span className="text-sm font-medium text-stone-900">{place.name}</span>
              {/* Baris 2: alamat lengkap (kecil, abu) */}
              <span className="line-clamp-1 text-xs text-stone-400">{place.address}</span>
            </button>
          ))}

          {/* ─── Atribusi OpenStreetMap ──────────────────────────────────
              WAJIB ditampilkan sesuai lisensi ODbL OpenStreetMap.
              Jika tidak ditampilkan, melanggar syarat penggunaan layanan. */}
          <div className="border-t border-stone-100 px-4 py-2">
            <span className="text-xs text-stone-400">
              ©{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                OpenStreetMap
              </a>{" "}
              contributors
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
