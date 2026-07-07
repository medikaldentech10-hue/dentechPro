const SKELETON_CARDS = Array.from({ length: 9 }, (_, index) => index);

export default function ProductsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-3 py-4 md:gap-6 md:px-6 md:py-8">
      <div className="-mx-3 flex flex-col gap-3 border-b border-border/70 bg-background/92 px-3 py-3 md:mx-0 md:border-b-0 md:bg-transparent md:px-0 md:py-0">
        <div className="space-y-2">
          <div className="h-8 w-32 animate-pulse rounded-lg bg-muted md:h-10 md:w-40" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted/70" />
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(180px,1.4fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_auto]">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="h-10 animate-pulse rounded-lg bg-muted/75" key={index} />
          ))}
        </div>

        <div className="flex gap-2 overflow-hidden pb-1">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              className="h-8 w-20 shrink-0 animate-pulse rounded-full bg-muted/65"
              key={index}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24 space-y-3 rounded-2xl border border-border/60 bg-card/50 p-4">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            {Array.from({ length: 6 }, (_, index) => (
              <div className="h-9 animate-pulse rounded-lg bg-muted/70" key={index} />
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-9 w-28 animate-pulse rounded-lg bg-muted/70" />
          </div>

          <div
            aria-busy="true"
            aria-label="Katalog yükleniyor"
            className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3"
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
    <div className="overflow-hidden rounded-[1.4rem] border border-border/60 bg-card/70 shadow-sm">
      <div className="aspect-square animate-pulse bg-muted/55" />
      <div className="space-y-3 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="h-6 w-16 animate-pulse rounded-full bg-primary/10" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted/70" />
        </div>
        <div className="space-y-2">
          <div className="h-4 animate-pulse rounded bg-muted/80" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-12 animate-pulse rounded-full bg-muted/65" />
          <div className="h-6 w-14 animate-pulse rounded-full bg-muted/55" />
        </div>
        <div className="space-y-2 pt-1">
          <div className="h-9 animate-pulse rounded-full bg-muted/70" />
          <div className="h-9 animate-pulse rounded-full bg-primary/10" />
        </div>
      </div>
    </div>
  );
}
