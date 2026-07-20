"use client";

import Link from "next/link";
import {
  type FormEvent,
  type PointerEvent,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Minus, Plus } from "lucide-react";

import { addToOrderDraftInlineAction } from "@/app/(public)/request/actions";
import { SurfaceCard } from "@/components/premium/surface-card";
import { ProductImage } from "@/components/products/product-image";
import { useRequestDrawer } from "@/components/request/request-drawer-provider";
import { PageTitle } from "@/components/shared/page-title";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  getJotaDescriptionModel,
  type JotaHeaderTone,
  type JotaDescriptionModel,
} from "@/lib/jota-description";
import { cn } from "@/lib/utils";

type ProductDetailClientProps = {
  desktopDescription: React.ReactNode;
  mobileDescription: React.ReactNode;
  initialVariantId?: string;
  priceVisibility: "approved" | "pending" | "public";
  product: ProductDetailView;
  salesMode: boolean;
};

type ProductDetailView = {
  brand: string;
  category: {
    name: string;
  } | null;
  code: string;
  id: string;
  imageUrl: string | null;
  name: string;
  status: string;
  usageArea?: string | null;
  variants: ProductVariantView[];
  relatedProducts?: RelatedProductView[];
};

type RelatedProductView = {
  brand: string;
  categoryName: string | null;
  href: string;
  id: string;
  imageUrl: string | null;
  name: string;
  variantCount: number;
};

type ProductVariantView = {
  clinicalNote?: string | null;
  code: string;
  connectionType: string | null;
  currency?: string;
  diameter: number | null;
  grit: string | null;
  groupImageUrl?: string | null;
  id: string;
  imageUrl: string | null;
  isActive: boolean;
  manufacturerRef: string | null;
  minOrderQty?: number | null;
  name: string;
  packageQuantity: number;
  price?: number | null;
  stockQuantity?: number;
  color?: string | null;
};

export function ProductDetailClient({
  desktopDescription,
  initialVariantId,
  mobileDescription,
  priceVisibility,
  product,
}: ProductDetailClientProps) {
  const variantGroups = useMemo(() => getVariantGroups(product.variants), [product.variants]);
  const visibleVariantGroups = useMemo(
    () => variantGroups.filter((group) => isBuyerFacingGroupLabel(group.label)),
    [variantGroups]
  );
  const initialVariant =
    product.variants.find((variant) => variant.id === initialVariantId) ??
    product.variants[0] ??
    null;
  const [selectedGroupKey, setSelectedGroupKey] = useState(
    initialVariant ? getVariantGroupKey(initialVariant) : variantGroups[0]?.key ?? null
  );
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariant?.id ?? null);
  const [magnifierPosition, setMagnifierPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const selectedGroup = useMemo(() => {
    const matchedGroup = variantGroups.find((group) => group.key === selectedGroupKey) ?? null;

    if (
      matchedGroup &&
      (visibleVariantGroups.length === 0 || isBuyerFacingGroupLabel(matchedGroup.label))
    ) {
      return matchedGroup;
    }

    return visibleVariantGroups[0] ?? variantGroups[0] ?? null;
  }, [selectedGroupKey, variantGroups, visibleVariantGroups]);
  const selectedGroupVariants = selectedGroup?.variants ?? [];
  const selectedVariant =
    selectedGroupVariants.find((variant) => variant.id === selectedVariantId) ??
    selectedGroupVariants[0] ??
    initialVariant;
  const selectedDescription = getReadableDescriptionText(selectedVariant?.clinicalNote);
  const jotaDescription = getJotaDescriptionModel(product, selectedVariant);
  const selectedVariantImageSrc = getImageSrc(selectedVariant?.imageUrl);
  const selectedGroupImageSrc =
    getImageSrc(selectedVariant?.groupImageUrl) ??
    (isJotaProductBrand(product.brand)
      ? (selectedGroupVariants.map((variant) => getImageSrc(variant.imageUrl)).find(Boolean) ?? null)
      : null);
  const selectedImageSrc =
    selectedVariantImageSrc ?? selectedGroupImageSrc ?? getImageSrc(product.imageUrl);
  const displayTitle = getSelectedProductTitle(product, selectedVariant, selectedGroup?.label);
  const titleParts = splitProductTitle(displayTitle);
  const imageZoomClass = shouldZoomProductImage(product, selectedVariant)
    ? "[&_img]:scale-[1.12] hover:[&_img]:scale-[1.26] sm:[&_img]:scale-[1.16] sm:hover:[&_img]:scale-[1.3]"
    : "[&_img]:scale-100 hover:[&_img]:scale-[1.12]";

  useEffect(() => {
    if (!selectedVariant?.id) {
      return;
    }

    const url = new URL(window.location.href);
    const variantToken = getVariantUrlToken(selectedVariant);

    if (variantToken) {
      url.searchParams.set("variant", variantToken);
    } else {
      url.searchParams.delete("variant");
    }

    window.history.replaceState(null, "", url);
  }, [selectedVariant]);

  const handleImagePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!selectedImageSrc || event.pointerType === "touch") {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);

    setMagnifierPosition({ x, y });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)] lg:items-start">
      <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
        <SurfaceCard className="overflow-hidden rounded-3xl border-border/70 bg-card/80 shadow-[0_20px_60px_rgb(15_23_42/0.08)]">
          <CardContent className="p-3 sm:p-5">
            <div className="relative overflow-hidden rounded-[1.6rem] border border-border/60 bg-[linear-gradient(145deg,rgb(255_255_255),rgb(241_245_249))] p-3 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.8)] dark:bg-[linear-gradient(145deg,rgb(15_23_42),rgb(30_41_59))] sm:p-5">
              <div
                className={cn(
                  "relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[1.25rem] bg-white [&_img]:drop-shadow-none [&_img]:transition-transform [&_img]:duration-300 sm:aspect-[1/1.02]",
                  imageZoomClass
                )}
                onPointerLeave={() => setMagnifierPosition(null)}
                onPointerMove={handleImagePointerMove}
              >
                <ProductImage
                  alt={displayTitle}
                  fallback={
                    <div className="flex h-full w-full flex-col justify-end rounded-[1.2rem] border border-white/65 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/8">
                      <span className="max-w-sm text-2xl font-semibold text-primary sm:text-3xl">
                        {displayTitle}
                      </span>
                    </div>
                  }
                  key={selectedImageSrc ?? "fallback"}
                  priority
                  src={selectedImageSrc}
                />
                {selectedImageSrc && magnifierPosition ? (
                  <>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute hidden size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/30 bg-white/15 shadow-sm ring-2 ring-white/75 backdrop-blur-[1px] lg:block"
                      style={{
                        left: `${magnifierPosition.x}%`,
                        top: `${magnifierPosition.y}%`,
                      }}
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-3 hidden h-32 w-40 overflow-hidden rounded-2xl border border-border/55 bg-white shadow-sm lg:block xl:h-40 xl:w-52"
                      style={{
                        backgroundImage: `url("${selectedImageSrc}")`,
                        backgroundPosition: `${magnifierPosition.x}% ${magnifierPosition.y}%`,
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "260%",
                      }}
                    />
                  </>
                ) : null}
              </div>
            </div>
          </CardContent>
        </SurfaceCard>

        {jotaDescription ? (
          <JotaDescriptionCard className="hidden lg:block" model={jotaDescription} />
        ) : selectedDescription ? (
          <SurfaceCard className="hidden rounded-3xl border-border/70 bg-card/80 shadow-[0_16px_50px_rgb(15_23_42/0.06)] lg:block">
            <CardContent className="p-5">
              <section className="rounded-2xl border border-border/65 bg-background/72 p-4 shadow-sm">
                <p className="text-sm leading-7 text-muted-foreground">
                  {selectedDescription}
                </p>
              </section>
            </CardContent>
          </SurfaceCard>
        ) : (
          desktopDescription
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
        <SurfaceCard className="rounded-3xl border-border/70 bg-card/80 shadow-[0_16px_50px_rgb(15_23_42/0.06)]">
          <CardContent className="p-4 sm:p-6">
            <PageTitle className="gap-2" title={titleParts.main} />
            {titleParts.detail ? (
              <p className="-mt-1 text-lg font-normal leading-7 text-muted-foreground sm:text-xl">
                {titleParts.detail}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
              {product.brand ? (
                <span className="rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-primary">
                  {product.brand}
                </span>
              ) : null}
              {product.category?.name ? (
                <span className="rounded-full border border-border/70 bg-background/75 px-2.5 py-1">
                  {product.category.name}
                </span>
              ) : null}
              {getTitleInfoBadges(product, selectedVariant, priceVisibility).map((badge) => (
                <span
                  className="rounded-full border border-border/70 bg-background/75 px-2.5 py-1"
                  key={badge}
                >
                  {badge}
                </span>
              ))}
            </div>
          </CardContent>
        </SurfaceCard>

        <SurfaceCard className="rounded-3xl border-border/70 bg-card/80 shadow-[0_16px_50px_rgb(15_23_42/0.06)]">
          <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
            {visibleVariantGroups.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {visibleVariantGroups.map((group) => (
                  <button
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground",
                      group.key === selectedGroup?.key &&
                        "border-primary/40 bg-primary/10 text-primary"
                    )}
                    key={group.key}
                    onClick={() => {
                      setSelectedGroupKey(group.key);
                      setSelectedVariantId(group.variants[0]?.id ?? null);
                    }}
                    type="button"
                  >
                    <VariantGroupSwatch label={group.label} />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="grid gap-2.5">
              {selectedGroupVariants.map((variant) => (
                <VariantSizeRow
                  canAdd={
                    priceVisibility === "approved" &&
                    typeof variant.price !== "undefined" &&
                    variant.price !== null
                  }
                  disabledReason={
                    !variant.isActive
                      ? "Pasif varyant"
                      : (variant.stockQuantity ?? 0) === 0
                        ? "Stok bilgisi icin iletisime gecin"
                        : undefined
                  }
                  isSelected={variant.id === selectedVariant?.id}
                  key={variant.id}
                  onSelect={setSelectedVariantId}
                  priceVisibility={priceVisibility}
                  product={product}
                  variant={variant}
                />
              ))}
            </div>
          </CardContent>
        </SurfaceCard>

        {jotaDescription ? (
          <JotaDescriptionCard className="lg:hidden" model={jotaDescription} />
        ) : selectedDescription ? (
          <SurfaceCard className="rounded-3xl border-border/70 bg-card/80 shadow-[0_16px_50px_rgb(15_23_42/0.06)] lg:hidden">
            <CardContent className="p-4">
              <section className="rounded-2xl border border-border/65 bg-background/72 p-4 shadow-sm">
                <p className="text-sm leading-7 text-muted-foreground">
                  {selectedDescription}
                </p>
              </section>
            </CardContent>
          </SurfaceCard>
        ) : (
          mobileDescription
        )}

        <RelatedProductsSection products={product.relatedProducts ?? []} />
      </div>
    </div>
  );
}

function JotaDescriptionCard({
  className,
  model,
}: {
  className?: string;
  model: JotaDescriptionModel;
}) {
  const headerTheme = JOTA_HEADER_THEMES[model.headerTone];

  return (
    <SurfaceCard
      className={cn(
        "rounded-3xl border-border/70 bg-card/80 shadow-[0_16px_50px_rgb(15_23_42/0.06)]",
        className
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <section className="grid gap-5" aria-label="JOTA ürün açıklaması">
          <header className={cn("rounded-2xl border p-4", headerTheme.container)}>
            <h2 className={cn("text-lg font-semibold", headerTheme.title)}>
              {model.title}
            </h2>
            <p className={cn("mt-1 text-sm font-medium", headerTheme.subtitle)}>
              {model.subtitle}
            </p>
          </header>

          <p className="text-sm leading-7 text-muted-foreground">{model.paragraph}</p>

          <div className="grid grid-cols-2 gap-2.5">
            {model.benefits.map((benefit) => (
              <article
                className="rounded-2xl border border-border/60 bg-background/65 p-3 shadow-sm"
                key={benefit.title}
              >
                <h3 className="text-sm font-semibold text-foreground">{benefit.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {benefit.description}
                </p>
              </article>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Klinik Kullanım Alanları</h3>
            <ul className="mt-2 grid gap-2 text-sm leading-6 text-muted-foreground">
              {model.clinicalUses.map((use) => (
                <li className="flex gap-2" key={use}>
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{use}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/65">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-border/55">
                {model.technicalRows.map((row) => (
                  <tr className="align-top" key={row.label}>
                    <th className="w-[38%] bg-muted/45 px-3 py-2.5 font-medium text-foreground">
                      {row.label}
                    </th>
                    <td className="px-3 py-2.5 leading-5 text-muted-foreground">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </CardContent>
    </SurfaceCard>
  );
}

const JOTA_HEADER_THEMES: Record<
  JotaHeaderTone,
  { container: string; subtitle: string; title: string }
> = {
  blue: {
    container:
      "border-blue-400/35 bg-gradient-to-br from-blue-800 via-blue-700 to-sky-600 shadow-[0_12px_30px_rgb(29_78_216/0.22)]",
    subtitle: "text-blue-100",
    title: "text-white",
  },
  green: {
    container:
      "border-emerald-400/35 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 shadow-[0_12px_30px_rgb(5_150_105/0.2)]",
    subtitle: "text-emerald-100",
    title: "text-white",
  },
  red: {
    container:
      "border-red-400/35 bg-gradient-to-br from-red-900 via-red-800 to-rose-700 shadow-[0_12px_30px_rgb(185_28_28/0.2)]",
    subtitle: "text-red-100",
    title: "text-white",
  },
  black: {
    container:
      "border-slate-500/50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-700 shadow-[0_12px_30px_rgb(15_23_42/0.28)]",
    subtitle: "text-slate-200",
    title: "text-white",
  },
  yellow: {
    container:
      "border-amber-300/60 bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100 shadow-[0_12px_30px_rgb(217_119_6/0.13)]",
    subtitle: "text-amber-800",
    title: "text-amber-950",
  },
  neutral: {
    container: "border-primary/15 bg-primary/6",
    subtitle: "text-primary",
    title: "text-foreground",
  },
};

function VariantGroupSwatch({ label }: { label: string }) {
  const swatch = getColorSwatch(label);

  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "size-4 rounded-full border shadow-[inset_0_0_0_1px_rgb(255_255_255/0.38)]",
          swatch.className
        )}
      />
      <span>{swatch.label}</span>
    </>
  );
}

function RelatedProductsSection({ products }: { products: RelatedProductView[] }) {
  if (!products.length) {
    return null;
  }

  return (
    <SurfaceCard className="rounded-3xl border-border/70 bg-card/80 shadow-[0_16px_50px_rgb(15_23_42/0.06)]">
      <CardContent className="p-4 sm:p-5">
        <section className="grid gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Benzer / Öne Çıkan Ürünler
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {products.map((item) => (
              <Link
                className="group/related grid w-40 shrink-0 gap-2 rounded-2xl border border-border/55 bg-background/60 p-2 transition hover:border-primary/25 hover:bg-background/85 sm:w-44"
                href={item.href}
                key={item.id}
              >
                <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-white">
                  <ProductImage
                    alt={item.name}
                    fallback={
                      <div className="flex h-full w-full items-center justify-center bg-white px-3 text-center text-xs font-semibold text-primary">
                        {item.brand}
                      </div>
                    }
                    src={item.imageUrl}
                  />
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-xs font-semibold leading-5 text-foreground">
                    {item.name}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                    <span className="truncate">{item.categoryName ?? item.brand}</span>
                    {item.variantCount > 1 ? (
                      <span className="shrink-0">{item.variantCount} varyant</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </CardContent>
    </SurfaceCard>
  );
}

function VariantSizeRow({
  canAdd,
  disabledReason,
  isSelected,
  onSelect,
  priceVisibility,
  product,
  variant,
}: {
  canAdd: boolean;
  disabledReason?: string;
  isSelected: boolean;
  onSelect: (variantId: string) => void;
  priceVisibility: "approved" | "pending" | "public";
  product: ProductDetailView;
  variant: ProductVariantView;
}) {
  const displayLabel = getBuyerVariantLabel(product, variant);
  const isSimpleNonJotaProduct =
    !isJotaProductBrand(product.brand) && product.variants.length === 1;
  const quantityStep = getQuantityStep(product, variant);
  const isOutOfStock = (variant.stockQuantity ?? 0) === 0;
  const displayPrice =
    priceVisibility === "approved" &&
    typeof variant.price !== "undefined" &&
    variant.price !== null
      ? formatPrice(variant.price, variant.currency ?? "TRY")
      : null;

  return (
    <div
      className={cn(
        "grid min-w-0 gap-3 rounded-2xl border border-border/65 bg-background/70 p-3 shadow-sm transition hover:border-primary/25 hover:bg-background/84 xl:grid-cols-[minmax(0,1fr)_minmax(190px,auto)] xl:items-center",
        isSelected && "border-primary/45 bg-primary/5 ring-2 ring-primary/15"
      )}
      id={`variant-${variant.id}`}
      onFocus={() => onSelect(variant.id)}
      onMouseEnter={() => onSelect(variant.id)}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {!isSimpleNonJotaProduct ? (
            <p className="font-semibold leading-6">{displayLabel}</p>
          ) : null}
          {variant.price === null ? (
            <span className="rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
              Fiyat bekleniyor
            </span>
          ) : null}
        </div>

        <div
          className={cn(
            "flex flex-wrap gap-2 text-xs text-muted-foreground",
            !isSimpleNonJotaProduct && "mt-2"
          )}
        >
          {displayPrice ? (
            <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 font-semibold text-primary">
              {displayPrice}
            </span>
          ) : null}
          {variant.packageQuantity > 1 ? (
            <span className="rounded-full bg-muted px-2.5 py-1">
              Paket: {variant.packageQuantity}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 gap-2">
        {canAdd ? (
          <AddToRequestInlineForm
            currency={variant.currency}
            disabled={!variant.isActive || isOutOfStock}
            disabledReason={disabledReason}
            key={variant.id}
            productName={product.name}
            quantityStep={quantityStep}
            submitLabel="Teklife Ekle"
            unitPrice={variant.price}
            variantId={variant.id}
            variantLabel={displayLabel}
          />
        ) : (
          <CommercialState priceVisibility={priceVisibility} />
        )}
      </div>
    </div>
  );
}

function AddToRequestInlineForm({
  currency,
  disabled,
  disabledReason,
  productName,
  quantityStep,
  submitLabel,
  unitPrice,
  variantId,
  variantLabel,
}: {
  currency?: string;
  disabled: boolean;
  disabledReason?: string;
  productName: string;
  quantityStep: number;
  submitLabel: string;
  unitPrice?: number | null;
  variantId: string;
  variantLabel?: string | null;
}) {
  const [quantity, setQuantity] = useState(String(quantityStep));
  const [feedback, setFeedback] = useState<null | { tone: "error" | "success"; text: string }>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const drawer = useRequestDrawer();

  if (disabled) {
    return (
      <Button className="w-full rounded-full font-semibold shadow-sm opacity-60" disabled>
        {disabledReason ?? submitLabel}
      </Button>
    );
  }

  const updateQuantity = (nextQuantity: number) => {
    setQuantity(String(Math.max(quantityStep, nextQuantity)));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextQuantity = Number(quantity);
    if (
      !Number.isInteger(nextQuantity) ||
      nextQuantity < quantityStep ||
      nextQuantity % quantityStep !== 0
    ) {
      setFeedback({ tone: "error", text: `Adet ${quantityStep} ve katlari olmalidir.` });
      setQuantity(String(quantityStep));
      return;
    }

    setFeedback(null);
    const token = drawer.beginAdd({
      currency,
      productName,
      quantity: nextQuantity,
      unitPrice,
      variantId,
      variantLabel,
    });
    startTransition(async () => {
      const result = await addToOrderDraftInlineAction({
        quantity: nextQuantity,
        variantId,
      });

      if (!result.success) {
        const message = result.error ?? "Urun talep listesine eklenemedi.";
        setFeedback({ tone: "error", text: message });
        drawer.failAdd(token, message);
        return;
      }

      drawer.confirmAdd(token, result);
      setFeedback({ tone: "success", text: "Teklife eklendi." });
      setQuantity(String(quantityStep));
    });
  };

  return (
    <div className="grid gap-2">
      <form className="grid min-w-0 grid-cols-[132px_minmax(0,1fr)] gap-2" onSubmit={handleSubmit}>
        <div className="grid grid-cols-[36px_minmax(0,1fr)_36px] rounded-full border border-input bg-background/80 shadow-sm">
          <button
            aria-label="Adet azalt"
            className="flex h-11 items-center justify-center text-muted-foreground transition hover:text-foreground"
            onClick={() => updateQuantity(Number(quantity) - quantityStep)}
            type="button"
          >
            <Minus className="size-4" />
          </button>
          <input
            aria-label="Adet"
            className="h-11 min-w-0 border-x border-input bg-transparent px-1 text-center text-sm outline-none"
            inputMode="numeric"
            min={quantityStep}
            onChange={(event) => setQuantity(event.currentTarget.value)}
            step={quantityStep}
            type="number"
            value={quantity}
          />
          <button
            aria-label="Adet arttir"
            className="flex h-11 items-center justify-center text-muted-foreground transition hover:text-foreground"
            onClick={() => updateQuantity(Number(quantity) + quantityStep)}
            type="button"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <Button
          className="min-w-0 w-full rounded-full px-3 py-2.5 font-semibold shadow-sm"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Ekleniyor..." : submitLabel}
        </Button>
      </form>

      {feedback ? (
        <div
          className={cn(
            "rounded-2xl border px-3 py-2 text-sm font-medium",
            feedback.tone === "success"
              ? "border-primary/20 bg-primary/10 text-primary"
              : "border-destructive/25 bg-destructive/10 text-destructive"
          )}
        >
          {feedback.text}
        </div>
      ) : null}
    </div>
  );
}

function CommercialState({
  priceVisibility,
}: {
  priceVisibility: "approved" | "pending" | "public";
}) {
  if (priceVisibility === "approved") {
    return (
      <p className="rounded-2xl border border-amber-200/70 bg-amber-50 px-3 py-2.5 text-center text-xs font-medium leading-5 text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
        Fiyat bilgisi hazırlanıyor.
      </p>
    );
  }

  return (
    <p className="rounded-2xl border border-border/70 bg-muted/65 px-3 py-2.5 text-center text-xs font-medium leading-5 text-muted-foreground">
      {priceVisibility === "pending"
        ? "Hesap onayi sonrasi teklif eklenebilir."
        : "Teklif icin profesyonel hesabinizla giris yapin."}
    </p>
  );
}

function getVariantGroups(variants: ProductVariantView[]) {
  const groups = new Map<string, { key: string; label: string; variants: ProductVariantView[] }>();

  for (const variant of variants) {
    const key = getVariantGroupKey(variant);
    const current = groups.get(key) ?? {
      key,
      label: getVariantGroupLabel(variant),
      variants: [],
    };

    current.variants.push(variant);
    current.variants.sort(compareVariantSize);
    groups.set(key, current);
  }

  return [...groups.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "tr-TR", { numeric: true })
  );
}

function getVariantGroupKey(variant: ProductVariantView) {
  return normalizeText([variant.color ?? "", variant.grit ?? ""].join("|")) || "standard";
}

function getVariantGroupLabel(variant: ProductVariantView) {
  return (
    normalizeGritLabel(variant.color ?? variant.grit ?? variant.code) ??
    variant.color ??
    variant.grit ??
    "Standart"
  );
}

function isBuyerFacingGroupLabel(value: string) {
  const normalized = normalizeText(value);

  return normalized !== "fg" && normalized !== "standart" && normalized !== "standard";
}

function splitProductTitle(title: string) {
  const match = title.match(
    /\b(Mavi|Siyah|Yeşil|Yesil|Kırmızı|Kirmizi|Pembe|Gri|Sarı|Sari)\b/i
  );

  if (!match?.index || match.index <= 0) {
    return { detail: null, main: title };
  }

  const main = title.slice(0, match.index).trim();
  const detail = title.slice(match.index).trim();

  return main && detail ? { detail, main } : { detail: null, main: title };
}

function getSelectedProductTitle(
  product: ProductDetailView,
  selectedVariant: ProductVariantView | null,
  selectedGroupLabel: string | null | undefined
) {
  if (!isJotaProductBrand(product.brand)) {
    return getSafeProductTitle(product.name) ?? getDisplayCode(product.code) ?? "Ürün";
  }

  const groupLabel =
    selectedGroupLabel && isBuyerFacingGroupLabel(selectedGroupLabel) ? selectedGroupLabel : null;
  const variantTitle = selectedVariant ? getCleanVariantTitle(selectedVariant.name) : null;

  if (variantTitle && !isTechnicalVariantTitle(variantTitle)) {
    return variantTitle;
  }

  if (!groupLabel) {
    const diameter = selectedVariant ? formatVariantDiameter(selectedVariant) : null;

    return diameter ? `${product.name} - ${diameter}` : product.name;
  }

  const replacedTitle = replaceKnownColorInTitle(product.name, groupLabel);

  if (replacedTitle !== product.name) {
    return replacedTitle;
  }

  return `${product.name} - ${groupLabel}`;
}

function isJotaProductBrand(brand: string) {
  const normalizedBrand = normalizeText(brand);

  return normalizedBrand === "jota" || normalizedBrand === "jota switzerland";
}

function getSafeProductTitle(value: string) {
  const title = value.trim();

  return title && isUsableBusinessCode(title) ? title : null;
}

function getCleanVariantTitle(value: string) {
  if (value.includes("·")) {
    return null;
  }

  const parts = value
    .split(/\s*[·|/]\s*/)
    .map((part) => part.trim())
    .filter((part) => part && isBuyerFacingGroupLabel(part));

  if (!parts.length) {
    return null;
  }

  return parts.join(" ");
}

function isTechnicalVariantTitle(value: string) {
  return /^Ø?\s*\d+(?:[,.]\d+)?$/i.test(value.trim());
}

function replaceKnownColorInTitle(title: string, color: string) {
  return title.replace(
    /\b(Mavi|Siyah|Yeşil|Yesil|Kırmızı|Kirmizi|Pembe|Gri|Sarı|Sari)\b/i,
    color
  );
}

function shouldZoomProductImage(product: ProductDetailView, selectedVariant: ProductVariantView | null) {
  const text = normalizeText(
    [
      product.brand,
      product.name,
      product.category?.name,
      selectedVariant?.name,
      selectedVariant?.code,
      selectedVariant?.manufacturerRef,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return (
    text.includes("jota") ||
    text.includes("frez") ||
    text.includes("bur") ||
    text.includes("elmas")
  );
}

function getVariantUrlToken(variant: ProductVariantView) {
  return (
    getDisplayCode(variant.code) ??
    getDisplayCode(variant.manufacturerRef) ??
    getVariantDisplayToken(variant)
  );
}

function getVariantDisplayToken(variant: ProductVariantView) {
  return slugifyUrlToken(
    [
      normalizeGritLabel(variant.color ?? variant.grit ?? ""),
      formatDisplayDiameter(variant.diameter),
    ]
      .filter(Boolean)
      .join("-")
  );
}

function slugifyUrlToken(value: string) {
  const token = value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return token || null;
}

function compareVariantSize(left: ProductVariantView, right: ProductVariantView) {
  return (
    compareNullableNumber(left.diameter, right.diameter) ||
    compareNullableText(left.code, right.code)
  );
}

function getQuantityStep(product: ProductDetailView, variant: ProductVariantView) {
  const minOrderQty = variant.minOrderQty;
  const packageQuantity = variant.packageQuantity;

  if (Number.isInteger(minOrderQty) && Number(minOrderQty) > 1) {
    return Number(minOrderQty);
  }

  if (!Number.isInteger(packageQuantity) || packageQuantity <= 1) {
    return 1;
  }

  const text = normalizeText(
    [
      product.brand,
      product.name,
      product.category?.name,
      product.usageArea,
      variant.name,
      variant.code,
      variant.manufacturerRef,
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (
    text.includes("jota") &&
    (text.includes("frez") ||
      text.includes("diamond") ||
      text.includes("elmas") ||
      text.includes("polisher") ||
      text.includes("polisaj") ||
      text.includes("cilalama"))
  ) {
    return packageQuantity;
  }

  return 1;
}

function getTitleInfoBadges(
  product: ProductDetailView,
  selectedVariant: ProductVariantView | null,
  priceVisibility: "approved" | "pending" | "public"
) {
  const packageQuantities = uniqueNumbers(
    product.variants.map((variant) => variant.packageQuantity).filter((value) => value > 1)
  );
  const badges: string[] = [];

  if (product.variants.length > 1) {
    badges.push(`${product.variants.length} seçenek`);
  }

  if (packageQuantities.length) {
    badges.push(packageQuantities.length === 1 ? `Paket: ${packageQuantities[0]} adet` : "Çoklu paket");
  }

  if (
    priceVisibility === "approved" &&
    selectedVariant &&
    typeof selectedVariant.stockQuantity === "number"
  ) {
    badges.push(`Stok: ${selectedVariant.stockQuantity} adet`);
  }

  return badges;
}

function getReadableDescriptionText(value: string | null | undefined) {
  const source = value?.trim();

  if (!source) {
    return null;
  }

  const text = source
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text || null;
}

function compareNullableNumber(left: number | null, right: number | null) {
  const hasLeft = typeof left === "number" && Number.isFinite(left);
  const hasRight = typeof right === "number" && Number.isFinite(right);

  if (!hasLeft && hasRight) return 1;
  if (hasLeft && !hasRight) return -1;
  if (!hasLeft && !hasRight) return 0;

  return Number(left) - Number(right);
}

function compareNullableText(left: string | null, right: string | null) {
  return normalizeText(left ?? "").localeCompare(normalizeText(right ?? ""), "tr-TR", {
    numeric: true,
  });
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 50;
  }

  return Math.min(100, Math.max(0, value));
}

function getDisplayCode(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed || !isUsableBusinessCode(trimmed)) {
    return null;
  }

  return trimmed;
}

function getImageSrc(value: string | null | undefined) {
  return value?.trim() || null;
}

function getBuyerVariantLabel(
  product: ProductDetailView,
  variant: ProductVariantView
) {
  if (isJotaProductBrand(product.brand)) {
    const diameter = formatVariantDiameter(variant);

    return diameter ?? (isBuyerFacingGroupLabel(variant.name) ? variant.name : "Seçenek");
  }

  const variantName = variant.name.trim();
  const normalizedVariantName = normalizeText(variantName);
  const matchesInternalCode = [variant.code, variant.manufacturerRef]
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizeText(value) === normalizedVariantName);

  if (
    variantName &&
    !matchesInternalCode &&
    isUsableBusinessCode(variantName) &&
    isBuyerFacingGroupLabel(variantName)
  ) {
    return variantName;
  }

  if (product.variants.length === 1 && product.name.trim()) {
    return product.name.trim();
  }

  const attributes = [
    normalizeGritLabel(variant.color ?? variant.grit ?? ""),
    formatVariantDiameter(variant),
  ].filter((value): value is string => Boolean(value));

  if (attributes.length) {
    return attributes.join(" · ");
  }

  return (
    getDisplayCode(variant.code) ??
    getDisplayCode(variant.manufacturerRef) ??
    "Seçenek"
  );
}

function formatVariantDiameter(variant: ProductVariantView) {
  const diameter = formatDisplayDiameter(variant.diameter);

  if (diameter) {
    return `Ø ${diameter}`;
  }

  return getSizeFromCode(variant.code) ?? getSizeFromCode(variant.manufacturerRef ?? "");
}

function normalizeGritLabel(value: string) {
  const normalized = normalizeText(value);

  if (normalized.includes("black") || normalized.includes("siyah")) return "Siyah";
  if (normalized.includes("gray") || normalized.includes("grey") || normalized.includes("gri")) {
    return "Gri";
  }
  if (normalized.includes("green") || normalized.includes("yesil")) return "Yeşil";
  if (normalized.includes("blue") || normalized.includes("mavi")) return "Mavi";
  if (normalized.includes("pink") || normalized.includes("pembe")) return "Pembe";
  if (normalized.includes("red") || normalized.includes("kirmizi")) return "Kırmızı";
  if (normalized.includes("yellow") || normalized.includes("sari")) return "Sarı";

  const grit = value.toUpperCase().match(/\b(XC|C|M|F|SF|UF)\b/)?.[1];

  return grit ?? null;
}

function getColorSwatch(label: string) {
  const normalized = normalizeText(label);

  if (normalized.includes("mavi") || normalized.includes("blue")) {
    return { className: "border-blue-600 bg-blue-500", label };
  }

  if (normalized.includes("siyah") || normalized.includes("black")) {
    return { className: "border-slate-700 bg-slate-950", label };
  }

  if (normalized.includes("yesil") || normalized.includes("green")) {
    return { className: "border-emerald-700 bg-emerald-500", label };
  }

  if (normalized.includes("kirmizi") || normalized.includes("red")) {
    return { className: "border-red-700 bg-red-500", label };
  }

  if (normalized.includes("pembe") || normalized.includes("pink")) {
    return { className: "border-pink-600 bg-pink-400", label };
  }

  if (normalized.includes("gri") || normalized.includes("gray") || normalized.includes("grey")) {
    return { className: "border-slate-500 bg-slate-400", label };
  }

  return { className: "border-border bg-muted", label };
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(price);
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

function uniqueNumbers(values: number[]) {
  return [...new Set(values.filter((value) => Number.isFinite(value)))];
}

function isUsableBusinessCode(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:$|[-_A-Z0-9].*)/i.test(
    trimmed
  );
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\s+/g, " ")
    .trim();
}
