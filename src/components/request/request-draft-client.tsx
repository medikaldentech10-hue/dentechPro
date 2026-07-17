"use client";

import { useRef, useState, useTransition } from "react";
import {
  CheckCircle2,
  LoaderCircle,
  MessageCircle,
  Minus,
  PackageSearch,
  Plus,
  Trash2,
} from "lucide-react";

import {
  clearOrderDraftAction,
  removeOrderItemInlineAction,
  submitOrderDraftToWhatsAppAction,
  updateOrderItemQuantityInlineAction,
} from "@/app/(public)/request/actions";
import { SurfaceCard } from "@/components/premium/surface-card";
import { ProductImage } from "@/components/products/product-image";
import { PendingSubmitButton } from "@/components/shared/pending-submit-button";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  customerPaymentPreferenceLabel,
  customerPaymentPreferenceOptions,
} from "@/lib/customer-request-preferences";

type RequestDraftClientProps = {
  draft: RequestDraftView;
};

type RequestDraftView = {
  customer_note: string | null;
  customer_payment_preference:
    | "bank_transfer"
    | "cash"
    | "credit_card_link"
    | "discuss_later"
    | null;
  id: string;
  items: RequestDraftItemView[];
  subtotal: number | null;
  total: number | null;
};

type RequestDraftItemView = {
  id: string;
  line_total: number | null;
  product: {
    brand: string;
    image_url: string | null;
    product_group_code: string;
    product_name: string;
  };
  quantity: number;
  unit_price: number | null;
  variant: {
    color: string | null;
    connection_type: string | null;
    diameter: number | null;
    grit: string | null;
    image_url: string | null;
    manufacturer_ref: string | null;
    variant_code: string | null;
  };
};

export function RequestDraftClient({ draft }: RequestDraftClientProps) {
  const [draftState, setDraftState] = useState(() => cloneDraft(draft));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [pendingItems, setPendingItems] = useState<
    Record<string, "quantity" | "remove" | undefined>
  >({});
  const confirmedDraftRef = useRef(cloneDraft(draft));
  const latestVersionRef = useRef<Record<string, number>>({});
  const pendingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});

  const setPendingForItem = (
    itemId: string,
    value: "quantity" | "remove" | null
  ) => {
    setPendingItems((current) => {
      if (!value && !current[itemId]) {
        return current;
      }

      const next = { ...current };

      if (value) {
        next[itemId] = value;
      } else {
        delete next[itemId];
      }

      return next;
    });
  };

  const scheduleQuantityCommit = (itemId: string, quantity: number) => {
    if (pendingTimersRef.current[itemId]) {
      clearTimeout(pendingTimersRef.current[itemId]!);
    }

    const version = (latestVersionRef.current[itemId] ?? 0) + 1;
    latestVersionRef.current[itemId] = version;
    setPendingForItem(itemId, "quantity");

    pendingTimersRef.current[itemId] = setTimeout(() => {
      startTransition(async () => {
        const result = await updateOrderItemQuantityInlineAction({ itemId, quantity });

        if (latestVersionRef.current[itemId] !== version) {
          return;
        }

        pendingTimersRef.current[itemId] = null;

        if (!result.success) {
          setDraftState(cloneDraft(confirmedDraftRef.current));
          setFeedback(result.error ?? "Adet güncellenemedi.");
          setPendingForItem(itemId, null);
          return;
        }

        const nextDraft = applyConfirmedQuantityResult(
          confirmedDraftRef.current,
          itemId,
          result
        );

        confirmedDraftRef.current = nextDraft;
        setDraftState(cloneDraft(nextDraft));
        setFeedback(null);
        setPendingForItem(itemId, null);
      });
    }, 320);
  };

  const updateQuantityLocally = (itemId: string, nextQuantity: number) => {
    setDraftState((current) => {
      const next = cloneDraft(current);
      const item = next.items.find((entry) => entry.id === itemId);

      if (!item) {
        return current;
      }

      const unitPrice = item.unit_price ?? 0;
      const previousLineTotal = item.line_total ?? unitPrice * item.quantity;
      const nextLineTotal = roundCurrency(unitPrice * nextQuantity);
      item.quantity = nextQuantity;
      item.line_total = nextLineTotal;
      next.subtotal = roundCurrency((next.subtotal ?? 0) - previousLineTotal + nextLineTotal);
      next.total = next.subtotal;
      return next;
    });
  };

  const handleQuantityChange = (itemId: string, nextQuantity: number) => {
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      return;
    }

    setFeedback(null);
    updateQuantityLocally(itemId, nextQuantity);
    scheduleQuantityCommit(itemId, nextQuantity);
  };

  const handleRemove = (itemId: string) => {
    const removedItem = draftState.items.find((item) => item.id === itemId);

    if (!removedItem) {
      return;
    }

    setFeedback(null);
    setPendingForItem(itemId, "remove");
    setDraftState((current) => {
      const next = cloneDraft(current);
      next.items = next.items.filter((item) => item.id !== itemId);
      next.subtotal = roundCurrency((next.subtotal ?? 0) - (removedItem.line_total ?? 0));
      next.total = next.subtotal;
      return next;
    });

    startTransition(async () => {
      const result = await removeOrderItemInlineAction({ itemId });

      if (!result.success) {
        setDraftState(cloneDraft(confirmedDraftRef.current));
        setFeedback(result.error ?? "Ürün listeden çıkarılamadı.");
        setPendingForItem(itemId, null);
        return;
      }

      const nextDraft = applyConfirmedRemoveResult(confirmedDraftRef.current, itemId, result);
      confirmedDraftRef.current = nextDraft;
      setDraftState(cloneDraft(nextDraft));
      setFeedback(null);
      setPendingForItem(itemId, null);
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <SurfaceCard>
        <CardHeader>
          <CardTitle>Ürünler</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {feedback ? (
            <div className="border-t border-border/70 px-4 pt-4">
              <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                {feedback}
              </p>
            </div>
          ) : null}

          {draftState.items.length ? (
            <>
              <div className="hidden border-t border-border/70 md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="w-full px-4 py-3 font-medium">Ürün</th>
                      <th className="px-3 py-3 font-medium">Adet</th>
                      <th className="px-4 py-3 text-right font-medium">Birim Fiyat</th>
                      <th className="px-4 py-3 text-right font-medium">Toplam</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {draftState.items.map((item) => (
                      <tr className="align-middle" key={item.id}>
                        <td className="min-w-0 px-4 py-3">
                          <RequestProductIdentity item={item} />
                        </td>
                        <td className="px-3 py-3">
                          <QuantityStepper
                            key={`${item.id}:${item.quantity}`}
                            isRemoving={pendingItems[item.id] === "remove"}
                            isSaving={pendingItems[item.id] === "quantity"}
                            item={item}
                            onChange={handleQuantityChange}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                          {formatPrice(item.unit_price)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                          {formatPrice(item.line_total)}
                        </td>
                        <td className="px-4 py-3">
                          <RemoveItemButton
                            disabled={Boolean(pendingItems[item.id])}
                            isPending={Boolean(pendingItems[item.id])}
                            onClick={() => handleRemove(item.id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-border/70 p-4 md:hidden">
                {draftState.items.map((item) => (
                  <div
                    className="rounded-xl border border-border/70 bg-background/60 p-4"
                    key={item.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <RequestProductIdentity item={item} />
                      <RemoveItemButton
                        disabled={Boolean(pendingItems[item.id])}
                        isPending={Boolean(pendingItems[item.id])}
                        onClick={() => handleRemove(item.id)}
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Birim Fiyat</p>
                        <p className="mt-1 font-medium">{formatPrice(item.unit_price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Toplam</p>
                        <p className="mt-1 font-semibold">{formatPrice(item.line_total)}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <QuantityStepper
                        key={`${item.id}:${item.quantity}`}
                        isRemoving={pendingItems[item.id] === "remove"}
                        isSaving={pendingItems[item.id] === "quantity"}
                        item={item}
                        onChange={handleQuantityChange}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="border-t border-border/70 p-6">
              <div className="flex min-h-52 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 bg-background/60 p-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
                  <PackageSearch />
                </div>
                <div className="flex max-w-md flex-col gap-2">
                  <h3 className="text-lg font-semibold">Talep listenizde henüz ürün yok.</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Katalogdan ürün seçerek talep listenizi oluşturabilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </SurfaceCard>

      <SurfaceCard className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle>Talep Özeti</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-xl border border-border/70 bg-background/60 p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Ürün kalemi</span>
              <span>{draftState.items.length}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>Ara toplam</span>
              <span>{formatPrice(draftState.subtotal)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4 text-base font-semibold">
              <span>Toplam</span>
              <span>{formatPrice(draftState.total)}</span>
            </div>
            <p className="mt-2 flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
              {isPending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
              <span>Fiyatlara KDV dahil değildir. Talep sonrası ekibimiz sizinle iletişime geçer.</span>
            </p>
          </div>

          <form action={submitOrderDraftToWhatsAppAction} className="grid gap-4">
            <div className="rounded-xl border border-border/70 bg-background/60 p-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <p className="text-sm font-semibold">Ödeme Tercihi</p>
                  <select
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                    defaultValue={draftState.customer_payment_preference ?? "discuss_later"}
                    name="customer_payment_preference"
                    required
                  >
                    {customerPaymentPreferenceOptions.map((option) => (
                      <option key={option} value={option}>
                        {customerPaymentPreferenceLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="grid gap-2 text-sm font-medium">
                  Talep Notu
                  <textarea
                    className="min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    defaultValue={draftState.customer_note ?? ""}
                    maxLength={1000}
                    name="customer_note"
                    placeholder="Teslimat, fatura, ürün alternatifi veya ödeme hakkında belirtmek istediğiniz detayları yazabilirsiniz."
                  />
                </label>
              </div>
            </div>

            <PendingSubmitButton
              className="w-full"
              pendingLabel="Gönderiliyor..."
              type="submit"
            >
              <MessageCircle data-icon="inline-start" />
              Talebi WhatsApp ile Gönder
            </PendingSubmitButton>
          </form>

          <form action={clearOrderDraftAction}>
            <Button className="w-full" type="submit" variant="outline">
              Listeyi Temizle
            </Button>
          </form>
        </CardContent>
      </SurfaceCard>
    </div>
  );
}

function RequestProductIdentity({ item }: { item: RequestDraftItemView }) {
  const variantSummary = getVariantSummary(item);
  const sku = getDisplayCode(item.product.product_group_code);
  const imageUrl = item.variant.image_url ?? item.product.image_url;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-white p-1.5">
        <ProductImage
          alt={item.product.product_name}
          fallback={
            <span className="text-sm font-semibold text-primary">
              {item.product.brand.trim().slice(0, 2) || "Ü"}
            </span>
          }
          src={imageUrl}
        />
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 max-w-[34rem] font-semibold leading-5">
          {getProductTitle(item)}
        </p>
        {variantSummary ? (
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {variantSummary}
          </p>
        ) : null}
        {sku && normalizeLabel(sku) !== normalizeLabel(variantSummary ?? "") ? (
          <p className="mt-1 text-[11px] text-muted-foreground/75">Kod: {sku}</p>
        ) : null}
      </div>
    </div>
  );
}

function RemoveItemButton({
  disabled,
  isPending,
  onClick,
}: {
  disabled: boolean;
  isPending: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label="Listeden kaldır"
      className="gap-1.5"
      disabled={disabled}
      onClick={onClick}
      type="button"
      variant="destructive"
    >
      {isPending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
      <span>Kaldır</span>
    </Button>
  );
}

function QuantityStepper({
  isRemoving,
  isSaving,
  item,
  onChange,
}: {
  isRemoving: boolean;
  isSaving: boolean;
  item: RequestDraftItemView;
  onChange: (itemId: string, quantity: number) => void;
}) {
  const [draftValue, setDraftValue] = useState(() => String(item.quantity));

  return (
    <div className="flex max-w-[190px] items-center gap-1.5">
      <Button
        disabled={isRemoving || item.quantity <= 1}
        onClick={() => onChange(item.id, item.quantity - 1)}
        className="size-9"
        size="icon"
        type="button"
        variant="outline"
      >
        <Minus className="size-4" />
      </Button>
      <input
        aria-label="Adet"
        className="h-9 w-14 rounded-lg border border-input bg-background px-2 text-center text-sm"
        disabled={isRemoving}
        inputMode="numeric"
        min={1}
        onBlur={() => {
          const quantity = Number(draftValue || item.quantity);
          const nextQuantity = Number.isInteger(quantity) && quantity > 0 ? quantity : item.quantity;
          setDraftValue(String(nextQuantity));
          if (nextQuantity !== item.quantity) {
            onChange(item.id, nextQuantity);
          }
        }}
        onChange={(event) => {
          setDraftValue(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        step={1}
        type="number"
        value={draftValue}
      />
      <Button
        disabled={isRemoving}
        onClick={() => onChange(item.id, item.quantity + 1)}
        className="size-9"
        size="icon"
        type="button"
        variant="outline"
      >
        <Plus className="size-4" />
      </Button>
      <span
        aria-label={isSaving ? "Kaydediliyor" : "Hazır"}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
        title={isSaving ? "Kaydediliyor" : "Hazır"}
      >
        {isSaving ? (
          <LoaderCircle className="size-3 animate-spin" />
        ) : (
          <CheckCircle2 className="size-3 text-primary" />
        )}
      </span>
    </div>
  );
}

function cloneDraft(draft: RequestDraftView): RequestDraftView {
  return {
    ...draft,
    items: draft.items.map((item) => ({
      ...item,
      product: { ...item.product },
      variant: { ...item.variant },
    })),
  };
}

function applyConfirmedQuantityResult(
  draft: RequestDraftView,
  itemId: string,
  result: {
    lineTotal?: number;
    quantity?: number;
    subtotal: number | null;
    total: number | null;
    unitPrice?: number | null;
  }
) {
  const next = cloneDraft(draft);
  const item = next.items.find((entry) => entry.id === itemId);

  if (!item) {
    return next;
  }

  item.quantity = result.quantity ?? item.quantity;
  item.line_total = result.lineTotal ?? item.line_total;
  item.unit_price = result.unitPrice ?? item.unit_price;
  next.subtotal = result.subtotal;
  next.total = result.total;
  return next;
}

function applyConfirmedRemoveResult(
  draft: RequestDraftView,
  itemId: string,
  result: {
    subtotal: number | null;
    total: number | null;
  }
) {
  const next = cloneDraft(draft);
  next.items = next.items.filter((entry) => entry.id !== itemId);
  next.subtotal = result.subtotal;
  next.total = result.total;
  return next;
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function formatPrice(value: number | null) {
  return new Intl.NumberFormat("tr-TR", {
    currency: "TRY",
    style: "currency",
  }).format(value ?? 0);
}

function getProductTitle(item: RequestDraftItemView) {
  const name = item.product.product_name.trim() || "Ürün";
  const brand = normalizeLabel(item.product.brand);

  return brand.startsWith("jota") && !normalizeLabel(name).startsWith("jota")
    ? `Jota ${name}`
    : name;
}

function getVariantSummary(item: RequestDraftItemView) {
  const band = getBandLabel(item.variant.color ?? item.variant.grit);
  const diameter =
    typeof item.variant.diameter === "number" && item.variant.diameter > 0
      ? `Ø ${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(item.variant.diameter)}`
      : null;
  const connection = item.variant.connection_type?.trim();
  const attributes = [
    band,
    diameter,
    connection && normalizeLabel(connection) !== "fg" ? connection : null,
  ].filter((value): value is string => Boolean(value));

  if (attributes.length) {
    return attributes.join(" · ");
  }

  const variantCode =
    getDisplayCode(item.variant.manufacturer_ref) ??
    getDisplayCode(item.variant.variant_code);
  const productCode = getDisplayCode(item.product.product_group_code);

  return variantCode && normalizeLabel(variantCode) !== normalizeLabel(productCode ?? "")
    ? variantCode
    : null;
}

function getBandLabel(value: string | null) {
  const normalized = normalizeLabel(value ?? "");

  if (!normalized) return null;
  if (normalized.includes("blue") || normalized.includes("mavi")) return "Mavi Kuşak";
  if (normalized.includes("green") || normalized.includes("yesil")) return "Yeşil Kuşak";
  if (normalized.includes("red") || normalized.includes("kirmizi")) return "Kırmızı Kuşak";
  if (normalized.includes("yellow") || normalized.includes("sari")) return "Sarı Kuşak";
  if (normalized.includes("black") || normalized.includes("siyah")) return "Siyah Kuşak";

  return null;
}

function normalizeLabel(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .trim();
}

function getDisplayCode(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized || isUuid(normalized) || isInternalSlug(normalized)) {
    return null;
  }

  return normalized;
}

function isInternalSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+){2,}$/i.test(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
