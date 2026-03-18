import { type NextRequest, NextResponse } from "next/server";

// ─── Tipe data hasil dari Nominatim API ──────────────────────────────────────
// Nominatim adalah layanan geocoding resmi OpenStreetMap — sepenuhnya gratis.
// Dokumentasi: https://nominatim.org/release-docs/develop/api/Search/
type NominatimResult = {
  place_id: number;
  display_name: string; // Alamat lengkap (nama, jalan, kota, provinsi, negara)
  name: string;         // Nama tempat saja (tanpa alamat lengkap)
  lat: string;          // Latitude sebagai string dari Nominatim
  lon: string;          // Longitude sebagai string dari Nominatim
};

// ─── GET /api/places/search ───────────────────────────────────────────────────
// Proxy endpoint yang meneruskan permintaan pencarian ke Nominatim OpenStreetMap.
//
// Mengapa perlu proxy?
//   1. Nominatim mewajibkan header User-Agent yang valid — tidak bisa dari browser langsung
//   2. Menyembunyikan implementasi (nanti bisa diganti ke Google Maps tanpa ubah frontend)
//   3. Bisa menambahkan cache di sisi server agar tidak spam API eksternal
//
// Cara pakai: GET /api/places/search?q=Kopi+Kenangan+Jakarta
// Response: { results: [{ placeId, name, address, lat, lng }] }
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  // Tidak perlu query ke API jika teks terlalu pendek (hemat request ke Nominatim)
  if (!q || q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  // Bangun URL query ke Nominatim dengan parameter yang tepat
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");      // Format respons JSON
  url.searchParams.set("limit", "6");          // Maksimal 6 hasil
  url.searchParams.set("addressdetails", "1"); // Sertakan detail alamat
  url.searchParams.set("countrycodes", "id");  // Prioritaskan hasil di Indonesia

  try {
    const response = await fetch(url.toString(), {
      headers: {
        // ⚠️ WAJIB oleh Nominatim Terms of Service:
        // Setiap request harus menyertakan User-Agent yang mengidentifikasi aplikasi.
        // Tanpa ini, request akan diblokir oleh server Nominatim.
        "User-Agent": "JanjiLink/1.0 (platform penjadwalan meeting Indonesia)",
        // Prioritaskan hasil berbahasa Indonesia
        "Accept-Language": "id,en;q=0.9",
      },
      // Cache hasil di server selama 60 detik.
      // Jika dua user mencari kata yang sama dalam 60 detik, hanya 1 request ke Nominatim.
      next: { revalidate: 60 },
    });

    // Jika Nominatim tidak bisa dihubungi, kembalikan array kosong (graceful degradation)
    if (!response.ok) {
      console.error(`[places/search] Nominatim error: ${response.status}`);
      return NextResponse.json({ results: [] });
    }

    const data: NominatimResult[] = await response.json();

    // Format ulang hasil Nominatim ke struktur yang lebih bersih untuk komponen frontend.
    // Kita pisahkan 'name' (pendek) dari 'address' (lengkap) agar UI lebih rapi.
    const results = data.map((item) => ({
      placeId: String(item.place_id),

      // Nama tempat pendek: ambil dari field 'name' jika ada,
      // atau ambil bagian pertama sebelum koma dari 'display_name'
      name: item.name?.trim() || item.display_name.split(",")[0].trim(),

      // Alamat lengkap: tampilkan di baris kedua dropdown sebagai keterangan lokasi
      address: item.display_name,

      // Koordinat GPS: berguna nanti untuk embed peta atau buka di aplikasi maps
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));

    return NextResponse.json({ results });
  } catch (error) {
    // Tangkap error jaringan (Nominatim down, timeout, dll)
    // Jangan crash aplikasi — cukup kembalikan kosong
    console.error("[places/search] Network error:", error);
    return NextResponse.json({ results: [] });
  }
}
