import "server-only";

import { canViewPrices, isAdmin, isApprovedUser, isSalesRep } from "@/lib/auth";
import { DENTECH_WHATSAPP_NUMBER } from "@/lib/config";
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

type DraftItemQueryRow = OrderItemRow & {
  variant: VariantRow & {
    product: ProductRow | null;
  };
};

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
    .select("*")
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
}

export async function removeDraftItem({
  itemId,
  profile,
}: {
  itemId: string;
  profile: Profile;
}) {
  assertCanCreateOrderRequest(profile);

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

export async function submitDraftToWhatsApp(profile: Profile) {
  assertCanCreateOrderRequest(profile);

  const draft = await getActiveRequestDraft(profile);

  if (!draft || draft.items.length === 0) {
    throw new Error("Talep listenizde ürün yok.");
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("order_drafts")
    .update({
      status: "whatsapp_approval_pending",
    })
    .eq("id", draft.id);

  if (error) {
    throw new Error(error.message);
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

  return buildWhatsAppUrl(draft, profile);
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
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function findDraft(userId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_drafts")
    .select("*")
    .eq("created_by_user_id", userId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function hydrateDraft(draft: OrderDraftRow): Promise<RequestDraft> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("*,variant:product_variants(*,product:products(*))")
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
    .select("*,product:products(*)")
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
    .select("*,draft:order_drafts(*)")
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
