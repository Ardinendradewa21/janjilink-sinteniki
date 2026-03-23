// Layout minimal untuk halaman onboarding.
// Tidak ada sidebar, tidak ada header dashboard — hanya full-screen canvas bersih.
import type { ReactNode } from "react";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50">
      {children}
    </div>
  );
}
