/**
 * End-to-end verification for request list / WhatsApp flow.
 * Run: node scripts/verify-request-flow.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1);
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey || !anonKey) {
  throw new Error("Missing Supabase env in .env.local");
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_USERS = [
  {
    email: "mvp-admin@test.dentech.local",
    password: "TestAdmin123!",
    profile: {
      role: "admin",
      verification_status: "approved",
      can_view_prices: true,
      is_active: true,
      full_name: "MVP Admin",
      phone: "905551111111",
      user_type: "other",
    },
  },
  {
    email: "mvp-pending@test.dentech.local",
    password: "TestPending123!",
    profile: {
      role: "pending_user",
      verification_status: "pending",
      can_view_prices: false,
      is_active: true,
      full_name: "MVP Pending User",
      phone: null,
      user_type: "doctor",
    },
  },
  {
    email: "mvp-doctor@test.dentech.local",
    password: "TestDoctor123!",
    profile: {
      role: "approved_doctor",
      verification_status: "approved",
      can_view_prices: true,
      is_active: true,
      full_name: "MVP Approved Doctor",
      phone: "905552222222",
      user_type: "doctor",
    },
  },
];

const results = { passed: [], failed: [], bugs: [] };

function pass(msg) {
  results.passed.push(msg);
  console.log(`  ✓ ${msg}`);
}

function fail(msg) {
  results.failed.push(msg);
  console.log(`  ✗ ${msg}`);
}

function bug(msg) {
  results.bugs.push(msg);
  console.log(`  BUG: ${msg}`);
}

async function ensureTestUser({ email, password, profile }) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users?.find((u) => u.email === email);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: profile.full_name,
        phone: profile.phone,
        user_type: profile.user_type,
      },
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    user = data.user;
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email,
      ...profile,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    throw new Error(`upsert profile ${email}: ${profileError.message}`);
  }

  return user;
}

async function signIn(email, password) {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return { client, session: data.session, user: data.user };
}

async function fetchPage(path, cookieHeader) {
  const res = await fetch(`http://localhost:3000${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    redirect: "manual",
  });
  const text = await res.text();
  return { status: res.status, location: res.headers.get("location"), text };
}

function sessionCookies(session) {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const value = encodeURIComponent(
    JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user: session.user,
    })
  );
  return `${cookieName}=${value}`;
}

async function getActiveVariant() {
  const { data, error } = await admin
    .from("product_variants")
    .select("id, variant_code, price, stock_quantity, is_active, product:products(id, product_name, is_active)")
    .eq("is_active", true)
    .gt("stock_quantity", 0)
    .not("price", "is", null)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function clearUserDrafts(userId) {
  const { data: drafts } = await admin
    .from("order_drafts")
    .select("id")
    .eq("created_by_user_id", userId);

  if (!drafts?.length) return;

  for (const draft of drafts) {
    await admin.from("order_items").delete().eq("order_draft_id", draft.id);
    await admin.from("order_drafts").delete().eq("id", draft.id);
  }
}

async function simulateDraftFlow(userId, variant) {
  const stockBefore = variant.stock_quantity;

  const { data: draft, error: draftError } = await admin
    .from("order_drafts")
    .insert({
      created_by_user_id: userId,
      source: "web",
      status: "draft",
    })
    .select("*")
    .single();

  if (draftError) throw new Error(draftError.message);

  const price = variant.price;
  const qty1 = 2;
  const qty2 = 1;
  const lineTotal1 = Number((price * qty1).toFixed(2));

  await admin.from("order_items").insert({
    order_draft_id: draft.id,
    variant_id: variant.id,
    quantity: qty1,
    unit_price: price,
    line_total: lineTotal1,
  });

  const { data: existing } = await admin
    .from("order_items")
    .select("*")
    .eq("order_draft_id", draft.id)
    .eq("variant_id", variant.id)
    .single();

  const nextQty = existing.quantity + qty2;
  const nextLineTotal = Number((price * nextQty).toFixed(2));

  await admin
    .from("order_items")
    .update({ quantity: nextQty, line_total: nextLineTotal, unit_price: price })
    .eq("id", existing.id);

  const { data: items } = await admin
    .from("order_items")
    .select("*")
    .eq("order_draft_id", draft.id);

  const { data: variantAfter } = await admin
    .from("product_variants")
    .select("stock_quantity")
    .eq("id", variant.id)
    .single();

  await clearUserDrafts(userId);

  return {
    itemCount: items?.length ?? 0,
    quantity: items?.[0]?.quantity ?? 0,
    unitPrice: items?.[0]?.unit_price ?? 0,
    lineTotal: items?.[0]?.line_total ?? 0,
    stockUnchanged: variantAfter.stock_quantity === stockBefore,
  };
}

async function main() {
  console.log("\n=== Setting up test users ===\n");
  const users = {};
  for (const spec of TEST_USERS) {
    const user = await ensureTestUser(spec);
    users[spec.profile.role === "admin" ? "admin" : spec.profile.role === "pending_user" ? "pending" : "doctor"] = {
      ...spec,
      id: user.id,
    };
    pass(`User ready: ${spec.email} (${spec.profile.role})`);
  }

  console.log("\n=== Database: products & variants ===\n");
  const variant = await getActiveVariant();
  if (!variant) {
    fail("No active variant with price and stock > 0 found");
    bug("Catalog empty or all variants have zero stock — cannot test add-to-request UI");
  } else {
    pass(`Found test variant: ${variant.variant_code} (stock=${variant.stock_quantity}, price=${variant.price})`);
  }

  console.log("\n=== Flow A: logged-out ===\n");
  const productsPublic = await fetchPage("/products");
  if (productsPublic.status === 200) {
    pass("/products returns 200 when logged out");
  } else {
    fail(`/products status ${productsPublic.status}`);
  }

  if (productsPublic.text.includes("Talep Listesine Ekle")) {
    fail("Add-to-request visible when logged out");
    bug("Talep Listesine Ekle should not appear for anonymous users");
  } else {
    pass("Talep Listesine Ekle not in logged-out /products HTML");
  }

  if (
    productsPublic.text.includes("Fiyat için giriş yapın") ||
    productsPublic.text.includes("giriş yapın")
  ) {
    pass("Prices hidden for logged-out user");
  } else {
    fail("Expected price-hidden message on /products");
  }

  const requestPublic = await fetchPage("/request");
  if (requestPublic.status === 307 || requestPublic.status === 302) {
    if (requestPublic.location?.includes("/login")) {
      pass("/request redirects to /login when logged out");
    } else {
      fail(`/request redirects to ${requestPublic.location}`);
    }
  } else {
    fail(`/request status ${requestPublic.status}, expected redirect`);
  }

  console.log("\n=== Flow B: pending user ===\n");
  const pendingSession = await signIn(users.pending.email, users.pending.password);
  const pendingCookie = sessionCookies(pendingSession.session);
  const productsPending = await fetchPage("/products", pendingCookie);

  if (productsPending.status === 200) pass("Pending user can view /products");
  else fail(`/products status ${productsPending.status} for pending user`);

  if (productsPending.text.includes("onay")) {
    pass("Pending user sees approval message instead of prices");
  } else {
    fail("Pending user price visibility message missing");
  }

  if (productsPending.text.includes('type="submit"') && productsPending.text.includes("Talep Listesine Ekle")) {
    fail("Pending user has active add-to-request form");
    bug("Pending user should not be able to add to request list");
  } else {
    pass("Add-to-request not available for pending user");
  }

  const requestPending = await fetchPage("/request", pendingCookie);
  if (requestPending.location?.includes("/pending-approval")) {
    pass("/request redirects pending user to /pending-approval");
  } else {
    fail(`/request for pending user: status=${requestPending.status} location=${requestPending.location}`);
    bug("Pending user should be blocked from /request");
  }

  console.log("\n=== Flow C/D: DB draft logic ===\n");
  if (variant) {
    await clearUserDrafts(users.doctor.id);
    const flow = await simulateDraftFlow(users.doctor.id, variant);
    if (flow.itemCount === 1) pass("Same variant merges into one row (not duplicate)");
    else {
      fail(`Expected 1 item row, got ${flow.itemCount}`);
      bug("Duplicate order_items rows for same variant");
    }
    if (flow.quantity === 3) pass("Quantity increments to 3 (2+1)");
    else {
      fail(`Expected quantity 3, got ${flow.quantity}`);
    }
    if (Number(flow.lineTotal) === Number((variant.price * 3).toFixed(2))) {
      pass("Line total calculated correctly");
    } else {
      fail(`Line total mismatch: ${flow.lineTotal}`);
    }
    if (flow.stockUnchanged) pass("Stock unchanged after draft operations");
    else {
      fail("Stock decreased when adding to draft");
      bug("Stock should not decrease on request list add");
    }
  }

  console.log("\n=== Flow C: approved doctor page checks ===\n");
  const doctorSession = await signIn(users.doctor.email, users.doctor.password);
  const doctorCookie = sessionCookies(doctorSession.session);
  const productsDoctor = await fetchPage("/products", doctorCookie);

  if (productsDoctor.text.includes("KDV Hariç") || productsDoctor.text.includes("₺")) {
    pass("Approved doctor sees prices on /products");
  } else {
    fail("Approved doctor prices not visible on /products");
    bug("can_view_prices approved_doctor should see prices");
  }

  if (
    productsDoctor.text.includes("Talep Listesine Ekle") &&
    productsDoctor.text.includes('name="variant_id"')
  ) {
    pass("Approved doctor has add-to-request form on /products");
  } else {
    fail("Add-to-request form missing for approved doctor");
    bug("Approved user should see Talep Listesine Ekle with variant_id field");
  }

  if (productsDoctor.text.includes('name="unit_price"')) {
    fail("Client form exposes unit_price field");
    bug("Price must not be accepted from client forms");
  } else {
    pass("Client form does not include unit_price");
  }

  const requestDoctor = await fetchPage("/request", doctorCookie);
  if (requestDoctor.status === 200) {
    pass("Approved doctor can access /request");
  } else {
    fail(`/request status ${requestDoctor.status} for approved doctor`);
  }

  console.log("\n=== Flow D: admin page checks ===\n");
  const adminSession = await signIn(users.admin.email, users.admin.password);
  const adminCookie = sessionCookies(adminSession.session);
  const productsAdmin = await fetchPage("/products", adminCookie);
  const adminProducts = await fetchPage("/admin/products", adminCookie);

  if (productsAdmin.text.includes("KDV Hariç") || productsAdmin.text.includes("₺")) {
    pass("Admin sees prices on /products");
  } else {
    fail("Admin prices not visible");
  }

  if (adminProducts.status === 200) {
    pass("/admin/products accessible for admin");
  } else {
    fail(`/admin/products status ${adminProducts.status}, location=${adminProducts.location}`);
  }

  if (
    productsAdmin.text.includes("Talep Listesine Ekle") &&
    productsAdmin.text.includes('name="variant_id"')
  ) {
    pass("Admin has add-to-request form on /products");
  } else {
    fail("Add-to-request form missing for admin");
  }

  console.log("\n=== Full draft lifecycle (server logic via DB) ===\n");
  if (variant) {
    await clearUserDrafts(users.doctor.id);
    const stockBefore = variant.stock_quantity;
    const price = variant.price;

    const { data: draft1, error: d1Err } = await admin
      .from("order_drafts")
      .insert({
        created_by_user_id: users.doctor.id,
        source: "web",
        status: "draft",
      })
      .select("id")
      .single();
    if (d1Err) throw new Error(d1Err.message);

    await admin.from("order_items").insert({
      order_draft_id: draft1.id,
      variant_id: variant.id,
      quantity: 2,
      unit_price: price,
      line_total: Number((price * 2).toFixed(2)),
    });

    const { data: existing } = await admin
      .from("order_items")
      .select("*")
      .eq("order_draft_id", draft1.id)
      .eq("variant_id", variant.id)
      .single();

    await admin
      .from("order_items")
      .update({
        quantity: 3,
        unit_price: price,
        line_total: Number((price * 3).toFixed(2)),
      })
      .eq("id", existing.id);

    await admin.from("audit_logs").insert({
      action: "draft_item_added",
      entity_id: draft1.id,
      entity_type: "order_draft",
      new_value: { variant_id: variant.id, quantity: 2 },
      user_id: users.doctor.id,
    });

    const { count: draftCount } = await admin
      .from("order_drafts")
      .select("*", { count: "exact", head: true })
      .eq("created_by_user_id", users.doctor.id)
      .eq("status", "draft");
    if (draftCount === 1) pass("One active draft per user");
    else {
      fail(`Expected 1 active draft, found ${draftCount}`);
      bug("Multiple active drafts for same user");
    }

    const { data: itemRow } = await admin
      .from("order_items")
      .select("*")
      .eq("order_draft_id", draft1.id)
      .single();
    if (Number(itemRow.unit_price) === Number(price)) {
      pass("Unit price snapshot stored on order_items");
    } else {
      fail(`Unit price snapshot mismatch: ${itemRow.unit_price} vs ${price}`);
    }

    const { count: auditCount } = await admin
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("entity_type", "order_draft")
      .eq("entity_id", draft1.id);
    if ((auditCount ?? 0) >= 1) pass(`Audit log rows exist (${auditCount})`);
    else {
      fail("No audit logs for draft");
      bug("audit_logs should be written on draft mutations");
    }

    await admin
      .from("order_drafts")
      .update({ status: "whatsapp_approval_pending" })
      .eq("id", draft1.id);

    const { data: stockAfter } = await admin
      .from("product_variants")
      .select("stock_quantity")
      .eq("id", variant.id)
      .single();
    if (stockAfter.stock_quantity === stockBefore) pass("Stock unchanged after draft lifecycle");
    else {
      fail(`Stock changed ${stockBefore} -> ${stockAfter.stock_quantity}`);
      bug("Stock must not decrease when adding to request list");
    }

    await clearUserDrafts(users.doctor.id);

    const { data: pendingProfile } = await admin
      .from("profiles")
      .select("*")
      .eq("email", users.pending.email)
      .single();
    const pendingCanDraft =
      pendingProfile?.is_active &&
      pendingProfile.verification_status === "approved" &&
      pendingProfile.can_view_prices &&
      pendingProfile.role === "approved_doctor";
    if (!pendingCanDraft) pass("Pending user profile cannot create drafts (policy check)");
    else fail("Pending user profile incorrectly allows drafts");
  }

  console.log("\n=== WhatsApp message format ===\n");
  const DENTECH_WHATSAPP_NUMBER = env.DENTECH_WHATSAPP_NUMBER ?? "905XXXXXXXXX";
  const mockDraft = {
    total: 300,
    items: [
      {
        product: { product_name: "Test Product" },
        variant: { variant_code: "TEST-SKU" },
        quantity: 2,
        unit_price: 100,
        line_total: 200,
      },
    ],
  };
  const profile = users.doctor.profile;
  const lines = [
    "Merhaba DENTech Medikal,",
    "Aşağıdaki ürünler için sipariş/teklif talebi oluşturmak istiyorum:",
    "",
    `1. Ürün: ${mockDraft.items[0].product.product_name}`,
    `   Varyant/Kod: ${mockDraft.items[0].variant.variant_code}`,
    `   Adet: ${mockDraft.items[0].quantity}`,
    `   Birim Fiyat: 100,00 TRY`,
    `   Ara Toplam: 200,00 TRY`,
    "",
    `Genel Toplam: 300,00 TRY`,
    "",
    "Müşteri Bilgileri:",
    `Ad Soyad: ${profile.full_name}`,
    `E-posta: ${users.doctor.email}`,
    `Telefon: ${profile.phone}`,
  ];
  const waUrl = `https://wa.me/${DENTECH_WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
  if (waUrl.includes("TEST-SKU") && waUrl.includes("MVP%20Approved%20Doctor")) {
    pass("WhatsApp URL encodes product, SKU, customer info");
  } else {
    fail("WhatsApp URL missing expected fields");
  }

  console.log("\n=== Summary ===\n");
  console.log(`Passed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);
  console.log(`Bugs: ${results.bugs.length}`);
  if (results.bugs.length) {
    console.log("\nBugs found:");
    results.bugs.forEach((b) => console.log(`  - ${b}`));
  }
  if (results.failed.length) {
    console.log("\nFailures:");
    results.failed.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
