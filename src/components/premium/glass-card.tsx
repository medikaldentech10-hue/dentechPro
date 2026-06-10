import type { ComponentProps } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type GlassCardProps = ComponentProps<typeof Card>;

export function GlassCard({ className, ...props }: GlassCardProps) {
  return (
    <Card
      className={cn(
        "border border-white/50 bg-card/72 shadow-[0_18px_70px_rgb(15_23_42/0.08)] backdrop-blur-xl",
        "supports-[backdrop-filter]:bg-card/62 dark:border-white/10 dark:shadow-[0_22px_80px_rgb(0_0_0/0.28)]",
        className
      )}
      {...props}
    />
  );
}
