import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Clock3, PackageSearch, Search } from "lucide-react";

import { RequestDraftClient } from "@/components/request/request-draft-client";
import { RequestHistoryList } from "@/components/request/request-history-list";
import { SurfaceCard } from "@/components/premium/surface-card";
import { PageTitle } from "@/components/shared/page-title";
import { Button, buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { getCurrentRoutingProfile, isSuspendedUser } from "@/lib/auth";
import {
  canCreateOrderRequest,
  getActiveRequestDraft,
  getUserRequestHistory,
  type RequestDraft,
  type RequestHistoryFilters,
} from "@/lib/order-drafts";
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
  const [profile, query] = await Promise.all([getCurrentRoutingProfile(), searchParams]);

  if (!profile) {
    redirect("/login");
  }

  if (isSuspendedUser(profile)) {
    redirect("/account-suspended");
  }

  if (!canCreateOrderRequest(profile)) {
    redirect("/pending-approval");
  }

  const filters = parseHistoryFilters(query);
  const draft = await getActiveRequestDraft(profile);
  const error = getStringParam(query.error);
  const status = getStringParam(query.status);
  const showPrices = Boolean(profile.can_view_prices);

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

      {status || error ? (
        <RequestFeedbackBanner error={error} status={status} />
      ) : null}
      <RequestFlowSummary />

      <section className="rounded-3xl border border-primary/12 bg-primary/[0.035] p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-background/85 px-3 py-1 text-xs font-medium text-primary shadow-sm">
              <Clock3 className="size-3.5" />
              Aktif Taslak
            </span>
            <h2 className="text-xl font-semibold tracking-normal">Aktif Talep</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Listeyi düzenleyip talebinizi göndermeden önce ürünlerinizi burada son kez kontrol edin.
            </p>
          </div>
          {!draft || draft.items.length === 0 ? (
            <EmptyRequestList />
          ) : (
            <RequestList draft={draft} />
          )}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-muted/[0.18] p-4 sm:p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-normal">Geçmiş Taleplerim</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Gönderdiğiniz talepleri, notlarınızı ve süreç durumlarını buradan takip edebilirsiniz.
          </p>
        </div>
        <RequestHistoryFilters filters={filters} />
        <Suspense fallback={<RequestHistorySkeleton />}>
          <RequestHistorySection
            filters={filters}
            profile={profile}
            showPrices={showPrices}
          />
        </Suspense>
      </section>
    </div>
  );
}

async function RequestHistorySection({
  filters,
  profile,
  showPrices,
}: {
  filters: RequestHistoryFilters;
  profile: NonNullable<Awaited<ReturnType<typeof getCurrentRoutingProfile>>>;
  showPrices: boolean;
}) {
  const history = await getUserRequestHistory(profile, filters);

  if (!history.length) {
    return <RequestHistoryEmptyState />;
  }

  return <RequestHistoryList drafts={history} showPrices={showPrices} />;
}

function RequestStatusBanner({ status }: { status: string }) {
  const messages: Record<string, string> = {
    added: "Ürün talep listesine eklendi.",
    cancelled: "Talep iptal edildi.",
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

function RequestFeedbackBanner({
  error,
  status,
}: {
  error?: string;
  status?: string;
}) {
  if (error === "item_rate_limited") {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
        Çok kısa sürede fazla işlem yapıldı. Lütfen birkaç saniye sonra tekrar deneyin.
      </div>
    );
  }

  if (error === "submit_rate_limited") {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
        Güvenlik nedeniyle kısa süre içinde tekrar talep gönderemezsiniz. Lütfen biraz sonra tekrar deneyin.
      </div>
    );
  }

  if (error === "submit_daily_limit") {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
        Günlük talep limitine ulaştınız. Acil durumlar için DENTech Medikal ile iletişime geçin.
      </div>
    );
  }

  if (!status) {
    return null;
  }

  return <RequestStatusBanner status={status} />;
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
            Burası doğrudan ödeme ekranı değil; ürünleri seçip ekibimize teklif talebi ilettiğiniz profesyonel talep alanıdır.
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
            Katalogdan ürün seçerek talep listenizi oluşturabilirsiniz. Ekibimiz talebiniz sonrası sizinle iletişime geçecektir.
          </p>
        </div>
        <Link className={cn(buttonVariants())} href="/products">
          Kataloğu İncele
        </Link>
      </CardContent>
    </SurfaceCard>
  );
}

function RequestHistoryEmptyState() {
  return (
    <SurfaceCard>
      <CardContent className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="font-medium">Henüz geçmiş talebiniz bulunmuyor.</p>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          Gönderdiğiniz talepler burada listelenir. Talep oluşturduktan sonra durumunu ve detaylarını bu alandan takip edebilirsiniz.
        </p>
      </CardContent>
    </SurfaceCard>
  );
}

function RequestHistorySkeleton() {
  return (
    <SurfaceCard>
      <CardContent className="grid gap-3 p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <Clock3 className="size-3.5" />
          Geçmiş talepler yükleniyor
        </div>
        {Array.from({ length: 2 }, (_, index) => (
          <div
            className="rounded-2xl border border-border/60 bg-background/75 p-3 shadow-sm"
            key={index}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-36 animate-pulse rounded bg-muted" />
                <div className="h-3.5 w-52 animate-pulse rounded bg-muted/75" />
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 animate-pulse rounded-lg bg-muted/75" />
                <div className="h-8 w-24 animate-pulse rounded-lg bg-muted/60" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </SurfaceCard>
  );
}

function RequestList({ draft }: { draft: RequestDraft }) {
  return <RequestDraftClient draft={draft} />;
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
          <div className="flex flex-wrap gap-2">
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
