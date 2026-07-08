"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  LoaderCircle,
  MapPin,
  Search,
  Shield,
  Stethoscope,
  TestTubeDiagonal,
  UserCheck,
  UserRound,
} from "lucide-react";

import { reviewUserAction } from "@/app/(admin)/admin/users/actions";
import { AdminUserActions, getSuggestedApprovalIntent } from "@/components/admin/admin-user-actions";
import { AdminUserProfileForm } from "@/components/admin/admin-user-profile-form";
import { SurfaceCard } from "@/components/premium/surface-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  adminUsersFilterOptions,
  type AdminUsersFilterKey,
  type AdminUsersStats,
  formatAdminUserDate,
  formatAdminUserLocation,
  getRequestedRoleDisplay,
  getRoleLabel,
  getStatusLabel,
  getUserTypeDescription,
  isPendingReview,
} from "@/lib/admin-users";
import type { Profile } from "@/lib/types/auth";
import { cn } from "@/lib/utils";

type AdminUsersPanelProps = {
  activeFilter: AdminUsersFilterKey;
  page: number;
  pageSize: number;
  profiles: Profile[];
  query: string;
  stats: AdminUsersStats;
  totalCount: number;
  totalPages: number;
};

export function AdminUsersPanel({
  activeFilter,
  page,
  pageSize,
  profiles,
  query,
  stats,
  totalCount,
  totalPages,
}: AdminUsersPanelProps) {
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const exportHref = buildExportHref(activeFilter, query);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <SummaryCard label="Onay Bekleyen" value={stats.pending} />
        <SummaryCard label="Hekimler" value={stats.doctors} />
        <SummaryCard label="Laboratuvarlar" value={stats.labs} />
        <SummaryCard label="Veterinerler" value={stats.vets} />
        <SummaryCard label="Saha Temsilcileri" value={stats.sales} />
        <SummaryCard label="Adminler" value={stats.admins} />
        <SummaryCard label="Askıya Alınanlar" value={stats.suspended} />
      </div>

      <SurfaceCard>
        <CardContent className="grid gap-4 p-5">
          <form
            action="/admin/users"
            className="grid gap-3 lg:grid-cols-[minmax(0,360px)_1fr_auto] lg:items-end"
          >
            <label className="grid gap-2 text-sm font-medium">
              Kullanıcı Ara
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 pl-9"
                  defaultValue={query}
                  name="q"
                  placeholder="Ad, e-posta, telefon, kurum veya şehir ara"
                />
              </span>
            </label>

            <div className="grid gap-2">
              <p className="text-sm font-medium">Filtreler</p>
              <div className="flex flex-wrap gap-2">
                {adminUsersFilterOptions.map((option) => (
                  <Link
                    className={cn(
                      buttonVariants({
                        size: "sm",
                        variant: activeFilter === option.key ? "default" : "outline",
                      }),
                      "rounded-full"
                    )}
                    href={getFilterHref(option.key, query)}
                    key={option.key}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-2 lg:justify-self-end">
              <p className="text-sm font-medium">Dışa Aktarım</p>
              <div className="flex gap-2">
                <Button size="sm" type="submit" variant="outline">
                  Ara
                </Button>
                <Link
                  className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                  href={exportHref}
                >
                  <Download data-icon="inline-start" />
                  CSV Dışa Aktar
                </Link>
              </div>
            </div>
            {activeFilter !== "all" ? (
              <input name="filter" type="hidden" value={activeFilter} />
            ) : null}
            <input name="page" type="hidden" value="1" />
          </form>

          <div className="flex flex-col gap-2 text-sm leading-6 text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>
              Toplam {totalCount} kullanıcı içinde sayfa {page} / {totalPages}
              <span className="ml-1 hidden sm:inline">· Sayfa boyutu {pageSize}</span>
            </p>
            {(query || activeFilter !== "all") && (
              <Link
                className={cn(buttonVariants({ variant: "link" }), "h-auto px-0 text-sm")}
                href="/admin/users"
              >
                Filtreleri Temizle
              </Link>
            )}
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            Hekim, laboratuvar ve veteriner başvurularında kurum ve lokasyon bilgileri
            profil üzerinde tutulur. Manuel müşteri kayıtları ise ayrı olarak
            <span className="font-medium text-foreground"> Müşteriler </span>
            ekranında izlenir. CSV dışa aktarımı, mevcut filtreyi kullanır; filtre
            seçilmediyse profesyonel kullanıcıları indirir.
          </p>
        </CardContent>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <CardContent className="p-0">
          <div>
            <div className="hidden grid-cols-[minmax(0,1.45fr)_0.95fr_0.95fr_0.95fr_0.95fr_auto] gap-4 border-b border-border/70 px-5 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground lg:grid">
              <span>Kullanıcı</span>
              <span>Talep Edilen Rol</span>
              <span>Mevcut Rol</span>
              <span>Durum</span>
              <span>Kayıt Tarihi</span>
              <span className="text-right">İşlemler</span>
            </div>

            <div className="divide-y divide-border/60">
              {profiles.map((profile) => {
                const isExpanded = openUserId === profile.id;
                const isPending = isPendingReview(profile);

                return (
                  <div className="px-4 py-4 lg:px-5" key={profile.id}>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_0.95fr_0.95fr_0.95fr_0.95fr_auto] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                            {getUserIcon(profile)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold">
                              {profile.full_name || "Ad bilgisi yok"}
                            </p>
                            <div className="mt-1 grid gap-1 text-sm text-muted-foreground">
                              <span className="truncate">{profile.email || "E-posta yok"}</span>
                              {profile.phone ? <span>{profile.phone}</span> : null}
                              {profile.clinic_name || profile.company_name ? (
                                <span className="truncate font-medium text-foreground/80">
                                  {profile.clinic_name ?? profile.company_name}
                                </span>
                              ) : null}
                              {profile.city || profile.district ? (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="size-3.5" />
                                  {formatAdminUserLocation(profile.city, profile.district)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      <CompactInfo
                        label="Talep Edilen Rol"
                        value={getRequestedRoleDisplay(profile)}
                      />
                      <CompactInfo label="Mevcut Rol" value={getRoleLabel(profile.role)} />
                      <StatusCell profile={profile} />
                      <CompactInfo
                        label="Kayıt Tarihi"
                        value={formatAdminUserDate(profile.created_at)}
                      />

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {isPending ? <PrimaryApprovalButton profile={profile} /> : null}
                        <Button
                          aria-expanded={isExpanded}
                          className="justify-center"
                          onClick={() =>
                            setOpenUserId((current) =>
                              current === profile.id ? null : profile.id
                            )
                          }
                          size="sm"
                          variant="outline"
                        >
                          {isExpanded ? (
                            <ChevronUp data-icon="inline-start" />
                          ) : (
                            <ChevronDown data-icon="inline-start" />
                          )}
                          Detay / İşlemler
                        </Button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="mt-4 grid gap-4 rounded-2xl border border-border/70 bg-background/60 p-4">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <ExpandedInfo
                            label="Kullanıcı Tipi"
                            value={getUserTypeDescription(profile.user_type)}
                          />
                          <ExpandedInfo
                            label="Talep Edilen Rol"
                            value={getRequestedRoleDisplay(profile)}
                          />
                          <ExpandedInfo
                            label="Kurum / Klinik"
                            value={profile.clinic_name ?? profile.company_name ?? "Belirtilmedi"}
                          />
                          <ExpandedInfo
                            label="Şehir / İlçe"
                            value={formatAdminUserLocation(profile.city, profile.district)}
                          />
                          <ExpandedInfo
                            label="Uzmanlık"
                            value={profile.specialty ?? "Belirtilmedi"}
                          />
                          <ExpandedInfo
                            label="Onay Durumu"
                            value={getStatusLabel(profile.verification_status)}
                          />
                          <ExpandedInfo
                            label="Hesap"
                            value={profile.is_active ? "Aktif" : "Pasif"}
                          />
                          <ExpandedInfo
                            label="Not"
                            value="Talep edilen rol bu alanda düzenlenebilir; mevcut onaylı rol yalnızca işlem butonlarıyla değişir."
                          />
                        </div>

                        <AdminUserProfileForm
                          key={profile.id}
                          profile={profile}
                          returnTo={buildPageHref(page, activeFilter, query)}
                        />

                        <AdminUserActions
                          canReactivate={!profile.is_active}
                          fullName={profile.full_name}
                          requestedRole={profile.requested_role}
                          role={profile.role}
                          userId={profile.id}
                          userType={profile.user_type}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </SurfaceCard>

      <AdminUsersPagination
        activeFilter={activeFilter}
        page={page}
        query={query}
        totalPages={totalPages}
      />
    </div>
  );
}

function AdminUsersPagination({
  activeFilter,
  page,
  query,
  totalPages,
}: {
  activeFilter: AdminUsersFilterKey;
  page: number;
  query: string;
  totalPages: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <nav
      aria-label="Kullanıcı sayfalama"
      className="flex flex-wrap items-center justify-between gap-2"
    >
      <div className="flex items-center gap-2">
        <PaginationArrow
          direction="previous"
          disabled={page <= 1}
          href={buildPageHref(page - 1, activeFilter, query)}
        />
        <div className="hidden items-center gap-1 sm:flex">
          {visiblePages.map((visiblePage, index) => {
            const previousPage = visiblePages[index - 1];
            const hasGap = previousPage ? visiblePage - previousPage > 1 : false;

            return (
              <span className="flex items-center gap-1" key={visiblePage}>
                {hasGap ? (
                  <span className="px-1 text-xs text-muted-foreground" aria-hidden="true">
                    ...
                  </span>
                ) : null}
                <Link
                  aria-current={visiblePage === page ? "page" : undefined}
                  className={cn(
                    buttonVariants({
                      size: "sm",
                      variant: visiblePage === page ? "default" : "outline",
                    }),
                    "min-w-9 px-3"
                  )}
                  href={buildPageHref(visiblePage, activeFilter, query)}
                >
                  {visiblePage}
                </Link>
              </span>
            );
          })}
        </div>
        <PaginationArrow
          direction="next"
          disabled={page >= totalPages}
          href={buildPageHref(page + 1, activeFilter, query)}
        />
      </div>

      <span className="text-sm text-muted-foreground">
        Sayfa {page} / {totalPages}
      </span>
    </nav>
  );
}

function PaginationArrow({
  direction,
  disabled,
  href,
}: {
  direction: "next" | "previous";
  disabled: boolean;
  href: string;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(buttonVariants({ size: "icon-sm", variant: "outline" }), "opacity-45")}
      >
        <Icon />
      </span>
    );
  }

  return (
    <Link
      className={buttonVariants({ size: "icon-sm", variant: "outline" })}
      href={href}
    >
      <Icon />
    </Link>
  );
}

function buildExportHref(activeFilter: AdminUsersFilterKey, query: string) {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set("q", query.trim());
  }

  if (activeFilter !== "all") {
    params.set("filter", activeFilter);
  }

  return params.size ? `/admin/users/export?${params.toString()}` : "/admin/users/export";
}

function getFilterHref(filter: AdminUsersFilterKey, query: string) {
  const params = new URLSearchParams();

  if (filter !== "all") {
    params.set("filter", filter);
  }

  if (query.trim()) {
    params.set("q", query.trim());
  }

  params.set("page", "1");
  return `/admin/users?${params.toString()}`;
}

function buildPageHref(page: number, activeFilter: AdminUsersFilterKey, query: string) {
  const params = new URLSearchParams();

  if (activeFilter !== "all") {
    params.set("filter", activeFilter);
  }

  if (query.trim()) {
    params.set("q", query.trim());
  }

  params.set("page", String(Math.max(1, page)));
  return `/admin/users?${params.toString()}`;
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages]);

  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <SurfaceCard>
      <CardContent className="flex flex-col gap-2 p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </SurfaceCard>
  );
}

function CompactInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 lg:block">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground lg:mb-1">
        {label}
      </p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function ExpandedInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-xl border border-border/70 bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function StatusCell({ profile }: { profile: Profile }) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground lg:hidden">
        Durum
      </p>
      <div className="flex flex-wrap gap-2">
        <Badge
          className={cn(
            "rounded-full border-border/70 bg-background/70",
            profile.verification_status === "pending" &&
              "border-primary/25 bg-accent/70 text-primary",
            profile.verification_status === "approved" &&
              "border-primary/25 bg-primary/10 text-primary",
            profile.verification_status === "rejected" &&
              "border-destructive/30 bg-destructive/10 text-destructive",
            profile.verification_status === "suspended" &&
              "border-destructive/40 bg-destructive/15 text-destructive"
          )}
          variant="outline"
        >
          {getStatusLabel(profile.verification_status)}
        </Badge>
        {!profile.is_active ? (
          <Badge className="rounded-full" variant="outline">
            Pasif Hesap
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

function PrimaryApprovalButton({ profile }: { profile: Profile }) {
  const intent = getSuggestedApprovalIntent(
    profile.requested_role,
    profile.user_type,
    profile.role
  );
  const label = getApprovalLabel(intent);

  return (
    <form action={reviewUserAction}>
      <input name="user_id" type="hidden" value={profile.id} />
      <input name="intent" type="hidden" value={intent} />
      <input name="note" type="hidden" value="" />
      <PrimaryApprovalSubmitButton label={label} />
    </form>
  );
}

function PrimaryApprovalSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} size="sm" type="submit">
      {pending ? (
        <LoaderCircle className="animate-spin" data-icon="inline-start" />
      ) : (
        <UserCheck data-icon="inline-start" />
      )}
      {pending ? "İşleniyor..." : label}
    </Button>
  );
}

function getApprovalLabel(intent: ReturnType<typeof getSuggestedApprovalIntent>) {
  const labels = {
    approve_doctor: "Hekim Olarak Onayla",
    approve_lab: "Laboratuvar Olarak Onayla",
    approve_sales_rep: "Saha Olarak Onayla",
    approve_vet: "Veteriner Olarak Onayla",
    reactivate: "Yeniden Aktif Et",
    reject: "Reddet",
    suspend: "Askıya Al",
  } as const;

  return labels[intent];
}

function getUserIcon(profile: Profile) {
  if (profile.role === "admin") {
    return <Shield className="size-4" />;
  }

  if (profile.role === "approved_lab" || profile.user_type === "lab") {
    return <TestTubeDiagonal className="size-4" />;
  }

  if (profile.role === "approved_doctor" || profile.user_type === "doctor") {
    return <Stethoscope className="size-4" />;
  }

  if (profile.role === "approved_vet" || profile.user_type === "vet") {
    return <Building2 className="size-4" />;
  }

  return <UserRound className="size-4" />;
}
