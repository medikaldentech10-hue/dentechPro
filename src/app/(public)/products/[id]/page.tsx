import Link from "next/link";
import { notFound } from "next/navigation";

import { SurfaceCard } from "@/components/premium/surface-card";
import { AddToRequestForm } from "@/components/products/add-to-request-form";
import { ProductCard } from "@/components/products/product-card";
import { PageTitle } from "@/components/shared/page-title";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { canViewPrices, getCurrentProfile, isAdmin, isSalesRep } from "@/lib/auth";
import {
  getPricedProductByIdForProfile,
  type PricedCatalogVariant,
} from "@/lib/products";
import { cn } from "@/lib/utils";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  const product = await getPricedProductByIdForProfile(profile, id);

  if (!product) {
    notFound();
  }

  const priceVisibility = canViewPrices(profile)
    ? "approved"
    : profile
      ? "pending"
      : "public";
  const primaryVariant = product.variants[0] ?? null;
  const canSeeCommercialData =
    priceVisibility === "approved" && primaryVariant && "price" in primaryVariant;
  const pricedVariant = canSeeCommercialData
    ? (primaryVariant as PricedCatalogVariant)
    : null;
  const salesMode = isSalesRep(profile);

  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-8 md:px-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <PageTitle
          description={product.description ?? "JOTA ürün kataloğu"}
          title={product.name}
        />
        <SurfaceCard>
          <CardContent className="flex flex-col gap-5 p-6">
            <StatusBadge
              label={product.category?.name ?? "JOTA Frezler"}
              tone="success"
            />
            <div className="grid gap-4 text-sm md:grid-cols-2">
              <Info label="Ürün Kodu" value={product.code} />
              <Info
                label="Varyant"
                value={primaryVariant?.name ?? "Varyant bilgisi bekleniyor"}
              />
              <Info label="Marka" value={product.brand} />
              <Info
                label="Katalog Durumu"
                value={product.status || "JOTA ürün kataloğu"}
              />
              {pricedVariant ? (
                <>
                  <Info
                    label="Fiyat"
                    value={formatPrice(pricedVariant.price, pricedVariant.currency)}
                  />
                  <Info label="Stok" value={`${pricedVariant.stockQuantity} adet`} />
                </>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {pricedVariant ? (
                <div className="w-full sm:max-w-md">
                  <AddToRequestForm
                    disabled={
                      !pricedVariant.isActive || pricedVariant.stockQuantity === 0
                    }
                    disabledReason={
                      !pricedVariant.isActive
                        ? "Pasif varyant"
                        : "Stok bilgisi için iletişime geçin"
                    }
                    submitLabel={
                      salesMode ? "Müşteri Adına Ekle" : "Talep Listesine Ekle"
                    }
                    variantId={pricedVariant.id}
                  />
                </div>
              ) : (
                <Button disabled>
                  {priceVisibility === "pending"
                    ? "Hesabınız onaylandıktan sonra talep oluşturabilirsiniz"
                    : "Fiyat ve sipariş talebi için giriş yapın"}
                </Button>
              )}
              <Link
                className={cn(buttonVariants({ variant: "link" }))}
                href="/products"
              >
                Kataloğa Dön
              </Link>
            </div>
          </CardContent>
        </SurfaceCard>
      </div>
      <ProductCard
        adminMode={isAdmin(profile)}
        priceVisibility={priceVisibility}
        product={product}
        salesMode={salesMode}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/60 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function formatPrice(price: number | null, currency: string) {
  if (price === null) {
    return "Fiyat tanımlanmadı";
  }

  return `${new Intl.NumberFormat("tr-TR", {
    currency,
    style: "currency",
  }).format(price)} + KDV Hariç`;
}
