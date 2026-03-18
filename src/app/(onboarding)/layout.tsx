// Layout minimal untuk halaman onboarding.
// Hanya menampilkan logo di atas dan konten wizard di tengah.
// Tidak menggunakan sidebar/header dashboard agar user fokus pada proses setup.

import Link from "next/link";
import type { ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      {/* Header: hanya logo, tanpa navigasi lain supaya user tidak teralihkan */}
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-stone-900 transition-opacity hover:opacity-70"
        >
          JanjiLink
        </Link>
      </header>

      {/* Area konten: wizard ditampilkan di tengah layar secara vertikal dan horizontal */}
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
        {children}
      </main>
    </div>
  );
}
