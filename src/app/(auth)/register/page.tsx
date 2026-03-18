"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { registerAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="w-full max-w-md">
      {/* Card utama */}
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900">Buat akun baru</h1>
          <p className="mt-1.5 text-sm text-stone-500">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Masuk di sini
            </Link>
          </p>
        </div>

        {/* Form */}
        <form action={formAction} className="space-y-5">
          {/* Error */}
          {state?.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {state.error}
            </div>
          )}

          {/* Nama */}
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-stone-700">
              Nama lengkap
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Nama lengkap Anda"
              disabled={isPending}
              className="border-stone-200 focus-visible:ring-emerald-500"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-700">
              Alamat email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="nama@email.com"
              disabled={isPending}
              className="border-stone-200 focus-visible:ring-emerald-500"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-700">
              Password
              <span className="ml-1.5 text-xs font-normal text-stone-400">(minimal 6 karakter)</span>
            </label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                placeholder="Buat password"
                disabled={isPending}
                className="border-stone-200 pr-10 focus-visible:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Konfirmasi Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-stone-700"
            >
              Konfirmasi password
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                required
                placeholder="Ulangi password"
                disabled={isPending}
                className="border-stone-200 pr-10 focus-visible:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Membuat akun...
              </>
            ) : (
              "Daftar Gratis"
            )}
          </Button>

          <p className="text-center text-xs text-stone-400">
            Dengan mendaftar, Anda menyetujui syarat penggunaan JanjiLink.
          </p>
        </form>
      </div>
    </div>
  );
}
