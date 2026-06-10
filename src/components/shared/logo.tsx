import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Dentech Pro">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm">
        DP
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-normal text-foreground">
          Dentech Pro
        </span>
        <span className="text-xs text-muted-foreground">DENTech Medikal</span>
      </span>
    </Link>
  );
}

