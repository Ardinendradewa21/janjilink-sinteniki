"use client";

// ─── BottomTabBar ─────────────────────────────────────────────────────────────
// Bottom navigation bar khusus mobile (lg:hidden).
// Menggantikan hamburger menu + sidebar sheet di layar kecil.
//
// Struktur tab:
//   [Beranda] [Booking] [+ FAB] [Analitik] [Profil]
//
// FAB (Floating Action Button) di tengah membuka dialog "Buat Event Baru"
// agar tindakan paling sering dilakukan bisa diakses dalam 1 tap.
//
// Konvensi navigasi:
//   - Beranda    → /dashboard (exact match)
//   - Booking    → /dashboard/bookings
//   - Analitik   → /dashboard/analytics
//   - Profil     → /dashboard/settings
//
// Safe area: height 64px + env(safe-area-inset-bottom) agar tidak
// tertutup home indicator iPhone/Android.

import { BarChart3, CalendarCheck, Home, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CreateEventDialog } from "@/components/dashboard/CreateEventDialog";

// ─── Definisi tab navigasi (tanpa FAB di tengah) ─────────────────────────────
const TABS = [
  { label: "Beranda",  href: "/dashboard",            icon: Home         },
  { label: "Booking",  href: "/dashboard/bookings",   icon: CalendarCheck },
  // Slot tengah dikosongkan untuk FAB
  { label: "Analitik", href: "/dashboard/analytics",  icon: BarChart3    },
  { label: "Profil",   href: "/dashboard/settings",   icon: Settings     },
];

export function BottomTabBar() {
  const pathname = usePathname();

  // State untuk mengontrol apakah dialog buat event sedang terbuka.
  // Dikelola di sini agar FAB bisa memicu dialog tanpa perlu navigasi halaman.
  const [createOpen, setCreateOpen] = useState(false);

  // Tentukan apakah sebuah tab aktif berdasarkan pathname saat ini.
  // "/dashboard" harus exact match agar tidak ikut aktif di sub-routes.
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <>
      {/* ─── Bottom Tab Bar ───────────────────────────────────────────────── */}
      {/* fixed bottom-0: menempel di bawah layar selalu (tidak ikut scroll)
          z-40: di atas konten halaman, di bawah modal/dialog
          shadow-[0_-1px_0_...]: border tipis di atas bar (pengganti border-t)
          pb-safe-bottom: clearance untuk home indicator HP modern */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-end bg-white lg:hidden"
        style={{
          boxShadow: "0 -1px 0 0 rgba(0,0,0,0.06)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="flex h-16 w-full items-center">

          {/* Tab kiri: Beranda + Booking */}
          {TABS.slice(0, 2).map((tab) => (
            <TabItem key={tab.href} tab={tab} active={isActive(tab.href)} />
          ))}

          {/* ─── FAB (Floating Action Button) tengah ─────────────────────── */}
          {/* Naik sedikit di atas bar (negative margin-top) untuk efek float.
              Ukuran 56px sesuai spesifikasi dokumen (lebih besar dari ikon tab biasa).
              Warna emerald-600 = primary action brand JanjiLink. */}
          <div className="flex flex-1 flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="tap-scale flex h-14 w-14 -translate-y-3 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-200 transition-colors hover:bg-emerald-700 active:bg-emerald-800"
              aria-label="Buat event baru"
            >
              <Plus className="h-6 w-6" strokeWidth={2.5} />
            </button>
          </div>

          {/* Tab kanan: Analitik + Profil */}
          {TABS.slice(2).map((tab) => (
            <TabItem key={tab.href} tab={tab} active={isActive(tab.href)} />
          ))}
        </div>
      </nav>

      {/* ─── Dialog Buat Event (dikontrol FAB) ───────────────────────────── */}
      {/* CreateEventDialog sudah punya UI lengkap. Di sini kita render dengan
          open/onOpenChange dikontrol dari state BottomTabBar sehingga FAB
          bisa membukanya tanpa perlu <DialogTrigger> di dalam tab bar. */}
      <CreateEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}

// ─── TabItem ──────────────────────────────────────────────────────────────────
// Satu tab di bottom bar. Menampilkan ikon + label, disorot jika aktif.
function TabItem({
  tab,
  active,
}: {
  tab: { label: string; href: string; icon: React.ElementType };
  active: boolean;
}) {
  return (
    <Link
      href={tab.href}
      className={[
        // flex-1: setiap tab mengisi lebar yang sama
        "tap-scale flex flex-1 flex-col items-center justify-center gap-1 py-2",
        "transition-colors",
        active ? "text-emerald-600" : "text-stone-400",
      ].join(" ")}
    >
      {/* Ikon tab — sedikit lebih besar saat aktif via font-weight ikon */}
      <tab.icon
        className={`h-5 w-5 transition-transform ${active ? "scale-110" : ""}`}
        strokeWidth={active ? 2.5 : 2}
      />
      {/* Label: ukuran 10px (xs) agar muat di layar sempit */}
      <span className="text-[10px] font-medium leading-none">{tab.label}</span>
    </Link>
  );
}
