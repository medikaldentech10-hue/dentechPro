/**
 * Verifies admin request status transitions and stock side effects.
 *
 * Run:
 *   node scripts/verify-admin-request-stock.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");

await loadLocalEnv(path.join(projectRoot, ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const runId = `verify-admin-request-stock-${Date.now()}`;
const adminEmail = "verify-admin-request-stock@test.dentech.local";
const adminPassword = "VerifyAdmin123!";
const results = {
  failed: [],
  passed: [],
};

let adminUserId = null;
const cleanup = {
  auditDraftIds: new Set(),
  categoryIds: new Set(),
  customerIds: new Set(),
  draftIds: new Set(),
  productIds: new Set(),
  variantIds: new Set(),
};

function pass(message) {
  results.passed.push(message);
  console.log(`  ✓ ${message}`);
}

function fail(message) {
  results.failed.push(message);
  console.log(`  ✗ ${message}`);
}

function assert(condition, message) {
  if (condition) {
    pass(message);
    return;
  }

  fail(message);
}

async function main() {
  console.log("\n=== Admin request stock verification ===\n");

  adminUserId = await ensureAdminUser();
  pass(`Admin test user ready: ${adminEmail}`);

  const primary = await createFixture({
    itemQuantity: 3,
    stockQuantity: 10,
    suffix: "primary",
  });
  const initialStock = await getVariantStock(primary.variant.id);
  assert(initialStock === 10, "Initial stock saved");

  await updateStatusLikeAdminAction(primary.draft.id, "confirmed");
  assert(
    (await getVariantStock(primary.variant.id)) === 7,
    "draft -> confirmed decreases stock by quantity"
  );

  await updateStatusLikeAdminAction(primary.draft.id, "confirmed");
  assert(
    (await getVariantStock(primary.variant.id)) === 7,
    "confirmed -> confirmed does not decrease again"
  );
  assert(
    (await auditCount(primary.draft.id, "order_draft_stock_decreased")) === 1,
    "confirmed -> confirmed does not write duplicate decrease audit"
  );

  await updateStatusLikeAdminAction(primary.draft.id, "cancelled");
  assert(
    (await getVariantStock(primary.variant.id)) === 10,
    "confirmed -> cancelled restores stock"
  );

  await updateStatusLikeAdminAction(primary.draft.id, "confirmed");
  assert(
    (await getVariantStock(primary.variant.id)) === 7,
    "cancelled -> confirmed decreases stock again"
  );
  assert(
    (await auditCount(primary.draft.id, "order_draft_stock_decreased")) === 2,
    "second confirmation writes second decrease audit"
  );
  assert(
    (await auditCount(primary.draft.id, "order_draft_stock_restored")) === 1,
    "cancellation writes restore audit"
  );
  assert(
    (await auditCount(primary.draft.id, "order_draft_status_changed")) === 4,
    "status change audit logs written"
  );
  assert(
    (await getVariantStock(primary.variant.id)) >= 0,
    "stock never below 0 after valid transitions"
  );

  const insufficient = await createFixture({
    itemQuantity: 3,
    stockQuantity: 2,
    suffix: "insufficient",
  });
  const blocked = await expectRejects(() =>
    updateStatusLikeAdminAction(insufficient.draft.id, "confirmed")
  );
  assert(blocked, "insufficient stock blocks confirmation");
  assert(
    (await getVariantStock(insufficient.variant.id)) === 2,
    "insufficient stock attempt leaves stock unchanged"
  );
  assert(
    (await getDraftStatus(insufficient.draft.id)) === "draft",
    "insufficient stock attempt leaves draft status unchanged"
  );
  assert(
    (await getVariantStock(insufficient.variant.id)) >= 0,
    "stock never below 0 after insufficient stock attempt"
  );

  console.log("\n=== Summary ===\n");
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);

  if (results.failed.length) {
    console.log("\nFailures:");
    for (const message of results.failed) {
      console.log(`  - ${message}`);
    }
    process.exitCode = 1;
  }
}

async function ensureAdminUser() {
  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (listError) {
    throw new Error(`listUsers: ${listError.message}`);
  }

  let user = listData.users.find((item) => item.email === adminEmail);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      email_confirm: true,
      password: adminPassword,
      user_metadata: {
        full_name: "Verify Admin Request Stock",
        user_type: "other",
      },
    });

    if (error) {
      throw new Error(`createUser: ${error.message}`);
    }

    user = data.user;
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      can_view_prices: true,
      email: adminEmail,
      full_name: "Verify Admin Request Stock",
      id: user.id,
      is_active: true,
      phone: "905550000001",
      role: "admin",
      user_type: "other",
      verification_status: "approved",
    },
    { onConflict: "id" }
  );

  if (profileError) {
    throw new Error(`upsert admin profile: ${profileError.message}`);
  }

  return user.id;
}

async function createFixture({ itemQuantity, stockQuantity, suffix }) {
  const categorySlug = `${runId}-${suffix}`;
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .insert({
      name: `Verify Category ${suffix}`,
      slug: categorySlug,
      status: "active",
      sort_order: 9999,
    })
    .select("*")
    .single();

  if (categoryError) {
    throw new Error(`category insert: ${categoryError.message}`);
  }

  cleanup.categoryIds.add(category.id);

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      brand: "JOTA",
      category_id: category.id,
      product_group_code: `${runId}-${suffix}-product`,
      product_name: `Verify Stock Product ${suffix}`,
      is_active: true,
    })
    .select("*")
    .single();

  if (productError) {
    throw new Error(`product insert: ${productError.message}`);
  }

  cleanup.productIds.add(product.id);

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .insert({
      currency: "TRY",
      is_active: true,
      package_quantity: 1,
      price: 100,
      product_id: product.id,
      stock_quantity: stockQuantity,
      stock_status: getStockStatus(stockQuantity),
      variant_code: `${runId}-${suffix}-variant`,
    })
    .select("*")
    .single();

  if (variantError) {
    throw new Error(`variant insert: ${variantError.message}`);
  }

  cleanup.variantIds.add(variant.id);

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      customer_type: "clinic",
      email: `${runId}-${suffix}@test.dentech.local`,
      name: `Verify Customer ${suffix}`,
      phone: "905550000002",
    })
    .select("*")
    .single();

  if (customerError) {
    throw new Error(`customer insert: ${customerError.message}`);
  }

  cleanup.customerIds.add(customer.id);

  const { data: draft, error: draftError } = await supabase
    .from("order_drafts")
    .insert({
      created_by_user_id: adminUserId,
      customer_id: customer.id,
      source: "admin",
      status: "draft",
      subtotal: itemQuantity * 100,
      total: itemQuantity * 100,
    })
    .select("*")
    .single();

  if (draftError) {
    throw new Error(`draft insert: ${draftError.message}`);
  }

  cleanup.draftIds.add(draft.id);
  cleanup.auditDraftIds.add(draft.id);

  const { error: itemError } = await supabase.from("order_items").insert({
    line_total: itemQuantity * 100,
    order_draft_id: draft.id,
    quantity: itemQuantity,
    unit_price: 100,
    variant_id: variant.id,
  });

  if (itemError) {
    throw new Error(`item insert: ${itemError.message}`);
  }

  return { category, customer, draft, product, variant };
}

async function updateStatusLikeAdminAction(draftId, newStatus) {
  if (!isAdminRequestStatus(newStatus)) {
    throw new Error(`Invalid test status: ${newStatus}`);
  }

  const { data: oldDraft, error: oldDraftError } = await supabase
    .from("order_drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (oldDraftError) {
    throw new Error(`old draft lookup: ${oldDraftError.message}`);
  }

  await validateStockMovementLikeApp({ draft: oldDraft, newStatus });

  const { data: newDraft, error: updateError } = await supabase
    .from("order_drafts")
    .update({ status: newStatus })
    .eq("id", draftId)
    .select("*")
    .single();

  if (updateError) {
    throw new Error(`status update: ${updateError.message}`);
  }

  try {
    await applyStockMovementLikeApp({ draft: oldDraft, newStatus });
  } catch (error) {
    await supabase
      .from("order_drafts")
      .update({ status: oldDraft.status })
      .eq("id", draftId);
    throw error;
  }

  await insertAudit({
    action: "order_draft_status_changed",
    draftId,
    newValue: { status: newDraft.status },
    oldValue: { status: oldDraft.status },
  });
}

async function validateStockMovementLikeApp({ draft, newStatus }) {
  if (draft.status === "confirmed" && newStatus === "confirmed") {
    return;
  }

  if (draft.status !== "confirmed" && newStatus === "confirmed") {
    await assertStockAvailable(draft.id);
    return;
  }

  if (draft.status === "confirmed" && newStatus === "cancelled") {
    return;
  }

  if (draft.status === "confirmed" && newStatus !== "confirmed") {
    throw new Error("Confirmed requests can only remain confirmed or be cancelled.");
  }
}

async function applyStockMovementLikeApp({ draft, newStatus }) {
  if (draft.status === "confirmed" && newStatus === "confirmed") {
    return;
  }

  if (draft.status !== "confirmed" && newStatus === "confirmed") {
    await decreaseStock(draft.id);
    return;
  }

  if (draft.status === "confirmed" && newStatus === "cancelled") {
    await restoreStock(draft.id);
    return;
  }

  if (draft.status === "confirmed" && newStatus !== "confirmed") {
    throw new Error("Confirmed requests can only remain confirmed or be cancelled.");
  }
}

async function decreaseStock(draftId) {
  const activeItems = await assertStockAvailable(draftId);

  const movements = [];

  for (const item of activeItems) {
    const nextStock = item.variant.stock_quantity - item.quantity;
    const { error } = await supabase
      .from("product_variants")
      .update({
        stock_quantity: nextStock,
        stock_status: getStockStatus(nextStock),
      })
      .eq("id", item.variant.id);

    if (error) {
      throw new Error(`decrease stock: ${error.message}`);
    }

    movements.push({
      item_id: item.id,
      quantity: item.quantity,
      stock_after: nextStock,
      stock_before: item.variant.stock_quantity,
      variant_code: item.variant.variant_code,
      variant_id: item.variant.id,
    });
  }

  await insertAudit({
    action: "order_draft_stock_decreased",
    draftId,
    newValue: { movements },
  });
}

async function assertStockAvailable(draftId) {
  const items = await getStockItems(draftId);
  const activeItems = items.filter((item) => item.variant?.is_active);

  if (!activeItems.length) {
    throw new Error("No active items to decrease stock for.");
  }

  const insufficient = activeItems.filter(
    (item) => item.variant.stock_quantity < item.quantity
  );

  if (insufficient.length) {
    throw new Error(
      `Insufficient stock: ${insufficient
        .map((item) => item.variant.variant_code)
        .join(", ")}`
    );
  }

  return activeItems;
}

async function restoreStock(draftId) {
  const movements = await getLastDecreaseMovements(draftId);

  for (const movement of movements) {
    const { data: variant, error: variantError } = await supabase
      .from("product_variants")
      .select("id,stock_quantity")
      .eq("id", movement.variant_id)
      .single();

    if (variantError) {
      throw new Error(`restore variant lookup: ${variantError.message}`);
    }

    const nextStock = variant.stock_quantity + movement.quantity;
    const { error } = await supabase
      .from("product_variants")
      .update({
        stock_quantity: nextStock,
        stock_status: getStockStatus(nextStock),
      })
      .eq("id", movement.variant_id);

    if (error) {
      throw new Error(`restore stock: ${error.message}`);
    }
  }

  await insertAudit({
    action: "order_draft_stock_restored",
    draftId,
    newValue: { movements },
  });
}

async function getStockItems(draftId) {
  const { data, error } = await supabase
    .from("order_items")
    .select(
      "id,quantity,variant_id,variant:product_variants(id,is_active,stock_quantity,variant_code)"
    )
    .eq("order_draft_id", draftId);

  if (error) {
    throw new Error(`stock items: ${error.message}`);
  }

  return data ?? [];
}

async function getLastDecreaseMovements(draftId) {
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
    throw new Error(`decrease audit lookup: ${error.message}`);
  }

  return data?.new_value?.movements ?? [];
}

async function insertAudit({ action, draftId, newValue, oldValue = null }) {
  const { error } = await supabase.from("audit_logs").insert({
    action,
    entity_id: draftId,
    entity_type: "order_draft",
    new_value: newValue,
    old_value: oldValue,
    user_id: adminUserId,
  });

  if (error) {
    throw new Error(`audit ${action}: ${error.message}`);
  }
}

async function auditCount(draftId, action) {
  const { count, error } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact", head: true })
    .eq("entity_type", "order_draft")
    .eq("entity_id", draftId)
    .eq("action", action);

  if (error) {
    throw new Error(`audit count ${action}: ${error.message}`);
  }

  return count ?? 0;
}

async function getVariantStock(variantId) {
  const { data, error } = await supabase
    .from("product_variants")
    .select("stock_quantity")
    .eq("id", variantId)
    .single();

  if (error) {
    throw new Error(`variant stock lookup: ${error.message}`);
  }

  return data.stock_quantity;
}

async function getDraftStatus(draftId) {
  const { data, error } = await supabase
    .from("order_drafts")
    .select("status")
    .eq("id", draftId)
    .single();

  if (error) {
    throw new Error(`draft status lookup: ${error.message}`);
  }

  return data.status;
}

async function expectRejects(fn) {
  try {
    await fn();
    return false;
  } catch {
    return true;
  }
}

function isAdminRequestStatus(value) {
  return [
    "draft",
    "submitted",
    "contacted",
    "payment_pending",
    "confirmed",
    "cancelled",
  ].includes(value);
}

function getStockStatus(stockQuantity) {
  if (stockQuantity === 0) {
    return "out_of_stock";
  }

  if (stockQuantity <= 10) {
    return "low_stock";
  }

  return "in_stock";
}

async function cleanupFixtures() {
  for (const draftId of cleanup.auditDraftIds) {
    await supabase.from("audit_logs").delete().eq("entity_id", draftId);
  }

  for (const draftId of cleanup.draftIds) {
    await supabase.from("order_items").delete().eq("order_draft_id", draftId);
    await supabase.from("order_drafts").delete().eq("id", draftId);
  }

  for (const variantId of cleanup.variantIds) {
    await supabase.from("product_variants").delete().eq("id", variantId);
  }

  for (const productId of cleanup.productIds) {
    await supabase.from("products").delete().eq("id", productId);
  }

  for (const customerId of cleanup.customerIds) {
    await supabase.from("customers").delete().eq("id", customerId);
  }

  for (const categoryId of cleanup.categoryIds) {
    await supabase.from("categories").delete().eq("id", categoryId);
  }
}

async function loadLocalEnv(envPath) {
  try {
    const contents = await readFile(envPath, "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const rawValue = trimmedLine.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");

      process.env[key] ??= value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

try {
  await main();
} finally {
  await cleanupFixtures();
}
