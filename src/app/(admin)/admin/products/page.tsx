import Link from "next/link";
import type { ReactNode } from "react";

import { SurfaceCard } from "@/components/premium/surface-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getAdminBrands,
  getAdminCategories,
  getAdminProductList,
  type AdminProductFilters,
  type AdminProductListItem,
  type AdminProductQualityFilter,
} from "@/lib/admin-products";
import { cn } from "@/lib/utils";

type AdminProductsSearchParams = {
  active?: "active" | "inactive" | "all";
  brand?: string;
  category?: string;
  page?: string;
  q?: string;
  quality?: AdminProductQualityFilter;
};

type AdminProductsPageProps = {
  searchParams: Promise<AdminProductsSearchParams>;
};

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const params = await searchParams;
  const filters: AdminProductFilters = {
    active: params.active ?? "active",
    brand: params.brand,
    category: params.category,
    page: params.page,
    pageSize: 25,
    quality: params.quality ?? "all",
    query: params.q,
  };
  const [brands, categories, productResult] = await Promise.all([
    getAdminBrands(),
    getAdminCategories(),
    getAdminProductList(filters),
  ]);
  const products = productResult.products;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Ürün Yönetimi"
        description="Katalog ürünlerini, eksik fiyatları ve varyant durumlarını yönetin."
      />

      <div className="flex flex-wrap gap-2">
        <QualityTab href={getQualityHref(params, "all")} selected={filters.quality === "all"}>
          Tüm Ürünler
        </QualityTab>
        <QualityTab
          href={getQualityHref(params, "missing_price")}
          selected={filters.quality === "missing_price"}
        >
          Fiyat Eksik
        </QualityTab>
        <QualityTab
          href={getQualityHref(params, "no_active_variant")}
          selected={filters.quality === "no_active_variant"}
        >
          Varyant Yok
        </QualityTab>
        <QualityTab
          href={getQualityHref(params, "inactive_or_duplicate")}
          selected={filters.quality === "inactive_or_duplicate"}
        >
          Pasif / Tekrarlı Varyant
        </QualityTab>
      </div>

      <SurfaceCard>
        <CardContent className="p-4">
          <form className="grid gap-3 lg:grid-cols-[1fr_180px_220px_160px_auto]">
            <Input
              defaultValue={filters.query}
              name="q"
              placeholder="Ürün adı, SKU veya varyant kodu"
            />
            <input name="page" type="hidden" value="1" />
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue={filters.brand}
              name="brand"
            >
              <option value="">Tüm markalar</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue={filters.category}
              name="category"
            >
              <option value="">Tüm kategoriler</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue={filters.active}
              name="active"
            >
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="all">Tümü</option>
            </select>
            <input name="quality" type="hidden" value={filters.quality} />
            <Button type="submit">Filtrele</Button>
          </form>
        </CardContent>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col gap-2 border-b border-border/70 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
          <div className="hidden grid-cols-[1.3fr_0.7fr_1fr_0.7fr_0.7fr_0.7fr_0.9fr_0.4fr] gap-3 border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground xl:grid">
            <span>Ürün</span>
            <span>Marka</span>
            <span>Kategori</span>
            <span>Durum</span>
            <span>Varyant</span>
            <span>Stok</span>
            <span>Fiyat</span>
            <span />
          </div>

          {products.length ? (
            <div className="divide-y divide-border/60">
              {products.map((product) => (
                <div
                  className="grid gap-4 px-4 py-4 text-sm xl:grid-cols-[1.3fr_0.7fr_1fr_0.7fr_0.7fr_0.7fr_0.9fr_0.4fr] xl:items-center"
                  key={product.id}
                >
                  <MobileLabel
                    label="Ürün"
                    value={
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold">{product.productName}</span>
                        <span className="text-xs text-muted-foreground">
                          {product.productGroupCode}
                        </span>
                        <ProductQualityBadges product={product} />
                      </div>
                    }
                  />
                  <MobileLabel label="Marka" value={product.brand} />
                  <MobileLabel label="Kategori" value={product.categoryName} />
                  <div className="flex items-center justify-between gap-3 xl:block">
                    <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground xl:hidden">
                      Durum
                    </span>
                    <ProductStatusBadge isActive={product.isActive} />
                  </div>
                  <MobileLabel
                    label="Varyant"
                    value={`${product.activeVariantCount} aktif / ${product.variantCount} toplam`}
                  />
                  <MobileLabel label="Stok" value={`${product.totalStock} adet`} />
                  <MobileLabel label="Fiyat" value={product.priceRange} />
                  <Link
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-border/70 bg-background/60 px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    href={`/admin/products/${product.id}`}
                  >
                    Detay
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                actionHref="/admin/products"
                actionLabel="Filtreleri Temizle"
                description="Seçili kalite, marka, kategori ve arama filtreleriyle eşleşen ürün bulunamadı."
                title="Ürün bulunamadı"
              />
            </div>
          )}
          {products.length ? (
            <div className="flex justify-center border-t border-border/70 px-4 py-4">
              <PaginationLinks
                currentPage={productResult.page}
                hasNextPage={productResult.hasNextPage}
                hasPreviousPage={productResult.hasPreviousPage}
                params={params}
              />
            </div>
          ) : null}
        </CardContent>
      </SurfaceCard>
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
  params: AdminProductsSearchParams;
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
  params: AdminProductsSearchParams,
  page: number
) {
  const nextParams = new URLSearchParams();

  if (params.q) nextParams.set("q", params.q);
  if (params.brand) nextParams.set("brand", params.brand);
  if (params.category) nextParams.set("category", params.category);
  if (params.active) nextParams.set("active", params.active);
  if (params.quality) nextParams.set("quality", params.quality);
  nextParams.set("page", String(page));

  return `/admin/products?${nextParams.toString()}`;
}

function getQualityHref(
  params: AdminProductsSearchParams,
  quality: AdminProductQualityFilter
) {
  const nextParams = new URLSearchParams();

  if (params.q) nextParams.set("q", params.q);
  if (params.brand) nextParams.set("brand", params.brand);
  if (params.category) nextParams.set("category", params.category);
  if (params.active) nextParams.set("active", params.active);
  if (quality !== "all") nextParams.set("quality", quality);

  const query = nextParams.toString();
  return query ? `/admin/products?${query}` : "/admin/products";
}

function QualityTab({
  children,
  href,
  selected,
}: {
  children: ReactNode;
  href: string;
  selected: boolean;
}) {
  return (
    <Link
      className={buttonVariants({ variant: selected ? "default" : "outline" })}
      href={href}
    >
      {children}
    </Link>
  );
}

function ProductQualityBadges({ product }: { product: AdminProductListItem }) {
  if (
    !product.hasMissingPrice &&
    !product.hasNoActiveVariant &&
    !product.hasInactiveVariant &&
    !product.hasDuplicateLikeVariants
  ) {
    return null;
  }

  return (
    <span className="flex flex-wrap gap-1 pt-1">
      {product.hasMissingPrice ? (
        <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300" variant="outline">
          Fiyat Eksik
        </Badge>
      ) : null}
      {product.hasNoActiveVariant ? (
        <Badge className="border-destructive/30 bg-destructive/10 text-destructive" variant="outline">
          Varyant Yok
        </Badge>
      ) : null}
      {product.hasInactiveVariant ? (
        <Badge variant="secondary">Pasif Varyant Var</Badge>
      ) : null}
      {product.hasDuplicateLikeVariants ? (
        <Badge variant="secondary">Tekrarlı Kod</Badge>
      ) : null}
    </span>
  );
}

function ProductStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-background/70",
        isActive
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-muted-foreground/30 bg-muted text-muted-foreground"
      )}
    >
      {isActive ? "Aktif" : "Pasif"}
    </Badge>
  );
}

function MobileLabel({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 xl:block">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground xl:hidden">
        {label}
      </span>
      <span className="min-w-0 text-right font-medium xl:text-left">{value}</span>
    </div>
  );
}
