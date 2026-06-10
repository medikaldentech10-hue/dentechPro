import Link from "next/link";
import { Search } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { MobileNav } from "@/components/shared/mobile-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getHeaderAuthState } from "@/lib/auth-ui";
import { publicNav } from "@/lib/constants";
import type { Profile } from "@/lib/types/auth";
import { cn } from "@/lib/utils";

type HeaderProps = {
  profile?: Profile | null;
};

export function Header({ profile = null }: HeaderProps) {
  const authState = getHeaderAuthState(profile);
  const navItems = authState.isAuthenticated
    ? publicNav.filter((item) => item.href !== "/login")
    : publicNav;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/82 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/68">
      <div className="mx-auto flex h-16 w-full max-w-[1320px] items-center justify-between gap-4 px-4 md:px-6">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden min-w-72 items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-3 py-1.5 shadow-sm backdrop-blur-xl lg:flex">
          <Search className="text-muted-foreground" />
          <Input
            className="h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            placeholder="JOTA ürün kataloğu"
          />
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {authState.showRequestList ? (
            <Link
              href="/request"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Talep Listem
            </Link>
          ) : null}
          <Link
            href={authState.href}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {authState.label}
          </Link>
          <Link href="/products" className={cn(buttonVariants())}>
            JOTA Frezleri Keşfet
          </Link>
        </div>
        <div className="md:hidden">
          <MobileNav profile={profile} />
        </div>
      </div>
    </header>
  );
}
