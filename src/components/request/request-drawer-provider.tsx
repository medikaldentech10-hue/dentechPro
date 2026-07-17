"use client";

import Link from "next/link";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Minus, Plus } from "lucide-react";

import {
  type RequestItemMutationResult,
  updateOrderItemQuantityInlineAction,
} from "@/app/(public)/request/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type OptimisticRequestItem = {
  currency?: string;
  productName: string;
  quantity: number;
  unitPrice?: number | null;
  variantId: string;
  variantLabel?: string | null;
};

type DrawerItem = OptimisticRequestItem & {
  error?: string;
  itemId?: string;
  lineTotal?: number | null;
  status: "adding" | "error" | "ready" | "updating";
};

type ServerDraft = {
  items: Array<{
    currency: string;
    id: string;
    lineTotal: number | null;
    manufacturerRef: string | null;
    productName: string;
    quantity: number;
    unitPrice: number | null;
    variantCode: string | null;
    variantId: string;
  }>;
  subtotal: number | null;
  total: number | null;
};

type AddResult = {
  draft?: ServerDraft;
  error?: string;
  itemId?: string;
  lineTotal?: number;
  quantity?: number;
  success?: boolean;
  unitPrice?: number | null;
};

type RequestDrawerContextValue = {
  beginAdd: (item: OptimisticRequestItem) => number;
  confirmAdd: (token: number, result: AddResult) => void;
  failAdd: (token: number, error?: string) => void;
};

const RequestDrawerContext = createContext<RequestDrawerContextValue | null>(null);

export function RequestDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DrawerItem[]>([]);
  const [addError, setAddError] = useState<string | null>(null);
  const [hasServerSnapshot, setHasServerSnapshot] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [latestVariantId, setLatestVariantId] = useState<string | null>(null);
  const tokenRef = useRef(0);
  const itemsRef = useRef<DrawerItem[]>([]);
  const confirmedItemsRef = useRef<Record<string, DrawerItem>>({});
  const addSnapshotsRef = useRef<Record<number, DrawerItem[]>>({});
  const desiredQuantitiesRef = useRef<Record<string, number>>({});
  const quantityTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout> | undefined>
  >({});
  const quantityInFlightRef = useRef<Record<string, boolean>>({});
  const flushQuantityRef = useRef<(itemId: string) => void>(() => undefined);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(
    () => () => {
      for (const timer of Object.values(quantityTimersRef.current)) {
        if (timer) {
          clearTimeout(timer);
        }
      }
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    },
    []
  );

  const highlightVariant = useCallback((variantId: string) => {
    setLatestVariantId(variantId);
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = setTimeout(() => setLatestVariantId(null), 1800);
  }, []);

  const beginAdd = useCallback(
    (nextItem: OptimisticRequestItem) => {
      const token = tokenRef.current + 1;
      tokenRef.current = token;
      setAddError(null);
      setIsReconciling(true);
      setOpen(true);
      highlightVariant(nextItem.variantId);
      setItems((current) => {
        addSnapshotsRef.current[token] = current.map((item) => ({ ...item }));
        const existingIndex = current.findIndex(
          (item) => item.variantId === nextItem.variantId
        );

        if (existingIndex >= 0) {
          return current.map((item, index) => {
            if (index !== existingIndex) {
              return item;
            }

            const quantity = item.quantity + nextItem.quantity;
            return {
              ...item,
              error: undefined,
              lineTotal:
                typeof item.unitPrice === "number"
                  ? roundCurrency(item.unitPrice * quantity)
                  : item.lineTotal,
              quantity,
              status: "adding",
            };
          });
        }

        return [
          ...current,
          {
            ...nextItem,
            lineTotal:
              typeof nextItem.unitPrice === "number"
                ? roundCurrency(nextItem.unitPrice * nextItem.quantity)
                : null,
            status: "adding",
          },
        ];
      });
      return token;
    },
    [highlightVariant]
  );

  const confirmAdd = useCallback((token: number, result: AddResult) => {
    delete addSnapshotsRef.current[token];
    if (tokenRef.current !== token) {
      return;
    }

    setAddError(null);
    setIsReconciling(false);

    if (!result.draft) {
      setItems((current) =>
        current.map((item) =>
          item.variantId === latestVariantId
            ? {
                ...item,
                itemId: result.itemId ?? item.itemId,
                lineTotal: result.lineTotal ?? item.lineTotal,
                quantity: result.quantity ?? item.quantity,
                status: "ready",
                unitPrice: result.unitPrice ?? item.unitPrice,
              }
            : item
        )
      );
      return;
    }

    setHasServerSnapshot(true);
    setItems((current) => {
      const reconciled = result.draft!.items.map((serverItem) => {
        const optimisticItem = current.find(
          (item) => item.variantId === serverItem.variantId
        );
        return {
          currency: serverItem.currency,
          itemId: serverItem.id,
          lineTotal: serverItem.lineTotal,
          productName: serverItem.productName,
          quantity: serverItem.quantity,
          status: "ready" as const,
          unitPrice: serverItem.unitPrice,
          variantId: serverItem.variantId,
          variantLabel:
            getDisplayCode(serverItem.variantCode) ??
            getDisplayCode(serverItem.manufacturerRef) ??
            optimisticItem?.variantLabel,
        };
      });
      confirmedItemsRef.current = Object.fromEntries(
        reconciled.map((item) => [item.itemId, { ...item }])
      );
      for (const item of reconciled) {
        desiredQuantitiesRef.current[item.itemId] = item.quantity;
      }
      return reconciled;
    });
  }, [latestVariantId]);

  const failAdd = useCallback((token: number, error?: string) => {
    const snapshot = addSnapshotsRef.current[token];
    delete addSnapshotsRef.current[token];
    if (tokenRef.current !== token) {
      return;
    }

    setItems(snapshot ?? []);
    setIsReconciling(false);
    setAddError(error ?? "Ürün talep listesine eklenemedi.");
  }, []);

  const flushQuantity = useCallback(async (itemId: string) => {
    const current = itemsRef.current.find((item) => item.itemId === itemId);
    const desiredQuantity = desiredQuantitiesRef.current[itemId];

    if (!current || quantityInFlightRef.current[itemId] || !desiredQuantity) {
      return;
    }

    quantityInFlightRef.current[itemId] = true;
    const sentQuantity = desiredQuantity;
    const result = await updateOrderItemQuantityInlineAction({
      itemId,
      quantity: sentQuantity,
    });
    quantityInFlightRef.current[itemId] = false;

    if (!result.success) {
      const confirmed = confirmedItemsRef.current[itemId];
      if (confirmed) {
        desiredQuantitiesRef.current[itemId] = confirmed.quantity;
        setItems((currentItems) =>
          currentItems.map((item) =>
            item.itemId === itemId
              ? {
                  ...confirmed,
                  error: result.error ?? "Adet güncellenemedi.",
                  status: "error",
                }
              : item
          )
        );
      }
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.itemId !== itemId) {
          return item;
        }

        const confirmed = applyQuantityResult(item, result);
        confirmedItemsRef.current[itemId] = confirmed;
        return desiredQuantitiesRef.current[itemId] === sentQuantity
          ? confirmed
          : {
              ...confirmed,
              lineTotal:
                typeof confirmed.unitPrice === "number"
                  ? roundCurrency(
                      confirmed.unitPrice * desiredQuantitiesRef.current[itemId]
                    )
                  : confirmed.lineTotal,
              quantity: desiredQuantitiesRef.current[itemId],
              status: "updating",
            };
      })
    );

    if (desiredQuantitiesRef.current[itemId] !== sentQuantity) {
      queueMicrotask(() => flushQuantityRef.current(itemId));
    }
  }, []);

  useEffect(() => {
    flushQuantityRef.current = (itemId) => void flushQuantity(itemId);
  }, [flushQuantity]);

  const changeQuantity = (itemId: string, nextQuantity: number) => {
    if (nextQuantity < 1) {
      return;
    }

    desiredQuantitiesRef.current[itemId] = nextQuantity;
    setItems((current) =>
      current.map((item) =>
        item.itemId === itemId
          ? {
              ...item,
              error: undefined,
              lineTotal:
                typeof item.unitPrice === "number"
                  ? roundCurrency(item.unitPrice * nextQuantity)
                  : item.lineTotal,
              quantity: nextQuantity,
              status: "updating",
            }
          : item
      )
    );

    const timer = quantityTimersRef.current[itemId];
    if (timer) {
      clearTimeout(timer);
    }
    quantityTimersRef.current[itemId] = setTimeout(
      () => void flushQuantity(itemId),
      320
    );
  };

  return (
    <RequestDrawerContext.Provider value={{ beginAdd, confirmAdd, failAdd }}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md" side="right">
          <SheetHeader className="border-b border-border/70 p-5 pr-12">
            <SheetTitle>Talep Listem</SheetTitle>
            <SheetDescription>
              {isReconciling && !hasServerSnapshot ? "En az " : ""}
              {items.length} ürün kalemi
              {isReconciling ? " · Talep listeniz güncelleniyor..." : ""}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {addError ? (
              <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                {addError}
              </p>
            ) : null}

            {items.map((item) => (
              <div
                className={cn(
                  "rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm transition-colors",
                  item.variantId === latestVariantId &&
                    "border-primary/40 bg-primary/5 ring-2 ring-primary/10"
                )}
                key={item.itemId ?? `optimistic:${item.variantId}`}
              >
                <div className="min-w-0">
                  <p className="font-semibold leading-6">{item.productName}</p>
                  {item.variantLabel ? (
                    <p className="mt-1 text-xs text-muted-foreground">{item.variantLabel}</p>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      aria-label="Adet azalt"
                      disabled={!item.itemId || item.quantity <= 1 || item.status === "adding"}
                      onClick={() =>
                        item.itemId && changeQuantity(item.itemId, item.quantity - 1)
                      }
                      size="icon"
                      variant="outline"
                    >
                      <Minus />
                    </Button>
                    <span className="min-w-8 text-center font-semibold">{item.quantity}</span>
                    <Button
                      aria-label="Adet artır"
                      disabled={!item.itemId || item.status === "adding"}
                      onClick={() =>
                        item.itemId && changeQuantity(item.itemId, item.quantity + 1)
                      }
                      size="icon"
                      variant="outline"
                    >
                      <Plus />
                    </Button>
                  </div>
                  {typeof item.unitPrice === "number" ? (
                    <div className="text-right text-sm">
                      <p className="text-xs text-muted-foreground">Birim fiyat</p>
                      <p className="font-medium">
                        {formatPrice(item.unitPrice, item.currency)}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4 text-sm">
                  <span className="text-muted-foreground">
                    {item.status === "adding" || item.status === "updating"
                      ? "Güncelleniyor..."
                      : "Ara toplam"}
                  </span>
                  {typeof item.lineTotal === "number" ? (
                    <span className="font-semibold">
                      {formatPrice(item.lineTotal, item.currency)}
                    </span>
                  ) : null}
                </div>

                {item.error ? (
                  <p className="mt-3 text-sm font-medium text-destructive">{item.error}</p>
                ) : null}
              </div>
            ))}

            {!items.length && !isReconciling && hasServerSnapshot ? (
              <p className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                Talep listenizde henüz ürün yok.
              </p>
            ) : null}
          </div>

          <SheetFooter className="border-t border-border/70 p-5">
            <Link
              className={cn(buttonVariants(), "h-10 w-full")}
              href="/request"
              onClick={() => setOpen(false)}
            >
              Talep Listesine Git
            </Link>
            <Button className="h-10 w-full" onClick={() => setOpen(false)} variant="outline">
              Alışverişe Devam Et
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </RequestDrawerContext.Provider>
  );
}

export function useRequestDrawer() {
  const value = useContext(RequestDrawerContext);

  if (!value) {
    throw new Error("useRequestDrawer must be used inside RequestDrawerProvider.");
  }

  return value;
}

function applyQuantityResult(item: DrawerItem, result: RequestItemMutationResult): DrawerItem {
  return {
    ...item,
    error: undefined,
    lineTotal: result.lineTotal ?? item.lineTotal,
    quantity: result.quantity ?? item.quantity,
    status: "ready",
    unitPrice: result.unitPrice ?? item.unitPrice,
  };
}

function getDisplayCode(value: string | null) {
  const trimmed = value?.trim();

  if (!trimmed || isUuid(trimmed)) {
    return null;
  }

  return trimmed;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function formatPrice(value: number, currency = "TRY") {
  return `${new Intl.NumberFormat("tr-TR", { currency, style: "currency" }).format(value)} + KDV`;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
