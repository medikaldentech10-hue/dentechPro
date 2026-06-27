import Link from "next/link";
import { ChevronDown, ClipboardList, UserCircle } from "lucide-react";

import { signOutAction } from "@/app/(public)/auth-actions";
import { Logo } from "@/components/shared/logo";
import { MobileNav } from "@/components/shared/mobile-nav";
import { Button, buttonVariants } from "@/components/ui/button";
import { getHeaderAuthState } from "@/lib/auth-ui";
import { publicNav } from "@/lib/constants";
import type { Profile } from "@/lib/types/auth";
import { cn } from "@/lib/utils";

type HeaderProps = {
  profile?: Profile | null;
};

export function Header({ profile = null }: HeaderProps) {
  const authState = getHeaderAuthState(profile);
  const navItems = publicNav;

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/76">
      <div className="mx-auto grid h-16 w-full max-w-[1320px] grid-cols-[1fr_auto] items-center gap-4 px-4 md:grid-cols-[1fr_auto_1fr] md:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={item.href === "/products" ? true : undefined}
              className="rounded-full px-1.5 py-1 transition hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center justify-end gap-2 md:flex">
          {authState.showRequestList ? (
            <Link
              href="/request"
              aria-label="Talep listesini aç"
              title="Talep Listem"
              className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }))}
            >
              <ClipboardList className="size-4" />
            </Link>
          ) : null}
          {authState.isAuthenticated ? (
            <AccountMenu
              authHref={authState.href}
              label={authState.label}
              profile={profile}
              showRequestList={authState.showRequestList}
            />
          ) : (
            <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
              Giriş Yap
            </Link>
          )}
        </div>
        <div className="md:hidden">
          <MobileNav profile={profile} />
        </div>
      </div>
    </header>
  );
}

function AccountMenu({
  authHref,
  label,
  profile,
  showRequestList,
}: {
  authHref: string;
  label: string;
  profile: Profile | null;
  showRequestList: boolean;
}) {
  const isAdminUser = profile?.role === "admin";

  return (
    <details className="group/account relative">
      <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <UserCircle className="size-4 text-primary" />
        <span>Hesabım</span>
        <ChevronDown className="size-3.5 text-muted-foreground transition group-open/account:rotate-180" />
      </summary>
      <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border/70 bg-popover p-1.5 text-sm text-popover-foreground shadow-xl">
        <Link className="block rounded-lg px-3 py-2 hover:bg-muted" href={authHref}>
          {label}
        </Link>
        {showRequestList ? (
          <Link className="block rounded-lg px-3 py-2 hover:bg-muted" href="/request">
            Taleplerim
          </Link>
        ) : null}
        {isAdminUser ? (
          <Link className="block rounded-lg px-3 py-2 hover:bg-muted" href="/admin">
            Admin Paneli
          </Link>
        ) : null}
        <form action={signOutAction} className="border-t border-border/70 pt-1.5">
          <Button className="w-full justify-start px-3" type="submit" variant="ghost">
            Çıkış Yap
          </Button>
        </form>
      </div>
    </details>
  );
}
