"use client";

import { Loader2, Save } from "lucide-react";
import { useActionState } from "react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { updateProfile } from "@/server/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Props ───────────────────────────────────────────────────────────────────
// Data user saat ini yang di-pass dari server component (page.tsx).
type SettingsFormProps = {
  name: string;
  email: string;
  slug: string;
};

// ─── SettingsForm ────────────────────────────────────────────────────────────
// Form client component untuk mengedit profil user (nama + slug/username).
// Menggunakan useActionState (React 19) agar error/success langsung tampil.
// Email ditampilkan read-only karena tidak bisa diubah.
export function SettingsForm({ name, email, slug }: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, null);

  // Ref untuk melacak apakah sudah pernah menampilkan toast (hindari duplikat)
  const prevStateRef = useRef(state);

  // Tampilkan toast saat action berhasil/gagal
  useEffect(() => {
    if (state === prevStateRef.current) return;
    prevStateRef.current = state;
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      {/* Pesan error dari server action */}
      {state?.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.error}
        </div>
      )}

      {/* Pesan sukses dari server action */}
      {state?.success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {state.success}
        </div>
      )}

      {/* Input nama lengkap */}
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-stone-700">
          Nama lengkap
        </label>
        <Input
          id="name"
          name="name"
          defaultValue={name}
          required
          disabled={isPending}
          className="border-stone-200 focus-visible:ring-emerald-500"
        />
      </div>

      {/* Email (hanya tampil, tidak bisa diedit) */}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-700">
          Email
        </label>
        <Input
          id="email"
          value={email}
          readOnly
          disabled
          className="border-stone-200 bg-stone-50 text-stone-500"
        />
        <p className="mt-1 text-xs text-stone-400">Email tidak bisa diubah.</p>
      </div>

      {/* Input slug/username publik */}
      <div>
        <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-stone-700">
          Username (slug)
        </label>
        <div className="flex items-center gap-2">
          {/* Prefix URL agar user tahu hasil akhirnya */}
          <span className="shrink-0 text-sm text-stone-400">janjilink.com/</span>
          <Input
            id="slug"
            name="slug"
            defaultValue={slug}
            required
            disabled={isPending}
            placeholder="nama-kamu"
            className="border-stone-200 focus-visible:ring-emerald-500"
          />
        </div>
        <p className="mt-1 text-xs text-stone-400">
          Huruf kecil, angka, dan strip (-). Contoh: budi-pratama
        </p>
      </div>

      {/* Tombol simpan */}
      <Button
        type="submit"
        disabled={isPending}
        className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Menyimpan...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Simpan Perubahan
          </>
        )}
      </Button>
    </form>
  );
}
