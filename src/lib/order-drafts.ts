import "server-only";

import { canViewPrices, isAdmin, isApprovedUser, isSalesRep } from "@/lib/auth";
import { DENTECH_WHATSAPP_NUMBER } from "@/lib/config";
import {
  type CustomerPaymentPreference,
  customerPaymentPreferenceLabel,
} from "@/lib/customer-request-preferences";
import {
  assertRateLimit,
  RATE_LIMIT_POLICIES,
  recordRateLimitEvent,
} from "@/lib/rate-limit";
import { getRequestSearchTokens } from "@/lib/request-numbers";
import { isCustomerCancellableStatus } from "@/lib/request-status";
import type { Database, Json } from "@/lib/supabase/database.types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/auth";

type OrderDraftRow = Database["public"]["Tables"]["order_drafts"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];

export type RequestListItem = OrderItemRow & {
  product: Pick<ProductRow, "id" | "product_group_code" | "product_name">;
  variant: Pick<
    VariantRow,
    | "currency"
    | "is_active"
    | "manufacturer_ref"
    | "stock_quantity"
    | "variant_code"
  >;
};

export type RequestDraft = OrderDraftRow & {
  items: RequestListItem[];
};

export type RequestHistoryFilters = {
  createdFrom?: string;
  createdTo?: string;
  query?: string;
  status?: OrderDraftRow["status"] | "all";
};

type DraftItemQueryRow = OrderItemRow & {
  variant: Pick<
    VariantRow,
    | "currency"
    | "is_active"
    | "manufacturer_ref"
    | "stock_quantity"
    | "variant_code"
  > & {
    product: Pick<ProductRow, "id" | "product_group_code" | "product_name"> | null;
  };
};

const REQUEST_DRAFT_COLUMNS =
  "id,request_number,created_by_user_id,customer_id,customer_note,customer_payment_preference,discount_total,note,source,status,subtotal,total,created_at,updated_at";
const REQUEST_ITEM_COLUMNS =
  "id,order_draft_id,variant_id,quantity,unit_price,line_total,created_at,updated_at";

export function canCreateOrderRequest(profile: Profile | null) {
  return Boolean(
    profile?.is_active &&
      profile.verification_status === "approved" &&
      profile.can_view_prices &&
      (isApprovedUser(profile) || isSalesRep(profile) || isAdmin(profile)) &&
      canViewPrices(profile)
  );
}

export async function getActiveRequestDraft(profile: Profile) {
  assertCanCreateOrderRequest(profile);
  const draft = await findDraft(profile.id);

  if (!draft) {
    return null;
  }

  return hydrateDraft(draft);
}

export async function getUserRequestHistory(
  profile: Profile,
  filters: RequestHistoryFilters = {}
) {
  assertCanCreateOrderRequest(profile);

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("order_drafts")
    .select(REQUEST_DRAFT_COLUMNS)
    .eq("created_by_user_id", profile.id)
    .neq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (filters.status && filters.status !== "all") {
    if (filters.status === "submitted") {
      query = query.in("status", ["submitted", "whatsapp_approval_pending"]);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  if (filters.createdFrom) {
    query = query.gte("created_at", startOfDayIso(filters.createdFrom));
  }

  if (filters.createdTo) {
    query = query.lte("created_at", endOfDayIso(filters.createdTo));
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const hydratedDrafts = await Promise.all((data ?? []).map(hydrateDraft));
  return filterRequestHistorySearch(hydratedDrafts, filters.query);
}

export async function addVariantToDraft({
  profile,
  quantity,
  variantId,
}: {
  profile: Profile;
  quantity: number;
  variantId: string;
}) {
  assertCanCreateOrderRequest(profile);
  assertPositiveInteger(quantity, "Adet");
  await assertRateLimit({
    policy: RATE_LIMIT_POLICIES.requestItemMutation,
    userId: profile.id,
  });

  const supabase = getSupabaseAdminClient();
  const variant = await getVariantForDraft(variantId);

  if (!variant.is_active || !variant.product?.is_active) {
    throw new Error("Pasif ürün veya varyant talep listesine eklenemez.");
  }

  if (variant.price === null) {
    throw new Error("Fiyat tanımlı olmayan varyant talep listesine eklenemez.");
  }

  const draft = await getOrCreateDraft(profile);
  const { data: existingItem, error: existingItemError } = await supabase
    .from("order_items")
    .select("id,quantity")
    .eq("order_draft_id", draft.id)
    .eq("variant_id", variant.id)
    .maybeSingle();

  if (existingItemError) {
    throw new Error(existingItemError.message);
  }

  const nextQuantity = (existingItem?.quantity ?? 0) + quantity;
  const lineTotal = calculateLineTotal(variant.price, nextQuantity);

  if (existingItem) {
    const { error } = await supabase
      .from("order_items")
      .update({
        line_total: lineTotal,
        quantity: nextQuantity,
        unit_price: variant.price,
      })
      .eq("id", existingItem.id);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase.from("order_items").insert({
      line_total: lineTotal,
      order_draft_id: draft.id,
      quantity,
      unit_price: variant.price,
      variant_id: variant.id,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  await recalculateDraftTotals(draft.id);
  await writeDraftAuditLog({
    action: "draft_item_added",
    draftId: draft.id,
    userId: profile.id,
    value: {
      quantity,
      variant_id: variant.id,
      variant_code: variant.variant_code,
    },
  });
  await recordRateLimitEvent({
    action: RATE_LIMIT_POLICIES.requestItemMutation.action,
    metadata: {
      draft_id: draft.id,
      quantity,
      variant_id: variant.id,
    },
    userId: profile.id,
  });

  return draft.id;
}

export async function updateDraftItemQuantity({
  itemId,
  profile,
  quantity,
}: {
  itemId: string;
  profile: Profile;
  quantity: number;
}) {
  assertCanCreateOrderRequest(profile);
  assertPositiveInteger(quantity, "Adet");
  await assertRateLimit({
    policy: RATE_LIMIT_POLICIES.requestItemMutation,
    userId: profile.id,
  });

  const supabase = getSupabaseAdminClient();
  const item = await getOwnedDraftItem(profile.id, itemId);
  const variant = await getVariantForDraft(item.variant_id);

  if (variant.price === null) {
    throw new Error("Fiyat tanımlı olmayan varyant güncellenemez.");
  }

  const { error } = await supabase
    .from("order_items")
    .update({
      line_total: calculateLineTotal(variant.price, quantity),
      quantity,
      unit_price: variant.price,
    })
    .eq("id", item.id);

  if (error) {
    throw new Error(error.message);
  }

  await recalculateDraftTotals(item.order_draft_id);
  await writeDraftAuditLog({
    action: "draft_item_quantity_updated",
    draftId: item.order_draft_id,
    userId: profile.id,
    value: {
      item_id: item.id,
      quantity,
      variant_id: item.variant_id,
    },
  });
  await recordRateLimitEvent({
    action: RATE_LIMIT_POLICIES.requestItemMutation.action,
    metadata: {
      item_id: item.id,
      order_draft_id: item.order_draft_id,
      quantity,
      variant_id: item.variant_id,
    },
    userId: profile.id,
  });
}

export async function removeDraftItem({
  itemId,
  profile,
}: {
  itemId: string;
  profile: Profile;
}) {
  assertCanCreateOrderRequest(profile);
  await assertRateLimit({
    policy: RATE_LIMIT_POLICIES.requestItemMutation,
    userId: profile.id,
  });

  const supabase = getSupabaseAdminClient();
  const item = await getOwnedDraftItem(profile.id, itemId);
  const { error } = await supabase.from("order_items").delete().eq("id", item.id);

  if (error) {
    throw new Error(error.message);
  }

  await recalculateDraftTotals(item.order_draft_id);
  await writeDraftAuditLog({
    action: "draft_item_removed",
    draftId: item.order_draft_id,
    userId: profile.id,
    value: {
      item_id: item.id,
      variant_id: item.variant_id,
    },
  });
  await recordRateLimitEvent({
    action: RATE_LIMIT_POLICIES.requestItemMutation.action,
    metadata: {
      item_id: item.id,
      order_draft_id: item.order_draft_id,
      variant_id: item.variant_id,
    },
    userId: profile.id,
  });
}

export async function clearDraft(profile: Profile) {
  assertCanCreateOrderRequest(profile);

  const draft = await findDraft(profile.id);

  if (!draft) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("order_items")
    .delete()
    .eq("order_draft_id", draft.id);

  if (error) {
    throw new Error(error.message);
  }

  await recalculateDraftTotals(draft.id);
  await writeDraftAuditLog({
    action: "draft_cleared",
    draftId: draft.id,
    userId: profile.id,
    value: {
      draft_id: draft.id,
    },
  });
}

export async function submitDraftToWhatsApp({
  customerNote,
  customerPaymentPreference,
  profile,
}: {
  customerNote: string | null;
  customerPaymentPreference: CustomerPaymentPreference;
  profile: Profile;
}) {
  assertCanCreateOrderRequest(profile);
  await assertRateLimit({
    policy: RATE_LIMIT_POLICIES.customerRequestSubmit,
    userId: profile.id,
  });

  const draft = await getActiveRequestDraft(profile);

  if (!draft || draft.items.length === 0) {
    const latestSubmittedDraft = await findLatestSubmittedDraft(profile.id);

    if (latestSubmittedDraft) {
      return buildWhatsAppUrl(latestSubmittedDraft, profile);
    }

    throw new Error("Talep listenizde ürün yok.");
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_drafts")
    .update({
      customer_note: customerNote,
      customer_payment_preference: customerPaymentPreference,
      status: "whatsapp_approval_pending",
    })
    .eq("id", draft.id)
    .eq("status", "draft")
    .select(REQUEST_DRAFT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    const latestSubmittedDraft = await findLatestSubmittedDraft(profile.id);

    if (latestSubmittedDraft) {
      return buildWhatsAppUrl(latestSubmittedDraft, profile);
    }

    throw new Error("Talep zaten gönderilmiş veya güncellenmiş.");
  }

  await writeDraftAuditLog({
    action: "draft_submitted_whatsapp",
    draftId: draft.id,
    userId: profile.id,
    value: {
      draft_id: draft.id,
      item_count: draft.items.length,
      total: draft.total,
    },
  });
  await recordRateLimitEvent({
    action: RATE_LIMIT_POLICIES.customerRequestSubmit.action,
    metadata: {
      draft_id: draft.id,
      item_count: draft.items.length,
      total: draft.total,
    },
    userId: profile.id,
  });

  return buildWhatsAppUrl(
    {
      ...draft,
      customer_note: customerNote,
      customer_payment_preference: customerPaymentPreference,
    },
    profile
  );
}

export async function cancelCustomerRequest({
  profile,
  requestId,
}: {
  profile: Profile;
  requestId: string;
}) {
  assertCanCreateOrderRequest(profile);

  const supabase = getSupabaseAdminClient();
  const { data: draft, error } = await supabase
    .from("order_drafts")
    .select(REQUEST_DRAFT_COLUMNS)
    .eq("id", requestId)
    .eq("created_by_user_id", profile.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!draft) {
    throw new Error("Talep bulunamadı.");
  }

  if (!isCustomerCancellableStatus(draft.status)) {
    throw new Error("Bu talep artık iptal edilemez.");
  }

  const { data: cancelledDraft, error: updateError } = await supabase
    .from("order_drafts")
    .update({ status: "cancelled" })
    .eq("id", draft.id)
    .eq("created_by_user_id", profile.id)
    .eq("status", draft.status)
    .select(REQUEST_DRAFT_COLUMNS)
    .maybeSingle();

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (!cancelledDraft) {
    throw new Error("Talep durumu güncellenemedi.");
  }

  await writeDraftAuditLog({
    action: "draft_cancelled_by_customer",
    draftId: cancelledDraft.id,
    userId: profile.id,
    value: {
      draft_id: cancelledDraft.id,
      previous_status: draft.status,
      next_status: cancelledDraft.status,
    },
  });

  return cancelledDraft;
}

function assertCanCreateOrderRequest(profile: Profile | null) {
  if (!canCreateOrderRequest(profile)) {
    throw new Error("Talep oluşturmak için onaylı ve aktif hesap gerekir.");
  }
}

async function getOrCreateDraft(profile: Profile) {
  const existingDraft = await findDraft(profile.id);

  if (existingDraft) {
    return existingDraft;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_drafts")
    .insert({
      created_by_user_id: profile.id,
      source: isSalesRep(profile) ? "sales" : isAdmin(profile) ? "admin" : "web",
      status: "draft",
    })
    .select(REQUEST_DRAFT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return (await findDraft(profile.id)) ?? data;
}

async function findDraft(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_drafts")
    .select(REQUEST_DRAFT_COLUMNS)
    .eq("created_by_user_id", userId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(error.message);
  }

  const drafts = data ?? [];

  if (!drafts.length) {
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("order_draft_id")
    .in(
      "order_draft_id",
      drafts.map((draft) => draft.id)
    );

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const counts = new Map<string, number>();
  for (const item of items ?? []) {
    counts.set(item.order_draft_id, (counts.get(item.order_draft_id) ?? 0) + 1);
  }

  return [...drafts].sort((left, right) => {
    const itemCountDiff = (counts.get(right.id) ?? 0) - (counts.get(left.id) ?? 0);

    if (itemCountDiff !== 0) {
      return itemCountDiff;
    }

    return (
      new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
    );
  })[0] ?? null;
}

async function findLatestSubmittedDraft(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_drafts")
    .select(REQUEST_DRAFT_COLUMNS)
    .eq("created_by_user_id", userId)
    .in("status", [
      "submitted",
      "whatsapp_approval_pending",
      "contacted",
      "payment_pending",
      "confirmed",
      "completed",
      "payment_received",
      "preparing",
      "shipped",
    ])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return hydrateDraft(data);
}

async function hydrateDraft(draft: OrderDraftRow): Promise<RequestDraft> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_items")
    .select(
      `${REQUEST_ITEM_COLUMNS},variant:product_variants(currency,is_active,manufacturer_ref,stock_quantity,variant_code,product:products(id,product_group_code,product_name))`
    )
    .eq("order_draft_id", draft.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...draft,
    items: ((data ?? []) as unknown as DraftItemQueryRow[]).map((item) => ({
      ...item,
      product: {
        id: item.variant.product?.id ?? "",
        product_group_code: item.variant.product?.product_group_code ?? "",
        product_name: item.variant.product?.product_name ?? "Ürün",
      },
      variant: {
        currency: item.variant.currency,
        is_active: item.variant.is_active,
        manufacturer_ref: item.variant.manufacturer_ref,
        stock_quantity: item.variant.stock_quantity,
        variant_code: item.variant.variant_code,
      },
    })),
  };
}

async function getVariantForDraft(variantId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id,product_id,variant_code,is_active,price,product:products(id,is_active)"
    )
    .eq("id", variantId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as VariantRow & { product: ProductRow | null };
}

async function getOwnedDraftItem(userId: string, itemId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_items")
    .select(
      `${REQUEST_ITEM_COLUMNS},draft:order_drafts(id,created_by_user_id,status)`
    )
    .eq("id", itemId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const item = data as OrderItemRow & { draft: OrderDraftRow | null };

  if (item.draft?.created_by_user_id !== userId || item.draft.status !== "draft") {
    throw new Error("Talep listesi kalemi bulunamadı.");
  }

  return item;
}

async function recalculateDraftTotals(draftId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("line_total")
    .eq("order_draft_id", draftId);

  if (error) {
    throw new Error(error.message);
  }

  const subtotal = (data ?? []).reduce(
    (sum, item) => sum + Number(item.line_total),
    0
  );

  const { error: updateError } = await supabase
    .from("order_drafts")
    .update({
      subtotal,
      total: subtotal,
    })
    .eq("id", draftId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

async function writeDraftAuditLog({
  action,
  draftId,
  userId,
  value,
}: {
  action: string;
  draftId: string;
  userId: string;
  value: Json;
}) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("audit_logs").insert({
    action,
    entity_id: draftId,
    entity_type: "order_draft",
    new_value: value,
    user_id: userId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

function buildWhatsAppUrl(draft: RequestDraft, profile: Profile) {
  const paymentPreferenceLabel = customerPaymentPreferenceLabel(
    draft.customer_payment_preference
  );
  const customerNote = draft.customer_note?.trim();

  const lines = [
    "Merhaba DENTech Medikal,",
    "Aşağıdaki ürünler için sipariş/teklif talebi oluşturmak istiyorum:",
    "",
    ...draft.items.flatMap((item, index) => [
      `${index + 1}. Ürün: ${item.product.product_name}`,
      `   Varyant/Kod: ${item.variant.variant_code}`,
      `   Adet: ${item.quantity}`,
      `   Birim Fiyat: ${formatPlainAmount(item.unit_price)} TRY`,
      `   Ara Toplam: ${formatPlainAmount(item.line_total)} TRY`,
      "",
    ]),
    `Genel Toplam: ${formatPlainAmount(draft.total)} TRY`,
    "",
    `Ödeme Tercihi: ${paymentPreferenceLabel ?? "Daha sonra görüşülsün"}`,
    ...(customerNote ? ["Talep Notu:", customerNote, ""] : []),
    "Müşteri Bilgileri:",
    `Ad Soyad: ${profile.full_name ?? "-"}`,
    `E-posta: ${profile.email ?? "-"}`,
    `Telefon: ${profile.phone ?? "-"}`,
    "",
    "Not: Bu talep Dentech Pro üzerinden oluşturulmuştur.",
  ];

  return `https://wa.me/${DENTECH_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    lines.join("\n")
  )}`;
}

function calculateLineTotal(price: number, quantity: number) {
  return Number((price * quantity).toFixed(2));
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} pozitif tam sayı olmalıdır.`);
  }
}

function formatPlainAmount(value: number | null) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value ?? 0);
}

function filterRequestHistorySearch(
  drafts: RequestDraft[],
  query: string | undefined
) {
  const needle = query?.trim().toLocaleLowerCase("tr-TR");

  if (!needle) {
    return drafts;
  }

  return drafts.filter((draft) => {
    const haystack = [
      ...getRequestSearchTokens(draft),
      ...draft.items.flatMap((item) => [
        item.product.product_group_code,
        item.product.product_name,
        item.variant.manufacturer_ref,
        item.variant.variant_code,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("tr-TR");

    return haystack.includes(needle);
  });
}

function startOfDayIso(value: string) {
  return `${value}T00:00:00.000Z`;
}

function endOfDayIso(value: string) {
  return `${value}T23:59:59.999Z`;
}
