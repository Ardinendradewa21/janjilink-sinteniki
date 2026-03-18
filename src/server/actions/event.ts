"use server";

import { LocationType, PlatformType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Server Action untuk membuat Event Type baru milik user yang sedang login.
export async function createEventType(formData: FormData) {
  const session = await auth();
  let userId = (session?.user as { id?: string } | undefined)?.id;

  // Fallback untuk session lama yang belum punya user.id: ambil dari email.
  if (!userId && session?.user?.email) {
    const userByEmail = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    userId = userByEmail?.id;
  }

  // Proteksi: hanya user login dengan id valid yang boleh membuat event.
  if (!session || !userId) {
    throw new Error("Anda harus login terlebih dahulu.");
  }

  const titleValue = formData.get("title");
  const descriptionValue = formData.get("description");
  const durationValue = formData.get("duration");
  const locationTypeValue = formData.get("locationType");
  const platformValue = formData.get("platform");
  const locationDetailsValue = formData.get("locationDetails");

  const title = typeof titleValue === "string" ? titleValue.trim() : "";
  const description = typeof descriptionValue === "string" ? descriptionValue.trim() : "";
  const locationDetails = typeof locationDetailsValue === "string" ? locationDetailsValue.trim() : "";
  const duration = Number(durationValue);

  // Validasi input agar data yang disimpan tetap aman dan konsisten.
  if (title.length < 3) {
    throw new Error("Judul event minimal 3 karakter.");
  }

  if (!Number.isInteger(duration) || duration <= 0) {
    throw new Error("Durasi harus berupa angka lebih dari 0.");
  }

  const locationType =
    locationTypeValue === LocationType.ONLINE || locationTypeValue === LocationType.OFFLINE
      ? locationTypeValue
      : null;

  if (!locationType) {
    throw new Error("Tipe lokasi tidak valid.");
  }

  // Platform hanya relevan untuk event online, tapi tetap opsional.
  const platform =
    typeof platformValue === "string" &&
    (platformValue === PlatformType.ZOOM ||
      platformValue === PlatformType.GOOGLE_MEET ||
      platformValue === PlatformType.JITSI ||
      platformValue === PlatformType.OTHER)
      ? platformValue
      : null;

  await prisma.eventType.create({
    data: {
      title,
      description: description.length > 0 ? description : null,
      duration,
      locationType,
      platform: locationType === LocationType.ONLINE ? platform : null,
      locationDetails: locationDetails.length > 0 ? locationDetails : null,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });

  // Revalidate dashboard agar list event langsung ter-refresh setelah submit berhasil.
  revalidatePath("/dashboard");

  return { success: true };
}

// Server Action untuk toggle status aktif/nonaktif event type.
export async function toggleEventType(eventTypeId: string) {
  const session = await auth();
  let userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId && session?.user?.email) {
    const u = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    userId = u?.id;
  }

  if (!session || !userId) throw new Error("Anda harus login terlebih dahulu.");

  const eventType = await prisma.eventType.findFirst({
    where: { id: eventTypeId, userId },
    select: { isActive: true },
  });

  if (!eventType) throw new Error("Event type tidak ditemukan.");

  await prisma.eventType.update({
    where: { id: eventTypeId },
    data: { isActive: !eventType.isActive },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// ─── updateEventType ─────────────────────────────────────────────────────────
// Server Action untuk memperbarui data event type yang sudah ada.
// Dipanggil dari EditEventDialog melalui useTransition.
export async function updateEventType(formData: FormData) {
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

  // Proteksi: hanya user login dengan id valid yang boleh mengupdate event
  if (!session || !userId) {
    throw new Error("Anda harus login terlebih dahulu.");
  }

  // Baca id event type yang akan diupdate dari formData
  const eventTypeId = formData.get("id");
  if (typeof eventTypeId !== "string") throw new Error("ID event tidak valid.");

  // Pastikan event type ini milik user yang sedang login (cegah akses event orang lain)
  const existing = await prisma.eventType.findFirst({
    where: { id: eventTypeId, userId },
  });
  if (!existing) throw new Error("Event type tidak ditemukan.");

  // Baca dan validasi input dari form
  const titleValue = formData.get("title");
  const descriptionValue = formData.get("description");
  const durationValue = formData.get("duration");
  const locationTypeValue = formData.get("locationType");
  const platformValue = formData.get("platform");
  const locationDetailsValue = formData.get("locationDetails");

  const title = typeof titleValue === "string" ? titleValue.trim() : "";
  const description = typeof descriptionValue === "string" ? descriptionValue.trim() : "";
  const locationDetails = typeof locationDetailsValue === "string" ? locationDetailsValue.trim() : "";
  const duration = Number(durationValue);

  if (title.length < 3) throw new Error("Judul event minimal 3 karakter.");
  if (!Number.isInteger(duration) || duration <= 0) throw new Error("Durasi harus berupa angka lebih dari 0.");

  const locationType =
    locationTypeValue === LocationType.ONLINE || locationTypeValue === LocationType.OFFLINE
      ? locationTypeValue
      : null;
  if (!locationType) throw new Error("Tipe lokasi tidak valid.");

  // Platform hanya relevan untuk event online, tapi tetap opsional
  const platform =
    typeof platformValue === "string" &&
    (platformValue === PlatformType.ZOOM ||
      platformValue === PlatformType.GOOGLE_MEET ||
      platformValue === PlatformType.JITSI ||
      platformValue === PlatformType.OTHER)
      ? platformValue
      : null;

  // Simpan perubahan ke database
  await prisma.eventType.update({
    where: { id: eventTypeId },
    data: {
      title,
      description: description.length > 0 ? description : null,
      duration,
      locationType,
      platform: locationType === LocationType.ONLINE ? platform : null,
      locationDetails: locationDetails.length > 0 ? locationDetails : null,
    },
  });

  // Refresh dashboard agar perubahan langsung tampil
  revalidatePath("/dashboard");
  return { success: true };
}

// Server Action untuk menghapus event type beserta semua booking terkait.
export async function deleteEventType(eventTypeId: string) {
  const session = await auth();
  let userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId && session?.user?.email) {
    const u = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    userId = u?.id;
  }

  if (!session || !userId) throw new Error("Anda harus login terlebih dahulu.");

  const eventType = await prisma.eventType.findFirst({
    where: { id: eventTypeId, userId },
  });

  if (!eventType) throw new Error("Event type tidak ditemukan.");

  // Hapus booking terkait dulu, baru hapus event type
  await prisma.booking.deleteMany({ where: { eventTypeId } });
  await prisma.eventType.delete({ where: { id: eventTypeId } });

  revalidatePath("/dashboard");
  return { success: true };
}
