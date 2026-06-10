import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  label: string;
  tone?: "neutral" | "success" | "warning" | "muted";
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-border bg-background/80 text-muted-foreground",
        tone === "success" &&
          "border-primary/25 bg-primary/10 text-primary",
        tone === "warning" &&
          "border-primary/25 bg-accent/70 text-accent-foreground",
        tone === "muted" && "opacity-70"
      )}
    >
      {label}
    </Badge>
  );
}
