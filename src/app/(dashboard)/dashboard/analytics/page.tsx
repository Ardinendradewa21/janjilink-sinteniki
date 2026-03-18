// ─── Analytics Dashboard ───────────────────────────────────────────────────────
// Route: /dashboard/analytics
//
// Statistik kinerja host dalam satu tampilan:
//  1. Kartu ringkasan: total booking, bulan ini, completion rate
//  2. Grafik batang booking per bulan (6 bulan terakhir)
//  3. Performa per event type
//  4. Jam paling populer (peak hours WIB)
//
// Data di-fetch via getAnalytics() dari query layer.
// Grafik di-render oleh AnalyticsCharts (client component, CSS murni).

import { BarChart3, CalendarCheck, Clock3, TrendingUp } from "lucide-react";
import { getRequiredUserId } from "@/lib/session";
import { getAnalytics } from "@/server/queries/analytics";
import {
  MonthlyBarChart,
  EventTypeTable,
  PeakHoursChart,
} from "@/components/dashboard/AnalyticsCharts";

export default async function AnalyticsPage() {
  const userId = await getRequiredUserId();

  // Satu fungsi = satu query Prisma yang mengambil semua data yang dibutuhkan
  const data = await getAnalytics(userId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-semibold text-stone-900">Analytics</p>
            <p className="text-sm text-stone-500">
              Pantau performa booking kamu dari waktu ke waktu.
            </p>
          </div>
        </div>
      </div>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<CalendarCheck className="h-5 w-5 text-emerald-600" />}
          label="Total Booking"
          value={data.totalBookings}
          sub="sepanjang waktu"
          accent="emerald"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
          label="Bulan Ini"
          value={data.bookingsThisMonth}
          sub="booking masuk bulan ini"
          accent="blue"
        />
        <StatCard
          icon={<Clock3 className="h-5 w-5 text-amber-600" />}
          label="Completion Rate"
          value={`${data.completionRate}%`}
          sub="dari booking yang dikonfirmasi"
          accent="amber"
        />
      </div>

      {/* Grafik bulanan */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="font-semibold text-stone-900">Booking per Bulan</h2>
          <p className="mt-0.5 text-sm text-stone-500">6 bulan terakhir</p>
        </div>
        <MonthlyBarChart data={data.monthly} />
      </div>

      {/* Grid: event type + peak hours */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="font-semibold text-stone-900">Performa Event Type</h2>
            <p className="mt-0.5 text-sm text-stone-500">
              Event mana yang paling banyak dipesan?
            </p>
          </div>
          <EventTypeTable data={data.byEventType} />
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="font-semibold text-stone-900">Jam Paling Populer</h2>
            <p className="mt-0.5 text-sm text-stone-500">
              Waktu yang paling sering dipilih tamu (WIB)
            </p>
          </div>
          <PeakHoursChart data={data.peakHours} />
        </div>
      </div>

      {/* Empty state */}
      {data.totalBookings === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-10 text-center">
          <BarChart3 className="mx-auto mb-3 h-10 w-10 text-stone-300" />
          <p className="font-semibold text-stone-700">Belum ada data analitik</p>
          <p className="mt-1 text-sm text-stone-500">
            Data akan muncul setelah ada booking masuk dari tamu kamu.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
// Kartu metrik dengan ikon, nilai besar, dan sub-label.
function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
  accent: "emerald" | "blue" | "amber";
}) {
  const bgMap = { emerald: "bg-emerald-50", blue: "bg-blue-50", amber: "bg-amber-50" };

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-stone-900">{value}</p>
          <p className="mt-1 text-xs text-stone-400">{sub}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bgMap[accent]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
