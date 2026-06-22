import Link from "next/link";

import { AddToRequestForm } from "@/components/products/add-to-request-form";
import { ProductImage } from "@/components/products/product-image";
import { PremiumCard } from "@/components/premium/premium-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardTitle } from "@/components/ui/card";
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
  const description = getProductDescription(catalogProduct, primaryVariant);
  const variantChips = getVariantChips(catalogProduct.variants);

  return (
    <PremiumCard className="group/card relative h-full overflow-hidden rounded-2xl border-border/70 bg-card/88 shadow-[0_12px_38px_rgb(15_23_42/0.07)] hover:border-primary/35 hover:shadow-[0_18px_54px_rgb(20_118_82/0.12)]">
      <Link
        aria-label={`${catalogProduct.name} detayını aç`}
        className="absolute inset-0 z-0 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        href={detailHref}
      />

      <div className="pointer-events-none relative z-10 flex flex-1 flex-col gap-2.5 p-2.5 sm:p-3">
        <div className="aspect-square overflow-hidden rounded-xl border border-border/55 bg-[radial-gradient(circle_at_20%_20%,rgb(20_118_82/0.12),transparent_32%),linear-gradient(135deg,rgb(255_255_255/0.96),rgb(241_245_249/0.72))] p-2 shadow-inner dark:bg-[radial-gradient(circle_at_20%_20%,rgb(20_118_82/0.18),transparent_32%),linear-gradient(135deg,rgb(255_255_255/0.07),rgb(15_23_42/0.5))]">
          <ProductImage
            alt={catalogProduct.name}
            fallback={
              <div className="flex h-full flex-col justify-between rounded-lg border border-white/65 bg-white/70 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/8">
                <span className="text-xs font-medium text-muted-foreground">
                  {catalogProduct.brand}
                </span>
                <span className="text-2xl font-semibold text-primary">
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

        <div className="flex flex-col gap-2.5 rounded-xl border border-border/55 bg-background/68 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge
              label={catalogProduct.category?.name ?? "JOTA Frezler"}
              tone="success"
            />
            <span className="rounded-full border border-border/65 bg-background/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
              {catalogProduct.brand}
            </span>
          </div>

          <CardTitle className="line-clamp-2 text-base leading-5 text-foreground md:text-[1.05rem]">
            {catalogProduct.name}
          </CardTitle>

          <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
            {description}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            {variantChips.length ? (
              variantChips.map((chip) => (
                <Link
                  className="pointer-events-auto relative z-20 rounded-full bg-muted/85 px-2 py-0.5 transition hover:bg-primary/10 hover:text-primary"
                  href={`${detailHref}?variant=${chip.variantId}`}
                  key={`${chip.label}-${chip.variantId}`}
                >
                  {chip.label}
                </Link>
              ))
            ) : (
              <span className="rounded-full bg-muted/85 px-2 py-0.5">
                {catalogProduct.variantCount} varyant
              </span>
            )}
            {displayCode ? (
              <span className="rounded-full bg-muted/85 px-2 py-0.5">
                SKU: {displayCode}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <CardContent className="relative z-20 mt-auto px-2.5 pb-2.5 pt-0 sm:px-3 sm:pb-3">
        <div className="flex flex-col gap-2 rounded-xl border border-border/55 bg-background/72 p-2.5 shadow-sm backdrop-blur">
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
      <p className="text-sm font-semibold text-foreground">
        {formatPrice(variant.price, variant.currency)}
      </p>
    );
  }

  if (visibility === "pending") {
    return (
      <p className="rounded-lg border border-border/70 bg-secondary px-2.5 py-2 text-xs font-medium text-secondary-foreground">
        Fiyat için hesap onayı bekleniyor
      </p>
    );
  }

  return (
    <p className="rounded-lg border border-border/70 bg-muted px-2.5 py-2 text-xs font-medium text-muted-foreground">
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
      <Button className="w-full text-xs" disabled>
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
  }).format(price)} + KDV`;
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
        color: null,
        diameter: null,
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
  product: PublicCatalogProduct | PricedCatalogProduct,
  primaryVariant: PublicCatalogVariant | PricedCatalogVariant | null
) {
  const description = product.description ? stripHtml(product.description) : "";
  const normalizedDescription = normalizeText(description);
  const normalizedName = normalizeText(product.name);
  const categorySlug = product.category?.slug ?? "";

  if (
    description &&
    description.length >= 24 &&
    normalizedDescription !== normalizedName &&
    !normalizedDescription.startsWith(normalizedName) &&
    !normalizedName.startsWith(normalizedDescription)
  ) {
    return description.slice(0, 110);
  }

  if (categorySlug === "setler-paketler") {
    return compactMetadata([
      product.brand,
      "set/paket",
      `${product.variantCount} varyant`,
    ]);
  }

  const diameter = formatDisplayDiameter(primaryVariant?.diameter ?? null);
  const metadata = compactMetadata([
    product.brand,
    product.code && !isUuid(product.code) ? product.code : null,
    diameter ? `Ø ${diameter}` : null,
    product.variantCount > 1 ? `${product.variantCount} varyant` : null,
  ]);

  if (metadata) {
    return metadata;
  }

  if (product.usageArea) {
    return `${product.usageArea} kullanımı için katalogda yer alan profesyonel dental ürün.`;
  }

  return `${product.category?.name ?? "JOTA Frezler"} kategorisinde listelenen profesyonel dental ürün.`;
}

function getVariantChips(
  variants: Array<PublicCatalogVariant | PricedCatalogVariant>
) {
  const seen = new Set<string>();
  const chips: Array<{ label: string; variantId: string }> = [];

  for (const variant of variants) {
    for (const label of getVariantLabels(variant)) {
      const key = normalizeText(label);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      chips.push({ label, variantId: variant.id });

      if (chips.length >= 4) {
        return chips;
      }
    }
  }

  return chips;
}

function getVariantLabels(variant: PublicCatalogVariant | PricedCatalogVariant) {
  const diameter = formatDisplayDiameter(variant.diameter);
  const labels = [
    normalizeHolder(variant.connectionType ?? variant.code),
    normalizeGritLabel(variant.color ?? variant.grit ?? variant.code),
    diameter ? `Ø ${diameter}` : getSizeFromCode(variant.code),
  ];

  return labels.filter((label): label is string => Boolean(label));
}

function normalizeHolder(value: string) {
  const match = value.toUpperCase().match(/\b(FG|RA|HP)\b/);

  return match?.[1] ?? null;
}

function normalizeGritLabel(value: string) {
  const normalized = normalizeText(value);

  if (normalized.includes("black") || normalized.includes("siyah")) return "Siyah";
  if (normalized.includes("green") || normalized.includes("yesil")) return "Yeşil";
  if (normalized.includes("blue") || normalized.includes("mavi")) return "Mavi";
  if (normalized.includes("red") || normalized.includes("kirmizi")) return "Kırmızı";
  if (normalized.includes("yellow") || normalized.includes("sari")) return "Sarı";

  const grit = value.toUpperCase().match(/\b(XC|C|M|F|SF|UF)\b/)?.[1];

  return grit ?? null;
}

function getSizeFromCode(value: string) {
  const match = value.match(/(?:^|[.-])(\d{3})(?:$|[.-])/);

  if (!match || !isValidDiameterCode(match[1])) {
    return null;
  }

  const diameter = formatDisplayDiameter(Number(match[1]) / 10);

  return diameter ? `Ø ${diameter}` : null;
}

function formatDisplayDiameter(value: number | null) {
  if (value === null || !Number.isFinite(value) || value <= 0 || value > 6) {
    return null;
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function isValidDiameterCode(value: string) {
  const numeric = Number(value);

  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 60;
}

function compactMetadata(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(" · ");
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

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLegacyPrice(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const price = Number.parseFloat(normalized);

  return Number.isFinite(price) ? price : null;
}
