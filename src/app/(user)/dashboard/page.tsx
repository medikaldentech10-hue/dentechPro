import { Clock3, ListChecks, PackageSearch, UserCheck } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProductCard } from "@/components/products/product-card";
import { PageTitle } from "@/components/shared/page-title";
import { sampleProducts } from "@/lib/constants";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Müşteri Paneli"
        description="Onay durumuna göre fiyat görünümü, talep listesi ve JOTA katalog erişimi için placeholder alan."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Hesap Durumu"
          value="Onay Bekliyor"
          description="pending_user örneği"
          icon={UserCheck}
        />
        <StatCard
          title="Talep Listesi"
          value="0"
          description="Henüz talep yok"
          icon={ListChecks}
        />
        <StatCard
          title="Katalog"
          value="302 varyant"
          description="JOTA Frezler"
          icon={PackageSearch}
        />
        <StatCard
          title="Onay Akışı"
          value="WhatsApp"
          description="Gelecek entegrasyon"
          icon={Clock3}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <DashboardCard
          title="Talep Özeti"
          description="Talep oluşturma, WhatsApp’a gönderme ve müşteri onayı akışı sonraki görevde Supabase verisiyle bağlanacak."
          icon={ListChecks}
        />
        <ProductCard product={sampleProducts[0]} priceVisibility="pending" />
      </div>
    </div>
  );
}
