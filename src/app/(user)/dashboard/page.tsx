import Link from "next/link";
import { Clock3, ListChecks, PackageSearch, UserCheck } from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { ProductCard } from "@/components/products/product-card";
import { SurfaceCard } from "@/components/premium/surface-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canViewPrices, requireDashboardAccess } from "@/lib/auth";
import {
  getActiveRequestDraft,
  type RequestDraft,
} from "@/lib/order-drafts";
import { getPricedProductsForProfile } from "@/lib/products";
import { getRequestDisplayNumber } from "@/lib/request-numbers";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type DashboardProfile = Awaited<ReturnType<typeof requireDashboardAccess>>;
type OrderDraftRow = Database["public"]["Tables"]["order_drafts"]["Row"];

type DashboardRequest = Pick<
  OrderDraftRow,
  "created_at" | "id" | "request_number" | "status" | "total"
> & {
  itemCount: number;
};

type RequestStats = {
  cancelled: number;
  completed: number;
  open: number;
  total: number;
};

type DashboardData = {
  activeDraft: RequestDraft | null;
  latestRequests: DashboardRequest[];
  products: Awaited<ReturnType<typeof getPricedProductsForProfile>>["products"];
  stats: RequestStats;
};

export default async function DashboardPage() {
  const profile = await requireDashboardAccess();
  const hasPriceAccess = canViewPrices(profile);
  const accountStatus = getAccountStatus(profile);
  const data = await getDashboardData(profile);
  const priceVisibility = hasPriceAccess ? "approved" : "pending";

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Kullanıcı Paneli"
        description="Hesap durumunuzu, talep geçmişinizi ve aktif JOTA katalog önerilerini takip edin."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Hesap Durumu"
          value={accountStatus.value}
          description={accountStatus.description}
          icon={UserCheck}
        />
        <StatCard
          title="Toplam Talep"
          value={String(data.stats.total)}
          description={
            data.stats.total ? "Kayıtlı talep sayınız" : "Henüz talep yok"
          }
          icon={ListChecks}
        />
        <StatCard
          title="Açık Talep"
          value={String(data.stats.open)}
          description="Taslak, gönderildi veya takipte"
          icon={Clock3}
        />
        <StatCard
          title="Tamamlanan / İptal"
          value={`${data.stats.completed} / ${data.stats.cancelled}`}
          description="Onaylanan ve iptal edilen talepler"
          icon={PackageSearch}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_390px]">
        <div className="flex flex-col gap-5">
          <RequestSummaryCard
            activeDraft={data.activeDraft}
            stats={data.stats}
          />
          <LatestRequestsCard
            canShowTotals={hasPriceAccess}
            requests={data.latestRequests}
          />
        </div>
        <FeaturedProductsCard
          priceVisibility={priceVisibility}
          products={data.products}
        />
      </div>
    </div>
  );
}

async function getDashboardData(profile: DashboardProfile): Promise<DashboardData> {
  try {
    const [activeDraft, requestStats, latestRequests, productResult] =
      await Promise.all([
      getActiveRequestDraft(profile),
      getRequestStats(profile.id),
      getLatestUserRequests(profile.id),
      getPricedProductsForProfile(profile, {
        brand: "JOTA",
        pageSize: 2,
      }),
    ]);

    return {
      activeDraft,
      latestRequests: mergeActiveDraft(activeDraft, latestRequests),
      products: productResult.products,
      stats: requestStats,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[dashboard.data]", error);
    }

    return {
      activeDraft: null,
      latestRequests: [],
      products: [],
      stats: {
        cancelled: 0,
        completed: 0,
        open: 0,
        total: 0,
      },
    };
  }
}

async function getRequestStats(userId: string): Promise<RequestStats> {
  const supabase = getSupabaseAdminClient();
  const [total, open, completed, cancelled] = await Promise.all([
    countUserDrafts(userId),
    countUserDrafts(userId, [
      "draft",
      "submitted",
      "contacted",
      "whatsapp_approval_pending",
      "payment_pending",
      "preparing",
      "shipped",
    ]),
    countUserDrafts(userId, ["confirmed", "completed", "payment_received"]),
    countUserDrafts(userId, ["cancelled"]),
  ]);

  return { cancelled, completed, open, total };

  async function countUserDrafts(
    ownerId: string,
    statuses?: OrderDraftRow["status"][]
  ) {
    let query = supabase
      .from("order_drafts")
      .select("id", { count: "exact", head: true })
      .eq("created_by_user_id", ownerId);

    if (statuses?.length) {
      query = query.in("status", statuses);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return count ?? 0;
  }
}

async function getLatestUserRequests(userId: string): Promise<DashboardRequest[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_drafts")
    .select("created_at,id,request_number,status,total")
    .eq("created_by_user_id", userId)
    .neq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  return attachItemCounts(data ?? []);
}

async function attachItemCounts(
  drafts: Pick<
    OrderDraftRow,
    "created_at" | "id" | "request_number" | "status" | "total"
  >[]
): Promise<DashboardRequest[]> {
  if (!drafts.length) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const draftIds = drafts.map((draft) => draft.id);
  const { data, error } = await supabase
    .from("order_items")
    .select("order_draft_id")
    .in("order_draft_id", draftIds);

  if (error) {
    throw new Error(error.message);
  }

  const counts = new Map<string, number>();
  for (const item of data ?? []) {
    counts.set(item.order_draft_id, (counts.get(item.order_draft_id) ?? 0) + 1);
  }

  return drafts.map((draft) => ({
    ...draft,
    itemCount: counts.get(draft.id) ?? 0,
  }));
}

function mergeActiveDraft(
  activeDraft: RequestDraft | null,
  latestRequests: DashboardRequest[]
) {
  const merged = activeDraft
    ? [
        {
          created_at: activeDraft.created_at,
          id: activeDraft.id,
          itemCount: activeDraft.items.length,
          request_number: activeDraft.request_number,
          status: activeDraft.status,
          total: activeDraft.total,
        },
        ...latestRequests.filter((request) => request.id !== activeDraft.id),
      ]
    : latestRequests;

  return merged.slice(0, 5);
}

function RequestSummaryCard({
  activeDraft,
  stats,
}: {
  activeDraft: RequestDraft | null;
  stats: RequestStats;
}) {
  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle>Talep Özeti</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <SummaryItem label="Aktif Taslak" value={activeDraft ? "Var" : "Yok"} />
        <SummaryItem label="Takipte" value={String(stats.open)} />
        <SummaryItem label="Sonuçlanan" value={String(stats.completed)} />
      </CardContent>
    </SurfaceCard>
  );
}

function LatestRequestsCard({
  canShowTotals,
  requests,
}: {
  canShowTotals: boolean;
  requests: DashboardRequest[];
}) {
  return (
    <SurfaceCard>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Talep Listesi</CardTitle>
        <Link className={buttonVariants({ variant: "outline" })} href="/request">
          Talep Sayfası
        </Link>
      </CardHeader>
      <CardContent>
        {requests.length ? (
          <div className="divide-y divide-border/60">
            {requests.map((request) => (
              <RequestRow
                canShowTotal={canShowTotals}
                key={request.id}
                request={request}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            actionHref="/products"
            actionLabel="Kataloğu İncele"
            description="Henüz talebiniz yok. Katalogdan ürün seçerek ilk talep listenizi oluşturabilirsiniz."
            title="Henüz talebiniz yok"
          />
        )}
      </CardContent>
    </SurfaceCard>
  );
}

function FeaturedProductsCard({
  priceVisibility,
  products,
}: {
  priceVisibility: "approved" | "pending" | "public";
  products: DashboardData["products"];
}) {
  if (!products.length) {
    return (
      <SurfaceCard className="h-fit">
        <CardHeader>
          <CardTitle>Öne Çıkan Ürünler</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            actionHref="/products"
            actionLabel="Kataloğa Git"
            description="Şu anda gösterilecek aktif ürün bulunamadı."
            title="Ürün önerisi yok"
          />
        </CardContent>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard className="h-fit">
      <CardHeader>
        <CardTitle>Öne Çıkan Ürünler</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            priceVisibility={priceVisibility}
          />
        ))}
      </CardContent>
    </SurfaceCard>
  );
}

function RequestRow({
  canShowTotal,
  request,
}: {
  canShowTotal: boolean;
  request: DashboardRequest;
}) {
  return (
    <Link
      className="grid gap-3 py-4 text-sm transition hover:text-primary md:grid-cols-[1fr_0.8fr_0.7fr_0.6fr]"
      href="/request"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{getRequestDisplayNumber(request)}</p>
        <p className="text-xs text-muted-foreground">{formatDate(request.created_at)}</p>
      </div>
      <div>
        <StatusBadge status={request.status} />
      </div>
      <p className="text-muted-foreground">{request.itemCount} kalem</p>
      <p className="font-medium md:text-right">
        {canShowTotal ? formatPrice(request.total) : "Fiyat gizli"}
      </p>
    </Link>
  );
}

function StatusBadge({ status }: { status: OrderDraftRow["status"] }) {
  return (
    <Badge
      className={cn(
        "bg-background/70",
        status === "cancelled"
          ? "border-destructive/30 text-destructive"
          : status === "confirmed" || status === "completed"
            ? "border-primary/25 bg-primary/10 text-primary"
            : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      )}
      variant="outline"
    >
      {requestStatusLabel(status)}
    </Badge>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/60 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

function getAccountStatus(profile: DashboardProfile) {
  if (profile.role === "pending_user") {
    return {
      description: "Hesap inceleme sürecinde",
      value: "Onay Bekliyor",
    };
  }

  if (
    profile.role === "approved_doctor" ||
    profile.role === "approved_lab" ||
    profile.role === "approved_vet"
  ) {
    return {
      description: "Fiyat ve talep erişimi aktif",
      value: "Onaylı / Aktif",
    };
  }

  if (profile.role === "sales_rep") {
    return {
      description: "Saha paneli erişimi aktif",
      value: "Saha Temsilcisi",
    };
  }

  if (profile.role === "admin") {
    return {
      description: "Yönetici erişimi aktif",
      value: "Admin",
    };
  }

  if (profile.role === "suspended_user") {
    return {
      description: "Hesap erişimi durduruldu",
      value: "Askıya Alındı",
    };
  }

  return {
    description: "Hesap durumu profil rolüne göre okunur",
    value: "Aktif",
  };
}

function requestStatusLabel(status: OrderDraftRow["status"]) {
  const labels: Record<OrderDraftRow["status"], string> = {
    cancelled: "İptal",
    completed: "Tamamlandı",
    confirmed: "Onaylandı",
    contacted: "İletişime Geçildi",
    draft: "Taslak",
    payment_pending: "Ödeme Bekliyor",
    payment_received: "Ödeme Alındı",
    preparing: "Hazırlanıyor",
    shipped: "Gönderildi",
    submitted: "Gönderildi",
    whatsapp_approval_pending: "WhatsApp Onayı",
  };

  return labels[status] ?? status;
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
