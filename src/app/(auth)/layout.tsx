import Link from "next/link";
import type { ReactNode } from "react";

// Layout sederhana untuk halaman autentikasi (login & register).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      {/* Navbar minimal */}
      <header className="border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-stone-900">
            JanjiLink
          </Link>
        </div>
      </header>

      {/* Konten form terpusat */}
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        {children}
      </main>
    </div>
  );
}
