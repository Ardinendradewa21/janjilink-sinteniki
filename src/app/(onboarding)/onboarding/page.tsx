// Halaman onboarding — server component.
// Dipanggil setelah user registrasi pertama kali.
// Tugasnya:
//   1. Cek apakah user sudah login (jika tidak → redirect ke /login)
//   2. Query DB untuk mendapatkan status onboarding + data awal user
//   3. Jika sudah selesai onboarding → langsung redirect ke /dashboard
//   4. Jika belum → render wizard dengan data awal untuk pre-fill step 1

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata = {
  title: "Selamat Datang — JanjiLink",
  description: "Setup profil dan mulai terima booking dalam 3 langkah mudah.",
};

export default async function OnboardingPage() {
  // Ambil session dari cookie JWT — hanya tersedia jika user sudah login
  const session = await auth();

  // Jika belum login, arahkan ke halaman login
  if (!session?.user) redirect("/login");

  // Ambil id dari token JWT (di-inject oleh jwt callback di lib/auth.ts)
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  // Query DB langsung untuk mendapatkan status onboarding terbaru.
  // Tidak mengandalkan data dari session/JWT karena onboardingCompleted bisa berubah
  // setelah token diterbitkan (misalnya kalau user refresh session).
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      slug: true,
      onboardingCompleted: true,
    },
  });

  // Kalau onboarding sudah selesai (misal user buka /onboarding manual), arahkan ke dashboard
  if (user?.onboardingCompleted) redirect("/dashboard");

  // Cek apakah slug saat ini adalah CUID default (otomatis dari Prisma).
  // CUID: 25 karakter, diawali huruf 'c', semua lowercase alphanumeric.
  // Jika ya, kosongkan agar user memilih slug yang lebih bermakna.
  const isCuid = /^c[a-z0-9]{24}$/.test(user?.slug ?? "");
  const initialSlug = isCuid ? "" : (user?.slug ?? "");

  return (
    <OnboardingWizard
      // Nama dipakai sebagai default value di Step 1
      initialName={user?.name ?? ""}
      // Slug dikosongkan jika masih berupa CUID default
      initialSlug={initialSlug}
    />
  );
}
