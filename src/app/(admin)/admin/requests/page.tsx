import Link from "next/link";
import type { ReactNode } from "react";
import { Eye } from "lucide-react";

import { SurfaceCard } from "@/components/premium/surface-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  adminRequestStatuses,
  getAdminRequestList,
  requestSourceLabel,
  requestStatusLabel,
  type AdminRequestListFilters,
  type AdminRequestListItem,
} from "@/lib/admin-requests";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AdminRequestsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const sourceFilters: Array<
  Database["public"]["Tables"]["order_drafts"]["Row"]["source"]
> = ["web", "sales", "admin"];

export default async function AdminRequestsPage({
  searchParams,
}: AdminRequestsPageProps) {
  const query = await searchParams;
  const filters = parseRequestFilters(query);
  const requests = await getAdminRequestList(filters);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        description="Web, saha ve admin kaynaklı talep taslaklarını izleyin ve durumlarını yönetin."
        title="Talepler"
      />

      <RequestFilters filters={filters} />

      <SurfaceCard className="overflow-hidden">
        <CardContent className="p-0">
          <div className="hidden grid-cols-[1.15fr_0.65fr_0.8fr_0.7fr_0.65fr_0.75fr_0.9fr_0.9fr_0.35fr] gap-3 border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground xl:grid">
            <span>Müşteri / Kullanıcı</span>
            <span>Kaynak</span>
            <span>Durum</span>
            <span>Toplam</span>
            <span>Kalem</span>
            <span>Oluşturan</span>
            <span>Oluşturma</span>
            <span>Güncelleme</span>
            <span />
          </div>

          {requests.length ? (
            <div className="divide-y divide-border/60">
              {requests.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                actionHref="/admin/requests"
                actionLabel="Filtreleri Temizle"
                description="Henüz talep taslağı bulunmuyor. Web veya saha akışından oluşturulan talepler burada listelenir."
                title="Talep bulunamadı"
              />
            </div>
          )}
        </CardContent>
      </SurfaceCard>
    </div>
  );
}

function RequestFilters({ filters }: { filters: AdminRequestListFilters }) {
  return (
    <SurfaceCard>
      <CardContent className="p-4">
        <form className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr_auto] lg:items-end">
          <label className="grid gap-2 text-sm font-medium">
            Ara
            <input
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue={filters.search ?? ""}
              name="q"
              placeholder="Müşteri, telefon, e-posta, talep no"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Durum
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue={filters.status ?? "all"}
              name="status"
            >
              <option value="all">Tümü</option>
              {adminRequestStatuses.map((status) => (
                <option key={status} value={status}>
                  {requestStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Kaynak
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue={filters.source ?? "all"}
              name="source"
            >
              <option value="all">Tümü</option>
              {sourceFilters.map((source) => (
                <option key={source} value={source}>
                  {requestSourceLabel(source)}
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

          <label className="grid gap-2 text-sm font-medium">
            Sıralama
            <select
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              defaultValue={filters.sort ?? "newest"}
              name="sort"
            >
              <option value="newest">En yeni</option>
              <option value="oldest">En eski</option>
              <option value="updated_newest">Güncellenen en yeni</option>
              <option value="total_desc">Toplam yüksek-düşük</option>
            </select>
          </label>

          <div className="flex gap-2">
            <button className={buttonVariants()} type="submit">
              Filtrele
            </button>
            <Link
              className={buttonVariants({ variant: "outline" })}
              href="/admin/requests"
            >
              Temizle
            </Link>
          </div>
        </form>
      </CardContent>
    </SurfaceCard>
  );
}

function RequestRow({ request }: { request: AdminRequestListItem }) {
  const detailHref = `/admin/requests/${request.id}`;

  return (
    <div className="relative grid gap-4 px-4 py-4 text-sm transition hover:bg-muted/45 xl:grid-cols-[1.35fr_0.65fr_0.8fr_0.7fr_0.55fr_0.75fr_0.85fr_0.85fr_0.35fr] xl:items-center">
      <Link
        aria-label="Talep detayını aç"
        className="absolute inset-0 z-0"
        href={detailHref}
      />
      <MobileLabel label="Müşteri" value={<RequestIdentity request={request} />} />
      <MobileLabel label="Kaynak" value={requestSourceLabel(request.source)} />
      <div className="relative z-10 flex items-center justify-between gap-3 xl:block">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground xl:hidden">
          Durum
        </span>
        <RequestStatusBadge status={request.status} />
      </div>
      <MobileLabel label="Toplam" value={formatPrice(request.total)} />
      <MobileLabel label="Kalem" value={`${request.itemCount}`} />
      <MobileLabel label="Oluşturan" value={request.requester?.full_name ?? "-"} />
      <MobileLabel label="Oluşturma" value={formatDate(request.created_at)} />
      <MobileLabel label="Güncelleme" value={formatDate(request.updated_at)} />
      <span className="relative z-10 inline-flex size-9 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground">
        <Eye />
      </span>
    </div>
  );
}

function RequestIdentity({ request }: { request: AdminRequestListItem }) {
  const companyName = request.customer?.company_name?.trim();
  const customerName = request.customer?.name?.trim();
  const fallbackName =
    request.requester?.full_name?.trim() || request.requester?.email?.trim() || "-";
  const primary = companyName || customerName || fallbackName;
  const secondary =
    companyName && customerName && companyName !== customerName ? customerName : null;
  const contact = [request.customer?.phone, request.customer?.email]
    .filter(Boolean)
    .join(" · ");

  return (
    <span className="block min-w-0 text-right xl:text-left">
      <span className="block truncate font-semibold text-foreground">{primary}</span>
      {secondary ? (
        <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
          {secondary}
        </span>
      ) : null}
      {contact ? (
        <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
          {contact}
        </span>
      ) : null}
      <span className="mt-0.5 block truncate text-[11px] font-normal text-muted-foreground/75">
        Talep: {request.id.slice(0, 8)}
      </span>
    </span>
  );
}

function RequestStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={cn(
        "bg-background/70",
        (status === "draft" || status === "contacted") &&
          "border-primary/25 bg-accent/70 text-primary",
        (status === "submitted" || status === "whatsapp_approval_pending") &&
          "border-primary/25 bg-primary/10 text-primary",
        (status === "payment_pending" || status === "confirmed") &&
          "border-primary/25 bg-primary/10 text-primary",
        status === "cancelled" &&
          "border-destructive/30 bg-destructive/10 text-destructive"
      )}
      variant="outline"
    >
      {requestStatusLabel(status)}
    </Badge>
  );
}

function MobileLabel({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="relative z-10 flex items-center justify-between gap-3 xl:block">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground xl:hidden">
        {label}
      </span>
      <span className="min-w-0 text-right font-medium xl:text-left">{value}</span>
    </div>
  );
}

function formatPrice(value: number | null) {
  return new Intl.NumberFormat("tr-TR", {
    currency: "TRY",
    style: "currency",
  }).format(value ?? 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function parseRequestFilters(
  query: Record<string, string | string[] | undefined>
): AdminRequestListFilters {
  return {
    createdFrom: getDateParam(query.from),
    createdTo: getDateParam(query.to),
    search: getStringParam(query.q),
    sort: getSortParam(query.sort),
    source: getSourceParam(query.source),
    status: getStatusParam(query.status),
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

function getStatusParam(
  value: string | string[] | undefined
): AdminRequestListFilters["status"] {
  const item = getStringParam(value);

  if (!item || item === "all") {
    return "all";
  }

  return adminRequestStatuses.includes(
    item as (typeof adminRequestStatuses)[number]
  )
    ? (item as (typeof adminRequestStatuses)[number])
    : "all";
}

function getSourceParam(
  value: string | string[] | undefined
): AdminRequestListFilters["source"] {
  const item = getStringParam(value);

  if (!item || item === "all") {
    return "all";
  }

  return sourceFilters.includes(item as (typeof sourceFilters)[number])
    ? (item as (typeof sourceFilters)[number])
    : "all";
}

function getSortParam(
  value: string | string[] | undefined
): AdminRequestListFilters["sort"] {
  const item = getStringParam(value);

  if (
    item === "oldest" ||
    item === "updated_newest" ||
    item === "total_desc"
  ) {
    return item;
  }

  return "newest";
}
