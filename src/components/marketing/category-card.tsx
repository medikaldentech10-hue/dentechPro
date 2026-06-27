import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

type CategoryCardProps = {
  title: string;
  description?: string;
  status: "active" | "coming-soon";
  href?: string;
  visual?: "bur" | "polish" | "endo" | "lab" | "supply" | "device";
};

export function CategoryCard({
  title,
  description,
  status,
  href = "#",
  visual = "bur",
}: CategoryCardProps) {
  const isActive = status === "active";
  const content = (
    <div
      className={cn(
        "group flex min-h-24 items-center justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-primary/45 hover:shadow-[0_14px_34px_rgb(15_23_42/0.08)] dark:border-white/10 dark:bg-slate-950/72",
        !isActive && "opacity-80 hover:border-slate-200 dark:hover:border-white/10"
      )}
    >
      <CategoryVisual visual={visual} />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pl-4">
        <div className="min-w-0 text-left">
          <h3 className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
          {!isActive ? (
            <div className="mt-2">
              <StatusBadge label="Yakında" tone="muted" />
            </div>
          ) : null}
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-primary transition group-hover:translate-x-0.5">
          <ArrowRight className="size-4" />
        </span>
      </div>
    </div>
  );

  if (!isActive) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

function CategoryVisual({ visual }: { visual: NonNullable<CategoryCardProps["visual"]> }) {
  return (
    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {visual === "bur" ? (
        <span className="absolute left-4 top-7 h-3 w-20 -rotate-6 rounded-full bg-gradient-to-r from-slate-300 via-slate-500 to-slate-200">
          <span className="absolute right-2 top-1/2 h-5 w-8 -translate-y-1/2 rounded-full bg-[repeating-linear-gradient(120deg,#64748b_0_2px,#dbe3ea_2px_5px)]" />
          <span className="absolute left-10 top-1/2 h-2 w-3 -translate-y-1/2 rounded-full bg-primary" />
        </span>
      ) : null}
      {visual === "polish" ? (
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          {["bg-slate-300", "bg-rose-300", "bg-stone-400"].map((color) => (
            <span className={cn("size-8 rounded-full shadow-inner", color)} key={color} />
          ))}
        </div>
      ) : null}
      {visual === "endo" ? (
        <div className="absolute inset-0 flex items-center justify-center gap-1.5">
          {[0, 1, 2, 3].map((item) => (
            <span
              className="h-12 w-1.5 rotate-[-22deg] rounded-full bg-gradient-to-b from-primary via-slate-200 to-slate-500"
              key={item}
            />
          ))}
        </div>
      ) : null}
      {visual === "lab" ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="h-8 w-16 rounded-[50%] bg-gradient-to-br from-amber-100 to-amber-200 shadow-inner" />
          <span className="absolute left-8 top-5 size-5 rounded-full bg-amber-50" />
          <span className="absolute right-8 top-6 size-5 rounded-full bg-amber-100" />
        </div>
      ) : null}
      {visual === "supply" ? (
        <span className="absolute left-4 top-5 h-8 w-16 rotate-[-12deg] rounded-full bg-gradient-to-r from-slate-200 via-white to-primary/70 shadow-sm">
          <span className="absolute right-0 top-1/2 h-3 w-5 -translate-y-1/2 rounded-full bg-slate-700" />
        </span>
      ) : null}
      {visual === "device" ? (
        <span className="absolute left-5 top-5 h-8 w-16 rotate-[28deg] rounded-full bg-gradient-to-r from-slate-300 via-slate-100 to-slate-500 shadow-sm">
          <span className="absolute -right-3 top-1/2 size-5 -translate-y-1/2 rounded-full border-4 border-slate-400" />
        </span>
      ) : null}
    </div>
  );
}
