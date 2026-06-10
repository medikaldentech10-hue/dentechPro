import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

import { PremiumCard } from "@/components/premium/premium-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CategoryCardProps = {
  title: string;
  description: string;
  status: "active" | "coming-soon";
  href?: string;
  meta?: string;
};

export function CategoryCard({
  title,
  description,
  status,
  href = "#",
  meta = "Yakında",
}: CategoryCardProps) {
  const content = (
    <PremiumCard
      className={cn(
        "min-h-44",
        status === "coming-soon" &&
          "opacity-70 hover:translate-y-0 hover:border-border/70 hover:shadow-[0_16px_55px_rgb(15_23_42/0.07)] dark:hover:shadow-[0_18px_65px_rgb(0_0_0/0.22)]"
      )}
    >
      <CardContent className="flex h-full flex-col justify-between gap-8 p-5">
        <div className="flex items-start justify-between gap-3">
          <StatusBadge
            label={status === "active" ? meta : "Yakında"}
            tone={status === "active" ? "success" : "muted"}
          />
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary shadow-sm">
            {status === "active" ? <ArrowRight /> : <Lock />}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold tracking-normal">{title}</h3>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </PremiumCard>
  );

  if (status === "coming-soon") {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}
