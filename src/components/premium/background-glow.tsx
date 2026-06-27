import { cn } from "@/lib/utils";

type BackgroundGlowProps = {
  className?: string;
};

export function BackgroundGlow({ className }: BackgroundGlowProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgb(79_197_197/0.14),transparent_34rem),radial-gradient(ellipse_at_80%_16%,rgb(79_197_197/0.08),transparent_28rem)]",
        className
      )}
    />
  );
}
