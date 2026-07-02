import Link from "next/link";
import { notFound } from "next/navigation";

import { updateCustomerAction } from "@/app/(admin)/admin/customers/actions";
import { SurfaceCard } from "@/components/premium/surface-card";
import { PageTitle } from "@/components/shared/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAdminCustomerDetail } from "@/lib/admin-customers";
import {
  requestSourceLabel,
  requestStatusLabel,
} from "@/lib/admin-requests";
import { getRequestDisplayNumber } from "@/lib/request-numbers";
import type { Database } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

type DraftRow = Database["public"]["Tables"]["order_drafts"]["Row"];

export const dynamic = "force-dynamic";

type AdminCustomerDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminCustomerDetailPage({
  params,
  searchParams,
}: AdminCustomerDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const customer = await getAdminCustomerDetail(id);

  if (!customer) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <PageTitle
          description="Satış/talep akışındaki müşteri kaydı ve ilgili talep geçmişi. Uygulama kullanıcı onayları /admin/users altında yönetilir."
          title={customer.name}
        />
        <Link className="text-sm font-medium text-primary" href="/admin/customers">
          Müşteri listesine dön
        </Link>
      </div>

      {query.status === "updated" ? (
        <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          Müşteri bilgileri kaydedildi.
        </div>
      ) : null}

      <SurfaceCard>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Müşteri Bilgileri</CardTitle>
            <CustomerStatusBadge isActive={customer.is_active} />
          </div>
        </CardHeader>
        <CardContent>
          <form action={updateCustomerAction} className="grid gap-4">
            <input name="customer_id" type="hidden" value={customer.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ad Soyad">
                <Input defaultValue={customer.name} name="name" required />
              </Field>
              <Field label="Klinik / Firma">
                <Input
                  defaultValue={customer.company_name ?? ""}
                  name="company_name"
                />
              </Field>
              <Field label="Telefon">
                <Input defaultValue={customer.phone ?? ""} name="phone" />
              </Field>
              <Field label="E-posta">
                <Input
                  defaultValue={customer.email ?? ""}
                  name="email"
                  type="email"
                />
              </Field>
            </div>
            <Field label="Notlar">
              <textarea
                className="min-h-28 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
                defaultValue={customer.notes ?? ""}
                name="notes"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                defaultChecked={customer.is_active}
                name="is_active"
                type="checkbox"
              />
              Aktif müşteri
            </label>
            <Button className="w-fit" type="submit">
              Müşteriyi Kaydet
            </Button>
          </form>
        </CardContent>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <CardHeader>
          <CardTitle>İlgili Talepler</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden grid-cols-[0.9fr_0.75fr_0.9fr_0.8fr_0.9fr_0.35fr] gap-3 border-t border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground lg:grid">
            <span>Talep No</span>
            <span>Kaynak</span>
            <span>Durum</span>
            <span>Toplam</span>
            <span>Oluşturma</span>
            <span />
          </div>
          {customer.requests.length ? (
            <div className="divide-y divide-border/60">
              {customer.requests.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))}
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              Bu müşteri için henüz talep bulunmuyor.
            </div>
          )}
        </CardContent>
      </SurfaceCard>
    </div>
  );
}

function RequestRow({ request }: { request: DraftRow }) {
  return (
    <div className="grid gap-4 px-4 py-4 text-sm lg:grid-cols-[0.9fr_0.75fr_0.9fr_0.8fr_0.9fr_0.35fr] lg:items-center">
      <MobileLabel label="Talep No" value={getRequestDisplayNumber(request)} />
      <MobileLabel label="Kaynak" value={requestSourceLabel(request.source)} />
      <div className="flex items-center justify-between gap-3 lg:block">
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground lg:hidden">
          Durum
        </span>
        <RequestStatusBadge status={request.status} />
      </div>
      <MobileLabel label="Toplam" value={formatPrice(request.total)} />
      <MobileLabel label="Oluşturma" value={formatDate(request.created_at)} />
      <Link
        className="text-sm font-medium text-primary"
        href={`/admin/requests/${request.id}`}
      >
        Aç
      </Link>
    </div>
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

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function MobileLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 lg:block">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground lg:hidden">
        {label}
      </span>
      <span className="min-w-0 text-right font-medium lg:text-left">{value}</span>
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
