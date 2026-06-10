import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");
const seedPath =
  process.argv[2] ?? path.join(__dirname, "data", "jota-mvp-products.json");

await loadLocalEnv(path.join(projectRoot, ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for import."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const seed = JSON.parse(await readFile(seedPath, "utf8"));
const stats = {
  createdProducts: 0,
  updatedProducts: 0,
  createdVariants: 0,
  updatedVariants: 0,
};

const categoryIds = new Map();

for (const category of seed.categories) {
  const parentId = category.parent_slug
    ? categoryIds.get(category.parent_slug) ?? null
    : null;

  const { data: existingCategory, error: categoryLookupError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", category.slug)
    .maybeSingle();

  if (categoryLookupError) {
    throw new Error(categoryLookupError.message);
  }

  const categoryPayload = {
    name: category.name,
    slug: category.slug,
    parent_id: parentId,
    status: "active",
    sort_order: category.sort_order ?? 0,
  };

  const { data: savedCategory, error: categorySaveError } = existingCategory
    ? await supabase
        .from("categories")
        .update(categoryPayload)
        .eq("id", existingCategory.id)
        .select("id")
        .single()
    : await supabase
        .from("categories")
        .insert(categoryPayload)
        .select("id")
        .single();

  if (categorySaveError) {
    throw new Error(categorySaveError.message);
  }

  categoryIds.set(category.slug, savedCategory.id);
}

for (const product of seed.products) {
  const categoryId = categoryIds.get(product.category_slug);

  if (!categoryId) {
    throw new Error(`Missing category for product: ${product.product_group_code}`);
  }

  const productPayload = {
    brand: product.brand ?? "JOTA",
    category_id: categoryId,
    product_group_code: product.product_group_code,
    product_name: product.product_name,
    description: product.description ?? null,
    usage_area: product.usage_area ?? null,
    target_user_type: product.target_user_type ?? null,
    material_tags: product.material_tags ?? null,
    procedure_tags: product.procedure_tags ?? null,
    image_url: product.image_url ?? null,
    is_active: product.is_active ?? true,
  };

  const { data: existingProduct, error: productLookupError } = await supabase
    .from("products")
    .select("id")
    .eq("product_group_code", product.product_group_code)
    .maybeSingle();

  if (productLookupError) {
    throw new Error(productLookupError.message);
  }

  const { data: savedProduct, error: productSaveError } = existingProduct
    ? await supabase
        .from("products")
        .update(productPayload)
        .eq("id", existingProduct.id)
        .select("id")
        .single()
    : await supabase
        .from("products")
        .insert(productPayload)
        .select("id")
        .single();

  if (productSaveError) {
    throw new Error(productSaveError.message);
  }

  if (existingProduct) {
    stats.updatedProducts += 1;
  } else {
    stats.createdProducts += 1;
  }

  for (const variant of product.variants ?? []) {
    const variantPayload = {
      product_id: savedProduct.id,
      variant_code: variant.variant_code,
      manufacturer_ref: variant.manufacturer_ref ?? null,
      ikas_product_id: variant.ikas_product_id ?? null,
      ikas_url: variant.ikas_url ?? null,
      connection_type: variant.connection_type ?? null,
      iso_shank: variant.iso_shank ?? null,
      diameter: variant.diameter ?? null,
      length: variant.length ?? null,
      grit: variant.grit ?? null,
      color: variant.color ?? null,
      package_quantity: variant.package_quantity ?? 1,
      price: variant.price ?? null,
      currency: variant.currency ?? "TRY",
      stock_quantity: variant.stock_quantity ?? 0,
      reserved_quantity: variant.reserved_quantity ?? 0,
      stock_status: variant.stock_status ?? "in_stock",
      uts_no: variant.uts_no ?? null,
      image_url: variant.image_url ?? null,
      is_active: variant.is_active ?? true,
    };

    const { data: existingVariant, error: variantLookupError } = await supabase
      .from("product_variants")
      .select("id")
      .eq("variant_code", variant.variant_code)
      .maybeSingle();

    if (variantLookupError) {
      throw new Error(variantLookupError.message);
    }

    const { error: variantSaveError } = existingVariant
      ? await supabase
          .from("product_variants")
          .update(variantPayload)
          .eq("id", existingVariant.id)
      : await supabase.from("product_variants").insert(variantPayload);

    if (variantSaveError) {
      throw new Error(variantSaveError.message);
    }

    if (existingVariant) {
      stats.updatedVariants += 1;
    } else {
      stats.createdVariants += 1;
    }
  }
}

console.info("[products.import]", stats);

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
