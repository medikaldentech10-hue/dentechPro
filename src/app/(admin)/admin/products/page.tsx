import Link from "next/link";
import type { ReactNode } from "react";
import { Edit } from "lucide-react";

import { SurfaceCard } from "@/components/premium/surface-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getAdminCategories,
  getAdminProductList,
  type AdminProductFilters,
} from "@/lib/admin-products";
import { cn } from "@/lib/utils";

type AdminProductsPageProps = {
  searchParams: Promise<{
    active?: "active" | "inactive" | "all";
    brand?: string;
    category?: string;
    q?: string;
  }>;
};

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const params = await searchParams;
  const filters: AdminProductFilters = {
    active: params.active ?? "active",
    brand: params.brand || "JOTA",
    category: params.category,
    query: params.q,
  };
  const [categories, products] = await Promise.all([
    getAdminCategories(),
    getAdminProductList(filters),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Ürün Yönetimi"
        description="JOTA katalog ürünlerini ve varyant bazlı fiyat/stok durumunu yönetin."
      />

      <SurfaceCard>
        <CardContent className="p-4">
          <form className="grid gap-3 lg:grid-cols-[1fr_160px_220px_160px_auto]">
            <Input
              defaultValue={filters.query}
              name="q"
              placeholder="Ürün adı, SKU veya varyant kodu"
            />
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue={filters.brand}
              name="brand"
            >
              <option value="JOTA">JOTA</option>
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
            <Button type="submit">Filtrele</Button>
          </form>
        </CardContent>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <CardContent className="p-0">
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
                    value={`${product.variantCount} varyant`}
                  />
                  <MobileLabel label="Stok" value={`${product.totalStock} adet`} />
                  <MobileLabel label="Fiyat" value={product.priceRange} />
                  <Link
                    aria-label={`${product.productName} düzenle`}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    href={`/admin/products/${product.id}`}
                  >
                    <Edit />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                actionLabel="Filtreleri Temizle"
                description="Seçili filtrelerle eşleşen ürün bulunamadı. Import çalıştıktan sonra JOTA ürünleri burada listelenir."
                title="Ürün bulunamadı"
              />
            </div>
          )}
        </CardContent>
      </SurfaceCard>
    </div>
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
