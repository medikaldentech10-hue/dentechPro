import Link from "next/link";

import { AddToRequestForm } from "@/components/products/add-to-request-form";
import { ProductImage } from "@/components/products/product-image";
import { PremiumCard } from "@/components/premium/premium-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import type { PriceVisibility } from "@/lib/constants";
import type {
  PricedCatalogProduct,
  PricedCatalogVariant,
  PublicCatalogProduct,
  PublicCatalogVariant,
} from "@/lib/products";

type LegacyProduct = {
  category: string;
  code: string;
  id: string;
  name: string;
  price: string;
  status: string;
  variant: string;
};

type ProductCardProps = {
  adminMode?: boolean;
  priceVisibility?: PriceVisibility;
  product: LegacyProduct | PublicCatalogProduct | PricedCatalogProduct;
  salesMode?: boolean;
};

export function ProductCard({
  adminMode = false,
  priceVisibility = "public",
  product,
  salesMode = false,
}: ProductCardProps) {
  const catalogProduct = normalizeProduct(product);
  const primaryVariant = catalogProduct.variants[0] ?? null;
  const detailHref = `/products/${catalogProduct.id}`;
  const displayCode = getDisplayCode(primaryVariant?.code ?? catalogProduct.code);
  const description = getProductDescription(catalogProduct);

  return (
    <PremiumCard className="group/card relative h-full overflow-hidden rounded-2xl border-border/75 bg-card/90 shadow-[0_18px_60px_rgb(15_23_42/0.08)] hover:border-primary/35 hover:shadow-[0_24px_80px_rgb(20_118_82/0.14)]">
      <Link
        aria-label={`${catalogProduct.name} detayını aç`}
        className="absolute inset-0 z-0 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        href={detailHref}
      />
      <div className="pointer-events-none relative z-10 flex flex-1 flex-col gap-4 px-4 pt-4">
        <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-border/60 bg-[radial-gradient(circle_at_20%_20%,rgb(20_118_82/0.14),transparent_34%),linear-gradient(135deg,rgb(255_255_255/0.96),rgb(241_245_249/0.72))] p-2 shadow-inner dark:bg-[radial-gradient(circle_at_20%_20%,rgb(20_118_82/0.2),transparent_34%),linear-gradient(135deg,rgb(255_255_255/0.07),rgb(15_23_42/0.5))]">
          <ProductImage
            alt={catalogProduct.name}
            fallback={
              <div className="flex h-full flex-col justify-between rounded-xl border border-white/65 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/8">
                <span className="text-xs font-medium text-muted-foreground">
                  {catalogProduct.brand}
                </span>
                <span className="text-3xl font-semibold text-primary">
                  {primaryVariant?.connectionType ?? "JOTA"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Dental ürün kataloğu
                </span>
              </div>
            }
            src={catalogProduct.imageUrl ?? primaryVariant?.imageUrl}
          />
        </div>
        <div className="flex flex-col gap-3 pb-1">
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              label={catalogProduct.category?.name ?? "JOTA Frezler"}
              tone="success"
            />
            <span className="rounded-full border border-border/70 bg-background/72 px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              {catalogProduct.brand}
            </span>
          </div>
          <div className="flex min-h-[132px] flex-col gap-2">
            <CardTitle className="text-[1.05rem] leading-6 text-foreground md:text-lg">
              {catalogProduct.name}
            </CardTitle>
            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2.5 py-1">
                {catalogProduct.variantCount} varyant
              </span>
              {displayCode ? (
                <span className="rounded-full bg-muted px-2.5 py-1">
                  SKU: {displayCode}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <CardContent className="relative z-20 mt-auto px-4 pb-4 pt-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/72 p-3 shadow-sm backdrop-blur">
          <PriceState visibility={priceVisibility} variant={primaryVariant} />
          <ProductAction
            adminMode={adminMode}
            priceVisibility={priceVisibility}
            salesMode={salesMode}
            variant={primaryVariant}
          />
        </div>
      </CardContent>
    </PremiumCard>
  );
}

function PriceState({
  variant,
  visibility,
}: {
  variant: PricedCatalogVariant | PublicCatalogVariant | null;
  visibility: PriceVisibility;
}) {
  if (visibility === "approved" && variant && "price" in variant) {
    return (
      <p className="text-base font-semibold text-foreground">
        {formatPrice(variant.price, variant.currency)}
      </p>
    );
  }

  if (visibility === "pending") {
    return (
      <p className="rounded-lg border border-border/70 bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground">
        Fiyat için hesap onayı bekleniyor
      </p>
    );
  }

  return (
    <p className="rounded-lg border border-border/70 bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">
      Fiyat için giriş yapın
    </p>
  );
}

function ProductAction({
  adminMode,
  priceVisibility,
  salesMode,
  variant,
}: {
  adminMode: boolean;
  priceVisibility: PriceVisibility;
  salesMode: boolean;
  variant: PricedCatalogVariant | PublicCatalogVariant | null;
}) {
  if (priceVisibility !== "approved" || !variant || !("stockQuantity" in variant)) {
    return (
      <Button className="w-full" disabled>
        {getActionLabel({ adminMode, priceVisibility, salesMode })}
      </Button>
    );
  }

  const disabled = !variant.isActive || variant.stockQuantity === 0;

  return (
    <AddToRequestForm
      disabled={disabled}
      disabledReason={
        disabled
          ? !variant.isActive
            ? "Pasif varyant"
            : "Stok bilgisi için iletişime geçin"
          : undefined
      }
      submitLabel={salesMode ? "Müşteri Adına Ekle" : "Talep Listesine Ekle"}
      variantId={variant.id}
    />
  );
}

function getActionLabel({
  adminMode,
  priceVisibility,
  salesMode,
}: {
  adminMode: boolean;
  priceVisibility: PriceVisibility;
  salesMode: boolean;
}) {
  if (priceVisibility === "public") {
    return "Fiyat için giriş yapın";
  }

  if (priceVisibility === "pending") {
    return "Fiyat için hesap onayı bekleniyor";
  }

  if (adminMode) {
    return "Talep Listesine Ekle";
  }

  return salesMode ? "Müşteri Adına Ekle" : "Talep Listesine Ekle";
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

function normalizeProduct(
  product: LegacyProduct | PublicCatalogProduct | PricedCatalogProduct
): PublicCatalogProduct | PricedCatalogProduct {
  if ("variants" in product) {
    return product;
  }

  return {
    brand: "JOTA",
    category: {
      id: product.category,
      name: product.category,
      slug: product.category,
      sort_order: 0,
    },
    code: product.code,
    description: null,
    id: product.id,
    imageUrl: null,
    name: product.name,
    status: product.status,
    usageArea: product.status,
    variantCount: 1,
    variants: [
      {
        code: product.code,
        connectionType: "FG",
        currency: "TRY",
        grit: null,
        id: product.id,
        imageUrl: null,
        isActive: true,
        manufacturerRef: product.code,
        name: product.variant,
        packageQuantity: 1,
        price: parseLegacyPrice(product.price),
        stockQuantity: 0,
        stockStatus: "ask_for_stock",
      },
    ],
  };
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getProductDescription(
  product: PublicCatalogProduct | PricedCatalogProduct
) {
  const description = product.description ? stripHtml(product.description) : "";

  if (description) {
    return description.slice(0, 132);
  }

  if (product.usageArea) {
    return `${product.usageArea} kullanımı için katalogda yer alan profesyonel dental ürün.`;
  }

  return "DENTech Medikal kataloğunda yer alan profesyonel dental ürün.";
}

function getDisplayCode(value: string | undefined) {
  if (!value || isUuid(value)) {
    return null;
  }

  return value;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function parseLegacyPrice(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const price = Number.parseFloat(normalized);

  return Number.isFinite(price) ? price : null;
}
