import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
};

export function EmptyState({
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
      <Button variant="outline">{actionLabel}</Button>
    </div>
  );
}

