import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SettingsForm } from "@/components/dashboard/SettingsForm";

// ─── SettingsPage ────────────────────────────────────────────────────────────
// Halaman server component untuk pengaturan profil user.
// Mengambil data user dari database, lalu render SettingsForm (client component).
// Route: /dashboard/settings
export default async function SettingsPage() {
  // Pastikan user sudah login
  const session = await auth();
  if (!session) redirect("/");

  // Ambil userId dari session (dengan fallback email lookup)
  let userId = (session.user as { id?: string } | undefined)?.id;
  if (!userId && session.user?.email) {
    const u = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    userId = u?.id;
  }
  if (!userId) redirect("/");

  // Ambil data profil user saat ini dari database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, slug: true },
  });

  if (!user) redirect("/");

  return (
    <section className="space-y-6">
      {/* Header halaman */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xl font-semibold text-stone-900">Pengaturan Profil</p>
        <p className="mt-1 text-sm text-stone-500">
          Atur nama dan username publik Anda. Username akan tampil di URL halaman booking.
        </p>
      </div>

      {/* Card form profil */}
      <div className="max-w-lg rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <SettingsForm name={user.name} email={user.email} slug={user.slug} />
      </div>
    </section>
  );
}
