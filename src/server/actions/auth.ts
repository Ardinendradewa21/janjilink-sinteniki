"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── Register ────────────────────────────────────────────────────────────────

type AuthState = { error: string } | null;

// Server Action untuk mendaftarkan user baru lalu auto-login.
// Menggunakan pattern useActionState (React 19) agar error bisa ditampilkan di form.
export async function registerAction(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  const confirmPassword = (formData.get("confirmPassword") as string | null) ?? "";

  // Validasi input
  if (name.length < 2) return { error: "Nama minimal 2 karakter." };
  if (!email.includes("@")) return { error: "Format email tidak valid." };
  if (password.length < 6) return { error: "Password minimal 6 karakter." };
  if (password !== confirmPassword) return { error: "Konfirmasi password tidak cocok." };

  // Cek duplikasi email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Email sudah terdaftar. Silakan login." };

  // Hash password sebelum disimpan ke database
  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: { name, email, password: hashedPassword },
  });

  // Auto login setelah registrasi — signIn akan melempar NEXT_REDIRECT jika berhasil.
  // Diarahkan ke /onboarding bukan /dashboard karena user baru belum setup profil/availability.
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/onboarding",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Registrasi berhasil. Silakan login manual." };
    }
    // Re-throw NEXT_REDIRECT agar Next.js menangani redirect
    throw error;
  }

  return null;
}

// ─── Login ───────────────────────────────────────────────────────────────────

// Server Action untuk login dengan email + password.
export async function loginAction(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  try {
    await signIn("credentials", {
      email: (formData.get("email") as string | null)?.trim().toLowerCase() ?? "",
      password: (formData.get("password") as string | null) ?? "",
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email atau password salah." };
    }
    // Re-throw NEXT_REDIRECT agar Next.js menangani redirect
    throw error;
  }

  return null;
}
