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
        description="AI destekli ürün bulucu ileride kullanım senaryolarını JOTA alt kategorileri ve varyant verisiyle eşleştirecek. Şimdilik placeholder filtre mimarisi."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {usageFilters.map((usage) => (
          <PremiumCard key={usage}>
            <CardContent className="flex min-h-36 flex-col justify-between gap-5 p-5">
              <StatusBadge label="Placeholder" tone="success" />
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold">{usage}</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Bu kullanım alanı ileride JOTA ürün önerileri ve varyant
                  eşleştirmeleriyle beslenecek.
                </p>
              </div>
            </CardContent>
          </PremiumCard>
        ))}
      </div>
    </div>
  );
}
