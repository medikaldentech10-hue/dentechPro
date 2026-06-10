import type { ComponentProps } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SurfaceCardProps = ComponentProps<typeof Card>;

export function SurfaceCard({ className, ...props }: SurfaceCardProps) {
  return (
    <Card
      className={cn(
        "border border-border/70 bg-card/82 shadow-sm backdrop-blur-xl",
        "supports-[backdrop-filter]:bg-card/72",
        className
      )}
      {...props}
    />
  );
}
