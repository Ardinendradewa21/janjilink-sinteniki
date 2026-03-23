"use server";

// ─── Server Actions untuk Onboarding Wizard ───────────────────────────────────
// Fase 6: Onboarding Flow — dipanggil dari OnboardingWizard (client component).
// Tiap action menangani satu step dalam wizard 3 langkah.
// Setelah step 3 selesai, completeOnboarding() menandai user sudah siap
// dan mengarahkan ke dashboard.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { LocationType, PlatformType } from "@prisma/client";

// Tipe hasil tiap step: null = belum ada state, error = gagal, success = berhasil.
// Pola ini kompatibel dengan useActionState maupun pemanggilan langsung via useTransition.
type StepResult = { error: string } | { success: true } | null;

// Helper: ambil userId dari session, dengan fallback ke email jika token JWT belum menyimpan id.
async function getUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;

  // Coba ambil id dari token JWT (sudah di-inject oleh jwt callback di lib/auth.ts)
  const tokenId = (session.user as { id?: string }).id;
  if (tokenId) return tokenId;

  // Fallback: query DB via email (terjadi kalau session baru saja dibuat)
  if (session.user.email) {
    const u = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    return u?.id ?? null;
  }

  return null;
}

// ─── Step 1: Simpan Profil (nama + slug) ─────────────────────────────────────
// User memilih nama tampilan dan slug URL publik mereka (janjilink.com/slug-kamu).
// Validasi: nama min 2 karakter, slug lowercase alphanumeric+strip, 3–30 karakter, unik.
export async function saveProfileStep(
  _prevState: StepResult,
  formData: FormData,
): Promise<StepResult> {
  const userId = await getUserId();
  if (!userId) return { error: "Sesi tidak valid. Silakan login ulang." };

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const slug = (formData.get("slug") as string | null)?.trim().toLowerCase() ?? "";
  // bio dan useCaseType dari step 0 (dikirim sebagai hidden input)
  const bio = (formData.get("bio") as string | null)?.trim() ?? "";
  const useCaseType = (formData.get("useCaseType") as string | null)?.trim() ?? "";

  // Validasi nama
  if (name.length < 2) return { error: "Nama minimal 2 karakter." };

  // Slug harus: diawali/diakhiri huruf atau angka, boleh ada strip di tengah, 3–30 karakter
  const slugRegex = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
  if (!slugRegex.test(slug)) {
    return {
      error:
        "Link harus 3–30 karakter, huruf kecil/angka, boleh pakai strip (-) di tengah. Contoh: budi-santoso",
    };
  }

  // Pastikan slug belum dipakai user lain
  const duplicate = await prisma.user.findFirst({
    where: { slug, NOT: { id: userId } },
  });
  if (duplicate) return { error: "Link ini sudah dipakai. Coba nama lain." };

  // Simpan nama, slug, bio, dan useCaseType ke DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.user.update as any)({
    where: { id: userId },
    data: {
      name,
      slug,
      bio: bio || null,
      useCaseType: useCaseType || null,
    },
  });

  return { success: true };
}

// ─── Step 2: Simpan Ketersediaan ─────────────────────────────────────────────
// User mengatur jam kerja per hari dalam seminggu (0=Minggu … 6=Sabtu).
// FormData dikirim dengan format: day_0_active="on", day_0_start="09:00", day_0_end="17:00"
// Strategi penyimpanan: hapus semua record lama, insert 7 record baru (replace-all).
export async function saveAvailabilityStep(
  _prevState: StepResult,
  formData: FormData,
): Promise<StepResult> {
  const userId = await getUserId();
  if (!userId) return { error: "Sesi tidak valid." };

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const days = [];

  for (let i = 0; i < 7; i++) {
    // Hari yang aktif ditandai dengan value "on" (sama dengan checkbox HTML standar)
    const isActive = formData.get(`day_${i}_active`) === "on";
    const startTime = (formData.get(`day_${i}_start`) as string | null) ?? "09:00";
    const endTime = (formData.get(`day_${i}_end`) as string | null) ?? "17:00";

    if (isActive) {
      // Validasi format HH:MM
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        return { error: `Format waktu hari ke-${i} tidak valid. Gunakan HH:MM.` };
      }
      // Validasi jam mulai harus sebelum jam selesai
      if (startTime >= endTime) {
        return { error: "Jam mulai harus lebih awal dari jam selesai." };
      }
    }

    days.push({ dayOfWeek: i, isActive, startTime, endTime, userId });
  }

  // Replace-all: hapus lama → insert baru
  await prisma.availability.deleteMany({ where: { userId } });
  await prisma.availability.createMany({ data: days });

  return { success: true };
}

// ─── Step 3: Buat Event Type Pertama ─────────────────────────────────────────
// Membuat template meeting pertama untuk user.
// Field: judul, durasi (menit), tipe lokasi (ONLINE/OFFLINE), platform (opsional).
export async function saveEventStep(
  _prevState: StepResult,
  formData: FormData,
): Promise<StepResult> {
  const userId = await getUserId();
  if (!userId) return { error: "Sesi tidak valid." };

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const rawDuration = formData.get("duration") as string | null;
  const duration = parseInt(rawDuration ?? "30", 10);
  const rawType = formData.get("locationType") as string | null;
  const locationType: LocationType = rawType === "OFFLINE" ? "OFFLINE" : "ONLINE";
  const rawPlatform = formData.get("platform") as string | null;

  if (title.length < 2) return { error: "Nama event minimal 2 karakter." };
  if (isNaN(duration) || duration < 5 || duration > 480) {
    return { error: "Durasi harus antara 5 sampai 480 menit." };
  }

  // Platform hanya relevan untuk meeting ONLINE
  const validPlatforms: PlatformType[] = ["ZOOM", "GOOGLE_MEET", "JITSI", "OTHER"];
  const platform: PlatformType | null =
    locationType === "ONLINE" && rawPlatform && validPlatforms.includes(rawPlatform as PlatformType)
      ? (rawPlatform as PlatformType)
      : null;

  await prisma.eventType.create({
    data: {
      title,
      duration,
      locationType,
      platform,
      userId,
    },
  });

  return { success: true };
}

// ─── Selesaikan Onboarding ────────────────────────────────────────────────────
// Dipanggil setelah step 3 berhasil.
// Menandai onboardingCompleted = true di DB, lalu redirect ke /dashboard.
// Menggunakan redirect() yang melempar NEXT_REDIRECT — harus di-re-throw oleh caller.
export async function completeOnboarding(): Promise<never> {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompleted: true },
  });

  // Invalidasi cache layout dashboard supaya pengecekan onboardingCompleted membaca data terbaru
  revalidatePath("/dashboard", "layout");

  // Redirect ke dashboard — Next.js menangani ini sebagai respons navigasi (bukan throw biasa)
  redirect("/dashboard");
}
