import { PremiumCard } from "@/components/premium/premium-card";
import { PageTitle } from "@/components/shared/page-title";
import { StatusBadge } from "@/components/shared/status-badge";
import { CardContent } from "@/components/ui/card";
import { usageFilters } from "@/lib/constants";

export default function UsagePage() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-10 md:px-6">
      <PageTitle
        title="Kullanım Alanları"
        description="Dental uygulamalarda ürün seçimini hızlandıran profesyonel kullanım başlıkları. Katalog içinde bu alanlara göre arama ve filtreleme yapabilirsiniz."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {usageFilters.map((usage) => (
          <PremiumCard key={usage}>
            <CardContent className="flex min-h-36 flex-col justify-between gap-5 p-5">
              <StatusBadge label="Katalog filtresi" tone="success" />
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">{usage}</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  İlgili ürünleri katalogda kullanım alanı, ürün adı veya kod
                  bilgisiyle birlikte inceleyin.
                </p>
              </div>
            </CardContent>
          </PremiumCard>
        ))}
      </div>
    </div>
  );
}
