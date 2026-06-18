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
      <SurfaceCard className="sticky top-24 flex flex-col gap-6 p-5">
        <FilterSection
          currentParams={currentParams}
          items={categories}
          selectedCategory={selectedCategory}
          title="JOTA Alt Kategorileri"
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
        "flex items-center justify-between rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-left text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-accent/30 hover:text-foreground",
        isActive && "border-primary/40 bg-accent/50 text-foreground"
      )}
      href={href}
    >
      <span>{label}</span>
    </Link>
  );
}
