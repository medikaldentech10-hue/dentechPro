import Link from "next/link";
import {
  AlertTriangle,
  PackageSearch,
  ShoppingBag,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { SurfaceCard } from "@/components/premium/surface-card";
import { PageTitle } from "@/components/shared/page-title";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAdminDashboardSummary,
  type AdminDashboardLowStockVariant,
  type AdminDashboardRequest,
} from "@/lib/admin-dashboard";
import { requestStatusLabel } from "@/lib/admin-requests";
import { getRequestDisplayNumber } from "@/lib/request-numbers";
import type { Profile } from "@/lib/types/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const summary = await getAdminDashboardSummary();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <PageTitle
          description="Kullanıcı onayları, katalog, stok, talep ve müşteri sağlığını tek ekrandan izleyin."
          title="Admin Paneli"
        />
        <div className="flex flex-wrap gap-2">
          <AdminLink href="/admin/users">Kullanıcılar</AdminLink>
          <AdminLink href="/admin/requests">Talepler</AdminLink>
          <AdminLink href="/admin/customers">Müşteriler</AdminLink>
          <AdminLink href="/admin/search-logs">Arama Logları</AdminLink>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/admin/users">
          <StatCard
            description="Onay bekleyen kayıtlar"
            icon={UserCheck}
            title="Bekleyen Kullanıcı"
            value={formatNumber(summary.pendingUsersCount)}
          />
        </Link>
        <Link href="/admin/products">
          <StatCard
            description="Yayında olan ürün grupları"
            icon={PackageSearch}
            title="Aktif Ürün"
            value={formatNumber(summary.activeProductsCount)}
          />
        </Link>
        <Link href="/admin/products">
          <StatCard
            description="Stok adedi 5 veya altı"
            icon={AlertTriangle}
            title="Düşük Stok Varyant"
            value={formatNumber(summary.lowStockVariantsCount)}
          />
        </Link>
        <Link href="/admin/requests?status=submitted">
          <StatCard
            description="Gönderildi, iletişimde veya ödeme bekliyor"
            icon={ShoppingBag}
            title="Açık Talep"
            value={formatNumber(summary.openRequestsCount)}
          />
        </Link>
        <Link href="/admin/requests?status=confirmed">
          <StatCard
            description="Bu ay onaylanan talepler"
            icon={Wallet}
            title="Aylık Onaylı Tutar"
            value={formatPrice(summary.confirmedMonthTotal)}
          />
        </Link>
        <Link href="/admin/customers">
          <StatCard
            description="Kayıtlı müşteri hesapları"
            icon={Users}
            title="Müşteri"
            value={formatNumber(summary.customersCount)}
          />
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <LatestRequestsCard requests={summary.latestRequests} />
        <LowStockCard variants={summary.lowStockVariants} />
        <PendingUsersCard users={summary.latestPendingUsers} />
      </div>
    </div>
  );
}

function LatestRequestsCard({ requests }: { requests: AdminDashboardRequest[] }) {
  return (
    <SurfaceCard>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Son Talepler</CardTitle>
        <AdminLink href="/admin/requests">Tümü</AdminLink>
      </CardHeader>
      <CardContent className="grid gap-3">
        {requests.length ? (
          requests.map((request) => {
            const customerName =
              request.customer?.company_name ||
              request.customer?.name ||
              "Müşteri bilgisi yok";

            return (
              <Link
                className="rounded-xl border border-border/70 bg-background/60 p-3 transition hover:bg-muted/60"
                href={`/admin/requests/${request.id}`}
                key={request.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{customerName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getRequestDisplayNumber(request)}
                    </p>
                  </div>
                  <RequestStatusBadge status={request.status} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{formatPrice(request.total)}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(request.created_at)}
                  </span>
                </div>
              </Link>
            );
          })
        ) : (
          <EmptyListText>Henüz talep bulunmuyor.</EmptyListText>
        )}
      </CardContent>
    </SurfaceCard>
  );
}

function LowStockCard({
  variants,
}: {
  variants: AdminDashboardLowStockVariant[];
}) {
  return (
    <SurfaceCard>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Düşük Stok</CardTitle>
        <AdminLink href="/admin/products">Ürünler</AdminLink>
      </CardHeader>
      <CardContent className="grid gap-3">
        {variants.length ? (
          variants.map((variant) => {
            const sku = getVisibleCode(variant.variant_code);
            const fallbackCode = getVisibleCode(variant.manufacturer_ref);

            return (
              <Link
                className="rounded-xl border border-border/70 bg-background/60 p-3 transition hover:bg-muted/60"
                href={
                  variant.product?.id
                    ? `/admin/products/${variant.product.id}`
                    : "/admin/products"
                }
                key={variant.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {variant.product?.product_name ?? "Ürün adı yok"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {variant.product?.brand ? <span>{variant.product.brand}</span> : null}
                      {sku ? <span>SKU: {sku}</span> : null}
                      {!sku && fallbackCode ? <span>Kod: {fallbackCode}</span> : null}
                    </div>
                  </div>
                  <Badge
                    className="border-destructive/30 bg-destructive/10 text-destructive"
                    variant="outline"
                  >
                    {variant.stock_quantity}
                  </Badge>
                </div>
              </Link>
            );
          })
        ) : (
          <EmptyListText>Düşük stok varyantı bulunmuyor.</EmptyListText>
        )}
      </CardContent>
    </SurfaceCard>
  );
}

function PendingUsersCard({ users }: { users: Profile[] }) {
  return (
    <SurfaceCard>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Bekleyen Kullanıcılar</CardTitle>
        <AdminLink href="/admin/users">Onaylar</AdminLink>
      </CardHeader>
      <CardContent className="grid gap-3">
        {users.length ? (
          users.map((user) => (
            <Link
              className="rounded-xl border border-border/70 bg-background/60 p-3 transition hover:bg-muted/60"
              href="/admin/users"
              key={user.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {user.full_name || user.email || "İsimsiz kullanıcı"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email ?? "-"}
                  </p>
                </div>
                <Badge
                  className="border-primary/25 bg-primary/10 text-primary"
                  variant="outline"
                >
                  Bekliyor
                </Badge>
              </div>
            </Link>
          ))
        ) : (
          <EmptyListText>Bekleyen kullanıcı yok.</EmptyListText>
        )}
      </CardContent>
    </SurfaceCard>
  );
}

function AdminLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link className="text-sm font-medium text-primary hover:underline" href={href}>
      {children}
    </Link>
  );
}

function RequestStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={cn(
        "bg-background/70",
        status === "cancelled"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-primary/25 bg-primary/10 text-primary"
      )}
      variant="outline"
    >
      {requestStatusLabel(status)}
    </Badge>
  );
}

function EmptyListText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function getVisibleCode(value: string | null | undefined) {
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    currency: "TRY",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}
