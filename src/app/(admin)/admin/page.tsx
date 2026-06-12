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
import { requestSourceLabel, requestStatusLabel } from "@/lib/admin-requests";
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
          requests.map((request) => (
            <Link
              className="rounded-xl border border-border/70 bg-background/60 p-3 transition hover:bg-muted/60"
              href={`/admin/requests/${request.id}`}
              key={request.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {request.customer?.company_name ||
                      request.customer?.name ||
                      request.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {requestSourceLabel(request.source)} · {formatDate(request.created_at)}
                  </p>
                </div>
                <RequestStatusBadge status={request.status} />
              </div>
              <p className="mt-2 text-sm font-medium">{formatPrice(request.total)}</p>
            </Link>
          ))
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
          variants.map((variant) => (
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
                    {variant.product?.product_name ?? variant.variant_code}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {variant.variant_code}
                    {variant.manufacturer_ref
                      ? ` · ${variant.manufacturer_ref}`
                      : ""}
                  </p>
                </div>
                <Badge
                  className="border-destructive/30 bg-destructive/10 text-destructive"
                  variant="outline"
                >
                  {variant.stock_quantity}
                </Badge>
              </div>
            </Link>
          ))
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
