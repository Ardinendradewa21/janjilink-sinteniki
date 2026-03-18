"use client";

// ─── AnalyticsCharts ──────────────────────────────────────────────────────────
// Kumpulan komponen grafik untuk halaman analytics dashboard.
// Semua grafik dibuat murni dengan CSS (div + height dinamis) tanpa library
// eksternal seperti Recharts/Chart.js, agar tidak menambah bundle size.
//
// Komponen yang tersedia:
//  • MonthlyBarChart — grafik batang booking per bulan (6 bulan terakhir)
//  • EventTypeTable  — tabel performa per event type
//  • PeakHoursChart  — grafik jam paling sering dipesan

import type { MonthlyBooking, EventTypeStats, HourStats } from "@/server/queries/analytics";

// ─── MonthlyBarChart ──────────────────────────────────────────────────────────
// Grafik batang horizontal: setiap bulan tampil sebagai bar dengan dua layer
// (confirmed = hijau, cancelled = merah, pending = abu).
// Tinggi bar proporsional terhadap nilai maksimum dalam dataset.
export function MonthlyBarChart({ data }: { data: MonthlyBooking[] }) {
  // Cari nilai maksimum untuk menormalkan tinggi semua bar ke skala yang sama
  const maxVal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="space-y-4">
      {/* Area grafik batang */}
      <div className="flex h-48 items-end gap-2">
        {data.map((d) => {
          // Hitung persentase tinggi masing-masing segmen
          const confirmedPct = (d.confirmed / maxVal) * 100;
          const cancelledPct = (d.cancelled / maxVal) * 100;
          const pendingPct = Math.max(((d.total - d.confirmed - d.cancelled) / maxVal) * 100, 0);
          const totalPct = (d.total / maxVal) * 100;

          return (
            <div key={d.month} className="group flex flex-1 flex-col items-center gap-1">
              {/* Label jumlah di atas bar */}
              <span className="text-xs font-medium text-stone-500 opacity-0 transition-opacity group-hover:opacity-100">
                {d.total}
              </span>

              {/* Bar: terdiri dari stack segmen warna berbeda */}
              <div
                className="relative w-full overflow-hidden rounded-t-md bg-stone-100 transition-all"
                style={{ height: `${Math.max(totalPct, 4)}%` }}
                title={`${d.label}: ${d.total} booking (${d.confirmed} konfirmasi, ${d.cancelled} batal)`}
              >
                {/* Segmen hijau: CONFIRMED — dari bawah */}
                {d.confirmed > 0 && (
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-emerald-500"
                    style={{ height: `${(confirmedPct / totalPct) * 100}%` }}
                  />
                )}
                {/* Segmen merah: CANCELLED — di atas confirmed */}
                {d.cancelled > 0 && (
                  <div
                    className="absolute left-0 right-0 bg-red-400"
                    style={{
                      bottom: `${(confirmedPct / totalPct) * 100}%`,
                      height: `${(cancelledPct / totalPct) * 100}%`,
                    }}
                  />
                )}
                {/* Segmen abu: PENDING — paling atas */}
                {pendingPct > 0 && (
                  <div
                    className="absolute left-0 right-0 bg-amber-300"
                    style={{
                      bottom: `${((confirmedPct + cancelledPct) / totalPct) * 100}%`,
                      height: `${(pendingPct / totalPct) * 100}%`,
                    }}
                  />
                )}
              </div>

              {/* Label bulan di bawah bar */}
              <span className="text-center text-xs text-stone-400 leading-tight">{d.label}</span>
            </div>
          );
        })}
      </div>

      {/* Legenda warna */}
      <div className="flex flex-wrap gap-4">
        <LegendDot color="bg-emerald-500" label="Dikonfirmasi" />
        <LegendDot color="bg-amber-300" label="Menunggu" />
        <LegendDot color="bg-red-400" label="Dibatalkan" />
      </div>
    </div>
  );
}

// ─── LegendDot ────────────────────────────────────────────────────────────────
// Titik warna + label untuk legenda grafik.
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />
      <span className="text-xs text-stone-500">{label}</span>
    </div>
  );
}

// ─── EventTypeTable ───────────────────────────────────────────────────────────
// Tabel sederhana: satu baris per event type, dengan bar progress horizontal
// menunjukkan completion rate (confirmed / total).
export function EventTypeTable({ data }: { data: EventTypeStats[] }) {
  if (data.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-stone-400">
        Belum ada data event type.
      </p>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="space-y-3">
      {data.map((et) => {
        // Completion rate: confirmed / (confirmed + cancelled), abaikan PENDING
        const decided = et.confirmed + et.cancelled;
        const rate = decided > 0 ? Math.round((et.confirmed / decided) * 100) : null;
        // Lebar bar relatif terhadap event type dengan booking terbanyak
        const barWidth = (et.total / maxTotal) * 100;

        return (
          <div key={et.id} className="space-y-1.5">
            {/* Nama event type + angka */}
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-stone-700">{et.title}</p>
              <div className="flex shrink-0 items-center gap-3 text-xs text-stone-500">
                <span>{et.total} booking</span>
                {rate !== null && (
                  <span className="font-medium text-emerald-600">{rate}% selesai</span>
                )}
              </div>
            </div>

            {/* Bar progress */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── PeakHoursChart ───────────────────────────────────────────────────────────
// Grafik batang horizontal untuk jam-jam paling populer.
// Setiap jam ditampilkan sebagai baris dengan bar lebar proporsional.
export function PeakHoursChart({ data }: { data: HourStats[] }) {
  if (data.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-stone-400">
        Belum cukup data untuk menampilkan jam populer.
      </p>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.hour} className="flex items-center gap-3">
          {/* Label jam */}
          <span className="w-14 shrink-0 text-right text-sm font-medium text-stone-600">
            {d.hour}
          </span>

          {/* Bar */}
          <div className="flex-1 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-6 rounded-full bg-emerald-400 transition-all duration-500"
              style={{ width: `${(d.count / maxCount) * 100}%` }}
            />
          </div>

          {/* Angka */}
          <span className="w-8 shrink-0 text-xs text-stone-400">{d.count}x</span>
        </div>
      ))}
    </div>
  );
}
