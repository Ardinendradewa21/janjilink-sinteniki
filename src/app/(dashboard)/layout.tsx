import { LogOut } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth, signOut } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomTabBar } from "@/components/dashboard/BottomTabBar";

// Utility sederhana untuk fallback inisial ketika image user tidak tersedia.
function getInitials(name?: string | null) {
  if (!name) return "JL";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "JL";

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Ambil session di server agar halaman dashboard hanya bisa diakses user login.
  const session = await auth();

  // Jika belum login, paksa kembali ke landing page.
  if (!session) {
    redirect("/");
  }

  // Ambil userId dari token JWT (di-inject oleh jwt callback di lib/auth.ts)
  const userId = (session.user as { id?: string }).id;

  // Cek status onboarding langsung dari DB — tidak mengandalkan JWT agar selalu akurat.
  // JWT bisa "stale" jika onboardingCompleted baru diubah setelah token diterbitkan.
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompleted: true },
    });
    // Jika user belum selesai onboarding, arahkan ke wizard sebelum masuk dashboard
    if (!user?.onboardingCompleted) {
      redirect("/onboarding");
    }
  }

  const userName = session.user?.name ?? "Host";
  const userEmail = session.user?.email ?? "Tanpa email";
  const userImage = session.user?.image ?? undefined;

  // Server action untuk logout user dari dashboard.
  const logoutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/" });
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* ─── Sidebar desktop (lg ke atas) ────────────────────────────────────
          Di mobile digantikan oleh BottomTabBar.
          fixed + inset-y-0: menempel penuh di kiri layar, tidak ikut scroll. */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-stone-200 bg-white lg:flex">
        <div className="border-b border-stone-200 px-6 py-5">
          <Link href="/" className="text-lg font-semibold tracking-tight text-stone-900">
            JanjiLink
          </Link>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <SidebarNav />
          <form action={logoutAction} className="mt-auto pt-4">
            <Button
              type="submit"
              variant="outline"
              className="w-full justify-start border-stone-200 text-stone-700 hover:bg-stone-100 hover:text-stone-900"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </form>
        </div>
      </aside>

      {/* ─── Wrapper konten utama ─────────────────────────────────────────────
          lg:pl-72: geser ke kanan selebar sidebar di desktop.
          Di mobile tidak ada padding kiri (sidebar disembunyikan). */}
      <div className="flex min-h-screen flex-col lg:pl-72">
        {/* ─── Header atas ──────────────────────────────────────────────────
            Di mobile: tampilkan logo JanjiLink + avatar user (tanpa hamburger).
            Di desktop: tampilkan label "Panel Host" + avatar. */}
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-stone-50/95 backdrop-blur-sm">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:h-16 lg:px-8">
            {/* Logo JanjiLink — hanya di mobile (di desktop ada di sidebar) */}
            <Link
              href="/dashboard"
              className="text-base font-bold tracking-tight text-stone-900 lg:hidden"
            >
              JanjiLink
            </Link>

            <p className="hidden text-sm font-medium text-stone-500 lg:block">Panel Host</p>

            {/* Avatar user + nama (desktop only) */}
            <div className="flex items-center gap-3 rounded-full border border-stone-200 bg-white px-2.5 py-1.5 shadow-sm">
              <Avatar className="h-7 w-7 lg:h-8 lg:w-8">
                <AvatarImage src={userImage} alt={userName} />
                <AvatarFallback className="bg-emerald-100 text-xs font-semibold text-emerald-700">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-semibold text-stone-900">{userName}</p>
                <p className="text-xs text-stone-500">{userEmail}</p>
              </div>
            </div>
          </div>
        </header>

        {/* ─── Konten halaman ───────────────────────────────────────────────
            pb-24 lg:pb-8: tambah padding bawah di mobile agar konten tidak
            tertutup BottomTabBar (64px bar + safe area). Di desktop tidak perlu. */}
        <main className="flex-1 bg-stone-50 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>

      {/* ─── Bottom Tab Bar (mobile only) ────────────────────────────────────
          Dirender di luar flex column agar fixed positioning bekerja dengan benar.
          lg:hidden memastikan hanya muncul di layar kecil. */}
      <BottomTabBar />
    </div>
  );
}
