// ─── Session Helper ───────────────────────────────────────────────────────────
// Berisi fungsi-fungsi pembantu untuk mengambil data user dari session NextAuth.
//
// Masalah yang diselesaikan:
// Sebelumnya setiap halaman dashboard dan server action menulis ulang blok
// yang sama untuk mendapatkan userId dari session:
//
//   const session = await auth();
//   let userId = (session?.user as { id?: string })?.id;
//   if (!userId && session?.user?.email) { ... prisma lookup ... }
//   if (!userId) redirect("/login");
//
// Dengan helper ini, cukup satu baris: `const userId = await getRequiredUserId()`

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── getRequiredUserId ────────────────────────────────────────────────────────
// Mengambil userId dari session yang sedang aktif.
// Jika belum login → redirect ke /login.
//
// Alur:
// 1. Coba ambil userId langsung dari JWT token (paling cepat, in-memory)
// 2. Jika tidak ada, fallback lookup ke DB berdasarkan email
//    (terjadi saat session dibuat tanpa id, misalnya OAuth pertama kali)
// 3. Jika masih tidak ada → redirect ke halaman login
//
// Dipakai di: semua halaman dashboard (server component) dan beberapa server actions.
export async function getRequiredUserId(): Promise<string> {
  const session = await auth();

  // Coba ambil id dari token JWT — sudah di-inject oleh callback jwt di auth.ts
  let userId = (session?.user as { id?: string } | undefined)?.id;

  // Fallback: cari user di DB berdasarkan email dari session
  // Situasi ini terjadi ketika session tidak menyimpan id secara eksplisit
  if (!userId && session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    userId = user?.id;
  }

  // Jika tetap tidak ditemukan → user belum login, paksa redirect
  if (!userId) redirect("/login");

  return userId;
}

// ─── getOptionalUserId ────────────────────────────────────────────────────────
// Sama seperti getRequiredUserId, tapi TIDAK redirect jika belum login.
// Mengembalikan undefined jika user belum login.
//
// Berguna untuk halaman yang bisa diakses publik tapi menampilkan
// konten berbeda jika user sudah login (contoh: landing page dengan
// tombol "Go to Dashboard" jika sudah login).
export async function getOptionalUserId(): Promise<string | undefined> {
  const session = await auth();

  let userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId && session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    userId = user?.id;
  }

  return userId;
}
