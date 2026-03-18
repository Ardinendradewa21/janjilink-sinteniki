"use client";

// ─── WorkspacePanel ────────────────────────────────────────────────────────────
// Komponen client-side untuk semua interaksi workspace yang butuh state:
//  • Form buat workspace baru (useActionState)
//  • Form undang anggota baru (useActionState)
//  • Tombol hapus anggota (useTransition + optimistic)
//  • Tombol hapus workspace
//
// Dipisah dari halaman (server component) agar halaman bisa fetch data
// di server, lalu pass ke sini sebagai props.

import { useActionState, useTransition, useState } from "react";
import { Users, Plus, Trash2, UserPlus, Loader2, Crown } from "lucide-react";
import { toast } from "sonner";
import {
  createWorkspace,
  inviteMember,
  removeMember,
  deleteWorkspace,
} from "@/server/actions/workspace";
import type { WorkspaceData } from "@/server/queries/workspace";

// ─── WorkspaceEmpty ────────────────────────────────────────────────────────────
// Tampilan saat user belum punya workspace.
// Berisi form buat workspace baru.
export function WorkspaceEmpty() {
  const [state, action, isPending] = useActionState(createWorkspace, {});

  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10">
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
          <Users className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="text-lg font-semibold text-stone-900">
          Buat Workspace Tim
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          Workspace memungkinkan kamu dan tim melihat jadwal satu sama lain
          dari satu dashboard bersama.
        </p>
      </div>

      {/* Form buat workspace */}
      <form action={action} className="mx-auto mt-8 max-w-sm space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700">
            Nama Workspace
          </label>
          <input
            name="name"
            type="text"
            required
            placeholder="Contoh: Tim Sales Acme Corp"
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-stone-700">
            Deskripsi{" "}
            <span className="font-normal text-stone-400">(opsional)</span>
          </label>
          <textarea
            name="description"
            rows={2}
            placeholder="Apa tujuan workspace ini?"
            className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        {/* Pesan error dari server */}
        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Buat Workspace
        </button>
      </form>
    </div>
  );
}

// ─── WorkspaceView ─────────────────────────────────────────────────────────────
// Tampilan workspace yang sudah ada: info + daftar anggota + form undang.
export function WorkspaceView({
  workspace,
  currentUserId,
}: {
  workspace: WorkspaceData;
  currentUserId: string;
}) {
  const isOwner = workspace.ownerId === currentUserId;

  return (
    <div className="space-y-6">
      {/* Info workspace */}
      <WorkspaceInfo workspace={workspace} isOwner={isOwner} />

      {/* Daftar anggota */}
      <MemberList
        members={workspace.members}
        isOwner={isOwner}
        currentUserId={currentUserId}
      />

      {/* Form undang anggota — hanya tampil untuk pemilik */}
      {isOwner && <InviteForm />}
    </div>
  );
}

// ─── WorkspaceInfo ─────────────────────────────────────────────────────────────
// Kartu info workspace: nama, deskripsi, jumlah anggota.
function WorkspaceInfo({
  workspace,
  isOwner,
}: {
  workspace: WorkspaceData;
  isOwner: boolean;
}) {
  const [isDeleting, startDelete] = useTransition();

  function handleDelete() {
    if (
      !confirm(
        `Hapus workspace "${workspace.name}"? Semua anggota akan dikeluarkan.`
      )
    ) return;

    startDelete(async () => {
      const result = await deleteWorkspace();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Workspace berhasil dihapus.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Ikon workspace */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
            <Users className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900">
              {workspace.name}
            </h2>
            {workspace.description && (
              <p className="mt-0.5 text-sm text-stone-500">
                {workspace.description}
              </p>
            )}
            <p className="mt-1 text-xs text-stone-400">
              {workspace.members.length} anggota
            </p>
          </div>
        </div>

        {/* Tombol hapus workspace — hanya untuk pemilik */}
        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            title="Hapus workspace"
            className="shrink-0 rounded-lg p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MemberList ────────────────────────────────────────────────────────────────
// Daftar anggota workspace dengan opsi hapus untuk pemilik.
function MemberList({
  members,
  isOwner,
  currentUserId,
}: {
  members: WorkspaceData["members"];
  isOwner: boolean;
  currentUserId: string;
}) {
  // Set ID anggota yang sedang diproses hapus (untuk disable tombol saat loading)
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemove(memberId: string, memberName: string) {
    if (!confirm(`Keluarkan ${memberName} dari workspace?`)) return;
    setRemovingId(memberId);

    const result = await removeMember(memberId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${memberName} berhasil dikeluarkan.`);
    }
    setRemovingId(null);
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-100 px-6 py-4">
        <h3 className="font-semibold text-stone-900">Anggota Tim</h3>
      </div>

      <ul className="divide-y divide-stone-100">
        {members.map((member) => (
          <li key={member.id} className="flex items-center gap-4 px-6 py-4">
            {/* Avatar inisial nama */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-sm font-semibold text-stone-600">
              {member.user.name.charAt(0).toUpperCase()}
            </div>

            {/* Info anggota */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-stone-900">
                  {member.user.name}
                </p>
                {/* Badge crown untuk pemilik */}
                {member.role === "OWNER" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <Crown className="h-3 w-3" />
                    Pemilik
                  </span>
                )}
                {/* Badge "Kamu" untuk user yang sedang login */}
                {member.user.id === currentUserId && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                    Kamu
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-stone-400">
                {member.user.email}
              </p>
            </div>

            {/* Tombol hapus — hanya pemilik bisa hapus, dan tidak bisa hapus diri sendiri */}
            {isOwner &&
              member.role !== "OWNER" &&
              member.user.id !== currentUserId && (
                <button
                  onClick={() => handleRemove(member.id, member.user.name)}
                  disabled={removingId === member.id}
                  title="Keluarkan dari workspace"
                  className="shrink-0 rounded-lg p-1.5 text-stone-300 transition-colors hover:text-red-500 disabled:opacity-40"
                >
                  {removingId === member.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── InviteForm ────────────────────────────────────────────────────────────────
// Form input email untuk mengundang anggota baru ke workspace.
// Menggunakan useActionState agar error dari server bisa ditampilkan.
function InviteForm() {
  const [state, action, isPending] = useActionState(inviteMember, {});
  const [email, setEmail] = useState("");

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-stone-900">Undang Anggota</h3>
      </div>

      <form
        action={(fd) => {
          action(fd);
          // Kosongkan input setelah submit berhasil (tidak ada error)
          if (!state.error) setEmail("");
        }}
        className="flex gap-2"
      >
        <input
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@contoh.com"
          className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="submit"
          disabled={isPending}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          Undang
        </button>
      </form>

      {state.error && (
        <p className="mt-2 text-sm text-red-600">{state.error}</p>
      )}

      <p className="mt-2 text-xs text-stone-400">
        Calon anggota harus sudah terdaftar di JanjiLink dengan email tersebut.
      </p>
    </div>
  );
}
