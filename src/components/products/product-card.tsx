import Link from "next/link";

import { AddToRequestForm } from "@/components/products/add-to-request-form";
import { ProductImage } from "@/components/products/product-image";
import { PremiumCard } from "@/components/premium/premium-card";
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

type VariantBadge = {
  colors: string[];
  href: string;
  label: string;
  tone: "holder" | "diameter" | "neutral";
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
  const displayTitle = getDisplayTitle(catalogProduct.name, catalogProduct.brand);
  const variantBadges = getVariantBadges(catalogProduct, detailHref);

  return (
    <PremiumCard className="group/card relative h-full overflow-hidden rounded-[1.7rem] border-white/20 bg-white/38 shadow-[0_18px_56px_rgb(15_23_42/0.07)] ring-1 ring-black/[0.01] backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:bg-white/54 hover:shadow-[0_26px_78px_rgb(20_118_82/0.15)] dark:border-white/8 dark:bg-slate-950/42 dark:ring-white/[0.025]">
      <Link
        aria-label={`${catalogProduct.name} detayini ac`}
        className="absolute inset-0 z-0 rounded-[1.7rem] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        href={detailHref}
      />

      <div className="pointer-events-none relative z-10 flex flex-1 flex-col p-2.5 pb-1 sm:p-3 sm:pb-1.5">
        <div className="relative aspect-square overflow-hidden rounded-[1.45rem] bg-[radial-gradient(circle_at_28%_18%,rgb(211_250_229/0.9),transparent_35%),radial-gradient(circle_at_76%_70%,rgb(20_118_82/0.16),transparent_38%),linear-gradient(145deg,rgb(255_255_255),rgb(244_248_247))] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.8),inset_0_-46px_90px_rgb(15_23_42/0.055)] dark:bg-[radial-gradient(circle_at_28%_18%,rgb(20_118_82/0.18),transparent_35%),linear-gradient(145deg,rgb(248_250_252),rgb(226_232_240))]">
          <div className="pointer-events-none absolute inset-x-6 top-4 z-0 h-px bg-gradient-to-r from-transparent via-white/95 to-transparent" />
          <div className="pointer-events-none absolute -right-10 -top-8 z-0 size-36 rounded-full bg-primary/12 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-12 z-0 size-36 rounded-full bg-cyan-100/55 blur-3xl" />

          <div className="absolute inset-2 z-0 flex items-center justify-center sm:inset-2.5">
            <ProductImage
              alt={catalogProduct.name}
              fallback={
                <div className="flex h-full w-full items-center justify-center rounded-2xl bg-white/42 text-3xl font-semibold text-primary backdrop-blur">
                  {primaryVariant?.connectionType ?? catalogProduct.brand}
                </div>
              }
              src={catalogProduct.imageUrl ?? primaryVariant?.imageUrl}
            />
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-28 bg-gradient-to-t from-white/58 via-white/18 to-transparent" />

          <div className="absolute inset-x-3 bottom-3 z-20 rounded-[1.15rem] border border-white/70 bg-gradient-to-br from-white/68 via-white/44 to-white/28 p-2.5 shadow-[0_14px_36px_rgb(15_23_42/0.14)] backdrop-blur-2xl backdrop-saturate-150">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                {catalogProduct.brand}
              </span>
              {variantBadges.length ? (
                <span className="text-[10px] font-medium text-slate-500">
                  Varyantlar
                </span>
              ) : null}
            </div>
            <CardTitle className="line-clamp-2 text-[0.9rem] font-semibold leading-[1.18] text-slate-950 sm:text-[0.95rem]">
              {displayTitle}
            </CardTitle>

            {variantBadges.length ? (
              <div className="mt-2 flex min-h-6 min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                {variantBadges.map((badge) => (
                  <VariantBadgeLink badge={badge} key={`${badge.label}-${badge.href}`} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <CardContent className="relative z-20 mt-auto px-3.5 pb-3.5 pt-0">
        <div className="flex flex-col gap-2 rounded-[1.15rem] border border-white/28 bg-white/34 p-2 shadow-[0_8px_24px_rgb(15_23_42/0.045)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-950/42">
          <PriceState visibility={priceVisibility} variant={primaryVariant} />
          <ProductAction
            adminMode={adminMode}
            priceVisibility={priceVisibility}
            salesMode={salesMode}
            variant={primaryVariant}
            variants={catalogProduct.variants}
          />
        </div>
      </CardContent>
    </PremiumCard>
  );
}

function VariantBadgeLink({ badge }: { badge: VariantBadge }) {
  return (
    <Link
      className={[
        "pointer-events-auto relative z-20 inline-flex min-h-6 items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold shadow-sm backdrop-blur transition",
        badge.tone === "holder"
          ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
          : "border-slate-200/80 bg-white/72 text-slate-900 hover:border-primary/25 hover:bg-primary/10",
      ].join(" ")}
      href={badge.href}
    >
      <span>{badge.label}</span>
      {badge.colors.length ? (
        <span className="flex items-center gap-0.5" aria-hidden="true">
          {badge.colors.slice(0, 4).map((color) => (
            <span
              className={`size-1.5 rounded-full ring-1 ring-white/80 ${colorClass(color)}`}
              key={color}
            />
          ))}
        </span>
      ) : null}
    </Link>
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
      <p className="px-1 text-[0.95rem] font-semibold text-foreground">
        {formatPrice(variant.price, variant.currency)}
      </p>
    );
  }

  if (visibility === "pending") {
    return (
      <p className="rounded-full border border-primary/15 bg-primary/10 px-3 py-2 text-center text-xs font-medium text-primary">
        Fiyat icin hesap onayi bekleniyor
      </p>
    );
  }

  return (
    <p className="rounded-full border border-border/60 bg-muted/65 px-3 py-2 text-center text-xs font-medium text-muted-foreground">
      <span className="sr-only">Fiyat için giriş yapın</span>
      Stok bilgisi için iletişime geçin
    </p>
  );
}

function ProductAction({
  adminMode,
  priceVisibility,
  salesMode,
  variant,
  variants,
}: {
  adminMode: boolean;
  priceVisibility: PriceVisibility;
  salesMode: boolean;
  variant: PricedCatalogVariant | PublicCatalogVariant | null;
  variants: Array<PricedCatalogVariant | PublicCatalogVariant>;
}) {
  if (priceVisibility !== "approved" || !variant || !("stockQuantity" in variant)) {
    return (
      <Button className="w-full rounded-full text-xs font-semibold shadow-sm" disabled>
        {getActionLabel({ adminMode, priceVisibility, salesMode })}
      </Button>
    );
  }

  const pricedVariants = variants.filter(
    (item): item is PricedCatalogVariant => "stockQuantity" in item
  );

  if (pricedVariants.length > 1) {
    return (
      <details className="group/selector pointer-events-auto relative z-30">
        <summary className="flex h-10 cursor-pointer list-none items-center justify-center rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
          Ekle
        </summary>
        <div className="mt-2 max-h-72 overflow-y-auto rounded-2xl border border-white/55 bg-white/92 p-2 shadow-[0_14px_38px_rgb(15_23_42/0.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/92">
          <p className="px-2 pb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Varyant seÃ§in
          </p>
          <div className="flex flex-col gap-2">
            {pricedVariants.map((item) => (
              <VariantRequestOption key={item.id} salesMode={salesMode} variant={item} />
            ))}
          </div>
        </div>
      </details>
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
            : "Stok bilgisi icin iletisime gecin"
          : undefined
      }
      submitLabel="Ekle"
      variantId={variant.id}
    />
  );
}

function VariantRequestOption({
  salesMode,
  variant,
}: {
  salesMode: boolean;
  variant: PricedCatalogVariant;
}) {
  const disabled = !variant.isActive || variant.stockQuantity === 0;

  return (
    <div className="rounded-xl border border-slate-200/75 bg-white/72 p-2 shadow-sm dark:border-white/10 dark:bg-white/8">
      <div className="mb-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px]">
        <span className="max-w-full truncate font-semibold text-slate-900 dark:text-slate-100">
          {getVariantOptionLabel(variant)}
        </span>
        {getVariantLabels(variant).map((label) => (
          <span
            className="rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 font-semibold text-primary"
            key={label}
          >
            {label}
          </span>
        ))}
        {variant.stockQuantity === 0 ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
            Stok yok
          </span>
        ) : null}
      </div>
      <AddToRequestForm
        disabled={disabled}
        disabledReason={
          !variant.isActive ? "Pasif varyant" : "Stok bilgisi icin iletisime gecin"
        }
        submitLabel={salesMode ? "Ekle" : "Ekle"}
        variantId={variant.id}
      />
    </div>
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
    return "Stok bilgisi icin iletisime gecin";
  }

  if (priceVisibility === "pending") {
    return "Hesap onayi bekleniyor";
  }

  if (adminMode || salesMode) {
    return "Ekle";
  }

  return "Ekle";
}

function formatPrice(price: number | null, currency: string) {
  if (price === null) {
    return "Fiyat tanimlanmadi";
  }

  return `${new Intl.NumberFormat("tr-TR", {
    currency,
    style: "currency",
  }).format(price)} + KDV`;
}

function getDisplayTitle(name: string, brand: string) {
  const withoutBrand = name
    .replace(new RegExp(`^${escapeRegExp(brand)}\\s*[-–—:]?\\s*`, "i"), "")
    .replace(/^JOTA\s*[-–—:]?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const cleanTitle = withoutBrand || name;
  const separators = [" — ", " - ", " | "];

  for (const separator of separators) {
    const [first, second] = cleanTitle.split(separator);

    if (first && second && first.length >= 8) {
      return first.trim();
    }
  }

  return cleanTitle.length > 64 ? `${cleanTitle.slice(0, 61).trim()}...` : cleanTitle;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function getVariantBadges(
  product: PublicCatalogProduct | PricedCatalogProduct,
  detailHref: string
) {
  if (product.category?.slug === "setler-paketler") {
    return getPackageBadges(product, detailHref);
  }

  const badges: VariantBadge[] = [];
  const holders = new Map<string, PublicCatalogVariant | PricedCatalogVariant>();
  const diameters = new Map<
    string,
    {
      colors: Set<string>;
      variant: PublicCatalogVariant | PricedCatalogVariant;
    }
  >();

  for (const variant of product.variants) {
    const holder = normalizeHolder(variant.connectionType ?? variant.code);
    const diameter = getDiameterLabel(variant);
    const color = normalizeColorKey(variant.color ?? variant.grit ?? variant.code);

    if (holder && !holders.has(holder)) {
      holders.set(holder, variant);
    }

    if (diameter) {
      const group = diameters.get(diameter) ?? {
        colors: new Set<string>(),
        variant,
      };

      if (color) {
        group.colors.add(color);
      }

      diameters.set(diameter, group);
    }
  }

  for (const [holder, variant] of holders) {
    badges.push({
      colors: [],
      href: `${detailHref}?variant=${variant.id}`,
      label: holder,
      tone: "holder",
    });

    if (badges.length >= 5) {
      break;
    }
  }

  for (const [diameter, group] of sortDiameterEntries(diameters)) {
    if (badges.length >= 5) {
      break;
    }

    badges.push({
      colors: Array.from(group.colors),
      href: `${detailHref}?variant=${group.variant.id}`,
      label: diameter,
      tone: "diameter",
    });
  }

  const remaining = holders.size + diameters.size - badges.length;

  if (remaining > 0) {
    badges.push({
      colors: [],
      href: detailHref,
      label: `+${remaining}`,
      tone: "neutral",
    });
  }

  return badges;
}

function getPackageBadges(
  product: PublicCatalogProduct | PricedCatalogProduct,
  detailHref: string
) {
  const firstVariant = product.variants[0];
  const packageQuantity = firstVariant?.packageQuantity ?? 1;

  if (!firstVariant || packageQuantity <= 1) {
    return [];
  }

  return [
    {
      colors: [],
      href: `${detailHref}?variant=${firstVariant.id}`,
      label: `${packageQuantity} pcs`,
      tone: "neutral" as const,
    },
  ];
}

function getVariantOptionLabel(variant: PublicCatalogVariant | PricedCatalogVariant) {
  const code = isUuidLike(variant.code) ? null : variant.code;
  const ref = variant.manufacturerRef && !isUuidLike(variant.manufacturerRef)
    ? variant.manufacturerRef
    : null;

  return ref ?? code ?? variant.name;
}

function getVariantLabels(variant: PublicCatalogVariant | PricedCatalogVariant) {
  return [
    normalizeHolder(variant.connectionType ?? variant.code),
    getDiameterLabel(variant),
    normalizeColorLabel(variant.color ?? variant.grit ?? variant.code),
  ].filter((label): label is string => Boolean(label));
}

function getDiameterLabel(variant: PublicCatalogVariant | PricedCatalogVariant) {
  const fromField = diameterToShortLabel(variant.diameter);

  return fromField ?? getSizeFromCode(variant.code);
}

function diameterToShortLabel(value: number | null) {
  if (value === null || !Number.isFinite(value) || value <= 0 || value > 6) {
    return null;
  }

  return String(Math.round(value * 10)).padStart(2, "0");
}

function sortDiameterEntries(
  entries: Map<
    string,
    {
      colors: Set<string>;
      variant: PublicCatalogVariant | PricedCatalogVariant;
    }
  >
) {
  return Array.from(entries.entries()).sort(
    ([left], [right]) => Number(left) - Number(right)
  );
}

function normalizeHolder(value: string) {
  const match = value.toUpperCase().match(/\b(FG|RA|HP)\b/);

  return match?.[1] ?? null;
}

function normalizeColorKey(value: string) {
  const normalized = normalizeText(value);

  if (normalized.includes("black") || normalized.includes("siyah")) return "black";
  if (normalized.includes("green") || normalized.includes("yesil")) return "green";
  if (normalized.includes("blue") || normalized.includes("mavi")) return "blue";
  if (normalized.includes("red") || normalized.includes("kirmizi")) return "red";
  if (normalized.includes("yellow") || normalized.includes("sari")) return "yellow";

  return null;
}

function normalizeColorLabel(value: string) {
  const normalized = normalizeText(value);

  if (normalized.includes("black") || normalized.includes("siyah")) return "Siyah";
  if (normalized.includes("green") || normalized.includes("yesil")) return "YeÅŸil";
  if (normalized.includes("blue") || normalized.includes("mavi")) return "Mavi";
  if (normalized.includes("red") || normalized.includes("kirmizi")) return "KÄ±rmÄ±zÄ±";
  if (normalized.includes("yellow") || normalized.includes("sari")) return "SarÄ±";

  return value.toUpperCase().match(/\b(XC|C|M|F|SF|UF|SG)\b/)?.[1] ?? null;
}

function colorClass(color: string) {
  switch (color) {
    case "black":
      return "bg-slate-950";
    case "blue":
      return "bg-sky-500";
    case "green":
      return "bg-emerald-500";
    case "red":
      return "bg-red-500";
    case "yellow":
      return "bg-yellow-400";
    default:
      return "bg-muted-foreground/40";
  }
}

function getSizeFromCode(value: string) {
  const match = value.match(/(?:^|[.-])(\d{3})(?:$|[.-])/);

  if (!match || !isValidDiameterCode(match[1])) {
    return null;
  }

  return String(Number(match[1]));
}

function isValidDiameterCode(value: string) {
  const numeric = Number(value);

  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 60;
}

function isUuidLike(value: string) {
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
