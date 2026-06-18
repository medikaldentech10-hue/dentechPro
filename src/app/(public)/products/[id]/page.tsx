import Link from "next/link";
import { notFound } from "next/navigation";

import { SurfaceCard } from "@/components/premium/surface-card";
import { AddToRequestForm } from "@/components/products/add-to-request-form";
import { ProductImage } from "@/components/products/product-image";
import { PageTitle } from "@/components/shared/page-title";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { canViewPrices, getCurrentProfile, isSalesRep } from "@/lib/auth";
import {
  getPricedProductByIdForProfile,
  type PricedCatalogVariant,
  type PublicCatalogVariant,
} from "@/lib/products";
import { cn } from "@/lib/utils";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const selectedVariantId = getStringParam(query.variant);
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
  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ?? null;
  const primaryVariant = selectedVariant ?? product.variants[0] ?? null;
  const canSeeCommercialData =
    priceVisibility === "approved" && primaryVariant && "price" in primaryVariant;
  const pricedVariant = canSeeCommercialData
    ? (primaryVariant as PricedCatalogVariant)
    : null;
  const salesMode = isSalesRep(profile);
  const description = getProductDescription(product);
  const displayProductCode = getDisplayCode(product.code);

  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-6 overflow-hidden px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6">
        <PageTitle description={description} title={product.name} />
        <SurfaceCard className="rounded-2xl border-border/70 bg-card/78">
          <CardContent className="flex min-w-0 flex-col gap-5 p-4 sm:p-6">
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                label={product.category?.name ?? "JOTA Frezler"}
                tone="success"
              />
              <span className="rounded-lg border border-border/70 bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {product.brand}
              </span>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              {displayProductCode ? (
                <Info label="Ürün Kodu" value={displayProductCode} />
              ) : null}
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
          </CardContent>
        </SurfaceCard>
        <SurfaceCard className="rounded-2xl border-border/70 bg-card/78">
          <CardContent className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">Varyantlar</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Uygun varyantı seçerek talep listenize ekleyebilirsiniz.
              </p>
            </div>
            <div className="grid gap-3">
              {product.variants.map((variant) => (
                <VariantRow
                  isSelected={variant.id === selectedVariantId}
                  key={variant.id}
                  priceVisibility={priceVisibility}
                  salesMode={salesMode}
                  variant={variant}
                />
              ))}
            </div>
          </CardContent>
        </SurfaceCard>
      </div>
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <SurfaceCard className="rounded-2xl border-border/70 bg-card/78 shadow-[0_18px_60px_rgb(15_23_42/0.08)]">
          <CardContent className="flex min-w-0 flex-col gap-5 p-4 sm:p-5">
            <div className="h-[220px] overflow-hidden rounded-2xl border border-border/70 bg-[radial-gradient(circle_at_20%_20%,rgb(20_118_82/0.14),transparent_34%),linear-gradient(135deg,rgb(255_255_255/0.96),rgb(241_245_249/0.72))] p-2 shadow-inner sm:aspect-[4/3] sm:h-auto dark:bg-[radial-gradient(circle_at_20%_20%,rgb(20_118_82/0.2),transparent_34%),linear-gradient(135deg,rgb(255_255_255/0.07),rgb(15_23_42/0.5))]">
              <ProductImage
                alt={product.name}
                fallback={
                  <div className="flex h-full flex-col justify-between rounded-lg border border-white/65 bg-white/55 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/8">
                    <span className="text-xs font-medium text-muted-foreground">
                      {product.brand}
                    </span>
                    <span className="text-3xl font-semibold text-primary">
                      {product.category?.name ?? "JOTA"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Dental ürün kataloğu
                    </span>
                  </div>
                }
                src={product.imageUrl ?? primaryVariant?.imageUrl ?? null}
              />
            </div>
            <Link className={cn(buttonVariants({ variant: "outline" }))} href="/products">
              Kataloğa Dön
            </Link>
          </CardContent>
        </SurfaceCard>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/65 bg-background/68 p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function VariantRow({
  isSelected,
  priceVisibility,
  salesMode,
  variant,
}: {
  isSelected: boolean;
  priceVisibility: "approved" | "pending" | "public";
  salesMode: boolean;
  variant: PricedCatalogVariant | PublicCatalogVariant;
}) {
  const displayCode = getDisplayCode(variant.code);
  const labels = getVariantLabels(variant);
  const pricedVariant = "price" in variant ? variant : null;

  return (
    <div
      className={cn(
        "grid min-w-0 scroll-mt-24 gap-4 rounded-2xl border border-border/65 bg-background/68 p-4 shadow-sm transition hover:border-primary/25 hover:bg-background/82 md:grid-cols-[minmax(0,1fr)_190px_minmax(0,220px)] md:items-center",
        isSelected && "border-primary/45 bg-primary/5 ring-2 ring-primary/15"
      )}
      id={`variant-${variant.id}`}
    >
      <div className="min-w-0">
        <p className="font-semibold leading-6">{variant.name}</p>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {labels.map((label) => (
            <span
              className="rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-primary"
              key={label}
            >
              {label}
            </span>
          ))}
          {displayCode ? (
            <span className="rounded-full bg-muted px-2.5 py-1">
              SKU: {displayCode}
            </span>
          ) : null}
          <span className="rounded-full bg-muted px-2.5 py-1">
            Paket: {variant.packageQuantity}
          </span>
          {variant.manufacturerRef && !isUuid(variant.manufacturerRef) ? (
            <span className="rounded-full bg-muted px-2.5 py-1">
              Ref: {variant.manufacturerRef}
            </span>
          ) : null}
        </div>
      </div>
      <div className="min-w-0 text-sm">
        {pricedVariant ? (
          <>
            <p className="font-semibold">
              {formatPrice(pricedVariant.price, pricedVariant.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Stok: {pricedVariant.stockQuantity} adet
            </p>
          </>
        ) : (
          <p className="rounded-lg border border-border/70 bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
            {priceVisibility === "pending"
              ? "Fiyat için hesap onayı bekleniyor"
              : "Fiyat için giriş yapın"}
          </p>
        )}
      </div>
      <div className="min-w-0">
        {pricedVariant ? (
          <AddToRequestForm
            disabled={!pricedVariant.isActive || pricedVariant.stockQuantity === 0}
            disabledReason={
              !pricedVariant.isActive
                ? "Pasif varyant"
                : "Stok bilgisi için iletişime geçin"
            }
            submitLabel={salesMode ? "Müşteri Adına Ekle" : "Talep Listesine Ekle"}
            variantId={pricedVariant.id}
          />
        ) : (
          <Button className="w-full" disabled>
            {priceVisibility === "pending"
              ? "Onay Bekleniyor"
              : "Giriş Yapın"}
          </Button>
        )}
      </div>
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

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getProductDescription(product: {
  category: { name: string } | null;
  description: string | null;
  name: string;
  usageArea: string | null;
}) {
  const description = product.description ? stripHtml(product.description) : "";
  const normalizedDescription = normalizeText(description);
  const normalizedName = normalizeText(product.name);

  if (
    description &&
    normalizedDescription !== normalizedName &&
    !normalizedDescription.startsWith(normalizedName)
  ) {
    return description.slice(0, 180);
  }

  if (product.usageArea) {
    return `${product.usageArea} kullanımı için katalogda yer alan profesyonel dental ürün.`;
  }

  return `${product.category?.name ?? "JOTA Frezler"} kategorisinde listelenen profesyonel dental ürün.`;
}

function getDisplayCode(value: string | undefined) {
  if (!value || isUuid(value)) {
    return null;
  }

  return value;
}

function getVariantLabels(variant: PublicCatalogVariant | PricedCatalogVariant) {
  const labels = [
    normalizeHolder(variant.connectionType ?? variant.code),
    normalizeGritLabel(variant.color ?? variant.grit ?? variant.code),
    variant.diameter ? `Ø ${variant.diameter}` : getSizeFromCode(variant.code),
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

  return match ? `Ø ${Number(match[1]) / 10}` : null;
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

function getStringParam(value: string | string[] | undefined) {
  const item = Array.isArray(value) ? value[0] : value;
  const trimmed = item?.trim();

  return trimmed || undefined;
}
