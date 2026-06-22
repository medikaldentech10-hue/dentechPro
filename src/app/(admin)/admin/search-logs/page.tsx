import Link from "next/link";
import type { ReactNode } from "react";

import { SurfaceCard } from "@/components/premium/surface-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAdminSearchLogAnalytics,
  type SearchLogEntry,
  type SearchTermSummary,
  type SearchTokenSummary,
} from "@/lib/search-logs";

export const dynamic = "force-dynamic";

export default async function AdminSearchLogsPage() {
  const analytics = await getAdminSearchLogAnalytics();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <PageTitle
          description="Katalog aramalarını, sonuçsuz sorguları ve en çok aranan terimleri takip edin."
          title="Arama Logları"
        />
        <Link className="text-sm font-medium text-primary hover:underline" href="/admin">
          Admin paneline dön
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          label="Toplam Arama"
          value={formatNumber(analytics.totalLoggedSearches)}
        />
        <SummaryCard
          label="Bugünkü Arama"
          value={formatNumber(analytics.searchesToday)}
        />
        <SummaryCard
          label="Sonuçsuz Arama"
          value={formatNumber(analytics.noResultSearches.length)}
        />
        <SummaryCard
          label="Ortalama Sonuç"
          value={formatNumber(analytics.averageResultCount)}
        />
        <SummaryCard
          helper={
            analytics.mostSearchedToken
              ? `${analytics.mostSearchedToken.count} arama`
              : "Henüz kriter yok"
          }
          label="En Çok Aranan Kriter"
          value={analytics.mostSearchedToken?.label ?? "-"}
        />
        <SummaryCard
          helper={
            analytics.mostCommonNoResultQuery
              ? `${analytics.mostCommonNoResultQuery.count} arama`
              : "Sonuçsuz sorgu yok"
          }
          label="En Sık Sonuçsuz Sorgu"
          value={analytics.mostCommonNoResultQuery?.query ?? "-"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <RecentSearchesCard searches={analytics.latestSearches} />
        <div className="grid gap-4">
          <TopTokensCard tokens={analytics.topTokens} />
          <TopSearchesCard searches={analytics.topSearches} />
          <NoResultSearchesCard searches={analytics.noResultSearches} />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  helper,
  label,
  value,
}: {
  helper?: string;
  label: string;
  value: string;
}) {
  return (
    <SurfaceCard>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 truncate text-3xl font-semibold tracking-tight">
          {value}
        </p>
        {helper ? (
          <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
        ) : null}
      </CardContent>
    </SurfaceCard>
  );
}

function RecentSearchesCard({ searches }: { searches: SearchLogEntry[] }) {
  return (
    <SurfaceCard className="overflow-hidden">
      <CardHeader>
        <CardTitle>Recent Searches</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {searches.length ? (
          <div className="divide-y divide-border/60">
            {searches.map((search) => (
              <SearchRow key={search.id} search={search} />
            ))}
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              description="Katalogda arama yapıldığında güvenli arama metrikleri burada görünür."
              title="Henüz arama logu yok"
            />
          </div>
        )}
      </CardContent>
    </SurfaceCard>
  );
}

function SearchRow({ search }: { search: SearchLogEntry }) {
  const chipLabels = getChipLabels(search);

  return (
    <div className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1fr_0.5fr_0.55fr_0.45fr_0.65fr] md:items-center">
      <SearchText search={search} />
      <MobileLabel label="Rol" value={roleLabel(search.role)} />
      <MobileLabel label="Kaynak" value={sourceLabel(search.source)} />
      <MobileLabel label="Sonuç" value={formatNumber(search.resultCount)} />
      <MobileLabel label="Tarih" value={formatDate(search.createdAt)} />
      {chipLabels.length ? (
        <div className="md:col-span-5">
          <TokenChips labels={chipLabels} />
        </div>
      ) : null}
    </div>
  );
}

function SearchText({ search }: { search: SearchLogEntry }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-foreground">{search.query}</p>
      {search.normalizedQuery && search.normalizedQuery !== search.query ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">
          Normalize: {search.normalizedQuery}
        </p>
      ) : null}
    </div>
  );
}

function TopTokensCard({ tokens }: { tokens: SearchTokenSummary[] }) {
  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle>Top Interpreted Tokens</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {tokens.length ? (
          tokens.map((token) => (
            <div
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3"
              key={`${token.type}-${token.value}`}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge
                  className="border-primary/20 bg-primary/10 text-primary"
                  variant="outline"
                >
                  {token.label}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {tokenTypeLabel(token.type)}
                </p>
              </div>
              <Badge variant="outline">{token.count}</Badge>
            </div>
          ))
        ) : (
          <EmptyListText>Henüz yorumlanan kriter yok.</EmptyListText>
        )}
      </CardContent>
    </SurfaceCard>
  );
}

function TopSearchesCard({ searches }: { searches: SearchTermSummary[] }) {
  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle>En Çok Arananlar</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {searches.length ? (
          searches.map((search) => (
            <div
              className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3"
              key={search.query}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{search.query}</p>
                <p className="text-xs text-muted-foreground">
                  Ortalama {formatNumber(search.averageResultCount)} sonuç
                </p>
              </div>
              <Badge variant="outline">{search.count}</Badge>
            </div>
          ))
        ) : (
          <EmptyListText>Henüz yeterli arama yok.</EmptyListText>
        )}
      </CardContent>
    </SurfaceCard>
  );
}

function NoResultSearchesCard({ searches }: { searches: SearchLogEntry[] }) {
  return (
    <SurfaceCard>
      <CardHeader>
        <CardTitle>No-Result Searches</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {searches.length ? (
          searches.map((search) => (
            <div
              className="rounded-xl border border-border/70 bg-background/60 p-3"
              key={search.id}
            >
              <SearchText search={search} />
              {getChipLabels(search).length ? (
                <div className="mt-2">
                  <TokenChips labels={getChipLabels(search)} />
                </div>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDate(search.createdAt)} · {roleLabel(search.role)}
              </p>
            </div>
          ))
        ) : (
          <EmptyListText>Sonuçsuz arama bulunmuyor.</EmptyListText>
        )}
      </CardContent>
    </SurfaceCard>
  );
}

function TokenChips({ labels }: { labels: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((chip) => (
        <Badge
          className="border-primary/20 bg-primary/10 text-primary"
          key={chip}
          variant="outline"
        >
          {chip}
        </Badge>
      ))}
    </div>
  );
}

function MobileLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 md:block">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground md:hidden">
        {label}
      </span>
      <span className="text-right font-medium md:text-left">{value}</span>
    </div>
  );
}

function EmptyListText({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function getChipLabels(search: SearchLogEntry) {
  const chipLabels = search.tokens.chips.map((chip) => chip.label);
  const categoryLabels = search.tokens.category.map((category) =>
    category.replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("tr-TR"))
  );

  return [...new Set([...chipLabels, ...categoryLabels])].slice(0, 8);
}

function roleLabel(role: SearchLogEntry["role"]) {
  const labels: Record<SearchLogEntry["role"], string> = {
    admin: "Admin",
    approved_doctor: "Onaylı Hekim",
    approved_lab: "Onaylı Lab",
    approved_vet: "Onaylı Vet",
    pending_user: "Onay Bekliyor",
    public: "Ziyaretçi",
    sales_rep: "Saha",
    suspended_user: "Askıda",
  };

  return labels[role];
}

function sourceLabel(source: string) {
  return source === "catalog" ? "Katalog" : source;
}

function tokenTypeLabel(type: string) {
  const labels: Record<string, string> = {
    category: "Kategori",
    color: "Renk",
    diameter: "Çap",
    holder: "Bağlantı",
    usage: "Kullanım",
  };

  return labels[type] ?? type;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
