// ─── OnboardingPage ────────────────────────────────────────────────────────────
// Route: /onboarding
//
// Server component: cek auth + status onboarding.
// Jika user belum login → redirect ke /login
// Jika user sudah selesai onboarding → redirect ke /dashboard
// Jika user baru → render wizard interaktif

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, slug: true, onboardingCompleted: true },
  });

  // User sudah onboarding sebelumnya → langsung ke dashboard
  if (user?.onboardingCompleted) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-start justify-center px-4 py-10 sm:py-16">
      <OnboardingWizard
        initialName={user?.name ?? ""}
        initialSlug={user?.slug ?? ""}
      />
    </div>
  );
}
