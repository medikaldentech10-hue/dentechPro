import Link from "next/link";

import { SurfaceCard } from "@/components/premium/surface-card";
import type { CatalogCategory } from "@/lib/products";
import { cn } from "@/lib/utils";

type FilterSidebarProps = {
  categories: CatalogCategory[];
  currentParams?: CatalogFilterParams;
  selectedCategory?: string;
};

export function FilterSidebar({
  categories,
  currentParams = {},
  selectedCategory,
}: FilterSidebarProps) {
  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <SurfaceCard className="sticky top-24 flex flex-col gap-5 rounded-2xl border-border/70 bg-card/72 p-5 shadow-[0_18px_55px_rgb(15_23_42/0.06)]">
        <div className="border-b border-border/60 pb-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Katalog Filtreleri
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Tüm aktif ürünleri kategoriye göre daraltın.
          </p>
        </div>
        <FilterSection
          currentParams={currentParams}
          items={categories}
          selectedCategory={selectedCategory}
          title="Kategoriler"
        />
      </SurfaceCard>
    </aside>
  );
}

export function FilterSection({
  currentParams = {},
  items,
  selectedCategory,
  title,
}: {
  currentParams?: CatalogFilterParams;
  items: CatalogCategory[];
  selectedCategory?: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="flex flex-col gap-2">
        <FilterLink
          href={getFilterHref(currentParams)}
          isActive={!selectedCategory}
          label="Tümü"
        />
        {items
          .filter((item) => item.slug !== "frezler" && item.slug !== "jota-frezler")
          .map((item) => (
            <FilterLink
              href={getFilterHref(currentParams, item.slug)}
              isActive={selectedCategory === item.slug}
              key={item.id}
              label={item.name}
            />
          ))}
      </div>
    </div>
  );
}

type CatalogFilterParams = {
  brand?: string;
  category?: string;
  max_price?: string;
  min_price?: string;
  q?: string;
  usage?: string;
};

function getFilterHref(params: CatalogFilterParams, category?: string) {
  const nextParams = new URLSearchParams();

  if (params.q) nextParams.set("q", params.q);
  if (params.brand) nextParams.set("brand", params.brand);
  if (params.usage) nextParams.set("usage", params.usage);
  if (params.min_price) nextParams.set("min_price", params.min_price);
  if (params.max_price) nextParams.set("max_price", params.max_price);
  if (category) nextParams.set("category", category);

  const query = nextParams.toString();

  return query ? `/products?${query}` : "/products";
}

function FilterLink({
  href,
  isActive,
  label,
}: {
  href: string;
  isActive: boolean;
  label: string;
}) {
  return (
    <Link
      className={cn(
        "flex items-center justify-between rounded-xl border border-border/70 bg-background/58 px-3 py-2.5 text-left text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-primary/8 hover:text-foreground",
        isActive &&
          "border-primary/35 bg-primary/10 font-medium text-primary shadow-sm ring-1 ring-primary/10"
      )}
      href={href}
    >
      <span>{label}</span>
    </Link>
  );
}
