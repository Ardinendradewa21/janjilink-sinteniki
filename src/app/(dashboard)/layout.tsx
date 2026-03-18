import { LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth, signOut } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
      {/* Sidebar desktop: fixed di kiri, tampil mulai layar besar */}
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

      <div className="flex min-h-screen flex-col lg:pl-72">
        {/* Header atas: memuat tombol hamburger mobile + profil user dinamis */}
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-stone-50/95 backdrop-blur-sm">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-stone-200 bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Buka menu dashboard</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 border-r border-stone-200 bg-white p-0 sm:max-w-72">
                  <SheetHeader className="border-b border-stone-200 px-5 py-4 text-left">
                    <SheetTitle className="text-base font-semibold text-stone-900">JanjiLink</SheetTitle>
                    <SheetDescription className="text-stone-500">Navigasi panel host.</SheetDescription>
                  </SheetHeader>
                  <div className="p-4">
                    <SidebarNav />
                    <form action={logoutAction} className="mt-4 border-t border-stone-200 pt-4">
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
                </SheetContent>
              </Sheet>
              <span className="text-sm font-semibold text-stone-900">Dashboard</span>
            </div>

            <p className="hidden text-sm font-medium text-stone-500 lg:block">Panel Host</p>

            <div className="flex items-center gap-3 rounded-full border border-stone-200 bg-white px-2.5 py-1.5 shadow-sm">
              <Avatar className="h-8 w-8">
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

        {/* Area utama konten dashboard */}
        <main className="flex-1 bg-stone-50 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
