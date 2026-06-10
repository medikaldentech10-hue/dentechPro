import { Search } from "lucide-react";

import { FilterDrawer } from "@/components/products/filter-drawer";
import { FilterSidebar } from "@/components/products/filter-sidebar";
import { ProductCard } from "@/components/products/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canViewPrices, getCurrentProfile, isAdmin, isSalesRep } from "@/lib/auth";
import {
  getCatalogCategories,
  getPricedProductsForProfile,
  type ProductFilters,
} from "@/lib/products";

type ProductsPageProps = {
  searchParams: Promise<{
    brand?: string;
    category?: string;
    q?: string;
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const filters: ProductFilters = {
    brand: params.brand || "JOTA",
    category: params.category,
    query: params.q,
  };
  const [categories, products] = await Promise.all([
    getCatalogCategories(),
    getPricedProductsForProfile(profile, filters),
  ]);
  const priceVisibility = canViewPrices(profile)
    ? "approved"
    : profile
      ? "pending"
      : "public";

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <div className="sticky top-16 z-20 -mx-4 flex flex-col justify-between gap-4 border-b border-border/70 bg-background/88 px-4 py-4 shadow-sm backdrop-blur-xl md:static md:mx-0 md:border-b-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none md:backdrop-blur-none">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <PageTitle
            title="JOTA Frezler"
            description="JOTA ürün kataloğu. Fiyat ve stok görünümü kullanıcı onay durumuna göre sunulur."
          />
          <div className="flex gap-2">
            <FilterDrawer
              categories={categories}
              selectedCategory={filters.category}
            />
            <Button disabled={priceVisibility !== "approved"}>
              Talep Oluştur
            </Button>
          </div>
        </div>
        <form className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 pl-9"
              defaultValue={filters.query}
              name="q"
              placeholder="Ürün adı veya SKU ara"
            />
          </div>
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            defaultValue={filters.brand}
            name="brand"
          >
            <option value="JOTA">JOTA</option>
          </select>
          <Button type="submit">Filtrele</Button>
        </form>
      </div>
      <div className="flex gap-6">
        <FilterSidebar
          categories={categories}
          selectedCategory={filters.category}
        />
        <div className="min-w-0 flex-1">
          {products.length ? (
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
          ) : (
            <EmptyState
              actionLabel="Filtreleri Temizle"
              description="Seçili filtrelerle eşleşen aktif JOTA ürünü bulunamadı. Import çalıştırıldıktan sonra ürünler burada listelenecek."
              title="Ürün bulunamadı"
            />
          )}
        </div>
      </div>
    </div>
  );
}
