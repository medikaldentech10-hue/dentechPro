import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");
const csvPath =
  process.argv.slice(2).find((value) => !value.startsWith("--")) ??
  path.join(__dirname, "data", "ikas-urunler.csv");

await loadLocalEnv(path.join(projectRoot, ".env.local"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for recategorization."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const stats = {
  categoryUpdates: 0,
  movedOutOfOther: 0,
  productsMatched: 0,
  productsSkipped: 0,
  variantAttributeUpdates: 0,
  variantsMatched: 0,
  variantsSkipped: 0,
};

const rows = parseCsv(await readFile(csvPath, "utf8"));
const desiredProducts = buildDesiredProductMap(rows);
const categoriesBySlug = await ensureCategoryIds();
const otherCategoryId = categoriesBySlug.get("diger-urunler") ?? null;
const movedByCategory = new Map();

for (const desiredProduct of desiredProducts.values()) {
  const categoryId = categoriesBySlug.get(desiredProduct.categorySlug);

  if (!categoryId) {
    stats.productsSkipped += 1;
    continue;
  }

  const product = await findProduct(desiredProduct);

  if (!product) {
    stats.productsSkipped += 1;
    continue;
  }

  stats.productsMatched += 1;

  if (product.category_id !== categoryId) {
    const movedFromOther = otherCategoryId && product.category_id === otherCategoryId;
    const { error } = await supabase
      .from("products")
      .update({ category_id: categoryId })
      .eq("id", product.id);

    if (error) {
      throw new Error(error.message);
    }

    stats.categoryUpdates += 1;

    if (movedFromOther) {
      stats.movedOutOfOther += 1;
      movedByCategory.set(
        desiredProduct.categorySlug,
        (movedByCategory.get(desiredProduct.categorySlug) ?? 0) + 1
      );
    }
  }

  for (const desiredVariant of desiredProduct.variants) {
    const variant = await findVariant(desiredVariant.variantCode);

    if (!variant) {
      stats.variantsSkipped += 1;
      continue;
    }

    stats.variantsMatched += 1;

    const updatePayload = compactPayload({
      color:
        desiredVariant.color && desiredVariant.color !== variant.color
          ? desiredVariant.color
          : undefined,
      connection_type:
        desiredVariant.connectionType &&
        desiredVariant.connectionType !== variant.connection_type
          ? desiredVariant.connectionType
          : undefined,
      diameter:
        typeof desiredVariant.diameter === "number" &&
        desiredVariant.diameter !== variant.diameter
          ? desiredVariant.diameter
          : undefined,
      grit:
        desiredVariant.grit && desiredVariant.grit !== variant.grit
          ? desiredVariant.grit
          : undefined,
    });

    if (!Object.keys(updatePayload).length) {
      continue;
    }

    const { error } = await supabase
      .from("product_variants")
      .update(updatePayload)
      .eq("id", variant.id);

    if (error) {
      throw new Error(error.message);
    }

    stats.variantAttributeUpdates += 1;
  }
}

const finalCategoryCounts = await getProductCountsByCategory();

console.info("[products.recategorize]", {
  file: path.relative(projectRoot, csvPath),
  movedByCategory: Object.fromEntries(movedByCategory),
  stats,
});
console.table(finalCategoryCounts);
process.exit(0);

function buildDesiredProductMap(csvRows) {
  const products = new Map();

  for (const row of csvRows) {
    const productGroupCode = getValue(row, [
      "product group id",
      "product_group_id",
      "urun grup id",
      "ürün grup id",
      "product group code",
      "product_group_code",
      "urun grup kodu",
      "ürün grup kodu",
    ]);
    const productName = getValue(row, [
      "name",
      "isim",
      "product name",
      "product_name",
      "urun adi",
      "ürün adı",
    ]);
    const description = stripHtml(getValue(row, ["description", "aciklama", "açıklama"]));
    const variantCode = getValue(row, [
      "variant id",
      "variant_id",
      "varyant id",
      "sku",
      "stok kodu",
      "varyant kodu",
      "variant code",
    ]);

    if (!productGroupCode && !productName) {
      continue;
    }

    const key = productGroupCode || slugify(productName);
    const product =
      products.get(key) ??
      {
        categorySlug: mapJotaCategorySlug(productName, description),
        productGroupCode,
        productName,
        variants: [],
      };
    const variantAttributes = inferVariantAttributes({
      description,
      productName,
      variantCode,
    });

    if (variantCode) {
      product.variants.push({
        ...variantAttributes,
        variantCode,
      });
    }

    products.set(key, product);
  }

  return products;
}

async function ensureCategoryIds() {
  await ensureRootCategories();

  const desiredCategories = [
    {
      name: "Elmas Frezler",
      slug: "elmas-frezler",
      sort_order: 102,
    },
    {
      name: "Karbit Frezler",
      slug: "karbit-frezler",
      sort_order: 103,
    },
    {
      name: "Aşındırıcı Taşlar",
      slug: "asindirici-taslar",
      sort_order: 104,
    },
    {
      name: "Ayırıcı Diskler",
      slug: "ayirici-diskler",
      sort_order: 105,
    },
    {
      name: "Cilalama Frezleri",
      slug: "cilalama-frezleri",
      sort_order: 106,
    },
    {
      name: "Diğer Ürünler",
      slug: "diger-urunler",
      sort_order: 199,
    },
  ];
  const categoryIds = await getCategoryIds();
  const parentId = categoryIds.get("jota-frezler") ?? null;

  for (const category of desiredCategories) {
    const existingId = categoryIds.get(category.slug);
    const payload = {
      name: category.name,
      parent_id: parentId,
      slug: category.slug,
      sort_order: category.sort_order,
      status: "active",
    };
    const { data, error } = existingId
      ? await supabase
          .from("categories")
          .update(payload)
          .eq("id", existingId)
          .select("id,slug")
          .single()
      : await supabase.from("categories").insert(payload).select("id,slug").single();

    if (error) {
      throw new Error(error.message);
    }

    categoryIds.set(data.slug, data.id);
  }

  return categoryIds;
}

async function ensureRootCategories() {
  const existingIds = await getCategoryIds();

  if (!existingIds.has("frezler")) {
    const { error } = await supabase.from("categories").insert({
      name: "Frezler",
      slug: "frezler",
      sort_order: 10,
      status: "active",
    });

    if (error) throw new Error(error.message);
  }

  const refreshedIds = await getCategoryIds();

  if (!refreshedIds.has("jota-frezler")) {
    const { error } = await supabase.from("categories").insert({
      name: "JOTA Frezler",
      parent_id: refreshedIds.get("frezler") ?? null,
      slug: "jota-frezler",
      sort_order: 20,
      status: "active",
    });

    if (error) throw new Error(error.message);
  }
}

async function getCategoryIds() {
  const { data, error } = await supabase.from("categories").select("id,slug");

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((category) => [category.slug, category.id]));
}

async function findProduct(product) {
  if (product.productGroupCode) {
    const { data, error } = await supabase
      .from("products")
      .select("id,category_id,product_name,product_group_code")
      .eq("product_group_code", product.productGroupCode)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (data) return data;
  }

  if (!product.productName) {
    return null;
  }

  const { data, error } = await supabase
    .from("products")
    .select("id,category_id,product_name,product_group_code")
    .eq("product_name", product.productName)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data;
}

async function findVariant(variantCode) {
  const { data, error } = await supabase
    .from("product_variants")
    .select("id,connection_type,color,diameter,grit,variant_code")
    .eq("variant_code", variantCode)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function getProductCountsByCategory() {
  const { data, error } = await supabase
    .from("products")
    .select("category:categories(slug,name)")
    .order("product_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const counts = new Map();

  for (const product of data ?? []) {
    const category = Array.isArray(product.category)
      ? product.category[0]
      : product.category;
    const slug = category?.slug ?? "uncategorized";
    const name = category?.name ?? "Kategorisiz";
    const current = counts.get(slug) ?? { count: 0, name, slug };
    current.count += 1;
    counts.set(slug, current);
  }

  return [...counts.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

function mapJotaCategorySlug(...values) {
  const normalized = normalizeText(values.filter(Boolean).join(" "));

  if (normalized.includes("karbit") || normalized.includes("carbide")) {
    return "karbit-frezler";
  }
  if (normalized.includes("elmas") || normalized.includes("diamond")) {
    return "elmas-frezler";
  }
  if (
    normalized.includes("arkansas") ||
    normalized.includes("abraziv") ||
    normalized.includes("abrasive") ||
    normalized.includes("asindir") ||
    normalized.includes("tas yapi") ||
    normalized.includes("tas frez")
  ) {
    return "asindirici-taslar";
  }
  if (
    normalized.includes("disk") ||
    normalized.includes("disc") ||
    normalized.includes("ayirici")
  ) {
    return "ayirici-diskler";
  }
  if (
    normalized.includes("cila") ||
    normalized.includes("cilalama") ||
    normalized.includes("polisaj") ||
    normalized.includes("polish") ||
    normalized.includes("parlat")
  ) {
    return "cilalama-frezleri";
  }

  return "diger-urunler";
}

function inferVariantAttributes({ description, productName, variantCode }) {
  const combined = [productName, description, variantCode].filter(Boolean).join(" ");

  return {
    color: normalizeColor(combined),
    connectionType: normalizeConnectionType(combined),
    diameter: parseDiameter(combined),
    grit: normalizeGrit(combined),
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
  if (normalized.includes("super fine")) return "SF";
  if (normalized.includes("ultra fine")) return "UF";
  if (normalized.includes("coarse")) return "C";
  if (normalized.includes("medium")) return "M";
  if (normalized.includes("fine")) return "F";

  return undefined;
}

function parseDiameter(value) {
  const variantOptions = normalizeText(value).match(/varyant secenekleri\s+([0-9,\s/.-]+)/);
  const sizeSource = variantOptions?.[1] ?? String(value ?? "");
  const match = sizeSource.match(/(?:^|[\s,./-])(\d{3})(?:$|[\s,./-])/);

  return match ? Number(match[1]) / 10 : undefined;
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

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ");
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
