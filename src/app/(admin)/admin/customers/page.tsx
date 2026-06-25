import Link from "next/link";
import { Eye } from "lucide-react";

import { SurfaceCard } from "@/components/premium/surface-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getAdminCustomerList,
  type AdminCustomerFilters,
  type AdminCustomerListItem,
} from "@/lib/admin-customers";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AdminCustomersPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AdminCustomersPage({
  searchParams,
}: AdminCustomersPageProps) {
  const params = await searchParams;
  const filters: AdminCustomerFilters = {
    search: params.q,
  };
  const customers = await getAdminCustomerList(filters);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        description="Saha ve admin talep akışlarında kullanılan ayrı müşteri kayıtlarını yönetin. Kayıtlı uygulama kullanıcıları /admin/users altında izlenir."
        title="Müşteriler"
      />

      <SurfaceCard>
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <Input
              defaultValue={filters.search}
              name="q"
              placeholder="Ad, klinik/firma, telefon veya e-posta ara"
            />
            <Button type="submit">Ara</Button>
            <Link
              className="inline-flex h-8 items-center justify-center rounded-lg border border-input px-3 text-sm font-medium transition hover:bg-muted"
              href="/admin/customers"
            >
              Temizle
            </Link>
          </form>
        </CardContent>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <CardContent className="p-0">
          <div className="hidden grid-cols-[1.1fr_1fr_0.75fr_1fr_0.6fr_0.8fr_0.9fr_0.35fr] gap-3 border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground xl:grid">
            <span>Ad Soyad</span>
            <span>Klinik / Firma</span>
            <span>Telefon</span>
            <span>E-posta</span>
            <span>Durum</span>
            <span>Son Talep</span>
            <span>Oluşturma</span>
            <span />
          </div>

          {customers.length ? (
            <div className="divide-y divide-border/60">
              {customers.map((customer) => (
                <CustomerRow customer={customer} key={customer.id} />
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                actionHref={filters.search ? "/admin/customers" : "/admin/users"}
                actionLabel={filters.search ? "Filtreleri Temizle" : "Kullanıcıları Aç"}
                description={
                  filters.search
                    ? "Seçili arama ile eşleşen manuel müşteri kaydı bulunamadı."
                    : "Henüz manuel müşteri kaydı yok. Kayıtlı uygulama kullanıcıları için /admin/users ekranını kullanın."
                }
                title={
                  filters.search
                    ? "Müşteri bulunamadı"
                    : "Manuel müşteri kaydı yok"
                }
              />
            </div>
          )}
        </CardContent>
      </SurfaceCard>
    </div>
  );
}

function CustomerRow({ customer }: { customer: AdminCustomerListItem }) {
  return (
    <div className="grid gap-4 px-4 py-4 text-sm xl:grid-cols-[1.1fr_1fr_0.75fr_1fr_0.6fr_0.8fr_0.9fr_0.35fr] xl:items-center">
      <MobileLabel label="Ad Soyad" value={customer.name} />
      <MobileLabel label="Klinik / Firma" value={customer.company_name ?? "-"} />
      <MobileLabel label="Telefon" value={customer.phone ?? "-"} />
      <MobileLabel label="E-posta" value={customer.email ?? "-"} />
      <div className="flex items-center justify-between gap-3 xl:block">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground xl:hidden">
          Durum
        </span>
        <CustomerStatusBadge isActive={customer.is_active} />
      </div>
      <MobileLabel
        label="Son Talep"
        value={customer.lastRequestDate ? formatDate(customer.lastRequestDate) : "-"}
      />
      <MobileLabel label="Oluşturma" value={formatDate(customer.created_at)} />
      <Link
        aria-label={`${customer.name} detayını aç`}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        href={`/admin/customers/${customer.id}`}
      >
        <Eye />
      </Link>
    </div>
  );
}

function CustomerStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      className={cn(
        "bg-background/70",
        isActive
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-muted-foreground/30 bg-muted text-muted-foreground"
      )}
      variant="outline"
    >
      {isActive ? "Aktif" : "Pasif"}
    </Badge>
  );
}

function MobileLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 xl:block">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground xl:hidden">
        {label}
      </span>
      <span className="min-w-0 text-right font-medium xl:text-left">{value}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
