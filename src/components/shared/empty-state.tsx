import { SearchX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

type EmptyStateProps = {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  title: string;
};

export function EmptyState({
  actionHref,
  title,
  description,
  actionLabel = "Talep Listesine Git",
}: EmptyStateProps) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-card/70 p-8 text-center shadow-sm backdrop-blur">
      <div className="flex size-12 items-center justify-center rounded-lg bg-accent text-primary">
        <SearchX />
      </div>
      <div className="flex max-w-md flex-col gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actionHref ? (
        <Link className={buttonVariants({ variant: "outline" })} href={actionHref}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
