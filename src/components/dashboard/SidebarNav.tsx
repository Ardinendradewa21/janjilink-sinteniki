"use client";

import type { LucideIcon } from "lucide-react";
import { BarChart3, CalendarCheck, Clock, Link as LinkIcon, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── Definisi menu sidebar ──────────────────────────────────────────────────
// Setiap item memetakan label, path, dan ikon di sidebar dashboard.
type SidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const sidebarItems: SidebarItem[] = [
  { label: "Event Types",  href: "/dashboard",             icon: LinkIcon      },
  { label: "Bookings",     href: "/dashboard/bookings",    icon: CalendarCheck },
  { label: "Analytics",   href: "/dashboard/analytics",   icon: BarChart3     },
  { label: "Ketersediaan", href: "/dashboard/availability", icon: Clock        },
  { label: "Pengaturan",  href: "/dashboard/settings",    icon: Settings      },
];

// ─── SidebarNav ──────────────────────────────────────────────────────────────
// Client component agar bisa menggunakan usePathname() untuk highlight menu aktif.
// Dipakai di layout dashboard (desktop sidebar + mobile sheet).
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {sidebarItems.map((item) => {
        // Cek apakah menu ini aktif berdasarkan pathname saat ini.
        // "/dashboard" harus exact match agar tidak bentrok dengan sub-routes.
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-emerald-50 text-emerald-700"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
