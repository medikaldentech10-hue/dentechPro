import type { ReactNode } from "react";

import { AppShell } from "@/components/shared/app-shell";
import { requireDashboardAccess } from "@/lib/auth";
import { dashboardNav } from "@/lib/constants";

export default async function UserLayout({ children }: { children: ReactNode }) {
  const profile = await requireDashboardAccess();

  return (
    <AppShell
      variant="dashboard"
      navItems={dashboardNav}
      profile={profile}
      sectionLabel="Kullanıcı Paneli"
    >
      {children}
    </AppShell>
  );
}
