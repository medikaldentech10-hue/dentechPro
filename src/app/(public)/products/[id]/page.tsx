import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  CircleDot,
  Package2,
  Tag,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

import { SurfaceCard } from "@/components/premium/surface-card";
import { AddToRequestForm } from "@/components/products/add-to-request-form";
import { ProductImage } from "@/components/products/product-image";
import { PageTitle } from "@/components/shared/page-title";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { canViewPrices, getCurrentProfile, isSalesRep } from "@/lib/auth";
import {
  getPricedProductByIdForProfile,
  type PricedCatalogVariant,
  type PublicCatalogVariant,
} from "@/lib/products";
import { cn } from "@/lib/utils";

const DESCRIPTION_FALLBACK =
  "Bu ürün için detaylı açıklama yakında eklenecektir. Ürün seçimi ve stok bilgisi için DENTech Medikal ekibiyle iletişime geçebilirsiniz.";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query, profile] = await Promise.all([
    params,
    searchParams,
    getCurrentProfile(),
  ]);
  const selectedVariantId = getStringParam(query.variant);
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
  const selectedCode = getDisplayCode(primaryVariant?.code ?? product.code);
  const selectedReference =
    primaryVariant?.manufacturerRef && !isUuid(primaryVariant.manufacturerRef)
      ? primaryVariant.manufacturerRef
      : null;
  const variantLabels = primaryVariant ? getVariantLabels(primaryVariant) : [];
  const metaItems = getMetaItems(product, primaryVariant, selectedCode, selectedReference);
  const descriptionState = getProductDescriptionState(product.description);

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 py-6 md:gap-6 md:px-6 md:py-8">
      <Link
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "h-auto w-fit px-0 text-sm text-muted-foreground hover:text-foreground"
        )}
        href="/products"
      >
        <ArrowLeft data-icon="inline-start" />
        Kataloğa Dön
      </Link>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <SurfaceCard className="overflow-hidden rounded-3xl border-border/70 bg-card/80 shadow-[0_20px_60px_rgb(15_23_42/0.08)]">
            <CardContent className="p-3 sm:p-5">
              <div className="relative overflow-hidden rounded-[1.6rem] border border-border/60 bg-[radial-gradient(circle_at_18%_20%,rgb(79_197_197/0.16),transparent_28%),radial-gradient(circle_at_82%_72%,rgb(15_23_42/0.05),transparent_34%),linear-gradient(145deg,rgb(255_255_255),rgb(241_245_249))] p-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.8)] dark:bg-[radial-gradient(circle_at_18%_20%,rgb(79_197_197/0.18),transparent_28%),linear-gradient(145deg,rgb(15_23_42),rgb(30_41_59))] sm:p-5">
                <div className="pointer-events-none absolute inset-x-10 top-4 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
                <div className="pointer-events-none absolute -left-10 bottom-8 size-28 rounded-full bg-primary/12 blur-3xl" />
                <div className="pointer-events-none absolute -right-6 top-8 size-24 rounded-full bg-cyan-100/70 blur-3xl dark:bg-primary/20" />
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[1.25rem] sm:aspect-[1/1.02]">
                  <ProductImage
                    alt={product.name}
                    fallback={
                      <div className="flex h-full w-full flex-col justify-between rounded-[1.2rem] border border-white/65 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/8">
                        <span className="text-xs font-medium text-muted-foreground">
                          {product.brand}
                        </span>
                        <span className="text-3xl font-semibold text-primary sm:text-4xl">
                          {product.category?.name ?? "JOTA"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Dental ürün kataloğu
                        </span>
                      </div>
                    }
                    priority
                    src={product.imageUrl ?? primaryVariant?.imageUrl ?? null}
                  />
                </div>
              </div>
            </CardContent>
          </SurfaceCard>

          <SurfaceCard className="hidden rounded-3xl border-border/70 bg-card/80 shadow-[0_16px_50px_rgb(15_23_42/0.06)] lg:block">
            <CardContent className="p-5">
              <ProductDescriptionHtml
                html={descriptionState.html}
                isFallback={descriptionState.isFallback}
              />
            </CardContent>
          </SurfaceCard>
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <SurfaceCard className="rounded-3xl border-border/70 bg-card/80 shadow-[0_16px_50px_rgb(15_23_42/0.06)]">
            <CardContent className="flex flex-col gap-5 p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={product.brand} tone="success" />
                {product.category?.name ? (
                  <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {product.category.name}
                  </span>
                ) : null}
                {product.status ? (
                  <span className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                    {product.status}
                  </span>
                ) : null}
              </div>

              <PageTitle className="gap-3" title={product.name} />

              {metaItems.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {metaItems.map((item) => (
                    <MetaRow
                      icon={item.icon}
                      key={`${item.label}-${item.value}`}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>
              ) : null}

              <div className="rounded-2xl border border-border/65 bg-background/76 p-3 shadow-sm sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Seçili Varyant
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground sm:text-base">
                      {primaryVariant?.name ?? "Varyant bilgisi bekleniyor"}
                    </p>
                    {variantLabels.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {variantLabels.map((label) => (
                          <span
                            className="rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary"
                            key={label}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="min-w-0 sm:max-w-[220px] sm:text-right">
                    <CommercialState
                      priceVisibility={priceVisibility}
                      pricedVariant={pricedVariant}
                    />
                  </div>
                </div>

                {pricedVariant ? (
                  <div className="mt-4">
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
                  </div>
                ) : null}
              </div>
            </CardContent>
          </SurfaceCard>

          <SurfaceCard className="rounded-3xl border-border/70 bg-card/80 shadow-[0_16px_50px_rgb(15_23_42/0.06)]">
            <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">Varyantlar</h2>
                <p className="text-sm text-muted-foreground">
                  Varyant seçin ve uygun olanı talep listenize ekleyin.
                </p>
              </div>
              <div className="grid gap-2.5">
                {product.variants.map((variant) => (
                  <VariantListItem
                    isSelected={variant.id === primaryVariant?.id}
                    key={variant.id}
                    productId={product.id}
                    variant={variant}
                  />
                ))}
              </div>
            </CardContent>
          </SurfaceCard>

          <SurfaceCard className="rounded-3xl border-border/70 bg-card/80 shadow-[0_16px_50px_rgb(15_23_42/0.06)] lg:hidden">
            <CardContent className="p-4">
              <ProductDescriptionHtml
                html={descriptionState.html}
                isFallback={descriptionState.isFallback}
              />
            </CardContent>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}

function ProductDescriptionHtml({
  html,
  isFallback,
}: {
  html: string;
  isFallback: boolean;
}) {
  if (isFallback) {
    return (
      <section className="rounded-2xl border border-border/65 bg-background/72 p-4 shadow-sm">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Ürün Açıklaması
          </h2>
          <p className="text-sm leading-7 text-muted-foreground">{html}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Ürün Açıklaması
      </h2>
      <div className="product-description-html" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-border/65 bg-background/72 p-3 shadow-sm">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function CommercialState({
  pricedVariant,
  priceVisibility,
}: {
  pricedVariant: PricedCatalogVariant | null;
  priceVisibility: "approved" | "pending" | "public";
}) {
  if (pricedVariant) {
    return (
      <>
        <p className="text-lg font-semibold text-foreground sm:text-xl">
          {formatPrice(pricedVariant.price, pricedVariant.currency)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Stok: {pricedVariant.stockQuantity} adet
        </p>
      </>
    );
  }

  return (
    <p className="rounded-full border border-border/70 bg-muted/65 px-3 py-2 text-center text-xs font-medium text-muted-foreground">
      {priceVisibility === "pending"
        ? "Fiyat için hesap onayı bekleniyor"
        : "Fiyat için giriş yapın"}
    </p>
  );
}

function VariantListItem({
  isSelected,
  productId,
  variant,
}: {
  isSelected: boolean;
  productId: string;
  variant: PricedCatalogVariant | PublicCatalogVariant;
}) {
  const displayCode = getDisplayCode(variant.code);
  const labels = getVariantLabels(variant);
  const href = `/products/${productId}?variant=${variant.id}`;

  return (
    <div
      className={cn(
        "grid min-w-0 scroll-mt-24 gap-3 rounded-2xl border border-border/65 bg-background/70 p-3 shadow-sm transition hover:border-primary/25 hover:bg-background/84 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
        isSelected && "border-primary/45 bg-primary/5 ring-2 ring-primary/15"
      )}
      id={`variant-${variant.id}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold leading-6">{variant.name}</p>
          {isSelected ? <StatusBadge label="Seçili" tone="success" /> : null}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {labels.map((label) => (
            <span
              className="rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-primary"
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {displayCode ? (
            <span className="rounded-full bg-muted px-2.5 py-1">SKU: {displayCode}</span>
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

      <div className="min-w-0 sm:w-[112px]">
        <Link
          aria-current={isSelected ? "true" : undefined}
          className={cn(
            buttonVariants({ variant: isSelected ? "default" : "outline" }),
            "w-full"
          )}
          href={href}
        >
          {isSelected ? "Seçili" : "Seç"}
        </Link>
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
  }).format(price)} + KDV`;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getProductDescriptionState(rawDescription: string | null) {
  const source = rawDescription?.trim() ?? "";
  const sanitized = sanitizeProductDescriptionHtml(source);
  const plainText = stripHtml(sanitized);

  if (plainText.length >= 24) {
    return {
      html: sanitized,
      isFallback: false,
    };
  }

  return {
    html: DESCRIPTION_FALLBACK,
    isFallback: true,
  };
}

function sanitizeProductDescriptionHtml(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<\/?(script|iframe|object|embed|form|input|button|textarea|select|meta|link|picture|source)[^>]*>/gi,
      ""
    )
    .replace(/\s(on\w+)\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/\s(style|class|id)\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(
      /\s(href|src)\s*=\s*("javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi,
      ""
    )
    .replace(/<img\b[^>]*>/gi, (match) => sanitizeImageTag(match))
    .replace(/<a\b[^>]*>/gi, (match) => sanitizeAnchorTag(match))
    .replace(/<a\b(?![^>]*\bhref=)[^>]*>/gi, "<span>")
    .replace(/<\/a>/gi, "</span>")
    .trim();
}

function sanitizeAnchorTag(tag: string) {
  const href = getAttributeValue(tag, "href");

  if (!href || !isSafeHref(href)) {
    return "<span>";
  }

  const isExternal = /^https?:\/\//i.test(href);
  const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";

  return `<a href="${escapeHtmlAttribute(href)}"${target}>`;
}

function sanitizeImageTag(tag: string) {
  const src = getAttributeValue(tag, "src");

  if (!src || !isSafeImageSrc(src)) {
    return "";
  }

  const alt = getAttributeValue(tag, "alt") ?? "";

  return `<img src="${escapeHtmlAttribute(src)}" alt="${escapeHtmlAttribute(alt)}" loading="lazy" decoding="async">`;
}

function getAttributeValue(tag: string, name: string) {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, "i")
  );

  return match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
}

function isSafeHref(value: string) {
  return /^(https?:\/\/|\/(?!\/)|#)/i.test(value);
}

function isSafeImageSrc(value: string) {
  return /^(https?:\/\/|\/(?!\/))/i.test(value);
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getMetaItems(
  product: {
    brand: string;
    category: { name: string } | null;
  },
  variant: PublicCatalogVariant | PricedCatalogVariant | null,
  selectedCode: string | null,
  selectedReference: string | null
) {
  const holder = variant ? normalizeHolder(variant.connectionType ?? variant.code) : null;
  const grit = variant ? normalizeGritLabel(variant.color ?? variant.grit ?? variant.code) : null;
  const diameter = variant ? formatVariantDiameter(variant) : null;
  const items = [
    { icon: Tag, label: "Marka", value: product.brand },
    product.category?.name
      ? { icon: Boxes, label: "Kategori", value: product.category.name }
      : null,
    selectedCode ? { icon: Tag, label: "SKU", value: selectedCode } : null,
    variant ? { icon: Package2, label: "Paket", value: String(variant.packageQuantity) } : null,
    holder ? { icon: Waypoints, label: "Tip", value: holder } : null,
    diameter ? { icon: CircleDot, label: "Çap", value: diameter } : null,
    grit ? { icon: Tag, label: "Renk / Grit", value: grit } : null,
    selectedReference ? { icon: Tag, label: "Ref", value: selectedReference } : null,
  ];

  return items.filter(
    (
      item
    ): item is {
      icon: LucideIcon;
      label: string;
      value: string;
    } => Boolean(item)
  );
}

function getDisplayCode(value: string | undefined) {
  if (!value || isUuid(value)) {
    return null;
  }

  return value;
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

function formatVariantDiameter(variant: PublicCatalogVariant | PricedCatalogVariant) {
  const diameter = formatDisplayDiameter(variant.diameter);

  if (diameter) {
    return `Ø ${diameter}`;
  }

  return getSizeFromCode(variant.code);
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
