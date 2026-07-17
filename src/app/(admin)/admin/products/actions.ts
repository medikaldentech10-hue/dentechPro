"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import type { Database, Json } from "@/lib/supabase/database.types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];
type VariantUpdate = Database["public"]["Tables"]["product_variants"]["Update"];

export async function updateProductAction(formData: FormData) {
  const startedAt = performance.now();
  const adminProfile = await requireApprovedAdmin();
  const productId = getRequiredString(formData, "product_id");
  const productGroupCode = getRequiredString(formData, "product_group_code");
  const productName = getRequiredString(formData, "product_name");
  const brand = getRequiredString(formData, "brand") || "JOTA";
  const categoryId = getOptionalString(formData, "category_id");

  if (!productId || !productGroupCode || !productName) {
    throw new Error("Ürün adı ve ürün kodu zorunludur.");
  }

  const supabase = getSupabaseAdminClient();
  await assertUniqueProductGroupCode(productGroupCode, productId);

  const { data: oldProduct, error: oldProductError } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (oldProductError) {
    throw new Error(oldProductError.message);
  }

  const patch: ProductUpdate = {
    brand,
    category_id: categoryId,
    description: getOptionalString(formData, "description"),
    image_url: getOptionalString(formData, "image_url"),
    is_active: formData.get("is_active") === "on",
    material_tags: parseCsv(formData, "material_tags"),
    procedure_tags: parseCsv(formData, "procedure_tags"),
    product_group_code: productGroupCode,
    product_name: productName,
    target_user_type: parseCsv(formData, "target_user_type"),
    usage_area: getOptionalString(formData, "usage_area"),
  };

  const { data: newProduct, error: updateError } = await supabase
    .from("products")
    .update(patch)
    .eq("id", productId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  await writeAuditLog({
    action: "product_updated",
    entityId: productId,
    entityType: "product",
    newValue: summarizeChangedFields(oldProduct, newProduct),
    userId: adminProfile.id,
  });

  revalidateProductPaths(productId, newProduct.product_group_code);
  logAdminPerf("admin.productSave", {
    durationMs: Math.round(performance.now() - startedAt),
    target: "product",
  });
  redirect(`/admin/products/${productId}?status=product-updated`);
}

export async function toggleProductActiveAction(formData: FormData) {
  const adminProfile = await requireApprovedAdmin();
  const productId = getRequiredString(formData, "product_id");
  const isActive = getRequiredString(formData, "is_active") === "true";

  if (!productId) {
    throw new Error("Ürün bulunamadı.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: oldProduct, error: oldProductError } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (oldProductError) {
    throw new Error(oldProductError.message);
  }

  const { data: newProduct, error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: isActive ? "product_activated" : "product_deactivated",
    entityId: productId,
    entityType: "product",
    newValue: summarizeChangedFields(oldProduct, newProduct),
    userId: adminProfile.id,
  });

  revalidateProductPaths(productId, newProduct.product_group_code);
  redirect(`/admin/products/${productId}?status=product-status-updated`);
}

export async function updateVariantAction(formData: FormData) {
  const startedAt = performance.now();
  const adminProfile = await requireApprovedAdmin();
  const productId = getRequiredString(formData, "product_id");
  const variantId = getRequiredString(formData, "variant_id");
  const variantCode = getRequiredString(formData, "variant_code");
  const price = parsePrice(formData, "price");
  const stockQuantity = parseStock(formData, "stock_quantity");
  const packageQuantity = parsePositiveInteger(formData, "package_quantity");

  if (!productId || !variantId || !variantCode) {
    throw new Error("Varyant kodu zorunludur.");
  }

  await assertUniqueVariantCode(variantCode, variantId);

  const supabase = getSupabaseAdminClient();
  const { data: oldVariant, error: oldVariantError } = await supabase
    .from("product_variants")
    .select("*")
    .eq("id", variantId)
    .eq("product_id", productId)
    .single();

  if (oldVariantError) {
    throw new Error(oldVariantError.message);
  }

  const patch: VariantUpdate = {
    color: getOptionalString(formData, "color"),
    connection_type: getOptionalString(formData, "connection_type"),
    currency: getOptionalString(formData, "currency") ?? "TRY",
    diameter: parseOptionalNumber(formData, "diameter"),
    grit: getOptionalString(formData, "grit"),
    image_url: getOptionalString(formData, "image_url"),
    length: parseOptionalNumber(formData, "length"),
    manufacturer_ref: getOptionalString(formData, "manufacturer_ref"),
    package_quantity: packageQuantity,
    price,
    stock_quantity: stockQuantity,
    stock_status: getStockStatus(stockQuantity),
    uts_no: getOptionalString(formData, "uts_no"),
    variant_code: variantCode,
  };

  const { data: newVariant, error } = await supabase
    .from("product_variants")
    .update(patch)
    .eq("id", variantId)
    .eq("product_id", productId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: "product_variant_updated",
    entityId: variantId,
    entityType: "product_variant",
    newValue: summarizeChangedFields(oldVariant, newVariant),
    userId: adminProfile.id,
  });

  await revalidateProductPathsForVariant(productId);
  logAdminPerf("admin.updateProductQuantity", {
    durationMs: Math.round(performance.now() - startedAt),
    target: "variant",
  });
  redirect(`/admin/products/${productId}?status=variant-updated`);
}

export async function deactivateVariantAction(formData: FormData) {
  const adminProfile = await requireApprovedAdmin();
  const productId = getRequiredString(formData, "product_id");
  const variantId = getRequiredString(formData, "variant_id");

  if (!productId || !variantId) {
    throw new Error("Varyant bulunamadı.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: oldVariant, error: oldVariantError } = await supabase
    .from("product_variants")
    .select("*")
    .eq("id", variantId)
    .eq("product_id", productId)
    .single();

  if (oldVariantError) {
    throw new Error(oldVariantError.message);
  }

  const { data: newVariant, error } = await supabase
    .from("product_variants")
    .update({ is_active: false })
    .eq("id", variantId)
    .eq("product_id", productId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: "product_variant_deactivated",
    entityId: variantId,
    entityType: "product_variant",
    newValue: summarizeChangedFields(oldVariant, newVariant),
    userId: adminProfile.id,
  });

  await revalidateProductPathsForVariant(productId);
  redirect(`/admin/products/${productId}?status=variant-status-updated`);
}

async function requireApprovedAdmin() {
  const profile = await requireAdmin();

  if (
    profile.role !== "admin" ||
    !profile.is_active ||
    profile.verification_status !== "approved"
  ) {
    throw new Error("Bu işlem için aktif admin yetkisi gerekir.");
  }

  return profile;
}

async function assertUniqueProductGroupCode(code: string, currentProductId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("product_group_code", code)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data && data.id !== currentProductId) {
    throw new Error("Bu ürün kodu başka bir üründe kullanılıyor.");
  }
}

async function assertUniqueVariantCode(code: string, currentVariantId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("id")
    .eq("variant_code", code)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data && data.id !== currentVariantId) {
    throw new Error("Bu varyant/SKU kodu başka bir varyantta kullanılıyor.");
  }
}

async function writeAuditLog({
  action,
  entityId,
  entityType,
  newValue,
  userId,
}: {
  action: string;
  entityId: string;
  entityType: string;
  newValue: Json;
  userId: string;
}) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("audit_logs").insert({
    action,
    entity_id: entityId,
    entity_type: entityType,
    new_value: newValue,
    user_id: userId,
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

async function revalidateProductPathsForVariant(productId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("product_group_code")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  revalidateProductPaths(productId, data?.product_group_code ?? null);
}

function revalidateProductPaths(productId: string, productSlug?: string | null) {
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  if (productSlug) {
    revalidatePath(`/products/${productSlug}`);
  }
}

function getRequiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = getRequiredString(formData, key);
  return value ? value : null;
}

function parseCsv(formData: FormData, key: string) {
  const value = getOptionalString(formData, key);

  if (!value) {
    return null;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePrice(formData: FormData, key: string) {
  const rawValue = getOptionalString(formData, key);

  if (!rawValue) {
    return null;
  }

  const value = Number(rawValue.replace(",", "."));

  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Fiyat 0 veya daha büyük sayısal bir değer olmalıdır.");
  }

  return value;
}

function parseStock(formData: FormData, key: string) {
  const value = Number(getRequiredString(formData, key));

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Stok 0 veya daha büyük tam sayı olmalıdır.");
  }

  return value;
}

function parsePositiveInteger(formData: FormData, key: string) {
  const rawValue = getOptionalString(formData, key);

  if (!rawValue) {
    return 1;
  }

  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Paket miktarı 1 veya daha büyük tam sayı olmalıdır.");
  }

  return value;
}

function parseOptionalNumber(formData: FormData, key: string) {
  const rawValue = getOptionalString(formData, key);

  if (!rawValue) {
    return null;
  }

  const value = Number(rawValue.replace(",", "."));

  if (!Number.isFinite(value)) {
    throw new Error(`${key} sayısal olmalıdır.`);
  }

  return value;
}

function getStockStatus(stockQuantity: number) {
  if (stockQuantity === 0) {
    return "out_of_stock";
  }

  if (stockQuantity <= 10) {
    return "low_stock";
  }

  return "in_stock";
}

function logAdminPerf(event: string, payload: Record<string, unknown>) {
  if (process.env.DENTECH_PERF_LOGS !== "true") {
    return;
  }

  console.info(`[${event}]`, payload);
}
