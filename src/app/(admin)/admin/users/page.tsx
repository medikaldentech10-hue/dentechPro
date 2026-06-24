import { UserCheck } from "lucide-react";

import { AdminUserActions } from "@/components/admin/admin-user-actions";
import { SurfaceCard } from "@/components/premium/surface-card";
import { PageTitle } from "@/components/shared/page-title";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Profile, VerificationStatus } from "@/lib/types/auth";
import { cn } from "@/lib/utils";

export default async function AdminUsersPage() {
  const supabase = getSupabaseAdminClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Kullanıcı Yönetimi"
        description="Kayıtlı uygulama kullanıcılarını inceleyin, bekleyen başvuruları onaylayın ve rol durumlarını takip edin."
      />

      <div className="grid gap-4 md:grid-cols-5">
        <ReviewStat label="Toplam" value={profiles.length} />
        <ReviewStat
          label="Bekleyen"
          value={profiles.filter((profile) => isPendingReview(profile)).length}
        />
        <ReviewStat
          label="Onaylı"
          value={
            profiles.filter(
              (profile) => profile.verification_status === "approved"
            ).length
          }
        />
        <ReviewStat
          label="Reddedilen"
          value={
            profiles.filter(
              (profile) => profile.verification_status === "rejected"
            ).length
          }
        />
        <ReviewStat
          label="Askıya Alınan"
          value={
            profiles.filter(
              (profile) => profile.verification_status === "suspended"
            ).length
          }
        />
      </div>

      <SurfaceCard className="overflow-hidden">
        <CardContent className="p-0">
          <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_0.7fr_0.8fr_0.8fr_0.9fr] gap-3 border-b border-border/70 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground xl:grid">
            <span>Ad Soyad</span>
            <span>E-posta</span>
            <span>Telefon</span>
            <span>Tip</span>
            <span>Rol</span>
            <span>Durum</span>
            <span>Kayıt</span>
          </div>

          {profiles.length ? (
            <div className="divide-y divide-border/60">
              {profiles.map((profile) => (
                <div key={profile.id} className="grid gap-4 px-4 py-4">
                  <div className="grid gap-3 text-sm xl:grid-cols-[1.2fr_1fr_0.8fr_0.7fr_0.8fr_0.8fr_0.9fr] xl:items-center">
                    <MobileLabel label="Ad Soyad" value={profile.full_name} />
                    <MobileLabel label="E-posta" value={profile.email} />
                    <MobileLabel label="Telefon" value={profile.phone} />
                    <MobileLabel label="Tip" value={profile.user_type} />
                    <MobileLabel label="Rol" value={roleLabel(profile.role)} />
                    <div className="flex items-center justify-between gap-3 xl:block">
                      <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground xl:hidden">
                        Durum
                      </span>
                      <ApprovalStatusBadge status={profile.verification_status} />
                    </div>
                    <MobileLabel
                      label="Kayıt"
                      value={formatDate(profile.created_at)}
                    />
                  </div>
                  <AdminUserActions
                    canReactivate={!profile.is_active}
                    fullName={profile.full_name}
                    userId={profile.id}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
                <UserCheck />
              </span>
              <div className="flex max-w-md flex-col gap-1">
                <h2 className="text-lg font-semibold">
                  Kayıtlı kullanıcı bulunmuyor
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Yeni hesap başvuruları ve onaylı kullanıcılar bu panelde
                  listelenecek.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </SurfaceCard>
    </div>
  );
}

function ReviewStat({ label, value }: { label: string; value: number }) {
  return (
    <SurfaceCard>
      <CardContent className="flex flex-col gap-2 p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </SurfaceCard>
  );
}

function MobileLabel({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 xl:block">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground xl:hidden">
        {label}
      </span>
      <span className="min-w-0 text-right font-medium xl:text-left">
        {value || "-"}
      </span>
    </div>
  );
}

function ApprovalStatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-background/70",
        status === "pending" && "border-primary/25 bg-accent/70 text-primary",
        status === "approved" && "border-primary/25 bg-primary/10 text-primary",
        status === "rejected" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        status === "suspended" &&
          "border-destructive/40 bg-destructive/15 text-destructive"
      )}
    >
      {statusLabel(status)}
    </Badge>
  );
}

function isPendingReview(profile: Profile) {
  return (
    profile.verification_status === "pending" || profile.role === "pending_user"
  );
}

function statusLabel(status: VerificationStatus) {
  const labels: Record<VerificationStatus, string> = {
    pending: "Beklemede",
    approved: "Onaylı",
    rejected: "Reddedildi",
    suspended: "Askıda",
  };

  return labels[status];
}

function roleLabel(role: Profile["role"]) {
  const labels: Record<Profile["role"], string> = {
    admin: "Admin",
    sales_rep: "Saha Temsilcisi",
    pending_user: "Bekleyen Kullanıcı",
    approved_doctor: "Onaylı Doktor",
    approved_lab: "Onaylı Lab",
    approved_vet: "Onaylı Vet",
    suspended_user: "Askıya Alınmış",
  };

  return labels[role];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
