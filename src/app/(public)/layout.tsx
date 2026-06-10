import type { ReactNode } from "react";

import { AppShell } from "@/components/shared/app-shell";
import { getCurrentProfile } from "@/lib/auth";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <AppShell profile={profile} variant="public">
      {children}
    </AppShell>
  );
}
