// ─── SettingsPage ────────────────────────────────────────────────────────────
// Halaman pengaturan profil user (nama + slug).
// Route: /dashboard/settings
//
// Pola: server component mengambil data → kirim ke SettingsForm (client component).
// Pemisahan ini penting: server component bisa query DB, client component bisa
// pakai hooks React (useState, useActionState).

import { redirect } from "next/navigation";
import { getRequiredUserId } from "@/lib/session";
import { getSettingsData } from "@/server/queries/dashboard";
import { SettingsForm } from "@/components/dashboard/SettingsForm";

export default async function SettingsPage() {
  // getRequiredUserId: ambil userId dari session, redirect ke /login jika belum login
  const userId = await getRequiredUserId();

  // Ambil data profil yang akan di-prefill ke form
  const user = await getSettingsData(userId);
  if (!user) redirect("/login");

  return (
    <section className="space-y-6">
      {/* Header halaman */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xl font-semibold text-stone-900">Pengaturan Profil</p>
        <p className="mt-1 text-sm text-stone-500">
          Atur nama dan username publik Anda. Username akan tampil di URL halaman booking.
        </p>
      </div>

      {/* Form profil — client component dengan useActionState */}
      <div className="max-w-lg rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <SettingsForm
          name={user.name}
          email={user.email}
          slug={user.slug}
          waNumber={user.waNumber ?? null}
          bio={user.bio ?? null}
        />
      </div>
    </section>
  );
}
