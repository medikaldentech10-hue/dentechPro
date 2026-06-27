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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/92 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-white/78 dark:border-white/10 dark:bg-background/88">
      <div className="mx-auto grid h-[4.5rem] w-full max-w-[1440px] grid-cols-[1fr_auto] items-center gap-4 px-4 md:grid-cols-[1fr_auto_1fr] md:px-8">
        <Logo />

        <nav className="hidden items-center gap-9 text-[0.95rem] font-semibold text-slate-700 md:flex dark:text-slate-200">
          {publicNav.map((item) => (
            <Link
              className="rounded-full px-1 py-2 transition hover:text-primary"
              href={item.href}
              key={item.href}
              prefetch={item.href === "/products" ? true : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-end gap-3 md:flex">
          <Link
            aria-label="Talep listem"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-10 gap-2 border-[var(--primary-border)] bg-white px-3.5 text-slate-800 shadow-sm hover:bg-[var(--primary-soft)] dark:bg-background/70 dark:text-slate-100"
            )}
            href="/request"
          >
            <ClipboardList className="size-4 text-primary" />
            <span>Talep Listem</span>
          </Link>
          <span className="h-8 w-px bg-border" aria-hidden="true" />
          <AccountMenu
            authHref={authState.href}
            isAuthenticated={authState.isAuthenticated}
            label={authState.label}
            profile={profile}
            showRequestList={authState.showRequestList}
          />
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
  isAuthenticated,
  label,
  profile,
  showRequestList,
}: {
  authHref: string;
  isAuthenticated: boolean;
  label: string;
  profile: Profile | null;
  showRequestList: boolean;
}) {
  const isAdminUser = profile?.role === "admin";

  return (
    <details className="group/account relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-slate-800 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:text-slate-100 [&::-webkit-details-marker]:hidden">
        <UserCircle className="size-5 text-slate-700 dark:text-slate-200" />
        <span>{profile?.full_name?.trim() || "Hesabım"}</span>
        <ChevronDown className="size-3.5 text-muted-foreground transition group-open/account:rotate-180" />
      </summary>
      <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-border/70 bg-popover p-1.5 text-sm text-popover-foreground shadow-xl">
        {isAuthenticated ? (
          <>
            {isAdminUser ? null : (
              <Link className="block rounded-lg px-3 py-2 hover:bg-muted" href={authHref}>
                {label}
              </Link>
            )}
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
          </>
        ) : (
          <>
            <Link className="block rounded-lg px-3 py-2 hover:bg-muted" href="/login">
              Giriş Yap
            </Link>
            <Link className="block rounded-lg px-3 py-2 hover:bg-muted" href="/register">
              Hesap Oluştur
            </Link>
          </>
        )}
      </div>
    </details>
  );
}
