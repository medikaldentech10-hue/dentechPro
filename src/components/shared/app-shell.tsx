import type { ReactNode } from "react";
import Link from "next/link";

import { BackgroundGlow } from "@/components/premium/background-glow";
import { signOutAction } from "@/app/(public)/auth-actions";
import { Header } from "@/components/shared/header";
import { MobileNav } from "@/components/shared/mobile-nav";
import { Sidebar } from "@/components/shared/sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { getHeaderAuthState } from "@/lib/auth-ui";
import type { dashboardNav } from "@/lib/constants";
import type { Profile } from "@/lib/types/auth";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: ReactNode;
  navItems?: typeof dashboardNav;
  profile?: Profile | null;
  sectionLabel?: string;
  variant?: "public" | "dashboard";
};

export function AppShell({
  children,
  navItems,
  profile = null,
  sectionLabel = "Dentech Pro",
  variant = "public",
}: AppShellProps) {
  const authState = getHeaderAuthState(profile);

  if (variant === "public") {
    return (
      <div className="min-h-dvh">
        <Header profile={profile} />
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="relative isolate flex min-h-dvh bg-background">
      <BackgroundGlow className="opacity-80" />
      {navItems ? <Sidebar items={navItems} sectionLabel={sectionLabel} /> : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 bg-background/82 px-4 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/68 md:px-6 lg:px-8">
          <div className="lg:hidden">
            <MobileNav
              navItems={navItems}
              profile={profile}
              sectionLabel={sectionLabel}
            />
          </div>
          <div className="hidden text-sm font-medium text-muted-foreground lg:block">
            {sectionLabel}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {authState.showRequestList ? (
              <Link
                className={cn(buttonVariants({ variant: "outline" }))}
                href="/request"
              >
                Talep Listem
              </Link>
            ) : null}
            <form action={signOutAction}>
              <Button variant="ghost" type="submit">
                Çıkış
              </Button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
