import type { ReactNode } from "react";

import { AppShell } from "@/components/shared/app-shell";
import { requireAdmin } from "@/lib/auth";
import { adminNav } from "@/lib/constants";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireAdmin();

  return (
    <AppShell
      variant="dashboard"
      navItems={adminNav}
      profile={profile}
      sectionLabel="Admin Paneli"
    >
      {children}
    </AppShell>
  );
}
