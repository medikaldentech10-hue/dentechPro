import { Clock3, ListChecks, PackageSearch, UserCheck } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProductCard } from "@/components/products/product-card";
import { PageTitle } from "@/components/shared/page-title";
import { canViewPrices, requireDashboardAccess } from "@/lib/auth";
import { sampleProducts } from "@/lib/constants";

type DashboardProfile = Awaited<ReturnType<typeof requireDashboardAccess>>;

export default async function DashboardPage() {
  const profile = await requireDashboardAccess();
  const accountStatus = getAccountStatus(profile);
  const priceVisibility = canViewPrices(profile) ? "approved" : "pending";

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Kullanıcı Paneli"
        description="Onaylı hesaplar için fiyat görünümü, talep listesi ve JOTA katalog erişimi."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Hesap Durumu"
          value={accountStatus.value}
          description={accountStatus.description}
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
          description="Talep oluşturma, WhatsApp'a gönderme ve müşteri onayı akışı Supabase verisiyle takip edilir."
          icon={ListChecks}
        />
        <ProductCard product={sampleProducts[0]} priceVisibility={priceVisibility} />
      </div>
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
      value: "Onaylı",
    };
  }

  if (profile.role === "sales_rep") {
    return {
      description: "Saha paneli erişimi aktif",
      value: "Saha Yetkili",
    };
  }

  if (profile.role === "admin") {
    return {
      description: "Yönetici erişimi aktif",
      value: "Admin",
    };
  }

  return {
    description: "Hesap durumu profil rolüne göre okunur",
    value: "Aktif",
  };
}
