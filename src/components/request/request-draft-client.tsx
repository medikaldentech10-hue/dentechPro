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
    product_group_code: string;
    product_name: string;
  };
  quantity: number;
  unit_price: number | null;
  variant: {
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
                      <th className="px-4 py-3 font-medium">Ürün</th>
                      <th className="px-4 py-3 font-medium">Varyant</th>
                      <th className="px-4 py-3 font-medium">Adet</th>
                      <th className="px-4 py-3 text-right font-medium">Birim Fiyat</th>
                      <th className="px-4 py-3 text-right font-medium">Toplam</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {draftState.items.map((item) => {
                      const referenceCode = getDisplayCode(item.variant.manufacturer_ref);

                      return (
                        <tr className="align-top" key={item.id}>
                          <td className="px-4 py-4">
                            <div className="font-medium">{item.product.product_name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {getDisplayCode(item.product.product_group_code) ?? "SKU yok"}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium">
                              {getDisplayCode(item.variant.variant_code) ?? "Standart varyant"}
                            </div>
                            {referenceCode ? (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {referenceCode}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-4">
                            <QuantityStepper
                              key={`${item.id}:${item.quantity}`}
                              isRemoving={pendingItems[item.id] === "remove"}
                              isSaving={pendingItems[item.id] === "quantity"}
                              item={item}
                              onChange={handleQuantityChange}
                            />
                          </td>
                          <td className="px-4 py-4 text-right font-medium">
                            {formatPrice(item.unit_price)}
                          </td>
                          <td className="px-4 py-4 text-right font-semibold">
                            {formatPrice(item.line_total)}
                          </td>
                          <td className="px-4 py-4">
                            <Button
                              aria-label="Listeden çıkar"
                              disabled={Boolean(pendingItems[item.id])}
                              onClick={() => handleRemove(item.id)}
                              size="icon"
                              type="button"
                              variant="ghost"
                            >
                              {pendingItems[item.id] ? (
                                <LoaderCircle className="animate-spin" />
                              ) : (
                                <Trash2 />
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
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
                      <div>
                        <p className="font-medium">{item.product.product_name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getDisplayCode(item.variant.variant_code) ?? "Standart varyant"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getDisplayCode(item.product.product_group_code) ?? "SKU yok"}
                        </p>
                      </div>
                      <Button
                        aria-label="Listeden çıkar"
                        disabled={Boolean(pendingItems[item.id])}
                        onClick={() => handleRemove(item.id)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        {pendingItems[item.id] ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <Trash2 />
                        )}
                      </Button>
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
    <div className="flex max-w-[220px] items-center gap-2">
      <Button
        disabled={isRemoving || item.quantity <= 1}
        onClick={() => onChange(item.id, item.quantity - 1)}
        size="icon"
        type="button"
        variant="outline"
      >
        <Minus className="size-4" />
      </Button>
      <input
        aria-label="Adet"
        className="h-9 w-20 rounded-lg border border-input bg-background px-3 text-center text-sm"
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
        size="icon"
        type="button"
        variant="outline"
      >
        <Plus className="size-4" />
      </Button>
      <span className="inline-flex min-w-[92px] items-center gap-1 text-xs text-muted-foreground">
        {isSaving ? (
          <>
            <LoaderCircle className="size-3 animate-spin" />
            Kaydediliyor
          </>
        ) : (
          <>
            <CheckCircle2 className="size-3 text-primary" />
            Hazır
          </>
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

function getDisplayCode(value: string | null | undefined) {
  const normalized = value?.trim();

  if (!normalized || isUuid(normalized) || isInternalSlug(normalized)) {
    return null;
  }

  return normalized;
}

function isInternalSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+){2,}$/.test(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
