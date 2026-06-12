import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { Profile } from "@/lib/types/auth";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type DraftRow = Database["public"]["Tables"]["order_drafts"]["Row"];

export type AdminCustomerFilters = {
  search?: string;
};

export type AdminCustomerListItem = CustomerRow & {
  lastRequestDate: string | null;
  requestCount: number;
};

export type AdminCustomerDetail = CustomerRow & {
  requests: DraftRow[];
};

export async function getAdminCustomerList(
  filters: AdminCustomerFilters = {}
): Promise<AdminCustomerListItem[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const customers = filterCustomers(data ?? [], filters.search);
  const requestStats = await getCustomerRequestStats(
    customers.map((customer) => customer.id)
  );

  return customers.map((customer) => ({
    ...customer,
    lastRequestDate: requestStats.get(customer.id)?.lastRequestDate ?? null,
    requestCount: requestStats.get(customer.id)?.requestCount ?? 0,
  }));
}

export async function getAdminCustomerDetail(
  customerId: string
): Promise<AdminCustomerDetail | null> {
  const supabase = getSupabaseAdminClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!customer) {
    return null;
  }

  const { data: requests, error: requestError } = await supabase
    .from("order_drafts")
    .select("*")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });

  if (requestError) {
    throw new Error(requestError.message);
  }

  return {
    ...customer,
    requests: requests ?? [],
  };
}

export async function updateAdminCustomer({
  adminProfile,
  customerId,
  patch,
}: {
  adminProfile: Profile;
  customerId: string;
  patch: Database["public"]["Tables"]["customers"]["Update"];
}) {
  const supabase = getSupabaseAdminClient();
  const { data: oldCustomer, error: oldCustomerError } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();

  if (oldCustomerError) {
    throw new Error(oldCustomerError.message);
  }

  const { data: newCustomer, error } = await supabase
    .from("customers")
    .update(patch)
    .eq("id", customerId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await writeCustomerAuditLog({
    adminProfile,
    customerId,
    newValue: summarizeChangedFields(oldCustomer, newCustomer),
  });
}

async function getCustomerRequestStats(customerIds: string[]) {
  const supabase = getSupabaseAdminClient();
  const stats = new Map<
    string,
    { lastRequestDate: string | null; requestCount: number }
  >();

  if (!customerIds.length) {
    return stats;
  }

  const { data, error } = await supabase
    .from("order_drafts")
    .select("customer_id,created_at")
    .in("customer_id", customerIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const draft of data ?? []) {
    if (!draft.customer_id) {
      continue;
    }

    const current = stats.get(draft.customer_id) ?? {
      lastRequestDate: null,
      requestCount: 0,
    };
    const lastRequestDate =
      !current.lastRequestDate || draft.created_at > current.lastRequestDate
        ? draft.created_at
        : current.lastRequestDate;

    stats.set(draft.customer_id, {
      lastRequestDate,
      requestCount: current.requestCount + 1,
    });
  }

  return stats;
}

function filterCustomers(customers: CustomerRow[], search?: string) {
  const needle = search?.trim().toLocaleLowerCase("tr-TR");

  if (!needle) {
    return customers;
  }

  return customers.filter((customer) => {
    const haystack = [
      customer.name,
      customer.company_name,
      customer.phone,
      customer.email,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("tr-TR");

    return haystack.includes(needle);
  });
}

async function writeCustomerAuditLog({
  adminProfile,
  customerId,
  newValue,
}: {
  adminProfile: Profile;
  customerId: string;
  newValue: Json;
}) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("audit_logs").insert({
    action: "customer_updated",
    entity_id: customerId,
    entity_type: "customer",
    new_value: newValue,
    user_id: adminProfile.id,
  });

  if (error) {
    throw new Error(error.message);
  }
}

function summarizeChangedFields<T extends Record<string, unknown>>(
  oldValue: T,
  newValue: T
): Json {
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const key of Object.keys(newValue)) {
    if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
      changes[key] = {
        from: oldValue[key],
        to: newValue[key],
      };
    }
  }

  return changes as Json;
}
