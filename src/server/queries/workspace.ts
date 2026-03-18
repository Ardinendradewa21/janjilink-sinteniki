// ─── Server Queries: Workspace ────────────────────────────────────────────────
// Query read-only untuk data workspace dan anggotanya.
// Dipakai oleh halaman /dashboard/workspace (server component).

import prisma from "@/lib/prisma";

// ─── Tipe Data ────────────────────────────────────────────────────────────────

export type WorkspaceMemberItem = {
  id: string;          // ID WorkspaceMember (bukan User.id)
  role: "OWNER" | "MEMBER";
  joinedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    slug: string;
  };
};

export type WorkspaceData = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  members: WorkspaceMemberItem[];
};

// ─── getWorkspaceForOwner ─────────────────────────────────────────────────────
// Mengambil workspace milik user beserta semua anggotanya.
// Mengembalikan null jika user belum membuat workspace.
export async function getWorkspaceForOwner(
  userId: string
): Promise<WorkspaceData | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { ownerId: userId },
    include: {
      members: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, slug: true },
          },
        },
      },
    },
  });

  if (!workspace) return null;

  return {
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
    ownerId: workspace.ownerId,
    createdAt: workspace.createdAt,
    members: workspace.members.map((m) => ({
      id: m.id,
      role: m.role as "OWNER" | "MEMBER",
      joinedAt: m.joinedAt,
      user: m.user,
    })),
  };
}
