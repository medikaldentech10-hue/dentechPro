import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Profile } from "@/lib/types/auth";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type DraftRow = Database["public"]["Tables"]["order_drafts"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];

export type AdminDashboardRequest = DraftRow & {
  customer: Pick<CustomerRow, "company_name" | "name"> | null;
};

export type AdminDashboardLowStockVariant = Pick<
  VariantRow,
  "id" | "manufacturer_ref" | "stock_quantity" | "variant_code"
> & {
  product: Pick<ProductRow, "brand" | "id" | "product_group_code" | "product_name"> | null;
};

export type AdminDashboardSummary = {
  activeProductsCount: number;
  confirmedMonthTotal: number;
  customersCount: number;
  latestPendingUsers: Profile[];
  latestRequests: AdminDashboardRequest[];
  lowStockVariants: AdminDashboardLowStockVariant[];
  lowStockVariantsCount: number;
  openRequestsCount: number;
  pendingUsersCount: number;
};

const openRequestStatuses: DraftRow["status"][] = [
  "submitted",
  "contacted",
  "payment_pending",
];

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const supabase = getSupabaseAdminClient();
  const monthStart = getMonthStartIso();

  const [
    pendingUsersCount,
    activeProductsCount,
    lowStockVariantsCount,
    openRequestsCount,
    confirmedMonthDrafts,
    customersCount,
    latestRequests,
    lowStockVariants,
    latestPendingUsers,
  ] = await Promise.all([
    countPendingUsers(),
    countActiveProducts(),
    countLowStockVariants(),
    countOpenRequests(),
    supabase
      .from("order_drafts")
      .select("total")
      .eq("status", "confirmed")
      .gte("updated_at", monthStart),
    countCustomers(),
    getLatestRequests(),
    getLowStockVariants(),
    getLatestPendingUsers(),
  ]);

  if (confirmedMonthDrafts.error) {
    throw new Error(confirmedMonthDrafts.error.message);
  }

  return {
    activeProductsCount,
    confirmedMonthTotal: (confirmedMonthDrafts.data ?? []).reduce(
      (sum, draft) => sum + Number(draft.total ?? 0),
      0
    ),
    customersCount,
    latestPendingUsers,
    latestRequests,
    lowStockVariants,
    lowStockVariantsCount,
    openRequestsCount,
    pendingUsersCount,
  };
}

async function getLatestRequests(): Promise<AdminDashboardRequest[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_drafts")
    .select(
      "id,request_number,customer_id,created_by_user_id,discount_total,note,source,status,subtotal,total,created_at,updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  const drafts = data ?? [];
  const customersById = await getCustomersByIds(
    drafts.map((draft) => draft.customer_id)
  );

  return drafts.map((draft) => ({
    ...draft,
    customer: draft.customer_id
      ? customersById.get(draft.customer_id) ?? null
      : null,
  }));
}

async function getLowStockVariants(): Promise<AdminDashboardLowStockVariant[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("id,variant_code,manufacturer_ref,stock_quantity,product:products(id,brand,product_group_code,product_name)")
    .eq("is_active", true)
    .lte("stock_quantity", 5)
    .order("stock_quantity", { ascending: true })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as AdminDashboardLowStockVariant[];
}

async function getLatestPendingUsers() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,email,full_name,is_active,phone,role,user_type,verification_status,can_view_prices,created_at,updated_at"
    )
    .or("verification_status.eq.pending,role.eq.pending_user")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

async function getCustomersByIds(ids: Array<string | null>) {
  const supabase = getSupabaseAdminClient();
  const customerIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const customers = new Map<string, Pick<CustomerRow, "company_name" | "name">>();

  if (!customerIds.length) {
    return customers;
  }

  const { data, error } = await supabase
    .from("customers")
    .select("id,name,company_name")
    .in("id", customerIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const customer of data ?? []) {
    customers.set(customer.id, {
      company_name: customer.company_name,
      name: customer.name,
    });
  }

  return customers;
}

async function countPendingUsers() {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .or("verification_status.eq.pending,role.eq.pending_user");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countActiveProducts() {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countLowStockVariants() {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("product_variants")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .lte("stock_quantity", 5);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countOpenRequests() {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("order_drafts")
    .select("*", { count: "exact", head: true })
    .in("status", openRequestStatuses);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function countCustomers() {
  const supabase = getSupabaseAdminClient();
  const { count, error } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

function getMonthStartIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
