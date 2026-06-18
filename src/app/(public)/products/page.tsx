import Link from "next/link";
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
  getPricedProductsForProfile,
  type ProductFilters,
} from "@/lib/products";

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
  const [categories, usageAreas, productResult] = await Promise.all([
    getCatalogCategories(),
    getCatalogUsageAreas(),
    getPricedProductsForProfile(profile, filters),
  ]);
  const products = productResult.products;
  const priceVisibility = hasPriceAccess
    ? "approved"
    : profile
      ? "pending"
      : "public";

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <div className="sticky top-16 z-20 -mx-4 flex flex-col justify-between gap-4 border-b border-border/70 bg-background/88 px-4 py-4 shadow-sm backdrop-blur-xl md:static md:mx-0 md:border-b-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none md:backdrop-blur-none">
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
