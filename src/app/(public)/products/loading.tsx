const SKELETON_CARDS = Array.from({ length: 12 }, (_, index) => index);

export default function ProductsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <div className="-mx-4 flex flex-col justify-between gap-4 border-b border-border/70 bg-background/88 px-4 py-4 shadow-sm backdrop-blur-xl md:mx-0 md:border-b-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none md:backdrop-blur-none">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted/80" />
          </div>
          <div className="h-10 w-28 animate-pulse rounded-lg bg-muted md:hidden" />
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(180px,1.4fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_auto]">
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/55 px-3 py-3 shadow-sm backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            <div className="h-3 w-52 animate-pulse rounded bg-muted/70" />
          </div>
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-muted/80"
                key={index}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24 space-y-3 rounded-2xl border border-border/60 bg-card/55 p-4 shadow-sm backdrop-blur">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            {Array.from({ length: 7 }, (_, index) => (
              <div
                className="h-9 animate-pulse rounded-lg bg-muted/70"
                key={index}
              />
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-10 w-24 animate-pulse rounded-lg bg-muted" />
          </div>
          <div
            aria-busy="true"
            aria-label="Katalog yukleniyor"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {SKELETON_CARDS.map((item) => (
              <ProductCardSkeleton key={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="h-full overflow-hidden rounded-[1.7rem] border border-white/20 bg-white/38 shadow-[0_18px_56px_rgb(15_23_42/0.07)] ring-1 ring-black/[0.01] backdrop-blur-2xl dark:border-white/8 dark:bg-slate-950/42 dark:ring-white/[0.025]">
      <div className="flex flex-col p-2.5 pb-1 sm:p-3 sm:pb-1.5">
        <div className="relative aspect-square overflow-hidden rounded-[1.45rem] bg-[radial-gradient(circle_at_28%_18%,rgb(211_250_229/0.55),transparent_35%),radial-gradient(circle_at_76%_70%,rgb(20_118_82/0.12),transparent_38%),linear-gradient(145deg,rgb(255_255_255),rgb(244_248_247))] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.8),inset_0_-46px_90px_rgb(15_23_42/0.055)] dark:bg-[radial-gradient(circle_at_28%_18%,rgb(20_118_82/0.14),transparent_35%),linear-gradient(145deg,rgb(248_250_252),rgb(226_232_240))]">
          <div className="absolute inset-8 animate-pulse rounded-[1.25rem] bg-white/52" />
          <div className="absolute inset-x-3 bottom-3 rounded-[1.15rem] border border-white/70 bg-gradient-to-br from-white/68 via-white/44 to-white/28 p-2.5 shadow-[0_14px_36px_rgb(15_23_42/0.14)] backdrop-blur-2xl">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="h-6 w-16 animate-pulse rounded-full bg-primary/12" />
              <div className="h-3 w-16 animate-pulse rounded bg-slate-200/80" />
            </div>
            <div className="space-y-1.5">
              <div className="h-4 animate-pulse rounded bg-slate-200/90" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200/70" />
            </div>
            <div className="mt-2 flex gap-1.5">
              <div className="h-6 w-12 animate-pulse rounded-full bg-primary/12" />
              <div className="h-6 w-12 animate-pulse rounded-full bg-white/72" />
              <div className="h-6 w-12 animate-pulse rounded-full bg-white/72" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-auto px-3.5 pb-3.5 pt-0">
        <div className="flex flex-col gap-2 rounded-[1.15rem] border border-white/28 bg-white/34 p-2 shadow-[0_8px_24px_rgb(15_23_42/0.045)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-950/42">
          <div className="h-9 animate-pulse rounded-full bg-muted/65" />
          <div className="h-10 animate-pulse rounded-full bg-primary/18" />
        </div>
      </div>
    </div>
  );
}
