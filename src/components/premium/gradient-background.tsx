import type { ReactNode } from "react";

import { BackgroundGlow } from "@/components/premium/background-glow";
import { cn } from "@/lib/utils";

type GradientBackgroundProps = {
  children: ReactNode;
  className?: string;
};

export function GradientBackground({
  children,
  className,
}: GradientBackgroundProps) {
  return (
    <div className={cn("relative isolate overflow-hidden", className)}>
      <BackgroundGlow />
      {children}
    </div>
  );
}
