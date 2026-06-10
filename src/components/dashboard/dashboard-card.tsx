import type { LucideIcon } from "lucide-react";

import { PremiumCard } from "@/components/premium/premium-card";
import { CardContent } from "@/components/ui/card";

type DashboardCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function DashboardCard({
  title,
  description,
  icon: Icon,
}: DashboardCardProps) {
  return (
    <PremiumCard>
      <CardContent className="flex min-h-36 flex-col justify-between gap-5 p-5">
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary shadow-sm">
          <Icon />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </PremiumCard>
  );
}
