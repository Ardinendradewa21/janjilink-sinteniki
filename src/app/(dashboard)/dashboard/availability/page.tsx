// ─── AvailabilityPage ────────────────────────────────────────────────────────
// Halaman untuk mengatur jam ketersediaan per hari dalam seminggu.
// Route: /dashboard/availability
//
// Pola: server component fetch data → pass ke AvailabilityForm (client component).

import { getRequiredUserId } from "@/lib/session";
import { getAvailabilityData } from "@/server/queries/dashboard";
import { AvailabilityForm } from "@/components/dashboard/AvailabilityForm";

// ─── Default availability ─────────────────────────────────────────────────────
// Dipakai saat user belum pernah menyimpan pengaturan ketersediaan.
// Senin (1) – Sabtu (6): aktif, 09:00–17:00. Minggu (0): nonaktif.
const DEFAULT_DAYS = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  isActive: i >= 1 && i <= 6,
  startTime: "09:00",
  endTime: "17:00",
}));

export default async function AvailabilityPage() {
  const userId = await getRequiredUserId();

  // Ambil data ketersediaan dari DB via query layer
  const availabilities = await getAvailabilityData(userId);

  // Jika 7 baris tersimpan di DB → pakai data DB. Jika belum lengkap → pakai default.
  // Alasan cek 7: replace-all strategy di saveAvailability selalu simpan tepat 7 baris.
  const days =
    availabilities.length === 7
      ? availabilities.map((a) => ({
          dayOfWeek: a.dayOfWeek,
          isActive: a.isActive,
          startTime: a.startTime,
          endTime: a.endTime,
        }))
      : DEFAULT_DAYS;

  return (
    <section className="space-y-6">
      {/* Header halaman */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xl font-semibold text-stone-900">Ketersediaan</p>
        <p className="mt-1 text-sm text-stone-500">
          Atur jam kerja Anda per hari. Slot booking yang tersedia akan mengikuti pengaturan ini.
        </p>
      </div>

      {/* Form ketersediaan — client component dengan 7 baris per hari */}
      <div className="max-w-2xl rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <AvailabilityForm initialDays={days} />
      </div>
    </section>
  );
}
