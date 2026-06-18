"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getHeaderAuthState } from "@/lib/auth-ui";
import { publicNav } from "@/lib/constants";
import type { Profile } from "@/lib/types/auth";
import { cn } from "@/lib/utils";

type MobileNavItem = {
  href: string;
  icon?: LucideIcon;
  label: string;
};

type MobileNavProps = {
  navItems?: MobileNavItem[];
  profile?: Profile | null;
  sectionLabel?: string;
};

export function MobileNav({
  navItems: providedNavItems,
  profile = null,
  sectionLabel = "Dentech Pro",
}: MobileNavProps) {
  const pathname = usePathname();
  const authState = getHeaderAuthState(profile);
  const navItems: MobileNavItem[] =
    providedNavItems ??
    (authState.isAuthenticated
      ? publicNav.filter((item) => item.href !== "/login")
      : publicNav);
  const activeHref = getActiveHref(navItems, pathname);

  return (
    <div>
      <Sheet>
        <SheetTrigger
          render={
            <button
              type="button"
              aria-label="Menü"
              className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }))}
            >
              <Menu />
            </button>
          }
        />
        <SheetContent
          className="w-[86vw] border-border/70 bg-background/92 p-0 shadow-2xl backdrop-blur-xl supports-[backdrop-filter]:bg-background/82"
          side="right"
        >
          <SheetHeader className="border-b border-border/70 p-4">
            <SheetTitle className="sr-only">Mobil navigasyon</SheetTitle>
            <Logo />
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {sectionLabel}
            </p>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activeHref === item.href ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg border border-transparent px-3 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  activeHref === item.href &&
                    "border-primary/25 bg-primary/10 text-primary"
                )}
              >
                {item.icon ? <item.icon className="size-4" /> : null}
                {item.label}
              </Link>
            ))}
            {authState.showRequestList ? (
              <Link
                href="/request"
                className={cn(
                  "rounded-lg border border-transparent px-3 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  pathname === "/request" &&
                    "border-primary/25 bg-primary/10 text-primary"
                )}
              >
                Talep Listem
              </Link>
            ) : null}
            <Link
              href={authState.href}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "mt-3 justify-center"
              )}
            >
              {authState.label}
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function getActiveHref(items: MobileNavItem[], pathname: string) {
  return [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    ?.href;
}
