"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full max-w-md">
      {/* Card utama */}
      <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900">Masuk ke akun</h1>
          <p className="mt-1.5 text-sm text-stone-500">
            Belum punya akun?{" "}
            <Link
              href="/register"
              className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Daftar gratis
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

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-stone-700"
            >
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
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-stone-700">
                Password
              </label>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="Masukkan password"
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

          {/* Submit */}
          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              "Masuk"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
