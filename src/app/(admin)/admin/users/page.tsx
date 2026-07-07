import { UserCheck } from "lucide-react";

import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { SurfaceCard } from "@/components/premium/surface-card";
import { PageTitle } from "@/components/shared/page-title";
import { CardContent } from "@/components/ui/card";
import {
  ADMIN_PROFILE_SELECT,
  ADMIN_USERS_PAGE_SIZE,
  buildAdminUsersSearchOr,
  getAdminUsersSearchQuery,
  parseAdminUsersFilter,
  parseAdminUsersPage,
  type AdminUsersFilterKey,
  type AdminUsersStats,
} from "@/lib/admin-users";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/auth";

type AdminUsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const params = await searchParams;
  const filter = parseAdminUsersFilter(getParamValue(params.filter));
  const query = getAdminUsersSearchQuery(getParamValue(params.q));
  const requestedPage = parseAdminUsersPage(getParamValue(params.page));

  const [{ profiles, totalCount, totalPages, page }, stats] = await Promise.all([
    getAdminUsersList({
      filter,
      page: requestedPage,
      query,
    }),
    getAdminUsersStats(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Kullanıcı Yönetimi"
        description="Kayıtlı kullanıcıları, onay bekleyen başvuruları ve rol yetkilerini buradan yönetin."
      />

      {profiles.length ? (
        <AdminUsersPanel
          activeFilter={filter}
          page={page}
          pageSize={ADMIN_USERS_PAGE_SIZE}
          profiles={profiles}
          query={query ?? ""}
          stats={stats}
          totalCount={totalCount}
          totalPages={totalPages}
        />
      ) : (
        <SurfaceCard>
          <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 p-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
              <UserCheck />
            </span>
            <div className="flex max-w-md flex-col gap-1">
              <h2 className="text-lg font-semibold">Sonuç bulunamadı.</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Arama veya filtreyi değiştirerek diğer kullanıcı gruplarını inceleyebilirsiniz.
              </p>
            </div>
          </CardContent>
        </SurfaceCard>
      )}
    </div>
  );
}

async function getAdminUsersList({
  filter,
  page,
  query,
}: {
  filter: AdminUsersFilterKey;
  page: number;
  query?: string;
}) {
  const supabase = getSupabaseAdminClient();
  let adminQuery = supabase
    .from("profiles")
    .select(ADMIN_PROFILE_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  adminQuery = applyAdminUsersFilter(adminQuery, filter);

  if (query) {
    adminQuery = adminQuery.or(buildAdminUsersSearchOr(query));
  }

  const safePage = Math.max(1, page);
  const from = (safePage - 1) * ADMIN_USERS_PAGE_SIZE;
  const to = from + ADMIN_USERS_PAGE_SIZE - 1;
  const { data, error, count } = await adminQuery.range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ADMIN_USERS_PAGE_SIZE));
  const clampedPage = Math.min(safePage, totalPages);

  if (clampedPage !== safePage) {
    const retryFrom = (clampedPage - 1) * ADMIN_USERS_PAGE_SIZE;
    const retryTo = retryFrom + ADMIN_USERS_PAGE_SIZE - 1;
    let retryQuery = applyAdminUsersFilter(
      supabase
        .from("profiles")
        .select(ADMIN_PROFILE_SELECT)
        .order("created_at", { ascending: false }),
      filter
    );

    if (query) {
      retryQuery = retryQuery.or(buildAdminUsersSearchOr(query));
    }

    const { data: retryData, error: retryError } = await retryQuery.range(
      retryFrom,
      retryTo
    );

    if (retryError) {
      throw new Error(retryError.message);
    }

    return {
      page: clampedPage,
      profiles: (retryData ?? []) as Profile[],
      totalCount,
      totalPages,
    };
  }

  return {
    page: clampedPage,
    profiles: (data ?? []) as Profile[],
    totalCount,
    totalPages,
  };
}

async function getAdminUsersStats(): Promise<AdminUsersStats> {
  const supabase = getSupabaseAdminClient();
  const [
    pending,
    doctors,
    labs,
    vets,
    sales,
    admins,
    suspended,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .or("verification_status.eq.pending,role.eq.pending_user"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "approved_doctor"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "approved_lab"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "approved_vet"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "sales_rep"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .or("role.eq.suspended_user,verification_status.eq.suspended"),
  ]);

  for (const result of [pending, doctors, labs, vets, sales, admins, suspended]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  return {
    admins: admins.count ?? 0,
    doctors: doctors.count ?? 0,
    labs: labs.count ?? 0,
    pending: pending.count ?? 0,
    sales: sales.count ?? 0,
    suspended: suspended.count ?? 0,
    vets: vets.count ?? 0,
  };
}

function applyAdminUsersFilter<TQuery extends {
  eq: (column: string, value: string) => TQuery;
  or: (filters: string) => TQuery;
}>(query: TQuery, filter: AdminUsersFilterKey) {
  switch (filter) {
    case "pending":
      return query.or("verification_status.eq.pending,role.eq.pending_user");
    case "doctor":
      return query.eq("role", "approved_doctor");
    case "lab":
      return query.eq("role", "approved_lab");
    case "vet":
      return query.eq("role", "approved_vet");
    case "sales":
      return query.eq("role", "sales_rep");
    case "admin":
      return query.eq("role", "admin");
    case "suspended":
      return query.or("role.eq.suspended_user,verification_status.eq.suspended");
    default:
      return query;
  }
}

function getParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
