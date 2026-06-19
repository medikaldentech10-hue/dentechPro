import Link from "next/link";
import { notFound } from "next/navigation";
import { FileDown, MessageCircle } from "lucide-react";

import {
  updateRequestPaymentInfoAction,
  updateRequestStatusAction,
} from "@/app/(admin)/admin/requests/actions";
import { AdminRequestCopyButton } from "@/components/admin/admin-request-whatsapp-actions";
import { SurfaceCard } from "@/components/premium/surface-card";
import { PageTitle } from "@/components/shared/page-title";
import { Button, buttonVariants } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminPaymentMethods,
  adminRequestStatuses,
  buildAdminRequestWhatsAppMessage,
  buildAdminRequestWhatsAppUrl,
  getAdminRequestDetail,
  paymentMethodLabel,
  requestSourceLabel,
  requestStatusLabel,
  type AdminRequestDetail,
  type AdminRequestLine,
} from "@/lib/admin-requests";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AdminRequestDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string; status?: string }>;
};

export default async function AdminRequestDetailPage({
  params,
  searchParams,
}: AdminRequestDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const request = await getAdminRequestDetail(id);

  if (!request) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PageTitle
          description={`${requestSourceLabel(request.source)} kaynaklı talep detayı ve durum yönetimi.`}
          title="Talep Detayı"
        />
        <Link
          className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
          href="/admin/requests"
        >
          Taleplere Dön
        </Link>
      </div>

      {query.status === "updated" ? (
        <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          Talep durumu güncellendi.
        </div>
      ) : null}

      {query.payment === "updated" ? (
        <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
          Ödeme takip bilgisi kaydedildi.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          <RequestParties request={request} />
          <RequestLines request={request} />
          <PaymentSection request={request} />
        </div>
        <RequestSummary request={request} />
      </div>
    </div>
  );
}

function RequestParties({ request }: { request: AdminRequestDetail }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SurfaceCard>
        <CardHeader>
          <CardTitle>Müşteri Bilgisi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <Info label="Ad / Ünvan" value={request.customer?.name} />
          <Info label="Firma" value={request.customer?.company_name} />
          <Info label="Tip" value={request.customer?.customer_type} />
          <Info label="Telefon" value={request.customer?.phone} />
          <Info label="E-posta" value={request.customer?.email} />
          <Info
            label="Konum"
            value={[request.customer?.city, request.customer?.district]
              .filter(Boolean)
              .join(" / ")}
          />
        </CardContent>
      </SurfaceCard>

      <SurfaceCard>
        <CardHeader>
          <CardTitle>Talep Sahibi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <Info label="Oluşturan" value={request.requester?.full_name} />
          <Info label="E-posta" value={request.requester?.email} />
          <Info label="Telefon" value={request.requester?.phone} />
          <Info label="Rol" value={request.requester?.role} />
          <Info label="Saha Temsilcisi" value={request.salesRep?.full_name} />
          <Info label="Temsilci E-posta" value={request.salesRep?.email} />
        </CardContent>
      </SurfaceCard>
    </div>
  );
}

function PaymentSection({ request }: { request: AdminRequestDetail }) {
  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle>Ödeme Takibi</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-3 rounded-xl border border-border/70 bg-background/60 p-4 text-sm md:grid-cols-2">
          <Info
            label="Yöntem"
            value={paymentMethodLabel(request.paymentInfo.method)}
          />
          <Info label="Referans" value={request.paymentInfo.reference || null} />
          <Info
            label="Güncelleme"
            value={
              request.paymentInfo.updated_at
                ? formatDate(request.paymentInfo.updated_at)
                : null
            }
          />
          <Info label="Talep Notu" value={request.requestNote} />
        </div>

        {request.paymentInfo.note ? (
          <div className="rounded-xl border border-border/70 bg-background/60 p-4 text-sm">
            <p className="mb-2 font-medium">Kayıtlı Ödeme Notu</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {request.paymentInfo.note}
            </p>
          </div>
        ) : null}

        <form action={updateRequestPaymentInfoAction} className="grid gap-4">
          <input name="request_id" type="hidden" value={request.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Ödeme Yöntemi
              <select
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                defaultValue={request.paymentInfo.method ?? "iban"}
                name="payment_method"
              >
                {adminPaymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {paymentMethodLabel(method)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Referans
              <input
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                defaultValue={request.paymentInfo.reference}
                maxLength={160}
                name="payment_reference"
                placeholder="Dekont / POS / görüşme referansı"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-medium">
            Ödeme Notu
            <textarea
              className="min-h-28 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              defaultValue={request.paymentInfo.note}
              maxLength={1000}
              name="payment_note"
              placeholder="IBAN paylaşıldı, POS link gönderildi, ödeme bekleniyor..."
            />
          </label>
          <Button className="w-fit" type="submit">
            Ödeme Bilgisini Kaydet
          </Button>
        </form>
      </CardContent>
    </SurfaceCard>
  );
}

function RequestLines({ request }: { request: AdminRequestDetail }) {
  return (
    <SurfaceCard className="overflow-hidden">
      <CardHeader>
        <CardTitle>Ürün Kalemleri</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="hidden grid-cols-[1.2fr_0.9fr_0.45fr_0.75fr_0.75fr] gap-3 border-t border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground md:grid">
          <span>Ürün</span>
          <span>Varyant</span>
          <span>Adet</span>
          <span className="text-right">Birim Fiyat</span>
          <span className="text-right">Ara Toplam</span>
        </div>
        <div className="divide-y divide-border/60">
          {request.items.length ? (
            request.items.map((item) => <RequestLineRow item={item} key={item.id} />)
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              Bu talepte ürün kalemi bulunmuyor.
            </div>
          )}
        </div>
      </CardContent>
    </SurfaceCard>
  );
}

function RequestLineRow({ item }: { item: AdminRequestLine }) {
  return (
    <div className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1.2fr_0.9fr_0.45fr_0.75fr_0.75fr] md:items-center">
      <MobileLabel
        label="Ürün"
        value={
          <div className="flex flex-col gap-1">
            <span className="font-semibold">
              {item.product?.product_name ?? "Ürün"}
            </span>
            <span className="text-xs text-muted-foreground">
              {item.product?.product_group_code ?? "-"}
            </span>
          </div>
        }
      />
      <MobileLabel
        label="Varyant"
        value={
          <div className="flex flex-col gap-1">
            <span className="font-medium">
              {item.variant?.variant_code ?? "-"}
            </span>
            <span className="text-xs text-muted-foreground">
              {item.variant?.manufacturer_ref ?? "JOTA varyant"}
            </span>
          </div>
        }
      />
      <MobileLabel label="Adet" value={`${item.quantity}`} />
      <MobileLabel label="Birim Fiyat" value={formatPrice(item.unit_price)} alignEnd />
      <MobileLabel label="Ara Toplam" value={formatPrice(item.line_total)} alignEnd />
    </div>
  );
}

function RequestSummary({ request }: { request: AdminRequestDetail }) {
  const whatsAppMessage = buildAdminRequestWhatsAppMessage(request);
  const whatsAppUrl = buildAdminRequestWhatsAppUrl(request);

  return (
    <SurfaceCard className="h-fit lg:sticky lg:top-24">
      <CardHeader>
        <CardTitle>Durum ve Özet</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-xl border border-border/70 bg-background/60 p-4">
          <Info label="Kaynak" value={requestSourceLabel(request.source)} />
          <Info label="Mevcut Durum" value={requestStatusLabel(request.status)} />
          <Info label="Oluşturma" value={formatDate(request.created_at)} />
          <Info label="Güncelleme" value={formatDate(request.updated_at)} />
        </div>

        <form action={updateRequestStatusAction} className="flex flex-col gap-2">
          <input name="request_id" type="hidden" value={request.id} />
          <label className="text-sm font-medium" htmlFor="status">
            Durum
          </label>
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            defaultValue={normalizeStatusForSelect(request.status)}
            id="status"
            name="status"
          >
            {adminRequestStatuses.map((status) => (
              <option key={status} value={status}>
                {requestStatusLabel(status)}
              </option>
            ))}
          </select>
          <Button className="mt-2" type="submit">
            Durumu Güncelle
          </Button>
        </form>

        <div className="grid gap-2">
          <a
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            href={`/admin/requests/${request.id}/quote`}
          >
            <FileDown data-icon="inline-start" />
            PDF Teklif İndir
          </a>
          <a
            className={cn(buttonVariants(), "w-full")}
            href={whatsAppUrl}
            rel="noreferrer"
            target="_blank"
          >
            <MessageCircle data-icon="inline-start" />
            WhatsApp Mesajını Aç
          </a>
          <AdminRequestCopyButton message={whatsAppMessage} />
        </div>

        <div className="rounded-xl border border-border/70 bg-background/60 p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Kalem</span>
            <span>{request.items.length}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>Ara Toplam</span>
            <span>{formatPrice(request.subtotal)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>İndirim</span>
            <span>{formatPrice(request.discount_total)}</span>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-4 text-base font-semibold">
            <span>Toplam</span>
            <span>{formatPrice(request.total)}</span>
          </div>
        </div>
      </CardContent>
    </SurfaceCard>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "-"}</span>
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
    <div className={cn("flex items-center justify-between gap-3 md:block")}>
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

function normalizeStatusForSelect(status: string) {
  if (status === "whatsapp_approval_pending") {
    return "submitted";
  }

  if (status === "payment_received" || status === "completed") {
    return "confirmed";
  }

  if (status === "preparing" || status === "shipped") {
    return "contacted";
  }

  return adminRequestStatuses.includes(status as (typeof adminRequestStatuses)[number])
    ? status
    : "draft";
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
