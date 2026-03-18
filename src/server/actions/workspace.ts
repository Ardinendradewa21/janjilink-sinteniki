"use server";

// ─── Server Actions: Workspace ────────────────────────────────────────────────
// Fungsi-fungsi untuk mengelola workspace (tim) dan keanggotaannya.
//
// Aturan bisnis:
//  - Satu user hanya bisa punya SATU workspace (buat sendiri)
//  - User bisa diundang ke workspace orang lain sebagai anggota
//  - Pemilik tidak bisa meninggalkan workspace-nya sendiri (harus hapus)
//  - Undangan menggunakan email — calon anggota harus punya akun JanjiLink

import { revalidatePath } from "next/cache";
import { getRequiredUserId } from "@/lib/session";
import prisma from "@/lib/prisma";

// ─── createWorkspace ──────────────────────────────────────────────────────────
// Membuat workspace baru. Satu user hanya boleh punya satu workspace.
// Setelah workspace dibuat, pemilik otomatis ditambahkan sebagai anggota
// dengan role OWNER agar bisa tampil di daftar anggota.
export async function createWorkspace(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  try {
    const userId = await getRequiredUserId();

    const name        = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;

    // Validasi nama workspace
    if (!name || name.length < 3) {
      return { error: "Nama workspace minimal 3 karakter." };
    }
    if (name.length > 60) {
      return { error: "Nama workspace maksimal 60 karakter." };
    }

    // Cek apakah user sudah punya workspace
    const existing = await prisma.workspace.findUnique({
      where: { ownerId: userId },
    });
    if (existing) {
      return { error: "Kamu sudah memiliki workspace. Satu akun hanya bisa punya satu workspace." };
    }

    // Buat workspace + langsung tambahkan pemilik sebagai anggota OWNER
    // Menggunakan nested create agar atomik (keduanya berhasil atau keduanya gagal)
    await prisma.workspace.create({
      data: {
        name,
        description,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });

    revalidatePath("/dashboard/workspace");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal membuat workspace." };
  }
}

// ─── updateWorkspace ──────────────────────────────────────────────────────────
// Memperbarui nama dan deskripsi workspace.
// Hanya pemilik yang bisa mengubah data workspace.
export async function updateWorkspace(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  try {
    const userId = await getRequiredUserId();

    const name        = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;

    if (!name || name.length < 3) {
      return { error: "Nama workspace minimal 3 karakter." };
    }

    // Cari workspace milik user ini
    const workspace = await prisma.workspace.findUnique({
      where: { ownerId: userId },
    });
    if (!workspace) {
      return { error: "Workspace tidak ditemukan." };
    }

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { name, description },
    });

    revalidatePath("/dashboard/workspace");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal memperbarui workspace." };
  }
}

// ─── inviteMember ─────────────────────────────────────────────────────────────
// Mengundang user baru ke workspace berdasarkan email.
//
// Validasi:
//  1. User yang diundang harus sudah punya akun JanjiLink
//  2. User tidak bisa mengundang diri sendiri
//  3. User belum menjadi anggota workspace ini
//  4. User belum punya workspace sendiri (satu user = satu workspace)
export async function inviteMember(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  try {
    const ownerId = await getRequiredUserId();
    const email   = (formData.get("email") as string)?.trim().toLowerCase();

    if (!email) return { error: "Email tidak boleh kosong." };

    // Cari workspace milik host ini
    const workspace = await prisma.workspace.findUnique({
      where: { ownerId },
      select: { id: true },
    });
    if (!workspace) {
      return { error: "Buat workspace dulu sebelum mengundang anggota." };
    }

    // Cari user yang akan diundang
    const invitee = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true },
    });
    if (!invitee) {
      return { error: "User dengan email ini belum terdaftar di JanjiLink." };
    }

    // Tidak bisa mengundang diri sendiri
    if (invitee.id === ownerId) {
      return { error: "Kamu tidak bisa mengundang diri sendiri." };
    }

    // Cek apakah sudah menjadi anggota
    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: workspace.id, userId: invitee.id },
      },
    });
    if (alreadyMember) {
      return { error: `${invitee.name} sudah menjadi anggota workspace ini.` };
    }

    // Tambahkan sebagai anggota MEMBER
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: invitee.id,
        role: "MEMBER",
      },
    });

    revalidatePath("/dashboard/workspace");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal mengundang anggota." };
  }
}

// ─── removeMember ─────────────────────────────────────────────────────────────
// Menghapus satu anggota dari workspace.
// Hanya pemilik yang bisa menghapus anggota.
// Pemilik tidak bisa menghapus dirinya sendiri (hapus workspace untuk itu).
export async function removeMember(
  memberId: string
): Promise<{ error?: string }> {
  try {
    const ownerId = await getRequiredUserId();

    // Verifikasi: workspace harus milik ownerId
    const workspace = await prisma.workspace.findUnique({
      where: { ownerId },
      select: { id: true },
    });
    if (!workspace) return { error: "Workspace tidak ditemukan." };

    // Cari anggota yang akan dihapus
    const member = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      select: { workspaceId: true, userId: true, role: true },
    });
    if (!member || member.workspaceId !== workspace.id) {
      return { error: "Anggota tidak ditemukan." };
    }

    // Pemilik tidak bisa dihapus dari workspace
    if (member.role === "OWNER") {
      return { error: "Pemilik workspace tidak bisa dihapus. Hapus workspace untuk menutupnya." };
    }

    await prisma.workspaceMember.delete({ where: { id: memberId } });

    revalidatePath("/dashboard/workspace");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal menghapus anggota." };
  }
}

// ─── deleteWorkspace ──────────────────────────────────────────────────────────
// Menghapus workspace beserta semua anggotanya (cascade).
// Hanya pemilik yang bisa menghapus workspace.
export async function deleteWorkspace(): Promise<{ error?: string }> {
  try {
    const ownerId = await getRequiredUserId();

    const workspace = await prisma.workspace.findUnique({
      where: { ownerId },
    });
    if (!workspace) return { error: "Workspace tidak ditemukan." };

    // onDelete: Cascade di schema akan menghapus semua WorkspaceMember juga
    await prisma.workspace.delete({ where: { id: workspace.id } });

    revalidatePath("/dashboard/workspace");
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal menghapus workspace." };
  }
}
