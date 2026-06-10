import Link from "next/link";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { SurfaceCard } from "@/components/premium/surface-card";
import { ProductCard } from "@/components/products/product-card";
import { PageTitle } from "@/components/shared/page-title";
import { buttonVariants } from "@/components/ui/button";
import { adminActions, sampleProducts } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Admin Paneli"
        description="Kullanıcı onayları, ürün/varyant/fiyat/stok yönetimi ve audit log için ayrı yönetim mimarisi placeholder’ı."
      />
      <div className="flex justify-end">
        <Link href="/admin/users" className={cn(buttonVariants())}>
          Kullanıcı Onaylarına Git
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Kullanıcı Onayları"
          value="Bekleyen"
          description="Role approval placeholder"
          icon={adminActions[0].icon}
        />
        <StatCard
          title="JOTA Katalog"
          value="302 varyant"
          description="Ürün yönetimi placeholder"
          icon={adminActions[1].icon}
        />
        <StatCard
          title="Audit Log"
          value="Hazır"
          description="İzleme mimarisi"
          icon={adminActions[6].icon}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminActions.map((action) => (
          <DashboardCard key={action.title} {...action} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <SurfaceCard className="overflow-hidden">
          <div className="grid grid-cols-3 border-b border-border/70 px-4 py-3 text-sm font-medium text-muted-foreground">
            <span>Alan</span>
            <span>Durum</span>
            <span>Not</span>
          </div>
          {adminActions.map((action) => (
            <div
              key={action.title}
              className="grid grid-cols-3 border-b border-border/50 px-4 py-3 text-sm last:border-b-0"
            >
              <span className="font-medium">{action.title}</span>
              <span>Placeholder</span>
              <span className="text-muted-foreground">{action.description}</span>
            </div>
          ))}
        </SurfaceCard>
        <ProductCard
          product={sampleProducts[4]}
          priceVisibility="approved"
          adminMode
        />
      </div>
    </div>
  );
}
