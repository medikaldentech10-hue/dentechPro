import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Eye, FileDown, XCircle } from "lucide-react";

import { updateRequestStatusAction } from "@/app/(admin)/admin/requests/actions";
import { ConfirmSubmitButton } from "@/components/admin/confirm-submit-button";
import { SurfaceCard } from "@/components/premium/surface-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  adminRequestStatuses,
  ADMIN_REQUESTS_PAGE_SIZE,
  getAdminRequestList,
  requestSourceLabel,
  requestStatusLabel,
  type AdminRequestListFilters,
  type AdminRequestListItem,
} from "@/lib/admin-requests";
import { getRequestDisplayNumber } from "@/lib/request-numbers";
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
  const result = await getAdminRequestList(filters);
  const requests = result.rows;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        description="Web, saha ve admin kaynaklı talep taslaklarını izleyin ve durumlarını yönetin."
        title="Talepler"
      />

      <RequestFilters filters={filters} />

      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Toplam {result.totalCount} talep içinde sayfa {result.page} / {result.totalPages}
          <span className="ml-1 hidden sm:inline">· Sayfa boyutu {ADMIN_REQUESTS_PAGE_SIZE}</span>
        </p>
        <AdminRequestsPagination
          currentPage={result.page}
          filters={filters}
          totalPages={result.totalPages}
        />
      </div>

      <SurfaceCard className="overflow-hidden">
        <CardContent className="p-0">
          <div className="hidden grid-cols-[1.15fr_0.65fr_0.8fr_0.7fr_0.65fr_0.75fr_0.9fr_0.9fr_0.55fr] gap-3 border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground xl:grid">
            <span>Müşteri / Kullanıcı</span>
            <span>Kaynak</span>
            <span>Durum</span>
            <span>Toplam</span>
            <span>Kalem</span>
            <span>Oluşturan</span>
            <span>Oluşturma</span>
            <span>Güncelleme</span>
            <span className="text-right">Aksiyonlar</span>
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
          <input name="page" type="hidden" value="1" />
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
  const quoteHref = `/admin/requests/${request.id}/quote`;

  return (
    <div className="relative grid gap-4 px-4 py-4 text-sm transition hover:bg-muted/45 xl:grid-cols-[1.35fr_0.65fr_0.8fr_0.7fr_0.55fr_0.75fr_0.85fr_0.85fr_0.55fr] xl:items-center">
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
      <div className="relative z-10 xl:justify-self-end">
        <RequestQuickActions
          detailHref={detailHref}
          quoteHref={quoteHref}
          request={request}
        />
      </div>
    </div>
  );
}

function RequestQuickActions({
  detailHref,
  quoteHref,
  request,
}: {
  detailHref: string;
  quoteHref: string;
  request: AdminRequestListItem;
}) {
  const canCancel = isCancellableStatus(request.status);

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Link
        aria-label="Görüntüle"
        className={buttonVariants({ size: "icon-sm", variant: "outline" })}
        href={detailHref}
        title="Görüntüle"
      >
        <Eye />
      </Link>
      <a
        aria-label="PDF indir"
        className={buttonVariants({ size: "icon-sm", variant: "outline" })}
        href={quoteHref}
        title="PDF indir"
      >
        <FileDown />
      </a>
      {canCancel ? (
        <form action={updateRequestStatusAction} className="contents">
          <input name="request_id" type="hidden" value={request.id} />
          <input name="status" type="hidden" value="cancelled" />
          <ConfirmSubmitButton
            aria-label="İptal et"
            confirmMessage="Bu talebi iptal etmek istediğinize emin misiniz?"
            size="icon-sm"
            title="İptal et"
          >
            <XCircle />
          </ConfirmSubmitButton>
        </form>
      ) : null}
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
        Talep: {getRequestDisplayNumber(request)}
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

function isCancellableStatus(status: string) {
  return status !== "cancelled";
}

function parseRequestFilters(
  query: Record<string, string | string[] | undefined>
): AdminRequestListFilters {
  return {
    createdFrom: getDateParam(query.from),
    createdTo: getDateParam(query.to),
    page: getPageParam(query.page),
    search: getStringParam(query.q),
    sort: getSortParam(query.sort),
    source: getSourceParam(query.source),
    status: getStatusParam(query.status),
  };
}

function AdminRequestsPagination({
  currentPage,
  filters,
  totalPages,
}: {
  currentPage: number;
  filters: AdminRequestListFilters;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <nav
      aria-label="Talep sayfalama"
      className="flex flex-wrap items-center justify-between gap-2 sm:justify-end"
    >
      <PaginationArrowLink
        direction="previous"
        disabled={currentPage <= 1}
        href={getRequestPageHref(filters, currentPage - 1)}
      />
      <div className="hidden items-center gap-1 sm:flex">
        {visiblePages.map((page, index) => {
          const previousPage = visiblePages[index - 1];
          const hasGap = previousPage ? page - previousPage > 1 : false;

          return (
            <span className="flex items-center gap-1" key={page}>
              {hasGap ? (
                <span className="px-1 text-xs text-muted-foreground" aria-hidden="true">
                  ...
                </span>
              ) : null}
              <Link
                aria-current={page === currentPage ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    size: "sm",
                    variant: page === currentPage ? "default" : "outline",
                  }),
                  "min-w-9 px-3"
                )}
                href={getRequestPageHref(filters, page)}
              >
                {page}
              </Link>
            </span>
          );
        })}
      </div>
      <span className="text-xs text-muted-foreground sm:hidden">
        Sayfa {currentPage} / {totalPages}
      </span>
      <PaginationArrowLink
        direction="next"
        disabled={currentPage >= totalPages}
        href={getRequestPageHref(filters, currentPage + 1)}
      />
    </nav>
  );
}

function PaginationArrowLink({
  direction,
  disabled,
  href,
}: {
  direction: "next" | "previous";
  disabled: boolean;
  href: string;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(buttonVariants({ size: "icon-sm", variant: "outline" }), "opacity-45")}
      >
        <Icon />
      </span>
    );
  }

  return (
    <Link
      className={buttonVariants({ size: "icon-sm", variant: "outline" })}
      href={href}
    >
      <Icon />
    </Link>
  );
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

  if (item === "oldest" || item === "updated_newest" || item === "total_desc") {
    return item;
  }

  return "newest";
}

function getPageParam(value: string | string[] | undefined) {
  const item = getStringParam(value);
  const parsed = Number(item);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function getRequestPageHref(filters: AdminRequestListFilters, page: number) {
  const params = new URLSearchParams();

  if (filters.search) params.set("q", filters.search);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.source && filters.source !== "all") params.set("source", filters.source);
  if (filters.createdFrom) params.set("from", filters.createdFrom);
  if (filters.createdTo) params.set("to", filters.createdTo);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  params.set("page", String(Math.max(1, page)));

  return `/admin/requests?${params.toString()}`;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages]);

  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}
