"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Tipe Return untuk useActionState ────────────────────────────────────────
// Mengembalikan pesan error ATAU success agar form bisa menampilkan feedback.
type ProfileState = { error?: string; success?: string } | null;

// ─── updateProfile ───────────────────────────────────────────────────────────
// Server Action untuk memperbarui nama dan slug (username publik) user.
// Dipanggil dari halaman /dashboard/settings melalui useActionState.
export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  // Ambil session user yang sedang login
  const session = await auth();
  let userId = (session?.user as { id?: string } | undefined)?.id;

  // Fallback: cari userId dari email jika belum tersedia di token JWT
  if (!userId && session?.user?.email) {
    const u = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    userId = u?.id;
  }

  if (!session || !userId) {
    return { error: "Anda harus login terlebih dahulu." };
  }

  // Baca dan bersihkan input dari form
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const slug = (formData.get("slug") as string | null)?.trim().toLowerCase() ?? "";

  // Validasi nama: minimal 2 karakter agar tidak kosong/absurd
  if (name.length < 2) return { error: "Nama minimal 2 karakter." };

  // Validasi slug: huruf kecil, angka, strip saja, panjang 3–30 karakter.
  // Tidak boleh diawali atau diakhiri strip.
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug)) {
    return {
      error: "Username harus 3–30 karakter, hanya huruf kecil, angka, dan strip (-).",
    };
  }

  // Cek apakah slug sudah dipakai oleh user lain (harus unik)
  const existing = await prisma.user.findFirst({
    where: { slug, id: { not: userId } },
    select: { id: true },
  });

  if (existing) return { error: "Username sudah dipakai oleh pengguna lain." };

  // Simpan perubahan nama dan slug ke database
  await prisma.user.update({
    where: { id: userId },
    data: { name, slug },
  });

  // Refresh cache halaman dashboard agar data terbaru langsung muncul
  revalidatePath("/dashboard", "layout");

  return { success: "Profil berhasil diperbarui." };
}
