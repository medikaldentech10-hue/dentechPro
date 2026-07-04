import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, PackageSearch, Search, Trash2 } from "lucide-react";

import {
  clearOrderDraftAction,
  removeOrderItemAction,
  submitOrderDraftToWhatsAppAction,
  updateOrderItemQuantityAction,
} from "@/app/(public)/request/actions";
import { SurfaceCard } from "@/components/premium/surface-card";
import { PageTitle } from "@/components/shared/page-title";
import { Button, buttonVariants } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile, isSuspendedUser } from "@/lib/auth";
import {
  canCreateOrderRequest,
  getActiveRequestDraft,
  getUserRequestHistory,
  type RequestDraft,
  type RequestHistoryFilters,
  type RequestListItem,
} from "@/lib/order-drafts";
import { getRequestDisplayNumber } from "@/lib/request-numbers";
import { getRequestStatusLabel } from "@/lib/request-status";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type RequestPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type RequestStatus = Database["public"]["Tables"]["order_drafts"]["Row"]["status"];

const historyStatusOptions: Array<{
  label: string;
  value: RequestStatus | "all";
}> = [
  { label: "Tümü", value: "all" },
  { label: "Gönderildi", value: "submitted" },
  { label: "İletişime Geçildi", value: "contacted" },
  { label: "Ödeme Bekliyor", value: "payment_pending" },
  { label: "Onaylandı", value: "confirmed" },
  { label: "İptal Edildi", value: "cancelled" },
];

export default async function RequestPage({ searchParams }: RequestPageProps) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (isSuspendedUser(profile)) {
    redirect("/account-suspended");
  }

  if (!canCreateOrderRequest(profile)) {
    redirect("/pending-approval");
  }

  const query = await searchParams;
  const filters = parseHistoryFilters(query);
  const [draft, history] = await Promise.all([
    getActiveRequestDraft(profile),
    getUserRequestHistory(profile, filters),
  ]);
  const status = getStringParam(query.status);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PageTitle
          title="Talep Listem"
          description="İncelediğiniz ürünleri talep listenize ekleyin, miktarları düzenleyin ve teklif sürecini başlatın."
        />
        <Link
          className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
          href="/products"
        >
          <PackageSearch data-icon="inline-start" />
          Kataloğa Dön
        </Link>
      </div>

      {status ? <RequestStatusBanner status={status} /> : null}
      <RequestFlowSummary />

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-normal">Aktif Talep</h2>
        {!draft || draft.items.length === 0 ? (
          <EmptyRequestList />
        ) : (
          <RequestList draft={draft} />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-normal">Talep Geçmişi</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Gönderdiğiniz taleplerin durumunu ve son hareketlerini buradan takip
            edebilirsiniz.
          </p>
        </div>
        <RequestHistoryFilters filters={filters} />
        {history.length ? (
          <RequestHistoryList drafts={history} />
        ) : (
          <SurfaceCard>
            <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="font-medium">Filtrelerle eşleşen talep bulunamadı.</p>
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                Gönderilmiş talepleriniz oluştuğunda burada listelenir.
              </p>
              <Link
                className={cn(buttonVariants({ variant: "outline" }), "mt-2")}
                href="/request"
              >
                Filtreleri Temizle
              </Link>
            </CardContent>
          </SurfaceCard>
        )}
      </section>
    </div>
  );
}

function RequestStatusBanner({ status }: { status: string }) {
  const messages: Record<string, string> = {
    added: "Ürün talep listesine eklendi.",
    cleared: "Talep listesi temizlendi.",
    removed: "Ürün talep listesinden çıkarıldı.",
    updated: "Adet güncellendi.",
  };

  const message = messages[status];

  if (!message) {
    return null;
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
      {message}
    </div>
  );
}

function RequestFlowSummary() {
  const steps = [
    "Ürün ekleyin",
    "Listeyi kontrol edin",
    "Talebi gönderin",
    "Ekibimiz sizinle iletişime geçsin",
  ];

  return (
    <SurfaceCard>
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Talep akışı</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Burası doğrudan ödeme ekranı değil; ürünleri seçip ekibimize teklif
            talebi ilettiğiniz profesyonel talep alanıdır.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {steps.map((step, index) => (
            <span
              className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary"
              key={step}
            >
              {index + 1}. {step}
            </span>
          ))}
        </div>
      </CardContent>
    </SurfaceCard>
  );
}

function EmptyRequestList() {
  return (
    <SurfaceCard>
      <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
          <PackageSearch />
        </div>
        <div className="flex max-w-md flex-col gap-2">
          <h2 className="text-lg font-semibold">Talep listenizde henüz ürün yok.</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Katalogdan ürün seçerek talep listenizi oluşturabilirsiniz. Ekibimiz
            talebiniz sonrası sizinle iletişime geçecektir.
          </p>
        </div>
        <Link className={cn(buttonVariants())} href="/products">
          Kataloğu İncele
        </Link>
      </CardContent>
    </SurfaceCard>
  );
}

function RequestList({ draft }: { draft: RequestDraft }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <SurfaceCard>
        <CardHeader>
          <CardTitle>Ürünler</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
                {draft.items.map((item) => (
                  <RequestTableRow item={item} key={item.id} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-border/70 p-4 md:hidden">
            {draft.items.map((item) => (
              <RequestMobileCard item={item} key={item.id} />
            ))}
          </div>
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
              <span>{draft.items.length}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
              <span>Ara toplam</span>
              <span>{formatPrice(draft.subtotal)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4 text-base font-semibold">
              <span>Toplam</span>
              <span>{formatPrice(draft.total)}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Fiyatlar KDV hariçtir. Talep gönderildikten sonra ekibimiz stok,
              fiyat ve süreç detaylarıyla sizinle iletişime geçer.
            </p>
          </div>
          <form action={submitOrderDraftToWhatsAppAction}>
            <Button className="w-full" type="submit">
              <MessageCircle data-icon="inline-start" />
              Talebi WhatsApp ile Gönder
            </Button>
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

function RequestHistoryFilters({
  filters,
}: {
  filters: RequestHistoryFilters;
}) {
  return (
    <SurfaceCard>
      <CardContent className="p-4">
        <form className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_auto] md:items-end">
          <label className="grid gap-2 text-sm font-medium">
            Ara
            <span className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="h-10 w-full rounded-lg border border-input bg-background px-3 pl-9 text-sm"
                defaultValue={filters.query ?? ""}
                name="q"
                placeholder="Talep no, ürün veya SKU"
              />
            </span>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Durum
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue={filters.status ?? "all"}
              name="history_status"
            >
              {historyStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Başlangıç
            <input
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue={filters.createdFrom ?? ""}
              name="from"
              type="date"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Bitiş
            <input
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue={filters.createdTo ?? ""}
              name="to"
              type="date"
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit">Filtrele</Button>
            <Link
              className={buttonVariants({ variant: "outline" })}
              href="/request"
            >
              Temizle
            </Link>
          </div>
        </form>
      </CardContent>
    </SurfaceCard>
  );
}

function RequestHistoryList({ drafts }: { drafts: RequestDraft[] }) {
  return (
    <SurfaceCard className="overflow-hidden">
      <CardContent className="p-0">
        <div className="hidden grid-cols-[1fr_0.75fr_0.65fr_0.75fr_0.75fr] gap-3 border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground md:grid">
          <span>Talep</span>
          <span>Durum</span>
          <span>Kalem</span>
          <span className="text-right">Toplam</span>
          <span className="text-right">Güncelleme</span>
        </div>
        <div className="divide-y divide-border/60">
          {drafts.map((draft) => (
            <RequestHistoryRow draft={draft} key={draft.id} />
          ))}
        </div>
      </CardContent>
    </SurfaceCard>
  );
}

function RequestHistoryRow({ draft }: { draft: RequestDraft }) {
  return (
    <div className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1fr_0.75fr_0.65fr_0.75fr_0.75fr] md:items-center">
      <MobileLabel
        label="Talep"
        value={
          <div>
            <p className="font-medium">{getRequestDisplayNumber(draft)}</p>
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {draft.items
                .map((item) => item.product.product_name)
                .filter(Boolean)
                .join(", ") || "Ürün kalemi yok"}
            </p>
          </div>
        }
      />
      <MobileLabel label="Durum" value={getRequestStatusLabel(draft.status)} />
      <MobileLabel label="Kalem" value={`${draft.items.length}`} />
      <MobileLabel label="Toplam" value={formatPrice(draft.total)} alignEnd />
      <MobileLabel label="Güncelleme" value={formatDate(draft.updated_at)} alignEnd />
    </div>
  );
}

function RequestTableRow({ item }: { item: RequestListItem }) {
  const productCode = getDisplayCode(item.product.product_group_code);
  const variantCode = getDisplayCode(item.variant.variant_code);
  const manufacturerRef = getDisplayCode(item.variant.manufacturer_ref);

  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <div className="font-medium">{item.product.product_name}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {productCode ?? "SKU yok"}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="font-medium">{variantCode ?? "Standart varyant"}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {manufacturerRef ?? "Teknik kod gizlendi"}
        </div>
      </td>
      <td className="px-4 py-4">
        <QuantityForm item={item} />
      </td>
      <td className="px-4 py-4 text-right font-medium">
        {formatPrice(item.unit_price)}
      </td>
      <td className="px-4 py-4 text-right font-semibold">
        {formatPrice(item.line_total)}
      </td>
      <td className="px-4 py-4">
        <RemoveItemForm itemId={item.id} />
      </td>
    </tr>
  );
}

function RequestMobileCard({ item }: { item: RequestListItem }) {
  const productCode = getDisplayCode(item.product.product_group_code);
  const variantCode = getDisplayCode(item.variant.variant_code);

  return (
    <div className="rounded-xl border border-border/70 bg-background/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{item.product.product_name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {variantCode ?? "Standart varyant"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{productCode ?? "SKU yok"}</p>
        </div>
        <RemoveItemForm itemId={item.id} />
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
        <QuantityForm item={item} />
      </div>
    </div>
  );
}

function MobileLabel({
  alignEnd = false,
  label,
  value,
}: {
  alignEnd?: boolean;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 md:block">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground md:hidden">
        {label}
      </span>
      <div
        className={cn(
          "min-w-0 text-right font-medium md:text-left",
          alignEnd && "md:text-right"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function QuantityForm({ item }: { item: RequestListItem }) {
  return (
    <form
      action={updateOrderItemQuantityAction}
      className="flex max-w-[170px] items-center gap-2"
    >
      <input name="item_id" type="hidden" value={item.id} />
      <input
        aria-label="Adet"
        className="h-9 w-20 rounded-lg border border-input bg-background px-3 text-sm"
        defaultValue={item.quantity}
        min={1}
        name="quantity"
        step={1}
        type="number"
      />
      <Button size="sm" type="submit" variant="outline">
        Güncelle
      </Button>
    </form>
  );
}

function RemoveItemForm({ itemId }: { itemId: string }) {
  return (
    <form action={removeOrderItemAction}>
      <input name="item_id" type="hidden" value={itemId} />
      <Button aria-label="Listeden çıkar" size="icon" type="submit" variant="ghost">
        <Trash2 />
      </Button>
    </form>
  );
}

function formatPrice(value: number | null) {
  return `${new Intl.NumberFormat("tr-TR", {
    currency: "TRY",
    style: "currency",
  }).format(value ?? 0)} + KDV`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function parseHistoryFilters(
  query: Record<string, string | string[] | undefined>
): RequestHistoryFilters {
  return {
    createdFrom: getDateParam(query.from),
    createdTo: getDateParam(query.to),
    query: getStringParam(query.q),
    status: getHistoryStatusParam(query.history_status),
  };
}

function getStringParam(value: string | string[] | undefined) {
  const item = Array.isArray(value) ? value[0] : value;
  const trimmed = item?.trim();
  return trimmed || undefined;
}

function getDateParam(value: string | string[] | undefined) {
  const item = getStringParam(value);
  return item && /^\d{4}-\d{2}-\d{2}$/.test(item) ? item : undefined;
}

function getHistoryStatusParam(
  value: string | string[] | undefined
): RequestHistoryFilters["status"] {
  const item = getStringParam(value);

  if (!item || item === "all") {
    return "all";
  }

  return historyStatusOptions.some((option) => option.value === item)
    ? (item as RequestStatus)
    : "all";
}

function getDisplayCode(value: string | null | undefined) {
  if (!value || isUuid(value) || isInternalSlug(value)) {
    return null;
  }

  return value;
}

function isInternalSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+){2,}$/.test(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
