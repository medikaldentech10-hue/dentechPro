export default function ProductDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 py-6 md:gap-6 md:px-6 md:py-8">
      <div className="h-6 w-28 animate-pulse rounded bg-muted/70" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-sm">
            <div className="p-3 sm:p-5">
              <div className="aspect-[4/3] animate-pulse rounded-[1.6rem] bg-muted/55 sm:aspect-[1/1.02]" />
            </div>
          </div>

          <div className="hidden rounded-3xl border border-border/70 bg-card/80 shadow-sm lg:block">
            <div className="space-y-3 p-5">
              <div className="h-4 w-28 animate-pulse rounded bg-muted/70" />
              <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted/50" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted/40" />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="rounded-3xl border border-border/70 bg-card/80 shadow-sm">
            <div className="space-y-4 p-4 sm:p-6">
              <div className="flex gap-2">
                <div className="h-7 w-16 animate-pulse rounded-full bg-primary/10" />
                <div className="h-7 w-20 animate-pulse rounded-full bg-muted/70" />
              </div>
              <div className="space-y-3">
                <div className="h-8 w-3/4 animate-pulse rounded bg-muted/80" />
                <div className="h-5 w-1/2 animate-pulse rounded bg-muted/60" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <div
                    className="h-16 animate-pulse rounded-2xl border border-border/60 bg-muted/45"
                    key={index}
                  />
                ))}
              </div>
              <div className="rounded-2xl border border-border/65 bg-background/76 p-4">
                <div className="space-y-3">
                  <div className="h-4 w-28 animate-pulse rounded bg-muted/70" />
                  <div className="h-5 w-2/3 animate-pulse rounded bg-muted/80" />
                  <div className="flex gap-2">
                    <div className="h-6 w-12 animate-pulse rounded-full bg-primary/10" />
                    <div className="h-6 w-14 animate-pulse rounded-full bg-muted/60" />
                    <div className="h-6 w-16 animate-pulse rounded-full bg-muted/50" />
                  </div>
                  <div className="h-10 animate-pulse rounded-xl bg-muted/70" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/80 shadow-sm">
            <div className="space-y-3 p-4 sm:p-6">
              <div className="h-6 w-28 animate-pulse rounded bg-muted/80" />
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  className="h-24 animate-pulse rounded-2xl border border-border/60 bg-muted/45"
                  key={index}
                />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/80 shadow-sm lg:hidden">
            <div className="space-y-3 p-4">
              <div className="h-4 w-28 animate-pulse rounded bg-muted/70" />
              <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-muted/50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
