import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

type SidebarItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type SidebarProps = {
  items: SidebarItem[];
  sectionLabel: string;
};

export function Sidebar({ items, sectionLabel }: SidebarProps) {
  return (
    <aside className="hidden min-h-dvh w-72 shrink-0 border-r border-sidebar-border/80 bg-sidebar/82 p-4 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-sidebar/72 lg:block">
      <div className="sticky top-4 flex flex-col gap-8">
        <Logo />
        <div className="flex flex-col gap-2">
          <p className="px-3 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {sectionLabel}
          </p>
          <nav className="flex flex-col gap-1">
            {items.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  index === 0 &&
                    "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                )}
              >
                <item.icon />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}
