import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AddToRequestForm } from "@/components/products/add-to-request-form";
import { PremiumCard } from "@/components/premium/premium-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  CardAction,
  CardContent,
  CardHeader,
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

  return (
    <PremiumCard>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <StatusBadge
            label={catalogProduct.category?.name ?? "JOTA Frezler"}
            tone="success"
          />
          <CardTitle>{catalogProduct.name}</CardTitle>
        </div>
        <CardAction>
          <Link
            aria-label={`${catalogProduct.name} detay`}
            className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            href={`/products/${catalogProduct.id}`}
          >
            <ArrowRight />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="aspect-[4/3] rounded-xl border border-border/70 bg-[linear-gradient(135deg,rgb(255_255_255/0.88),rgb(20_118_82/0.14))] p-4 dark:bg-[linear-gradient(135deg,rgb(255_255_255/0.06),rgb(20_118_82/0.18))]">
          <div className="flex h-full flex-col justify-between rounded-lg border border-white/65 bg-white/55 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/8">
            <span className="text-xs font-medium text-muted-foreground">
              {catalogProduct.brand}
            </span>
            <span className="text-3xl font-semibold text-primary">
              {primaryVariant?.connectionType ?? "FG"}
            </span>
            <span className="text-xs text-muted-foreground">
              {primaryVariant?.code ?? catalogProduct.code}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {primaryVariant?.name ?? catalogProduct.code}
          </p>
          <p className="text-xs text-muted-foreground">{catalogProduct.status}</p>
          <PriceState visibility={priceVisibility} variant={primaryVariant} />
        </div>
        <ProductAction
          adminMode={adminMode}
          priceVisibility={priceVisibility}
          salesMode={salesMode}
          variant={primaryVariant}
        />
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

function parseLegacyPrice(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const price = Number.parseFloat(normalized);

  return Number.isFinite(price) ? price : null;
}
