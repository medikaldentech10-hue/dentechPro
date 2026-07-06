import { UserCheck } from "lucide-react";

import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { SurfaceCard } from "@/components/premium/surface-card";
import { PageTitle } from "@/components/shared/page-title";
import { CardContent } from "@/components/ui/card";
import { ADMIN_PROFILE_SELECT } from "@/lib/admin-users";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export default async function AdminUsersPage() {
  const supabase = getSupabaseAdminClient();
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(ADMIN_PROFILE_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Kullanıcı Yönetimi"
        description="Kayıtlı kullanıcıları, onay bekleyen başvuruları ve rol yetkilerini buradan yönetin."
      />

      {profiles.length ? (
        <AdminUsersPanel profiles={profiles} />
      ) : (
        <SurfaceCard>
          <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
              <UserCheck />
            </span>
            <div className="flex max-w-md flex-col gap-1">
              <h2 className="text-lg font-semibold">Kayıtlı kullanıcı bulunmuyor.</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Yeni hesap başvuruları ve aktif kullanıcılar bu panelde listelenecektir.
              </p>
            </div>
          </CardContent>
        </SurfaceCard>
      )}
    </div>
  );
}
