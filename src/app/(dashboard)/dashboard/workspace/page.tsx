// ─── WorkspacePage ────────────────────────────────────────────────────────────
// Halaman manajemen workspace/tim.
// Route: /dashboard/workspace
//
// Tampilan berbeda berdasarkan kondisi:
//  1. Belum punya workspace → WorkspaceEmpty (form buat workspace baru)
//  2. Sudah punya workspace → WorkspaceView (info + anggota + undang)
//
// Arsitektur:
//  - Server component: getRequiredUserId + getWorkspaceForOwner
//  - Client component: WorkspacePanel (semua interaksi dan form)
//  Pemisahan ini penting: server fetch data, client handle form submission
//  dan state UI tanpa perlu re-fetch dari client.

import { Users } from "lucide-react";
import { getRequiredUserId } from "@/lib/session";
import { getWorkspaceForOwner } from "@/server/queries/workspace";
import {
  WorkspaceEmpty,
  WorkspaceView,
} from "@/components/dashboard/WorkspacePanel";

export default async function WorkspacePage() {
  const userId   = await getRequiredUserId();

  // Coba ambil workspace milik user ini. null = belum punya workspace.
  const workspace = await getWorkspaceForOwner(userId);

  return (
    <div className="space-y-6">
      {/* Header halaman */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <Users className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-semibold text-stone-900">Workspace Tim</p>
            <p className="text-sm text-stone-500">
              Kelola tim kamu dan lihat jadwal bersama dalam satu tempat.
            </p>
          </div>
        </div>
      </div>

      {/* Konten: kondisional berdasarkan ada/tidaknya workspace */}
      {workspace === null ? (
        // Belum punya workspace → tampilkan form buat baru
        <WorkspaceEmpty />
      ) : (
        // Sudah punya workspace → tampilkan detail + anggota + undang
        <WorkspaceView workspace={workspace} currentUserId={userId} />
      )}
    </div>
  );
}
