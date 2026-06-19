import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");
const seedPath =
  process.argv.slice(2).find((value) => !value.startsWith("--")) ??
  path.join(__dirname, "data", "jota-mvp-products.json");

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

const stats = {
  createdCategories: 0,
  createdProducts: 0,
  createdVariants: 0,
  skippedRows: 0,
  updatedCategories: 0,
  updatedProducts: 0,
  updatedVariants: 0,
};

const importData = seedPath.toLowerCase().endsWith(".csv")
  ? await readIkasCsv(seedPath)
  : await readJsonSeed(seedPath);

await importCategories(importData.categories);
await importProducts(importData.products, importData.source);

console.info("[products.import]", {
  source: importData.source,
  file: path.relative(projectRoot, seedPath),
  ...stats,
});

async function readJsonSeed(filePath) {
  const seed = JSON.parse(await readFile(filePath, "utf8"));
  return {
    categories: seed.categories ?? [],
    products: seed.products ?? [],
    source: "json",
  };
}

async function readIkasCsv(filePath) {
  const rows = parseCsv(await readFile(filePath, "utf8"));
  const categories = new Map();
  const products = new Map();

  ensureRootCategories(categories);

  for (const row of rows) {
    const sku = getValue(row, [
      "sku",
      "stok kodu",
      "stok_kodu",
      "varyant kodu",
      "variant code",
      "variant_code",
      "barkod",
      "barcode",
      "varyant id",
      "variant id",
    ]);
    const productName = getValue(row, [
      "product name",
      "product_name",
      "urun adi",
      "ürün adı",
      "urun_adi",
      "isim",
      "name",
      "baslik",
      "başlık",
    ]);
    const variantName = getValue(row, [
      "variant name",
      "variant_name",
      "varyant adi",
      "varyant adı",
      "secenek",
      "seçenek",
    ]);

    if (!sku && !productName) {
      stats.skippedRows += 1;
      continue;
    }

    const brand = normalizeBrand(getValue(row, ["brand", "marka"]) || "JOTA");
    const rawCategory =
      getValue(row, [
        "category",
        "kategori",
        "kategori adi",
        "kategori adı",
        "category name",
        "categories",
        "kategoriler",
      ]) || "Diğer Ürünler";
    const categorySlug = normalizeCategory(categories, {
      categoryName: rawCategory,
      productName,
      sku,
      variantName,
    });
    const productGroupCode =
      getValue(row, [
        "product group code",
        "product_group_code",
        "urun grup kodu",
        "ürün grup kodu",
        "model kodu",
        "group code",
        "urun grup id",
        "product group id",
      ]) || slugify(productName || sku);
    const productKey = productGroupCode || slugify(productName || sku);
    const product = products.get(productKey) ?? {
      brand,
      category_slug: categorySlug,
      description: getValue(row, ["description", "aciklama", "açıklama"]),
      image_url: normalizeImageUrl(
        getValue(row, [
          "image",
          "image url",
          "image_url",
          "resim url",
          "gorsel",
          "görsel",
          "resim",
        ])
      ),
      is_active: parseActive(getValue(row, ["active", "aktif", "status", "durum"])),
      product_group_code: productGroupCode,
      product_name: productName || variantName || sku,
      usage_area: getValue(row, ["usage_area", "kullanim alani", "kullanım alanı"]),
      variants: [],
    };

    mergeDefined(product, {
      brand,
      category_slug: categorySlug,
      description: getValue(row, ["description", "aciklama", "açıklama"]),
      image_url: normalizeImageUrl(
        getValue(row, [
          "image",
          "image url",
          "image_url",
          "resim url",
          "gorsel",
          "görsel",
          "resim",
        ])
      ),
      is_active: parseActive(getValue(row, ["active", "aktif", "status", "durum"])),
      product_name: productName,
      usage_area: getValue(row, ["usage_area", "kullanim alani", "kullanım alanı"]),
    });

    const variantAttributes = inferVariantAttributes({ productName, row, sku, variantName });

    product.variants.push({
      color: variantAttributes.color,
      connection_type: variantAttributes.connection_type,
      currency: getValue(row, ["currency", "para birimi"]) || "TRY",
      diameter: variantAttributes.diameter,
      grit: variantAttributes.grit,
      image_url: normalizeImageUrl(
        getValue(row, [
          "variant image",
          "variant_image",
          "image",
          "image url",
          "image_url",
          "resim url",
        ])
      ),
      is_active: parseActive(getValue(row, ["active", "aktif", "status", "durum"])),
      manufacturer_ref: variantName || getValue(row, ["manufacturer_ref", "ref"]),
      price: parseMoney(getValue(row, ["price", "fiyat", "sale price", "satis fiyati"])),
      stock_quantity: parseStock(
        getValue(row, ["stock", "stok", "stok ana depo", "quantity", "adet"])
      ),
      stock_status: getStockStatusForOptionalStock(
        parseStock(
          getValue(row, ["stock", "stok", "stok ana depo", "quantity", "adet"])
        )
      ),
      variant_code: sku || `${productGroupCode}-${product.variants.length + 1}`,
    });

    products.set(productKey, product);
  }

  return {
    categories: [...categories.values()],
    products: [...products.values()],
    source: "ikas_csv",
  };
}

async function importCategories(categories) {
  const categoryIds = new Map();

  for (const category of categories) {
    const parentId = category.parent_slug
      ? categoryIds.get(category.parent_slug) ?? null
      : null;
    const existingCategory = await findCategoryBySlug(category.slug);
    const categoryPayload = compactPayload({
      name: category.name,
      parent_id: parentId,
      slug: category.slug,
      sort_order: category.sort_order ?? 0,
      status: category.status ?? "active",
    });
    const { data: savedCategory, error } = existingCategory
      ? await supabase
          .from("categories")
          .update(categoryPayload)
          .eq("id", existingCategory.id)
          .select("id")
          .single()
      : await supabase.from("categories").insert(categoryPayload).select("id").single();

    if (error) {
      throw new Error(error.message);
    }

    if (existingCategory) {
      stats.updatedCategories += 1;
    } else {
      stats.createdCategories += 1;
    }

    categoryIds.set(category.slug, savedCategory.id);
  }

  return categoryIds;
}

async function importProducts(products, source) {
  const categoryIds = await getCategoryIds();

  for (const product of products) {
    const categoryId = categoryIds.get(product.category_slug);

    if (!categoryId) {
      stats.skippedRows += 1;
      console.warn(
        `[products.import] skipped product without category: ${product.product_group_code}`
      );
      continue;
    }

    const productPayload = compactPayload({
      brand: product.brand ?? "JOTA",
      category_id: categoryId,
      description: product.description,
      image_url: product.image_url,
      is_active: product.is_active,
      material_tags: product.material_tags,
      procedure_tags: product.procedure_tags,
      product_group_code: product.product_group_code,
      product_name: product.product_name,
      target_user_type: product.target_user_type,
      usage_area: product.usage_area,
    });
    const existingProduct = await findProduct(product);
    const { data: savedProduct, error } = existingProduct
      ? await supabase
          .from("products")
          .update(productPayload)
          .eq("id", existingProduct.id)
          .select("id")
          .single()
      : await supabase.from("products").insert(productPayload).select("id").single();

    if (error) {
      throw new Error(error.message);
    }

    if (existingProduct) {
      stats.updatedProducts += 1;
    } else {
      stats.createdProducts += 1;
    }

    for (const variant of product.variants ?? []) {
      await importVariant({
        productId: savedProduct.id,
        source,
        variant,
      });
    }
  }
}

async function importVariant({ productId, source, variant }) {
  const variantPayload = compactPayload({
    color: variant.color,
    connection_type: variant.connection_type,
    currency: variant.currency ?? "TRY",
    diameter: variant.diameter,
    grit: variant.grit,
    ikas_product_id: variant.ikas_product_id,
    ikas_url: variant.ikas_url,
    image_url: variant.image_url,
    is_active: variant.is_active,
    iso_shank: variant.iso_shank,
    length: variant.length,
    manufacturer_ref: variant.manufacturer_ref,
    package_quantity: variant.package_quantity ?? 1,
    price: variant.price,
    product_id: productId,
    reserved_quantity: variant.reserved_quantity ?? 0,
    stock_quantity:
      source === "ikas_csv" ? variant.stock_quantity : variant.stock_quantity ?? 0,
    stock_status:
      source === "ikas_csv"
        ? variant.stock_status
        : variant.stock_status ?? getStockStatus(variant.stock_quantity ?? 0),
    uts_no: variant.uts_no,
    variant_code: variant.variant_code,
  });
  const existingVariant = await findVariant(variant.variant_code);
  const { error } = existingVariant
    ? await supabase
        .from("product_variants")
        .update(source === "ikas_csv" ? variantPayload : variantPayload)
        .eq("id", existingVariant.id)
    : await supabase.from("product_variants").insert(variantPayload);

  if (error) {
    throw new Error(error.message);
  }

  if (existingVariant) {
    stats.updatedVariants += 1;
  } else {
    stats.createdVariants += 1;
  }
}

async function findCategoryBySlug(slug) {
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function findProduct(product) {
  if (product.product_group_code) {
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .eq("product_group_code", product.product_group_code)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return data;
    }
  }

  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("product_name", product.product_name)
    .eq("brand", product.brand ?? "JOTA")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function findVariant(variantCode) {
  const { data, error } = await supabase
    .from("product_variants")
    .select("id")
    .eq("variant_code", variantCode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function getCategoryIds() {
  const { data, error } = await supabase.from("categories").select("id,slug");

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((category) => [category.slug, category.id]));
}

function ensureRootCategories(categories) {
  categories.set("frezler", {
    name: "Frezler",
    slug: "frezler",
    sort_order: 10,
  });
  categories.set("jota-frezler", {
    name: "JOTA Frezler",
    parent_slug: "frezler",
    slug: "jota-frezler",
    sort_order: 20,
  });
}

function normalizeCategory(
  categories,
  { categoryName, productName = "", sku = "", variantName = "" }
) {
  const slug = mapJotaCategorySlug(categoryName, productName, variantName, sku);
  const displayName = getJotaCategoryName(slug, categoryName);

  if (!categories.has(slug)) {
    categories.set(slug, {
      name: displayName,
      parent_slug: "jota-frezler",
      slug,
      sort_order: 100 + categories.size,
    });
  }

  return slug;
}

function mapJotaCategorySlug(...values) {
  const normalized = normalizeText(values.filter(Boolean).join(" "));

  if (
    normalized.includes("set") ||
    normalized.includes("kit") ||
    normalized.includes("paket")
  ) {
    return "setler-paketler";
  }
  if (normalized.includes("elmas")) return "elmas-frezler";
  if (normalized.includes("diamond")) return "elmas-frezler";
  if (normalized.includes("karbit") || normalized.includes("carbide")) {
    return "karbit-frezler";
  }
  if (
    normalized.includes("tas") ||
    normalized.includes("abraziv") ||
    normalized.includes("asindir") ||
    normalized.includes("abrasive")
  ) {
    return "asindirici-taslar";
  }
  if (normalized.includes("disk") || normalized.includes("disc")) {
    return "ayirici-diskler";
  }
  if (
    normalized.includes("cila") ||
    normalized.includes("polisaj") ||
    normalized.includes("polish")
  ) {
    return "cilalama-frezleri";
  }
  if (normalized.includes("cerrahi")) return "karbit-frezler";

  return slugify(values.find(Boolean) || "Diger Urunler");
}

function getJotaCategoryName(slug, fallback) {
  const names = {
    "asindirici-taslar": "Aşındırıcı Taşlar",
    "ayirici-diskler": "Ayırıcı Diskler",
    "cilalama-frezleri": "Cilalama Frezleri",
    "elmas-frezler": "Elmas Frezler",
    "karbit-frezler": "Karbit Frezler",
    "setler-paketler": "Setler / Paketler",
  };

  return names[slug] ?? fallback.trim();
}

function inferVariantAttributes({ productName, row, sku, variantName }) {
  const combined = [productName, variantName, sku].filter(Boolean).join(" ");
  const directConnection = getValue(row, [
    "connection type",
    "connection_type",
    "shank",
    "sap",
    "şaft",
    "saft",
  ]);
  const directColor = getValue(row, ["color", "renk"]);
  const directDiameter = getValue(row, ["diameter", "cap", "çap"]);
  const variantValue1 = getValue(row, [
    "variant value 1",
    "variant_value_1",
    "varyant deger 1",
    "varyant değer 1",
  ]);
  const variantValue2 = getValue(row, [
    "variant value 2",
    "variant_value_2",
    "varyant deger 2",
    "varyant değer 2",
  ]);
  const directGrit = getValue(row, ["grit", "kum", "kumlama"]);
  const variantValues = [variantValue1, variantValue2].filter(Boolean).join(" ");

  return {
    color: normalizeColor(directColor || variantValues || combined),
    connection_type: normalizeConnectionType(directConnection || combined),
    diameter: parseDiameter(directDiameter || variantValues || sku || variantName),
    grit: normalizeGrit(directGrit || directColor || variantValues || combined),
  };
}

function normalizeConnectionType(value) {
  const match = String(value ?? "").toUpperCase().match(/\b(FG|RA|HP)\b/);

  return match?.[1];
}

function normalizeColor(value) {
  const normalized = normalizeText(value);

  if (normalized.includes("black") || normalized.includes("siyah")) return "Siyah";
  if (normalized.includes("green") || normalized.includes("yesil")) return "Yeşil";
  if (normalized.includes("blue") || normalized.includes("mavi")) return "Mavi";
  if (normalized.includes("red") || normalized.includes("kirmizi")) return "Kırmızı";
  if (normalized.includes("yellow") || normalized.includes("sari")) return "Sarı";
  if (normalized.includes("white") || normalized.includes("beyaz")) return "Beyaz";

  return undefined;
}

function normalizeGrit(value) {
  const normalized = normalizeText(value);
  const grit = String(value ?? "").toUpperCase().match(/\b(XC|C|M|F|SF|UF)\b/)?.[1];

  if (grit) return grit;
  if (normalized.includes("coarse")) return "C";
  if (normalized.includes("medium")) return "M";
  if (normalized.includes("fine")) return "F";
  if (normalized.includes("super fine")) return "SF";
  if (normalized.includes("ultra fine")) return "UF";

  return undefined;
}

function parseDiameter(value) {
  if (!value) return undefined;
  const sizeCode = String(value).match(/(?:^|[.-])(\d{3})(?:$|[.-])/);

  if (sizeCode) {
    return Number(sizeCode[1]) / 10;
  }

  const direct = Number(String(value).replace(",", "."));

  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  return undefined;
}

function parseCsv(contents) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < contents.length; index += 1) {
    const char = contents[index];
    const next = contents[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
      continue;
    }

    field += char;
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headerRow, ...dataRows] = rows.filter((csvRow) =>
    csvRow.some((cell) => cell.trim())
  );

  if (!headerRow) {
    return [];
  }

  const headers = headerRow.map(normalizeHeader);
  return dataRows.map((csvRow) =>
    Object.fromEntries(
      headers.map((header, index) => [header, csvRow[index]?.trim() ?? ""])
    )
  );
}

function getValue(row, aliases) {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];

    if (value !== undefined && value !== "") {
      return value;
    }
  }

  return null;
}

function compactPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
}

function mergeDefined(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== null && value !== "") {
      target[key] = value;
    }
  }
}

function parseMoney(value) {
  if (!value) return undefined;
  const normalized = value
    .replace(/[₺$€\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseStock(value) {
  if (!value) return undefined;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined;
}

function parseActive(value) {
  if (!value) return undefined;
  const normalized = normalizeText(value);

  if (["1", "true", "aktif", "active", "yayinda", "yayında"].includes(normalized)) {
    return true;
  }

  if (
    ["0", "false", "pasif", "inactive", "arsiv", "arşiv", "draft"].includes(
      normalized
    )
  ) {
    return false;
  }

  return undefined;
}

function normalizeBrand(value) {
  return normalizeText(value) === "jota" ? "JOTA" : String(value).trim();
}

function getStockStatus(stockQuantity) {
  if (stockQuantity === 0) return "out_of_stock";
  if (stockQuantity <= 10) return "low_stock";
  return "in_stock";
}

function getStockStatusForOptionalStock(stockQuantity) {
  return typeof stockQuantity === "number" ? getStockStatus(stockQuantity) : undefined;
}

function normalizeImageUrl(value) {
  const firstImageUrl = String(value ?? "")
    .split(";")
    .map((item) => item.trim())
    .find((item) => /^https?:\/\//i.test(item) && !/\.(mp4|mov|webm)(\?|$)/i.test(item));

  return firstImageUrl || undefined;
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeHeader(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
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
