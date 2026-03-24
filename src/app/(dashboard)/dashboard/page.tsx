// ─── Dashboard Home ───────────────────────────────────────────────────────────
// Halaman utama dashboard host.
// Route: /dashboard
//
// Menampilkan: sambutan, My Link (URL publik), tombol buat event, daftar event types.
// Data di-fetch via getDashboardData() dari query layer — halaman ini murni rendering.

import { getRequiredUserId } from "@/lib/session";
import { getDashboardData, getDashboardStats } from "@/server/queries/dashboard";
import { CreateEventDialog } from "@/components/dashboard/CreateEventDialog";
import { CopyLinkButton } from "@/components/dashboard/CopyLinkButton";
import { EventTypeCard } from "@/components/dashboard/EventTypeCard";
import { auth } from "@/lib/auth";
import { CalendarPlus, Eye, Link2, Plus } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

export default async function DashboardHomePage() {
  const userId = await getRequiredUserId();

  // Jalankan semua query paralel untuk performa optimal
  const [{ eventTypes, slug }, stats, session] = await Promise.all([
    getDashboardData(userId),
    getDashboardStats(userId),
    auth(),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const firstName = session?.user?.name?.split(" ")[0] ?? "Host";

  return (
    <section className="space-y-5">
      {/* Sapaan user */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-stone-500">Selamat datang, {firstName}!</p>
        <p className="mt-0.5 text-xl font-semibold text-stone-900">
          Kelola jadwal meeting kamu dari sini.
        </p>
      </div>

      {/* ─── Quick Stats Strip ─────────────────────────────────────────────────
          3 angka paling penting: hari ini, minggu ini, menunggu konfirmasi.
          Dibuat sebagai grid 3 kolom agar terbaca cepat (one-glance). */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Hari ini",    value: stats.todayCount,   accent: false },
          { label: "Minggu ini",  value: stats.weekCount,    accent: false },
          { label: "Menunggu",    value: stats.pendingCount, accent: stats.pendingCount > 0 },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            className={`rounded-xl border p-4 shadow-sm ${
              accent
                ? "border-amber-200 bg-amber-50"
                : "border-stone-200 bg-white"
            }`}
          >
            <p className={`text-2xl font-bold ${accent ? "text-amber-700" : "text-stone-900"}`}>
              {value}
            </p>
            <p className={`mt-0.5 text-xs font-medium ${accent ? "text-amber-600" : "text-stone-500"}`}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* ─── Quick Action Chips ────────────────────────────────────────────────
          Shortcut navigasi cepat: lihat profil publik + link ke booking list.
          Horizontal scroll di mobile agar tidak memakan ruang vertikal. */}
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link
          href={`/${slug}`}
          target="_blank"
          className="tap-scale inline-flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Eye className="h-3.5 w-3.5" />
          Lihat Profil
        </Link>
        <Link
          href="/dashboard/bookings"
          className="tap-scale inline-flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Link2 className="h-3.5 w-3.5" />
          Semua Booking
        </Link>
        <Link
          href="/dashboard/availability"
          className="tap-scale inline-flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Atur Jadwal
        </Link>
      </div>

      {/* ─── My Link ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
            My Link
          </p>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-sm font-semibold text-stone-900 sm:text-base">
              janjilink.com/{slug}
            </p>
            <CopyLinkButton slug={slug} />
          </div>
        </div>
        <CreateEventDialog />
      </div>

      {/* Grid event types */}
      {eventTypes.length === 0 ? (
        <EmptyState
          icon={<CalendarPlus className="h-10 w-10 text-stone-300" />}
          title="Belum ada jadwal"
          description="Buat event pertama kamu agar tamu bisa langsung booking waktu bersamamu."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {eventTypes.map((et) => (
            <EventTypeCard
              key={et.id}
              id={et.id}
              title={et.title}
              description={et.description}
              duration={et.duration}
              locationType={et.locationType}
              platform={et.platform}
              locationDetails={et.locationDetails}
              isActive={et.isActive}
              username={slug}
              appUrl={appUrl}
            />
          ))}
        </div>
      )}
    </section>
  );
}
