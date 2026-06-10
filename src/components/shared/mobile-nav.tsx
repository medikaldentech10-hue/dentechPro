"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
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

type MobileNavProps = {
  profile?: Profile | null;
};

export function MobileNav({ profile = null }: MobileNavProps) {
  const authState = getHeaderAuthState(profile);
  const navItems = authState.isAuthenticated
    ? publicNav.filter((item) => item.href !== "/login")
    : publicNav;

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
            <div className="flex items-center justify-between gap-3">
              <Logo />
              <ThemeToggle />
            </div>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            {authState.showRequestList ? (
              <Link
                href="/request"
                className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
