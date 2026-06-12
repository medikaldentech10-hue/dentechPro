import Link from "next/link";
import { MessageCircle, PackageSearch, Search } from "lucide-react";

import { StatCard } from "@/components/dashboard/stat-card";
import { GlassCard } from "@/components/premium/glass-card";
import { SurfaceCard } from "@/components/premium/surface-card";
import { PageTitle } from "@/components/shared/page-title";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import {
  recentCustomerMeetings,
  salesActions,
} from "@/lib/constants";

export default function SalesPage() {
  const primaryActions = salesActions.slice(0, 4);
  const followUpActions = salesActions.slice(4, 7);
  const meetingsAction = salesActions[7];

  return (
    <div className="flex flex-col gap-6 pb-20 lg:pb-6">
      <PageTitle
        title="Saha Satış Paneli"
        description="Müşteri ziyaretinde hızlı hesap bulma, müşteri adına talep oluşturma ve WhatsApp onayı takibi için admin panelinden ayrı saha operasyon görünümü."
      />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassCard className="bg-[linear-gradient(135deg,rgb(255_255_255/0.86),rgb(20_118_82/0.16))] dark:bg-[linear-gradient(135deg,rgb(255_255_255/0.07),rgb(20_118_82/0.18))]">
          <CardContent className="flex flex-col gap-5 p-5 md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div className="flex flex-col gap-2">
                <StatusBadge label="Ziyaret modu" tone="success" />
                <h2 className="text-2xl font-semibold tracking-normal">
                  Müşteri yanında hızlı talep akışı
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Hesabı bul, JOTA ürünlerini seç, talep listesini müşteriye
                  WhatsApp üzerinden gönder. Gerçek veri ve izinler sonraki
                  Supabase aşamasında bağlanacak.
                </p>
              </div>
              <Link className={buttonVariants()} href="/sales/request">
                <MessageCircle data-icon="inline-start" />
                Müşteri Adına Sipariş
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {primaryActions.map((action) => (
                <ActionTile key={action.title} action={action} />
              ))}
            </div>
          </CardContent>
        </GlassCard>

        <SurfaceCard>
          <CardContent className="flex flex-col gap-4 p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Bugünkü saha odağı</h2>
                <p className="text-sm text-muted-foreground">
                  Temsilci için aksiyon sırası
                </p>
              </div>
              <Search className="text-primary" />
            </div>
            <div className="grid gap-3">
              {followUpActions.map((action, index) => (
                <div
                  key={action.title}
                  className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/58 p-3"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </SurfaceCard>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {followUpActions.map((action) => (
          <StatCard
            key={action.title}
            title={action.title}
            value="Takip"
            description={action.description}
            icon={action.icon}
          />
        ))}
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <SurfaceCard>
          <CardContent className="flex flex-col gap-4 p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">{meetingsAction.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {meetingsAction.description}
                </p>
              </div>
              <StatusBadge label="CRM placeholder" tone="success" />
            </div>
            <div className="grid gap-3">
              {recentCustomerMeetings.map((meeting) => (
                <div
                  key={`${meeting.customer}-${meeting.time}`}
                  className="grid gap-3 rounded-lg border border-border/70 bg-background/58 p-4 md:grid-cols-[1fr_auto]"
                >
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">{meeting.customer}</p>
                    <p className="text-sm text-muted-foreground">
                      {meeting.contact} · {meeting.time}
                    </p>
                    <p className="text-sm leading-6">{meeting.note}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <StatusBadge label={meeting.nextStep} tone="warning" />
                    <Button variant="outline">Takip Notu Aç</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </SurfaceCard>

        <SurfaceCard>
          <CardContent className="flex h-full flex-col justify-between gap-5 p-5 md:p-6">
            <div className="flex flex-col gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                <PackageSearch />
              </div>
              <div>
                <h2 className="font-semibold">Hızlı Ürün Ara</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Müşteri görüşmesinde JOTA kataloğunu açın, ürünü seçin ve
                  talep listesine müşteri adına ekleyin.
                </p>
              </div>
            </div>
            <Link className={buttonVariants({ variant: "outline" })} href="/products">
              JOTA Kataloğunu Aç
            </Link>
          </CardContent>
        </SurfaceCard>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/92 p-3 shadow-[0_-12px_40px_rgb(15_23_42/0.08)] backdrop-blur-xl lg:hidden">
        <Link className={buttonVariants({ className: "w-full" })} href="/sales/request">
          Müşteri Adına Sipariş
        </Link>
      </div>
    </div>
  );
}

function ActionTile({
  action,
}: {
  action: (typeof salesActions)[number];
}) {
  const content = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary shadow-sm">
        <action.icon />
      </span>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="font-semibold">{action.title}</span>
        <span className="text-sm leading-6 text-muted-foreground">
          {action.description}
        </span>
      </span>
    </>
  );
  const className =
    "flex min-h-28 items-start gap-4 rounded-xl border border-border/70 bg-card/64 p-4 text-left shadow-sm backdrop-blur transition hover:border-primary/40 hover:bg-accent/25";

  if (action.title === "Müşteri Adına Sipariş") {
    return (
      <Link className={className} href="/sales/request">
        {content}
      </Link>
    );
  }

  return (
    <button className={className} type="button">
      {content}
    </button>
  );
}
