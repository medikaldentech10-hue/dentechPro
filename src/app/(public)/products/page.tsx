import Link from "next/link";
import { after } from "next/server";
import { Search } from "lucide-react";

import { FilterDrawer } from "@/components/products/filter-drawer";
import { FilterSidebar } from "@/components/products/filter-sidebar";
import { ProductCard } from "@/components/products/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canViewPrices, getCurrentProfile, isAdmin, isSalesRep } from "@/lib/auth";
import {
  getCatalogCategories,
  getCatalogUsageAreas,
  getCachedPublicFirstPageProducts,
  getPricedProductsForProfile,
  getPublicProducts,
  interpretCatalogQuery,
  type ProductFilters,
} from "@/lib/products";
import { recordCatalogSearch } from "@/lib/search-logs";
import { cn } from "@/lib/utils";

type ProductsSearchParams = {
  brand?: string;
  category?: string;
  max_price?: string;
  min_price?: string;
  page?: string;
  q?: string;
  usage?: string;
};

type ProductsPageProps = {
  searchParams: Promise<ProductsSearchParams>;
};

const SEARCH_SUGGESTIONS = [
  "859",
  "014",
  "FG",
  "RA",
  "mavi",
  "kırmızı",
  "zirkonya",
  "polisaj",
  "kompozit",
  "set",
  "elmas frez",
  "karbit frez",
] as const;

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const filters: ProductFilters = {
    brand: params.brand || "JOTA",
    category: params.category,
    maxPrice: params.max_price,
    minPrice: params.min_price,
    page: params.page,
    pageSize: 24,
    query: params.q,
    usage: params.usage,
  };
  const hasPriceAccess = canViewPrices(profile);
  const hasActiveFilters = Boolean(
    params.q ||
      params.category ||
      params.usage ||
      params.min_price ||
      params.max_price ||
      (params.brand && params.brand !== "JOTA")
  );
  const isFirstPublicCatalogPage =
    !hasPriceAccess && !hasActiveFilters && (!params.page || params.page === "1");
  const [categories, usageAreas, productResult] = await Promise.all([
    getCatalogCategories(),
    getCatalogUsageAreas(),
    hasPriceAccess
      ? getPricedProductsForProfile(profile, filters)
      : isFirstPublicCatalogPage
        ? getCachedPublicFirstPageProducts(filters)
        : getPublicProducts(filters),
  ]);
  after(async () => {
    await recordCatalogSearch({
      profile,
      query: params.q,
      resultCount: productResult.totalCount,
    });
  });
  const products = productResult.products;
  const priceVisibility = hasPriceAccess
    ? "approved"
    : profile
      ? "pending"
      : "public";
  const activeFilterLabels = [
    params.q ? `Arama: ${params.q}` : null,
    params.category
      ? `Kategori: ${
          categories.find((category) => category.slug === params.category)?.name ??
          params.category
        }`
      : null,
    params.usage ? `Kullanım: ${params.usage}` : null,
    params.brand && params.brand !== "JOTA" ? `Marka: ${params.brand}` : null,
    hasPriceAccess && params.min_price ? `Min: ₺${params.min_price}` : null,
    hasPriceAccess && params.max_price ? `Max: ₺${params.max_price}` : null,
  ].filter((label): label is string => Boolean(label));
  const interpretedCriteria = interpretCatalogQuery(params.q);

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <div className="-mx-4 flex flex-col justify-between gap-4 border-b border-border/70 bg-background/88 px-4 py-4 shadow-sm backdrop-blur-xl md:mx-0 md:border-b-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none md:backdrop-blur-none">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <PageTitle
            description="DENTech Medikal JOTA kataloğunda ürün, kod ve kullanım alanına göre hızlıca arama yapın."
            title="Katalog"
          />
          <div className="flex gap-2">
            <FilterDrawer
              categories={categories}
              currentParams={params}
              selectedCategory={filters.category}
            />
          </div>
        </div>
        <form className="grid gap-2 md:grid-cols-[minmax(180px,1.4fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 pl-9"
              defaultValue={filters.query}
              name="q"
              placeholder="Ürün adı veya SKU ara"
            />
          </div>
          <input name="page" type="hidden" value="1" />
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            defaultValue={filters.category ?? ""}
            name="category"
          >
            <option value="">Tüm kategoriler</option>
            {categories
              .filter(
                (item) => item.slug !== "frezler" && item.slug !== "jota-frezler"
              )
              .map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
          </select>
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            defaultValue={filters.brand}
            name="brand"
          >
            <option value="JOTA">JOTA</option>
          </select>
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            defaultValue={filters.usage ?? ""}
            name="usage"
          >
            <option value="">Tüm kullanım alanları</option>
            {usageAreas.map((usageArea) => (
              <option key={usageArea} value={usageArea}>
                {usageArea}
              </option>
            ))}
          </select>
          {hasPriceAccess ? (
            <div className="grid grid-cols-2 gap-2 md:col-span-2 xl:col-span-1">
              <Input
                className="h-10"
                defaultValue={params.min_price}
                min={0}
                name="min_price"
                placeholder="Min fiyat"
                type="number"
              />
              <Input
                className="h-10"
                defaultValue={params.max_price}
                min={0}
                name="max_price"
                placeholder="Max fiyat"
                type="number"
              />
            </div>
          ) : null}
          <Button type="submit">Filtrele</Button>
        </form>
        <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/55 px-3 py-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Popüler aramalar
            </p>
            <p className="text-xs text-muted-foreground">
              Ürün kodu, ölçü veya kullanım alanı ile arayın
            </p>
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {SEARCH_SUGGESTIONS.map((suggestion) => (
              <Link
                className={cn(
                  "shrink-0 rounded-full border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-primary/35 hover:bg-primary/10 hover:text-primary",
                  params.q === suggestion && "border-primary/40 bg-primary/12 text-primary"
                )}
                href={`/products?q=${encodeURIComponent(suggestion)}`}
                key={suggestion}
              >
                {suggestion}
              </Link>
            ))}
          </div>
        </div>
        {hasActiveFilters ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/60 px-3 py-3 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {activeFilterLabels.map((label) => (
                  <span
                    className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    key={label}
                  >
                    {label}
                  </span>
                ))}
              </div>
              {interpretedCriteria.length ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Akıllı arama
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">
                      Aramanızdan algılanan kriterler:
                    </span>
                    {interpretedCriteria.map((criterion) => (
                      <span
                        className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-primary"
                        key={`${criterion.type}-${criterion.value}`}
                      >
                        {criterion.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <Link
              className={cn(
                buttonVariants({ variant: "link" }),
                "h-auto self-start px-0 text-sm md:self-center"
              )}
              href="/products"
            >
              Filtreleri Temizle
            </Link>
          </div>
        ) : null}
      </div>
      <div className="flex gap-6">
        <FilterSidebar
          categories={categories}
          currentParams={params}
          selectedCategory={filters.category}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>
              {productResult.totalCount} ürün içinde sayfa {productResult.page} /{" "}
              {productResult.totalPages}
            </p>
            <PaginationLinks
              currentPage={productResult.page}
              hasNextPage={productResult.hasNextPage}
              hasPreviousPage={productResult.hasPreviousPage}
              params={params}
            />
          </div>
          {products.length ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard
                    adminMode={isAdmin(profile)}
                    key={product.id}
                    priceVisibility={priceVisibility}
                    product={product}
                    salesMode={isSalesRep(profile)}
                  />
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                <PaginationLinks
                  currentPage={productResult.page}
                  hasNextPage={productResult.hasNextPage}
                  hasPreviousPage={productResult.hasPreviousPage}
                  params={params}
                />
              </div>
            </>
          ) : (
            <EmptyState
              actionHref="/products"
              actionLabel="Filtreleri Temizle"
              description="Seçili filtrelerle eşleşen aktif JOTA ürünü bulunamadı."
              title="Ürün bulunamadı"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PaginationLinks({
  currentPage,
  hasNextPage,
  hasPreviousPage,
  params,
}: {
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  params: ProductsSearchParams;
}) {
  if (!hasPreviousPage && !hasNextPage) {
    return null;
  }

  return (
    <div className="flex gap-2">
      {hasPreviousPage ? (
        <Link
          className={buttonVariants({ variant: "outline" })}
          href={getPageHref(params, currentPage - 1)}
        >
          Önceki
        </Link>
      ) : null}
      {hasNextPage ? (
        <Link
          className={buttonVariants({ variant: "outline" })}
          href={getPageHref(params, currentPage + 1)}
        >
          Sonraki
        </Link>
      ) : null}
    </div>
  );
}

function getPageHref(
  params: ProductsSearchParams,
  page: number
) {
  const nextParams = new URLSearchParams();

  if (params.q) nextParams.set("q", params.q);
  if (params.brand) nextParams.set("brand", params.brand);
  if (params.category) nextParams.set("category", params.category);
  if (params.usage) nextParams.set("usage", params.usage);
  if (params.min_price) nextParams.set("min_price", params.min_price);
  if (params.max_price) nextParams.set("max_price", params.max_price);
  nextParams.set("page", String(page));

  return `/products?${nextParams.toString()}`;
}
