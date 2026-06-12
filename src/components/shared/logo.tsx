import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Dentech Pro">
      <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-sm font-semibold text-primary shadow-sm">
        DT
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-normal text-foreground">
          Dentech Pro
        </span>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          DENTech Medikal
        </span>
      </span>
    </Link>
  );
}
