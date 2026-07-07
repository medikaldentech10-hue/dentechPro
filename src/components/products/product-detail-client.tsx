"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import {
  Boxes,
  CircleDot,
  Package2,
  Tag,
  Waypoints,
  type LucideIcon,
} from "lucide-react";

import { addToOrderDraftInlineAction } from "@/app/(public)/request/actions";
import { SurfaceCard } from "@/components/premium/surface-card";
import { ProductImage } from "@/components/products/product-image";
import { PageTitle } from "@/components/shared/page-title";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
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
  variants: ProductVariantView[];
};

type ProductVariantView = {
  code: string;
  connectionType: string | null;
  currency?: string;
  diameter: number | null;
  grit: string | null;
  id: string;
  imageUrl: string | null;
  isActive: boolean;
  manufacturerRef: string | null;
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
  salesMode,
}: ProductDetailClientProps) {
  const initialVariant =
    product.variants.find((variant) => variant.id === initialVariantId) ?? product.variants[0] ?? null;
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariant?.id ?? null);

  const selectedVariant = useMemo(
    () =>
      product.variants.find((variant) => variant.id === selectedVariantId) ??
      product.variants[0] ??
      null,
    [product.variants, selectedVariantId]
  );
  const selectedCode = getDisplayCode(selectedVariant?.code ?? product.code);
  const selectedReference =
    selectedVariant?.manufacturerRef && !isUuid(selectedVariant.manufacturerRef)
      ? selectedVariant.manufacturerRef
      : null;
  const variantLabels = selectedVariant ? getVariantLabels(selectedVariant) : [];
  const metaItems = getMetaItems(product, selectedVariant, selectedCode, selectedReference);
  const canSeeCommercialData =
    priceVisibility === "approved" &&
    selectedVariant &&
    typeof selectedVariant.price !== "undefined";

  useEffect(() => {
    if (!selectedVariantId) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("variant", selectedVariantId);
    window.history.replaceState(null, "", url);
  }, [selectedVariantId]);

  return (
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
                      <span className="text-xs text-muted-foreground">Dental ürün kataloğu</span>
                    </div>
                  }
                  priority
                  src={product.imageUrl ?? selectedVariant?.imageUrl ?? null}
                />
              </div>
            </div>
          </CardContent>
        </SurfaceCard>

        {desktopDescription}
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
                    {selectedVariant?.name ?? "Varyant bilgisi bekleniyor"}
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
                    price={canSeeCommercialData ? selectedVariant?.price ?? null : null}
                    priceVisibility={priceVisibility}
                    stockQuantity={
                      canSeeCommercialData ? selectedVariant?.stockQuantity ?? null : null
                    }
                    variantCurrency={selectedVariant?.currency ?? "TRY"}
                  />
                </div>
              </div>

              {canSeeCommercialData && selectedVariant ? (
                <div className="mt-4">
                  <AddToRequestInlineForm
                    disabled={!selectedVariant.isActive || (selectedVariant.stockQuantity ?? 0) === 0}
                    disabledReason={
                      !selectedVariant.isActive
                        ? "Pasif varyant"
                        : "Stok bilgisi için iletişime geçin"
                    }
                    key={selectedVariant.id}
                    submitLabel={salesMode ? "Müşteri Adına Ekle" : "Talep Listesine Ekle"}
                    variantId={selectedVariant.id}
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
                  isSelected={variant.id === selectedVariant?.id}
                  key={variant.id}
                  onSelect={setSelectedVariantId}
                  variant={variant}
                />
              ))}
            </div>
          </CardContent>
        </SurfaceCard>

        {mobileDescription}
      </div>
    </div>
  );
}

function AddToRequestInlineForm({
  disabled,
  disabledReason,
  submitLabel,
  variantId,
}: {
  disabled: boolean;
  disabledReason?: string;
  submitLabel: string;
  variantId: string;
}) {
  const [quantity, setQuantity] = useState("1");
  const [feedback, setFeedback] = useState<null | { tone: "error" | "success"; text: string }>(null);
  const [isPending, startTransition] = useTransition();

  if (disabled) {
    return (
      <button
        className={cn(
          buttonVariants({ variant: "default" }),
          "w-full rounded-full font-semibold shadow-sm opacity-60"
        )}
        disabled
        type="button"
      >
        {disabledReason ?? submitLabel}
      </button>
    );
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextQuantity = Number(quantity);
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      setFeedback({ tone: "error", text: "Adet en az 1 olmalıdır." });
      setQuantity("1");
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await addToOrderDraftInlineAction({
        quantity: nextQuantity,
        variantId,
      });

      if (!result.success) {
        setFeedback({ tone: "error", text: result.error ?? "Ürün talep listesine eklenemedi." });
        return;
      }

      setFeedback({ tone: "success", text: "Talep listesine eklendi." });
      setQuantity("1");
    });
  };

  return (
    <div className="grid gap-3">
      <form className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-2" onSubmit={handleSubmit}>
        <input
          aria-label="Adet"
          className="h-10 min-w-0 rounded-full border border-input bg-background/80 px-2 text-center text-sm shadow-sm"
          inputMode="numeric"
          min={1}
          onChange={(event) => setQuantity(event.currentTarget.value)}
          step={1}
          type="number"
          value={quantity}
        />
        <Button
          className="min-w-0 w-full rounded-full px-3 font-semibold shadow-sm"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Ekleniyor..." : submitLabel}
        </Button>
      </form>

      {feedback ? (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between",
            feedback.tone === "success"
              ? "border-primary/20 bg-primary/10 text-primary"
              : "border-destructive/25 bg-destructive/10 text-destructive"
          )}
        >
          <span className="font-medium">{feedback.text}</span>
          {feedback.tone === "success" ? (
            <div className="flex flex-wrap gap-2">
              <Link className={buttonVariants({ size: "sm", variant: "outline" })} href="/request">
                Talep Listesine Git
              </Link>
              <Button onClick={() => setFeedback(null)} size="sm" type="button" variant="ghost">
                Alışverişe Devam Et
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CommercialState({
  price,
  priceVisibility,
  stockQuantity,
  variantCurrency,
}: {
  price: number | null;
  priceVisibility: "approved" | "pending" | "public";
  stockQuantity: number | null;
  variantCurrency: string;
}) {
  if (priceVisibility === "approved" && price !== null) {
    return (
      <>
        <p className="text-lg font-semibold text-foreground sm:text-xl">
          {formatPrice(price, variantCurrency)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Stok: {stockQuantity ?? 0} adet</p>
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
  onSelect,
  variant,
}: {
  isSelected: boolean;
  onSelect: (variantId: string) => void;
  variant: ProductVariantView;
}) {
  const displayCode = getDisplayCode(variant.code);
  const labels = getVariantLabels(variant);

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
        <button
          aria-current={isSelected ? "true" : undefined}
          className={cn(
            buttonVariants({ variant: isSelected ? "default" : "outline" }),
            "w-full"
          )}
          onClick={() => onSelect(variant.id)}
          type="button"
        >
          {isSelected ? "Seçili" : "Seç"}
        </button>
      </div>
    </div>
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

function formatPrice(price: number | null, currency: string) {
  if (price === null) {
    return "Fiyat tanımlanmadı";
  }

  return `${new Intl.NumberFormat("tr-TR", {
    currency,
    style: "currency",
  }).format(price)} + KDV`;
}

function getMetaItems(
  product: {
    brand: string;
    category: { name: string } | null;
  },
  variant: ProductVariantView | null,
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

function getVariantLabels(variant: ProductVariantView) {
  const diameter = formatDisplayDiameter(variant.diameter);
  const labels = [
    normalizeHolder(variant.connectionType ?? variant.code),
    normalizeGritLabel(variant.color ?? variant.grit ?? variant.code),
    diameter ? `Ø ${diameter}` : getSizeFromCode(variant.code),
  ];

  return labels.filter((label): label is string => Boolean(label));
}

function formatVariantDiameter(variant: ProductVariantView) {
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
