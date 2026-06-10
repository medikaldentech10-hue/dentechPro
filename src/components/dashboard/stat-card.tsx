import type { LucideIcon } from "lucide-react";

import { SurfaceCard } from "@/components/premium/surface-card";
import { CardContent } from "@/components/ui/card";

type StatCardProps = {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

export function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <SurfaceCard>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary shadow-sm">
          <Icon />
        </span>
      </CardContent>
    </SurfaceCard>
  );
}
