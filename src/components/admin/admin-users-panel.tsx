"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  MapPin,
  Search,
  Shield,
  Stethoscope,
  TestTubeDiagonal,
  UserCheck,
  UserRound,
} from "lucide-react";

import { reviewUserAction } from "@/app/(admin)/admin/users/actions";
import {
  AdminUserActions,
  getSuggestedApprovalIntent,
  type ReviewIntent,
} from "@/components/admin/admin-user-actions";
import { SurfaceCard } from "@/components/premium/surface-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type {
  Profile,
  RequestedRole,
  UserRole,
  UserType,
  VerificationStatus,
} from "@/lib/types/auth";
import { cn } from "@/lib/utils";

type AdminUsersPanelProps = {
  profiles: Profile[];
};

type FilterKey =
  | "all"
  | "pending"
  | "doctor"
  | "lab"
  | "vet"
  | "sales"
  | "admin"
  | "suspended";

const filterOptions: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Tümü" },
  { key: "pending", label: "Onay Bekleyen" },
  { key: "doctor", label: "Hekimler" },
  { key: "lab", label: "Laboratuvarlar" },
  { key: "vet", label: "Veterinerler" },
  { key: "sales", label: "Saha" },
  { key: "admin", label: "Admin" },
  { key: "suspended", label: "Askıya Alınan" },
] as const;

export function AdminUsersPanel({ profiles }: AdminUsersPanelProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const stats = useMemo(() => buildStats(profiles), [profiles]);

  const filteredProfiles = useMemo(() => {
    const query = normalizeForSearch(searchQuery);

    return profiles.filter((profile) => {
      if (!matchesFilter(profile, activeFilter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = normalizeForSearch(
        [
          profile.full_name,
          profile.email,
          profile.phone,
          profile.clinic_name,
          profile.company_name,
          profile.city,
          profile.district,
          profile.specialty,
          getRoleLabel(profile.role),
          getRequestedRoleLabel(profile.requested_role),
          getRequestedRoleLabel(profile.user_type),
          getStatusLabel(profile.verification_status),
          getUserTypeDescription(profile.user_type),
        ]
          .filter(Boolean)
          .join(" ")
      );

      return haystack.includes(query);
    });
  }, [activeFilter, profiles, searchQuery]);

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
          <div className="grid gap-3 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-end">
            <label className="grid gap-2 text-sm font-medium">
              Kullanıcı Ara
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 pl-9"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Ad, e-posta, telefon, kurum veya şehir ara"
                  value={searchQuery}
                />
              </span>
            </label>

            <div className="grid gap-2">
              <p className="text-sm font-medium">Filtreler</p>
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <Button
                    className="rounded-full"
                    key={option.key}
                    onClick={() => setActiveFilter(option.key)}
                    size="sm"
                    variant={activeFilter === option.key ? "default" : "outline"}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            Hekim, laboratuvar ve veteriner başvurularında kurum ve lokasyon bilgileri
            profil üzerinde tutulur. Manuel müşteri kayıtları ise ayrı olarak
            <span className="font-medium text-foreground"> Müşteriler </span>
            ekranında izlenir.
          </p>
        </CardContent>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <CardContent className="p-0">
          {filteredProfiles.length ? (
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
                {filteredProfiles.map((profile) => {
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
                                    {formatLocation(profile.city, profile.district)}
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
                          value={formatDate(profile.created_at)}
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
                              value={formatLocation(profile.city, profile.district)}
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
                              value="Alternatif roller aşağıdaki işlem alanından seçilebilir."
                            />
                          </div>

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
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
                <UserCheck />
              </span>
              <div className="flex max-w-md flex-col gap-1">
                <h2 className="text-lg font-semibold">Sonuç bulunamadı.</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Arama ifadesini veya filtreleri değiştirerek diğer kullanıcı gruplarını
                  inceleyebilirsiniz.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </SurfaceCard>
    </div>
  );
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
      <Button size="sm" type="submit">
        <UserCheck data-icon="inline-start" />
        {label}
      </Button>
    </form>
  );
}

function buildStats(profiles: Profile[]) {
  return {
    admins: profiles.filter((profile) => profile.role === "admin").length,
    doctors: profiles.filter((profile) => profile.role === "approved_doctor").length,
    labs: profiles.filter((profile) => profile.role === "approved_lab").length,
    pending: profiles.filter((profile) => isPendingReview(profile)).length,
    sales: profiles.filter((profile) => profile.role === "sales_rep").length,
    suspended: profiles.filter(
      (profile) =>
        profile.role === "suspended_user" || profile.verification_status === "suspended"
    ).length,
    vets: profiles.filter((profile) => profile.role === "approved_vet").length,
  };
}

function matchesFilter(profile: Profile, filter: FilterKey) {
  switch (filter) {
    case "pending":
      return isPendingReview(profile);
    case "doctor":
      return profile.role === "approved_doctor";
    case "lab":
      return profile.role === "approved_lab";
    case "vet":
      return profile.role === "approved_vet";
    case "sales":
      return profile.role === "sales_rep";
    case "admin":
      return profile.role === "admin";
    case "suspended":
      return (
        profile.role === "suspended_user" ||
        profile.verification_status === "suspended"
      );
    default:
      return true;
  }
}

function isPendingReview(profile: Profile) {
  return (
    profile.verification_status === "pending" || profile.role === "pending_user"
  );
}

function getRoleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    admin: "Admin",
    approved_doctor: "Hekim",
    approved_lab: "Laboratuvar",
    approved_vet: "Veteriner",
    pending_user: "Onay Bekliyor",
    sales_rep: "Saha Temsilcisi",
    suspended_user: "Askıya Alındı",
  };

  return labels[role];
}

function getRequestedRoleLabel(value: RequestedRole | UserType | null) {
  const labels: Partial<Record<UserType, string>> = {
    admin: "Admin",
    doctor: "Hekim",
    lab: "Laboratuvar",
    other: "Genel Başvuru",
    sales: "Saha Temsilcisi",
    vet: "Veteriner",
  };

  return value ? labels[value] ?? "Belirtilmedi" : "Belirtilmedi";
}

function getUserTypeDescription(userType: UserType | null) {
  const descriptions: Partial<Record<UserType, string>> = {
    admin: "Operasyon yetkisine sahip hesap",
    doctor: "Klinik / hekim kullanıcısı",
    lab: "Laboratuvar kullanıcısı",
    other: "Ek doğrulama gerektirebilecek kayıt tipi",
    sales: "Saha operasyon hesabı",
    vet: "Veteriner kullanıcı",
  };

  return descriptions[userType ?? "other"] ?? "Kayıt tipi belirtilmedi";
}

function getStatusLabel(status: VerificationStatus) {
  const labels: Record<VerificationStatus, string> = {
    approved: "Onaylı",
    pending: "Onay Bekliyor",
    rejected: "Reddedildi",
    suspended: "Askıya Alındı",
  };

  return labels[status];
}

function getApprovalLabel(intent: ReviewIntent) {
  const labels: Record<ReviewIntent, string> = {
    approve_doctor: "Hekim Olarak Onayla",
    approve_lab: "Laboratuvar Olarak Onayla",
    approve_sales_rep: "Saha Olarak Onayla",
    approve_vet: "Veteriner Olarak Onayla",
    reactivate: "Yeniden Aktif Et",
    reject: "Reddet",
    suspend: "Askıya Al",
  };

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

function getRequestedRoleDisplay(profile: Profile) {
  if (profile.requested_role) {
    return `${getRequestedRoleLabel(profile.requested_role)} Başvurusu`;
  }

  if (profile.user_type) {
    return `${getRequestedRoleLabel(profile.user_type)} Başvurusu`;
  }

  return "Başvuru tipi belirtilmedi";
}

function formatLocation(city: string | null, district: string | null) {
  if (city && district) {
    return `${district} / ${city}`;
  }

  if (city) {
    return city;
  }

  if (district) {
    return district;
  }

  return "Belirtilmedi";
}

function normalizeForSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
