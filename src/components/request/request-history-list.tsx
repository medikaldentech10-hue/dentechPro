"use client";

import { Eye, ReceiptText, XCircle } from "lucide-react";

import { cancelCustomerRequestAction } from "@/app/(public)/request/actions";
import { PendingSubmitButton } from "@/components/shared/pending-submit-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { customerPaymentPreferenceLabel } from "@/lib/customer-request-preferences";
import { getRequestStatusLabel, isCustomerCancellableStatus } from "@/lib/request-status";
import { cn } from "@/lib/utils";

type RequestHistoryListProps = {
  drafts: RequestHistoryDraft[];
  showPrices: boolean;
};

type RequestHistoryDraft = {
  created_at: string;
  customer_note: string | null;
  customer_payment_preference:
    | "bank_transfer"
    | "credit_card_link"
    | "cash"
    | "discuss_later"
    | null;
  id: string;
  items: RequestHistoryItem[];
  request_number: string | null;
  status: string;
  total: number | null;
};

type RequestHistoryItem = {
  id: string;
  line_total: number | null;
  quantity: number;
  unit_price: number | null;
  product: {
    product_group_code: string;
    product_name: string;
  };
  variant: {
    manufacturer_ref: string | null;
    variant_code: string | null;
  };
};

export function RequestHistoryList({
  drafts,
  showPrices,
}: RequestHistoryListProps) {
  return (
    <div className="grid gap-3">
      {drafts.map((draft) => (
        <div
          className="rounded-2xl border border-border/70 bg-background/70 p-4 shadow-sm"
          key={draft.id}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold">{getVisibleRequestNumber(draft)}</p>
                <Badge className="rounded-full" variant="outline">
                  {getRequestStatusLabel(draft.status)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{formatDate(draft.created_at)}</span>
                <span>{draft.items.length} ürün kalemi</span>
                {draft.customer_payment_preference ? (
                  <span>
                    {customerPaymentPreferenceLabel(draft.customer_payment_preference)}
                  </span>
                ) : null}
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {draft.items
                  .map((item) => item.product.product_name)
                  .filter(Boolean)
                  .join(", ") || "Ürün kalemi bulunmuyor."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              {showPrices ? (
                <div className="mr-1 text-right">
                  <p className="text-xs text-muted-foreground">Genel Toplam</p>
                  <p className="text-sm font-semibold">{formatPrice(draft.total)}</p>
                </div>
              ) : null}

              <RequestHistoryDetailSheet draft={draft} showPrices={showPrices} />

              {isCustomerCancellableStatus(draft.status) ? (
                <form action={cancelCustomerRequestAction}>
                  <input name="request_id" type="hidden" value={draft.id} />
                  <PendingSubmitButton
                    className="gap-1.5"
                    onClick={(event) => {
                      if (
                        !window.confirm(
                          "Bu talebi iptal etmek istediğinize emin misiniz?"
                        )
                      ) {
                        event.preventDefault();
                      }
                    }}
                    pendingLabel="İptal ediliyor..."
                    size="sm"
                    type="submit"
                    variant="outline"
                  >
                    <XCircle data-icon="inline-start" />
                    İptal Et
                  </PendingSubmitButton>
                </form>
              ) : (
                <p className="max-w-sm text-sm leading-5 text-muted-foreground">
                  Bu talep işleme alındığı için iptal için DENTech Medikal ile iletişime geçin.
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RequestHistoryDetailSheet({
  draft,
  showPrices,
}: {
  draft: RequestHistoryDraft;
  showPrices: boolean;
}) {
  const paymentPreference = customerPaymentPreferenceLabel(
    draft.customer_payment_preference
  );
  const customerNote = draft.customer_note?.trim();

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            type="button"
          >
            <Eye data-icon="inline-start" />
            Detay
          </button>
        }
      />
      <SheetContent
        side="right"
        className="w-[min(720px,calc(100vw-16px))] overflow-hidden border-border/70 bg-background/98 p-0 sm:max-w-[720px]"
      >
        <SheetHeader className="border-b border-border/70 p-5 pr-12">
          <SheetTitle>{getVisibleRequestNumber(draft)}</SheetTitle>
          <SheetDescription>
            {getRequestStatusLabel(draft.status)} · {formatDate(draft.created_at)}
          </SheetDescription>
        </SheetHeader>

        <div className="flex h-full flex-col overflow-hidden">
          <div className="grid gap-4 overflow-y-auto p-5">
            <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:grid-cols-2">
              <DetailRow label="Durum" value={getRequestStatusLabel(draft.status)} />
              <DetailRow label="Oluşturma" value={formatDate(draft.created_at)} />
              <DetailRow label="Ürün Kalemi" value={`${draft.items.length}`} />
              {paymentPreference ? (
                <DetailRow label="Ödeme Tercihi" value={paymentPreference} />
              ) : null}
              {showPrices ? (
                <DetailRow label="Genel Toplam" value={formatPrice(draft.total)} />
              ) : null}
            </div>

            {customerNote ? (
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <p className="text-sm font-medium">Talep Notu</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {customerNote}
                </p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-border/70 bg-background">
              <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
                <ReceiptText className="size-4 text-primary" />
                <p className="text-sm font-medium">Ürün Kalemleri</p>
              </div>
              <div className="divide-y divide-border/70">
                {draft.items.map((item) => {
                  const displayCode =
                    getDisplayCode(item.variant.variant_code) ??
                    getDisplayCode(item.variant.manufacturer_ref) ??
                    getDisplayCode(item.product.product_group_code);

                  return (
                    <div
                      className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                      key={item.id}
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{item.product.product_name}</p>
                        {displayCode ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {displayCode}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-sm sm:text-right">
                        <p className="font-medium">{item.quantity} adet</p>
                        {showPrices ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatCompactLine(item.unit_price, item.line_total)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function getVisibleRequestNumber(request: {
  id: string;
  request_number: string | null;
}) {
  const requestNumber = request.request_number?.trim();
  return requestNumber || "Talep Kaydı";
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

function formatPrice(value: number | null) {
  return `${new Intl.NumberFormat("tr-TR", {
    currency: "TRY",
    style: "currency",
  }).format(value ?? 0)} + KDV`;
}

function formatCompactLine(unitPrice: number | null, lineTotal: number | null) {
  return `${formatPrice(unitPrice)} / ${formatPrice(lineTotal)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
