"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  Gauge,
  PackageSearch,
  ShieldCheck,
  ShoppingBag,
  Users,
} from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

type SidebarItem = {
  href: string;
  label: string;
};

type SidebarProps = {
  items: SidebarItem[];
  sectionLabel: string;
};

export function Sidebar({ items, sectionLabel }: SidebarProps) {
  const pathname = usePathname();
  const activeHref = getActiveHref(items, pathname);

  return (
    <aside className="hidden min-h-dvh w-72 shrink-0 border-r border-sidebar-border/80 bg-sidebar/82 p-4 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-sidebar/72 lg:block">
      <div className="sticky top-4 flex flex-col gap-8">
        <Logo />
        <div className="flex flex-col gap-2">
          <p className="px-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {sectionLabel}
          </p>
          <nav className="flex flex-col gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activeHref === item.href ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  activeHref === item.href &&
                    "border-primary/30 bg-primary/12 text-primary shadow-sm ring-1 ring-primary/15"
                )}
              >
                {activeHref === item.href ? (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                ) : null}
                <NavIcon href={item.href} />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}

function NavIcon({ href }: { href: string }) {
  const Icon =
    href === "/admin"
      ? ShieldCheck
      : href === "/admin/users"
        ? ClipboardCheck
        : href === "/admin/products" || href === "/products"
          ? PackageSearch
          : href === "/admin/requests" || href === "/sales/request"
            ? ShoppingBag
            : href === "/admin/customers"
              ? Users
              : Gauge;

  return <Icon className="size-4" />;
}

function getActiveHref(items: SidebarItem[], pathname: string) {
  return [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    ?.href;
}
