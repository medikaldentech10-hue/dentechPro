import type { ComponentProps } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PremiumCardProps = ComponentProps<typeof Card>;

export function PremiumCard({ className, ...props }: PremiumCardProps) {
  return (
    <Card
      className={cn(
        "border border-border/70 bg-card/86 shadow-[0_16px_55px_rgb(15_23_42/0.07)] backdrop-blur-xl transition",
        "hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_22px_70px_rgb(79_197_197/0.13)]",
        "dark:shadow-[0_18px_65px_rgb(0_0_0/0.22)] dark:hover:shadow-[0_22px_80px_rgb(0_0_0/0.3)]",
        className
      )}
      {...props}
    />
  );
}
