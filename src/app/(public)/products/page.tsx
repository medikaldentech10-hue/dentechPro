import Link from "next/link";
import { after } from "next/server";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";

import { FilterSidebar } from "@/components/products/filter-sidebar";
import { ProductCard } from "@/components/products/product-card";
import { EmptyState } from "@/components/shared/empty-state";
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

const MOBILE_SEARCH_SUGGESTIONS = SEARCH_SUGGESTIONS.slice(0, 7);

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
  const searchUiKey = getFilterUiStateKey(params);

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-3 py-4 md:gap-6 md:px-6 md:py-8">
      <div className="-mx-3 flex flex-col justify-between gap-3 border-b border-border/70 bg-background/88 px-3 py-3 shadow-sm backdrop-blur-xl md:mx-0 md:gap-4 md:border-b-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none md:backdrop-blur-none">
        <div className="flex flex-col gap-1 md:gap-2">
          <h1 className="text-xl font-semibold tracking-normal text-foreground md:text-3xl">
            Katalog
          </h1>
          <p className="max-w-2xl text-sm leading-5 text-muted-foreground md:text-base md:leading-6">
            Ürün adı, SKU veya kullanım alanına göre hızlıca arayın.
          </p>
        </div>

        <form className="flex gap-2 md:hidden" key={`mobile-search-${searchUiKey}`}>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-full pl-9 text-sm"
              defaultValue={filters.query}
              name="q"
              placeholder="Ürün adı veya SKU ara"
            />
          </div>
          <PreservedSearchParamInputs includeQ={false} params={params} />
          <input name="page" type="hidden" value="1" />
          <Button className="h-10 shrink-0 rounded-full px-4" type="submit">
            Ara
          </Button>
        </form>

        <details className="group md:hidden">
          <summary className="flex h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-border/70 bg-background px-4 text-sm font-semibold shadow-sm transition hover:border-primary/35 hover:bg-primary/8 [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="size-4" />
            Filtreler
          </summary>
          <form
            className="mt-3 grid gap-2 rounded-2xl border border-border/70 bg-card/70 p-3 shadow-sm"
            key={`mobile-filters-${searchUiKey}`}
          >
            <input name="page" type="hidden" value="1" />
            {params.q ? <input name="q" type="hidden" value={params.q} /> : null}
            <CatalogSelects
              categories={categories}
              filters={filters}
              usageAreas={usageAreas}
            />
            {hasPriceAccess ? (
              <PriceFilterInputs params={params} />
            ) : null}
            <div className="mt-1 flex items-center gap-3">
              <Button className="h-9 flex-1 rounded-full" type="submit">
                Filtrele
              </Button>
              {hasActiveFilters ? (
                <Link
                  className={cn(
                    buttonVariants({ variant: "link" }),
                    "h-auto px-0 text-sm"
                  )}
                  href="/products"
                >
                  Temizle
                </Link>
              ) : null}
            </div>
          </form>
        </details>

        <form
          className="hidden gap-2 md:grid md:grid-cols-[minmax(180px,1.4fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)_auto]"
          key={`desktop-filters-${searchUiKey}`}
        >
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
          <CatalogSelects
            categories={categories}
            filters={filters}
            usageAreas={usageAreas}
          />
          {hasPriceAccess ? (
            <div className="grid grid-cols-2 gap-2 md:col-span-2 xl:col-span-1">
              <PriceFilterInputs params={params} />
            </div>
          ) : null}
          <Button type="submit">Filtrele</Button>
        </form>

        <SearchChips
          currentQuery={params.q}
          params={params}
          suggestions={MOBILE_SEARCH_SUGGESTIONS}
          variant="mobile"
        />
        <SearchChips
          currentQuery={params.q}
          params={params}
          suggestions={SEARCH_SUGGESTIONS}
          variant="desktop"
        />

        {hasActiveFilters ? (
          <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2 shadow-sm backdrop-blur md:rounded-2xl md:py-3 md:flex-row md:items-center md:justify-between">
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
                <div className="hidden flex-col gap-2 sm:flex sm:flex-row sm:items-center">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Akıllı arama
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground">
                      Aramanızdan algılanan kriterler:
                    </span>
                    {interpretedCriteria.map((criterion) => (
                      <span
                        className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
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
          <div className="mb-3 flex flex-col gap-2 text-sm text-muted-foreground sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {productResult.totalCount} ürün içinde sayfa {productResult.page} /{" "}
              {productResult.totalPages}
            </p>
            <PaginationLinks
              currentPage={productResult.page}
              hasNextPage={productResult.hasNextPage}
              hasPreviousPage={productResult.hasPreviousPage}
              params={params}
              totalPages={productResult.totalPages}
            />
          </div>
          {products.length ? (
            <>
              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
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
              <div className="mt-5 flex justify-center sm:mt-6">
                <PaginationLinks
                  currentPage={productResult.page}
                  hasNextPage={productResult.hasNextPage}
                  hasPreviousPage={productResult.hasPreviousPage}
                  params={params}
                  totalPages={productResult.totalPages}
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

function CatalogSelects({
  categories,
  filters,
  usageAreas,
}: {
  categories: Awaited<ReturnType<typeof getCatalogCategories>>;
  filters: ProductFilters;
  usageAreas: string[];
}) {
  return (
    <>
      <select
        className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        defaultValue={filters.category ?? ""}
        name="category"
      >
        <option value="">Tüm kategoriler</option>
        {categories
          .filter((item) => item.slug !== "frezler" && item.slug !== "jota-frezler")
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
    </>
  );
}

function PriceFilterInputs({ params }: { params: ProductsSearchParams }) {
  return (
    <>
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
    </>
  );
}

function SearchChips({
  currentQuery,
  params,
  suggestions,
  variant,
}: {
  currentQuery?: string;
  params: ProductsSearchParams;
  suggestions: readonly string[];
  variant: "desktop" | "mobile";
}) {
  if (variant === "mobile") {
    return (
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 md:hidden">
        {suggestions.map((suggestion) => (
          <SearchChip
            isActive={currentQuery === suggestion}
            key={suggestion}
            params={params}
            suggestion={suggestion}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="hidden flex-col gap-2 rounded-2xl border border-border/60 bg-card/55 px-3 py-3 shadow-sm backdrop-blur md:flex">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Popüler aramalar
        </p>
        <p className="text-xs text-muted-foreground">
          Ürün kodu, ölçü veya kullanım alanı ile arayın
        </p>
      </div>
      <div className="-mx-1 flex flex-wrap gap-2 px-1">
        {suggestions.map((suggestion) => (
          <SearchChip
            isActive={currentQuery === suggestion}
            key={suggestion}
            params={params}
            suggestion={suggestion}
          />
        ))}
      </div>
    </div>
  );
}

function SearchChip({
  isActive,
  params,
  suggestion,
}: {
  isActive: boolean;
  params: ProductsSearchParams;
  suggestion: string;
}) {
  return (
    <Link
      className={cn(
        "shrink-0 rounded-full border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-primary/35 hover:bg-primary/10 hover:text-primary",
        isActive && "border-primary/40 bg-primary/12 text-primary"
      )}
      href={getSearchHref(params, suggestion)}
    >
      {suggestion}
    </Link>
  );
}

function getSearchHref(params: ProductsSearchParams, query: string) {
  const nextParams = new URLSearchParams();

  nextParams.set("q", query);
  if (params.brand) nextParams.set("brand", params.brand);
  if (params.category) nextParams.set("category", params.category);
  if (params.usage) nextParams.set("usage", params.usage);
  if (params.min_price) nextParams.set("min_price", params.min_price);
  if (params.max_price) nextParams.set("max_price", params.max_price);

  return `/products?${nextParams.toString()}`;
}

function PaginationLinks({
  currentPage,
  hasNextPage,
  hasPreviousPage,
  params,
  totalPages,
}: {
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  params: ProductsSearchParams;
  totalPages: number;
}) {
  if (totalPages <= 1 && !hasPreviousPage && !hasNextPage) {
    return null;
  }

  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = clampPage(currentPage, safeTotalPages);
  const visiblePages = getVisiblePages(safeCurrentPage, safeTotalPages);

  return (
    <nav
      aria-label="Sayfalama"
      className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end"
    >
      <div className="flex w-full items-center justify-between gap-2 sm:hidden">
        <PageArrowLink
          direction="previous"
          disabled={!hasPreviousPage || safeCurrentPage <= 1}
          href={getPageHref(params, safeCurrentPage - 1, safeTotalPages)}
        />
        <span className="text-xs font-medium text-muted-foreground">
          Sayfa {safeCurrentPage} / {safeTotalPages}
        </span>
        <PageArrowLink
          direction="next"
          disabled={!hasNextPage || safeCurrentPage >= safeTotalPages}
          href={getPageHref(params, safeCurrentPage + 1, safeTotalPages)}
        />
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        {hasPreviousPage && safeCurrentPage > 1 ? (
          <Link
            className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3 text-sm")}
            href={getPageHref(params, safeCurrentPage - 1, safeTotalPages)}
          >
            Önceki
          </Link>
        ) : null}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => {
            const previousPage = visiblePages[index - 1];
            const hasGap = previousPage ? page - previousPage > 1 : false;

            return (
              <span className="flex items-center gap-1" key={page}>
                {hasGap ? (
                  <span className="px-1 text-xs text-muted-foreground" aria-hidden="true">
                    ...
                  </span>
                ) : null}
                <Link
                  aria-current={page === safeCurrentPage ? "page" : undefined}
                  className={cn(
                    buttonVariants({
                      variant: page === safeCurrentPage ? "default" : "outline",
                    }),
                    "size-9 px-0 text-sm"
                  )}
                  href={getPageHref(params, page, safeTotalPages)}
                >
                  {page}
                </Link>
              </span>
            );
          })}
        </div>
        {hasNextPage && safeCurrentPage < safeTotalPages ? (
          <Link
            className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3 text-sm")}
            href={getPageHref(params, safeCurrentPage + 1, safeTotalPages)}
          >
            Sonraki
          </Link>
        ) : null}
      </div>
      <form
        className="flex w-full items-center justify-center gap-1 sm:w-auto"
        action="/products"
        key={`pagination-${getFilterUiStateKey(params)}-${safeCurrentPage}`}
      >
        <PreservedSearchParamInputs params={params} />
        <Input
          aria-label="Sayfa numarası"
          className="h-8 w-14 px-2 text-center text-xs sm:h-9 sm:w-16 sm:text-sm"
          defaultValue={safeCurrentPage}
          max={safeTotalPages}
          min={1}
          name="page"
          type="number"
        />
        <Button className="h-8 rounded-full px-3 text-xs sm:h-9 sm:rounded-md sm:text-sm" type="submit" variant="outline">
          Git
        </Button>
      </form>
    </nav>
  );
}

function PageArrowLink({
  direction,
  disabled,
  href,
}: {
  direction: "next" | "previous";
  disabled: boolean;
  href: string;
}) {
  const label = direction === "previous" ? "Önceki sayfa" : "Sonraki sayfa";
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "size-9 rounded-full px-0 opacity-45"
        )}
      >
        <Icon className="size-4" />
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <Link
      aria-label={label}
      className={cn(buttonVariants({ variant: "outline" }), "size-9 rounded-full px-0")}
      href={href}
    >
      <Icon className="size-4" />
    </Link>
  );
}

function getPageHref(
  params: ProductsSearchParams,
  page: number,
  totalPages?: number
) {
  const nextParams = new URLSearchParams();
  const safePage = totalPages ? clampPage(page, totalPages) : Math.max(1, page);

  if (params.q) nextParams.set("q", params.q);
  if (params.brand) nextParams.set("brand", params.brand);
  if (params.category) nextParams.set("category", params.category);
  if (params.usage) nextParams.set("usage", params.usage);
  if (params.min_price) nextParams.set("min_price", params.min_price);
  if (params.max_price) nextParams.set("max_price", params.max_price);
  nextParams.set("page", String(safePage));

  return `/products?${nextParams.toString()}`;
}

function PreservedSearchParamInputs({
  includeQ = true,
  params,
}: {
  includeQ?: boolean;
  params: ProductsSearchParams;
}) {
  return (
    <>
      {includeQ && params.q ? <input name="q" type="hidden" value={params.q} /> : null}
      {params.brand ? <input name="brand" type="hidden" value={params.brand} /> : null}
      {params.category ? (
        <input name="category" type="hidden" value={params.category} />
      ) : null}
      {params.usage ? <input name="usage" type="hidden" value={params.usage} /> : null}
      {params.min_price ? (
        <input name="min_price" type="hidden" value={params.min_price} />
      ) : null}
      {params.max_price ? (
        <input name="max_price" type="hidden" value={params.max_price} />
      ) : null}
    </>
  );
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages]);

  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

function clampPage(page: number, totalPages: number) {
  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.min(Math.max(1, Math.floor(page)), Math.max(1, totalPages));
}

function getFilterUiStateKey(params: ProductsSearchParams) {
  return [
    params.q ?? "",
    params.brand ?? "",
    params.category ?? "",
    params.usage ?? "",
    params.min_price ?? "",
    params.max_price ?? "",
    params.page ?? "",
  ].join("|");
}
