import "server-only";

import { DENTECH_WHATSAPP_NUMBER } from "@/lib/config";
import {
  customerPaymentPreferenceLabel,
  type CustomerPaymentPreference,
} from "@/lib/customer-request-preferences";
import { getRequestDisplayNumber, getRequestSearchTokens } from "@/lib/request-numbers";
import type { Database, Json } from "@/lib/supabase/database.types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/auth";

type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type DraftRow = Database["public"]["Tables"]["order_drafts"]["Row"];
type ItemRow = Database["public"]["Tables"]["order_items"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];
type AuditLogRow = Database["public"]["Tables"]["audit_logs"]["Row"];
type AdminRequestCustomer = Pick<
  CustomerRow,
  | "assigned_sales_rep_id"
  | "city"
  | "company_name"
  | "customer_type"
  | "district"
  | "email"
  | "id"
  | "name"
  | "phone"
>;

const PAYMENT_NOTE_MARKER = "\n\n---DENTECH_ADMIN_PAYMENT---\n";
const ADMIN_REQUEST_DRAFT_COLUMNS =
  "id,request_number,created_by_user_id,customer_id,customer_note,customer_payment_preference,discount_total,note,source,status,subtotal,total,created_at,updated_at";
const ADMIN_REQUEST_ITEM_COLUMNS =
  "id,order_draft_id,variant_id,quantity,unit_price,line_total,created_at,updated_at";

export type AdminPaymentMethod = "iban" | "pos_link" | "cash" | "other";

export type AdminPaymentInfo = {
  method: AdminPaymentMethod | null;
  note: string;
  reference: string;
  updated_at: string | null;
};

export const adminPaymentMethods: AdminPaymentMethod[] = [
  "iban",
  "pos_link",
  "cash",
  "other",
];

export type AdminRequestStatus =
  | "draft"
  | "submitted"
  | "contacted"
  | "payment_pending"
  | "confirmed"
  | "cancelled";

export const adminRequestStatuses: AdminRequestStatus[] = [
  "draft",
  "submitted",
  "contacted",
  "payment_pending",
  "confirmed",
  "cancelled",
];

export type AdminRequestListItem = DraftRow & {
  customer: AdminRequestCustomer | null;
  itemCount: number;
  requester: Profile | null;
};

export type AdminRequestListFilters = {
  createdFrom?: string;
  createdTo?: string;
  search?: string;
  sort?: "newest" | "oldest" | "updated_newest" | "total_desc";
  source?: DraftRow["source"] | "all";
  status?: AdminRequestStatus | "all";
};

export type AdminRequestLine = ItemRow & {
  product: Pick<ProductRow, "id" | "product_group_code" | "product_name"> | null;
  variant: Pick<
    VariantRow,
    "currency" | "manufacturer_ref" | "variant_code"
  > | null;
};

export type AdminRequestDetail = DraftRow & {
  customer: AdminRequestCustomer | null;
  customerNote: string | null;
  customerPaymentPreference: CustomerPaymentPreference | null;
  items: AdminRequestLine[];
  paymentInfo: AdminPaymentInfo;
  requestNote: string | null;
  requester: Profile | null;
  salesRep: Profile | null;
};

type ItemQueryRow = ItemRow & {
  variant: (Pick<
    VariantRow,
    "currency" | "manufacturer_ref" | "variant_code"
  > & {
    product: Pick<ProductRow, "id" | "product_group_code" | "product_name"> | null;
  }) | null;
};

type StockMovement = {
  item_id: string;
  quantity: number;
  stock_after: number;
  stock_before: number;
  variant_code: string;
  variant_id: string;
};

type StockItemRow = ItemRow & {
  variant: Pick<
    VariantRow,
    "id" | "is_active" | "stock_quantity" | "stock_status" | "variant_code"
  > | null;
};

export function isAdminRequestStatus(value: string): value is AdminRequestStatus {
  return adminRequestStatuses.includes(value as AdminRequestStatus);
}

export function requestStatusLabel(status: string) {
  const labels: Record<string, string> = {
    cancelled: "İptal",
    confirmed: "Onaylandı",
    contacted: "İletişime Geçildi",
    draft: "Taslak",
    payment_pending: "Ödeme Bekliyor",
    submitted: "Gönderildi",
    whatsapp_approval_pending: "Gönderildi",
  };

  return labels[status] ?? status;
}

export function requestSourceLabel(source: DraftRow["source"]) {
  const labels: Record<DraftRow["source"], string> = {
    admin: "Admin",
    sales: "Saha",
    web: "Web",
    whatsapp: "WhatsApp",
  };

  return labels[source];
}

export function paymentMethodLabel(method: AdminPaymentMethod | null) {
  const labels: Record<AdminPaymentMethod, string> = {
    cash: "Nakit",
    iban: "IBAN / Havale",
    other: "Diğer",
    pos_link: "POS Link",
  };

  return method ? labels[method] : "Belirtilmedi";
}

export function customerPaymentPreferenceDisplay(
  value: CustomerPaymentPreference | null
) {
  return customerPaymentPreferenceLabel(value) ?? "Belirtilmedi";
}

export function isAdminPaymentMethod(
  value: string
): value is AdminPaymentMethod {
  return adminPaymentMethods.includes(value as AdminPaymentMethod);
}

export function buildAdminRequestWhatsAppMessage(request: AdminRequestDetail) {
  const lines = [
    "Merhaba DENTech Medikal,",
    "Aşağıdaki talep için takip mesajı oluşturuldu:",
    "",
    "Talep Bilgileri:",
    `Talep No: ${getRequestDisplayNumber(request)}`,
    `Durum: ${requestStatusLabel(request.status)}`,
    `Kaynak: ${requestSourceLabel(request.source)}`,
    `Oluşturma: ${formatDateTime(request.created_at)}`,
    "",
    "Müşteri Bilgileri:",
    `Ad / Ünvan: ${request.customer?.name ?? "-"}`,
    `Firma: ${request.customer?.company_name ?? "-"}`,
    `Telefon: ${request.customer?.phone ?? "-"}`,
    `E-posta: ${request.customer?.email ?? "-"}`,
    `Konum: ${[request.customer?.city, request.customer?.district]
      .filter(Boolean)
      .join(" / ") || "-"}`,
    "",
    "Talep Sahibi / Saha Bilgisi:",
    `Oluşturan: ${request.requester?.full_name ?? "-"}`,
    `Oluşturan E-posta: ${request.requester?.email ?? "-"}`,
    `Oluşturan Telefon: ${request.requester?.phone ?? "-"}`,
    `Saha Temsilcisi: ${request.salesRep?.full_name ?? "-"}`,
    `Temsilci E-posta: ${request.salesRep?.email ?? "-"}`,
    "",
    "Ürün Kalemleri:",
    ...request.items.flatMap((item, index) => [
      `${index + 1}. Ürün: ${item.product?.product_name ?? "Ürün"}`,
      `   Ürün Kodu: ${item.product?.product_group_code ?? "-"}`,
      `   Varyant/Kod: ${item.variant?.variant_code ?? "-"}`,
      `   Adet: ${item.quantity}`,
      `   Birim Fiyat: ${formatPlainAmount(item.unit_price)} TRY`,
      `   Ara Toplam: ${formatPlainAmount(item.line_total)} TRY`,
      "",
    ]),
    `Ara Toplam: ${formatPlainAmount(request.subtotal)} TRY`,
    `İndirim: ${formatPlainAmount(request.discount_total)} TRY`,
    `Genel Toplam: ${formatPlainAmount(request.total)} TRY`,
    "",
    "Not: Bu mesaj Dentech Pro admin panelinden hazırlanmıştır.",
  ];

  return lines.join("\n");
}

export function buildAdminRequestWhatsAppUrl(request: AdminRequestDetail) {
  return `https://wa.me/${DENTECH_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    buildAdminRequestWhatsAppMessage(request)
  )}`;
}

export async function getAdminRequestList(
  filters: AdminRequestListFilters = {}
): Promise<AdminRequestListItem[]> {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("order_drafts")
    .select(ADMIN_REQUEST_DRAFT_COLUMNS)
    .limit(100);

  if (filters.status && filters.status !== "all") {
    if (filters.status === "submitted") {
      query = query.in("status", ["submitted", "whatsapp_approval_pending"]);
    } else {
      query = query.eq("status", filters.status);
    }
  }

  if (filters.source && filters.source !== "all") {
    query = query.eq("source", filters.source);
  }

  if (filters.createdFrom) {
    query = query.gte("created_at", startOfDayIso(filters.createdFrom));
  }

  if (filters.createdTo) {
    query = query.lte("created_at", endOfDayIso(filters.createdTo));
  }

  if (filters.sort === "oldest") {
    query = query.order("created_at", { ascending: true });
  } else if (filters.sort === "total_desc") {
    query = query.order("total", { ascending: false });
  } else if (filters.sort === "updated_newest") {
    query = query.order("updated_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: drafts, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = drafts ?? [];
  const [customersById, profilesById, itemCounts] = await Promise.all([
    getCustomersByIds(rows.map((draft) => draft.customer_id)),
    getProfilesByIds(rows.map((draft) => draft.created_by_user_id)),
    getItemCounts(rows.map((draft) => draft.id)),
  ]);

  const hydratedRows = rows.map((draft) => ({
    ...draft,
    customer: draft.customer_id ? customersById.get(draft.customer_id) ?? null : null,
    itemCount: itemCounts.get(draft.id) ?? 0,
    requester: draft.created_by_user_id
      ? profilesById.get(draft.created_by_user_id) ?? null
      : null,
  }));

  return filterAdminRequestSearch(hydratedRows, filters.search);
}

export async function getAdminRequestDetail(
  draftId: string
): Promise<AdminRequestDetail | null> {
  const supabase = getSupabaseAdminClient();
  const { data: draft, error } = await supabase
    .from("order_drafts")
    .select(ADMIN_REQUEST_DRAFT_COLUMNS)
    .eq("id", draftId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!draft) {
    return null;
  }

  const [customersById, profilesById, items] = await Promise.all([
    getCustomersByIds([draft.customer_id]),
    getProfilesByIds([draft.created_by_user_id]),
    getDraftItems(draft.id),
  ]);

  const customer = draft.customer_id
    ? customersById.get(draft.customer_id) ?? null
    : null;
  const requester = draft.created_by_user_id
    ? profilesById.get(draft.created_by_user_id) ?? null
    : null;

  const salesRepId = customer?.assigned_sales_rep_id ?? null;
  const salesRep = salesRepId
    ? profilesById.get(salesRepId) ??
      (await getProfilesByIds([salesRepId])).get(salesRepId) ??
      null
    : requester?.role === "sales_rep"
      ? requester
      : null;

  return {
    ...draft,
    customer,
    customerNote: draft.customer_note?.trim() || null,
    customerPaymentPreference: draft.customer_payment_preference,
    items,
    paymentInfo: extractAdminPaymentInfo(draft.note),
    requestNote: extractRequestNote(draft.note),
    requester,
    salesRep,
  };
}

export async function updateRequestPaymentInfo({
  adminProfile,
  method,
  note,
  reference,
  requestNote,
  requestId,
}: {
  adminProfile: Profile;
  method: AdminPaymentMethod | null;
  note: string;
  reference: string;
  requestNote: string | null;
  requestId: string;
}) {
  const supabase = getSupabaseAdminClient();
  const { data: oldDraft, error: oldDraftError } = await supabase
    .from("order_drafts")
    .select("*")
    .eq("id", requestId)
    .single();

  if (oldDraftError) {
    throw new Error(oldDraftError.message);
  }

  const oldPaymentInfo = extractAdminPaymentInfo(oldDraft.note);
  const nextPaymentInfo: AdminPaymentInfo = {
    method,
    note,
    reference,
    updated_at: new Date().toISOString(),
  };

  const { data: newDraft, error: updateError } = await supabase
    .from("order_drafts")
    .update({
      note: serializeDraftNote({
        paymentInfo: nextPaymentInfo,
        requestNote,
      }),
    })
    .eq("id", requestId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  await writeRequestPaymentAudit({
    adminProfile,
    newPaymentInfo: nextPaymentInfo,
    oldPaymentInfo,
    requestId: newDraft.id,
  });
}

export async function writeRequestPaymentAudit({
  adminProfile,
  newPaymentInfo,
  oldPaymentInfo,
  requestId,
}: {
  adminProfile: Profile;
  newPaymentInfo: AdminPaymentInfo;
  oldPaymentInfo: AdminPaymentInfo;
  requestId: string;
}) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("audit_logs").insert({
    action: "order_draft_payment_info_updated",
    entity_id: requestId,
    entity_type: "order_draft",
    old_value: toJson({ payment_info: oldPaymentInfo }),
    new_value: toJson({ payment_info: newPaymentInfo }),
    user_id: adminProfile.id,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function writeRequestStatusAudit({
  adminProfile,
  newDraft,
  oldDraft,
}: {
  adminProfile: Profile;
  newDraft: DraftRow;
  oldDraft: DraftRow;
}) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("audit_logs").insert({
    action: "order_draft_status_changed",
    entity_id: oldDraft.id,
    entity_type: "order_draft",
    old_value: toJson({ status: oldDraft.status }),
    new_value: toJson({ status: newDraft.status }),
    user_id: adminProfile.id,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function applyRequestStockMovement({
  adminProfile,
  newStatus,
  oldDraft,
}: {
  adminProfile: Profile;
  newStatus: AdminRequestStatus;
  oldDraft: DraftRow;
}) {
  if (oldDraft.status === "confirmed" && newStatus === "confirmed") {
    return;
  }

  if (oldDraft.status !== "confirmed" && newStatus === "confirmed") {
    await decreaseRequestStock({ adminProfile, draftId: oldDraft.id });
    return;
  }

  if (oldDraft.status === "confirmed" && newStatus === "cancelled") {
    await restoreRequestStock({ adminProfile, draftId: oldDraft.id });
    return;
  }

  if (oldDraft.status === "confirmed" && newStatus !== "confirmed") {
    throw new Error(
      "Onaylanmış talep yalnızca iptal edilebilir veya onaylı kalabilir."
    );
  }
}

export async function validateRequestStockMovement({
  newStatus,
  oldDraft,
}: {
  newStatus: AdminRequestStatus;
  oldDraft: DraftRow;
}) {
  if (oldDraft.status === "confirmed" && newStatus === "confirmed") {
    return;
  }

  if (oldDraft.status !== "confirmed" && newStatus === "confirmed") {
    await assertRequestStockAvailable(oldDraft.id);
    return;
  }

  if (oldDraft.status === "confirmed" && newStatus !== "confirmed") {
    if (newStatus === "cancelled") {
      return;
    }

    throw new Error(
      "Onaylanmış talep yalnızca iptal edilebilir veya onaylı kalabilir."
    );
  }
}

async function decreaseRequestStock({
  adminProfile,
  draftId,
}: {
  adminProfile: Profile;
  draftId: string;
}) {
  const supabase = getSupabaseAdminClient();
  const activeItems = await assertRequestStockAvailable(draftId);

  const movements: StockMovement[] = [];

  for (const item of activeItems) {
    const variant = item.variant;

    if (!variant) {
      continue;
    }

    const nextStock = variant.stock_quantity - item.quantity;
    const { error } = await supabase
      .from("product_variants")
      .update({
        stock_quantity: nextStock,
        stock_status: getStockStatus(nextStock),
      })
      .eq("id", variant.id);

    if (error) {
      throw new Error(error.message);
    }

    movements.push({
      item_id: item.id,
      quantity: item.quantity,
      stock_after: nextStock,
      stock_before: variant.stock_quantity,
      variant_code: variant.variant_code,
      variant_id: variant.id,
    });
  }

  await writeStockAuditLog({
    action: "order_draft_stock_decreased",
    adminProfile,
    draftId,
    movements,
  });
}

async function assertRequestStockAvailable(draftId: string) {
  const items = await getStockItems(draftId);
  const activeItems = items.filter((item) => item.variant?.is_active);

  if (!activeItems.length) {
    throw new Error("Stok düşülecek aktif ürün kalemi bulunamadı.");
  }

  const insufficientItems = activeItems.filter((item) => {
    const stock = item.variant?.stock_quantity ?? 0;
    return stock < item.quantity;
  });

  if (insufficientItems.length) {
    const codes = insufficientItems
      .map((item) => item.variant?.variant_code ?? item.variant_id)
      .join(", ");
    throw new Error(`Yetersiz stok nedeniyle talep onaylanamadı: ${codes}`);
  }

  return activeItems;
}

async function restoreRequestStock({
  adminProfile,
  draftId,
}: {
  adminProfile: Profile;
  draftId: string;
}) {
  const movements = await getLastStockDecreaseMovements(draftId);

  if (!movements.length) {
    return;
  }

  const supabase = getSupabaseAdminClient();

  for (const movement of movements) {
    const { data: variant, error: variantError } = await supabase
      .from("product_variants")
      .select("id,stock_quantity,variant_code")
      .eq("id", movement.variant_id)
      .single();

    if (variantError) {
      throw new Error(variantError.message);
    }

    const nextStock = variant.stock_quantity + movement.quantity;
    const { error } = await supabase
      .from("product_variants")
      .update({
        stock_quantity: nextStock,
        stock_status: getStockStatus(nextStock),
      })
      .eq("id", variant.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  await writeStockAuditLog({
    action: "order_draft_stock_restored",
    adminProfile,
    draftId,
    movements,
  });
}

async function getDraftItems(draftId: string): Promise<AdminRequestLine[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_items")
    .select(
      `${ADMIN_REQUEST_ITEM_COLUMNS},variant:product_variants(currency,manufacturer_ref,variant_code,product:products(id,product_group_code,product_name))`
    )
    .eq("order_draft_id", draftId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as ItemQueryRow[]).map((item) => ({
    ...item,
    product: item.variant?.product
      ? {
          id: item.variant.product.id,
          product_group_code: item.variant.product.product_group_code,
          product_name: item.variant.product.product_name,
        }
      : null,
    variant: item.variant
      ? {
          currency: item.variant.currency,
          manufacturer_ref: item.variant.manufacturer_ref,
          variant_code: item.variant.variant_code,
        }
      : null,
  }));
}

async function getStockItems(draftId: string): Promise<StockItemRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("order_items")
    .select(
      `${ADMIN_REQUEST_ITEM_COLUMNS},variant:product_variants(id,is_active,stock_quantity,stock_status,variant_code)`
    )
    .eq("order_draft_id", draftId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as StockItemRow[];
}

async function getLastStockDecreaseMovements(draftId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("new_value")
    .eq("entity_type", "order_draft")
    .eq("entity_id", draftId)
    .eq("action", "order_draft_stock_decreased")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return parseStockMovements(data);
}

async function writeStockAuditLog({
  action,
  adminProfile,
  draftId,
  movements,
}: {
  action: "order_draft_stock_decreased" | "order_draft_stock_restored";
  adminProfile: Profile;
  draftId: string;
  movements: StockMovement[];
}) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("audit_logs").insert({
    action,
    entity_id: draftId,
    entity_type: "order_draft",
    new_value: toJson({ movements }),
    user_id: adminProfile.id,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function getItemCounts(draftIds: string[]) {
  const supabase = getSupabaseAdminClient();
  const ids = uniqueStrings(draftIds);
  const counts = new Map<string, number>();

  if (!ids.length) {
    return counts;
  }

  const { data, error } = await supabase
    .from("order_items")
    .select("order_draft_id")
    .in("order_draft_id", ids);

  if (error) {
    throw new Error(error.message);
  }

  for (const item of data ?? []) {
    counts.set(item.order_draft_id, (counts.get(item.order_draft_id) ?? 0) + 1);
  }

  return counts;
}

async function getCustomersByIds(ids: Array<string | null>) {
  const supabase = getSupabaseAdminClient();
  const customerIds = uniqueStrings(ids);
  const customers = new Map<string, AdminRequestCustomer>();

  if (!customerIds.length) {
    return customers;
  }

  const { data, error } = await supabase
    .from("customers")
    .select(
      "id,assigned_sales_rep_id,city,company_name,customer_type,district,email,name,phone"
    )
    .in("id", customerIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const customer of data ?? []) {
    customers.set(customer.id, customer);
  }

  return customers;
}

async function getProfilesByIds(ids: Array<string | null>) {
  const supabase = getSupabaseAdminClient();
  const profileIds = uniqueStrings(ids);
  const profiles = new Map<string, Profile>();

  if (!profileIds.length) {
    return profiles;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,email,full_name,is_active,phone,requested_role,clinic_name,company_name,city,district,specialty,role,user_type,verification_status,can_view_prices,created_at,updated_at"
    )
    .in("id", profileIds);

  if (error) {
    throw new Error(error.message);
  }

  for (const profile of data ?? []) {
    profiles.set(profile.id, profile);
  }

  return profiles;
}

function uniqueStrings(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function filterAdminRequestSearch(
  rows: AdminRequestListItem[],
  search?: string
) {
  const needle = search?.trim().toLocaleLowerCase("tr-TR");

  if (!needle) {
    return rows;
  }

  return rows.filter((row) => {
    const haystack = [
      ...getRequestSearchTokens(row),
      row.customer?.name,
      row.customer?.company_name,
      row.customer?.phone,
      row.customer?.email,
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

function parseStockMovements(
  auditLog: Pick<AuditLogRow, "new_value"> | null
): StockMovement[] {
  const value = auditLog?.new_value;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const movements = value.movements;

  if (!Array.isArray(movements)) {
    return [];
  }

  return movements.filter(isStockMovement);
}

function isStockMovement(value: Json): value is StockMovement {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.item_id === "string" &&
    typeof value.quantity === "number" &&
    typeof value.stock_after === "number" &&
    typeof value.stock_before === "number" &&
    typeof value.variant_code === "string" &&
    typeof value.variant_id === "string"
  );
}

function getStockStatus(stockQuantity: number): VariantRow["stock_status"] {
  if (stockQuantity === 0) {
    return "out_of_stock";
  }

  if (stockQuantity <= 10) {
    return "low_stock";
  }

  return "in_stock";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPlainAmount(value: number | null) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value ?? 0);
}

function extractAdminPaymentInfo(note: string | null): AdminPaymentInfo {
  if (!note?.includes(PAYMENT_NOTE_MARKER)) {
    return emptyPaymentInfo();
  }

  const [, paymentPayload] = note.split(PAYMENT_NOTE_MARKER);

  if (!paymentPayload) {
    return emptyPaymentInfo();
  }

  try {
    const parsed = JSON.parse(paymentPayload) as Partial<AdminPaymentInfo>;
    const method =
      typeof parsed.method === "string" && isAdminPaymentMethod(parsed.method)
        ? parsed.method
        : null;

    return {
      method,
      note: typeof parsed.note === "string" ? parsed.note : "",
      reference: typeof parsed.reference === "string" ? parsed.reference : "",
      updated_at:
        typeof parsed.updated_at === "string" ? parsed.updated_at : null,
    };
  } catch {
    return emptyPaymentInfo();
  }
}

function extractRequestNote(note: string | null) {
  if (!note) {
    return null;
  }

  const [requestNote] = note.split(PAYMENT_NOTE_MARKER);
  const trimmed = requestNote.trim();
  return trimmed || null;
}

function serializeDraftNote({
  paymentInfo,
  requestNote,
}: {
  paymentInfo: AdminPaymentInfo;
  requestNote: string | null;
}) {
  const baseNote = requestNote?.trim() ?? "";
  const paymentPayload = JSON.stringify(paymentInfo);
  return `${baseNote}${PAYMENT_NOTE_MARKER}${paymentPayload}`;
}

function emptyPaymentInfo(): AdminPaymentInfo {
  return {
    method: null,
    note: "",
    reference: "",
    updated_at: null,
  };
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
