import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, PackageSearch, Trash2 } from "lucide-react";

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
  type RequestDraft,
  type RequestListItem,
} from "@/lib/order-drafts";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type RequestPageProps = {
  searchParams: Promise<{ status?: string }>;
};

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

  const draft = await getActiveRequestDraft(profile);
  const { status } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <PageTitle
          description="Onaylı JOTA ürünlerini talep listenize ekleyin, miktarları düzenleyin ve talebi WhatsApp üzerinden DENTech Medikal ekibine iletin."
          title="Talep Listem"
        />
        <Link
          className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
          href="/products"
        >
          <PackageSearch data-icon="inline-start" />
          Ürün Kataloğuna Dön
        </Link>
      </div>

      {status ? <RequestStatus status={status} /> : null}

      {!draft || draft.items.length === 0 ? (
        <EmptyRequestList />
      ) : (
        <RequestList draft={draft} />
      )}
    </div>
  );
}

function RequestStatus({ status }: { status: string }) {
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

function EmptyRequestList() {
  return (
    <SurfaceCard>
      <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
          <PackageSearch />
        </div>
        <div className="flex max-w-md flex-col gap-2">
          <h2 className="text-lg font-semibold">
            Talep listenizde henüz ürün yok.
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            JOTA katalogundan ürün seçerek talep listenizi oluşturabilirsiniz.
          </p>
        </div>
        <Link className={cn(buttonVariants())} href="/products">
          JOTA Frezleri Keşfet
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
                  <th className="px-4 py-3 text-right font-medium">
                    Birim Fiyat
                  </th>
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
              Fiyatlar KDV hariçtir. Nihai onay DENTech Medikal tarafından
              WhatsApp üzerinden yapılır.
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

function RequestTableRow({ item }: { item: RequestListItem }) {
  return (
    <tr className="align-top">
      <td className="px-4 py-4">
        <div className="font-medium">{item.product.product_name}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {item.product.product_group_code}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="font-medium">{item.variant.variant_code}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {item.variant.manufacturer_ref ?? "JOTA varyant"}
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
  return (
    <div className="rounded-xl border border-border/70 bg-background/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{item.product.product_name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.variant.variant_code}
          </p>
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
  }).format(value ?? 0)} + KDV Hariç`;
}
