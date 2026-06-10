import type { ReactNode } from "react";

import { AppShell } from "@/components/shared/app-shell";
import { requireSalesAccess } from "@/lib/auth";
import { salesNav } from "@/lib/constants";

export default async function SalesLayout({ children }: { children: ReactNode }) {
  const profile = await requireSalesAccess();

  return (
    <AppShell
      variant="dashboard"
      navItems={salesNav}
      profile={profile}
      sectionLabel="Saha Satış Paneli"
    >
      {children}
    </AppShell>
  );
}
