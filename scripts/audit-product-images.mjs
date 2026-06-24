import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const REPORT_DIR = path.join(process.cwd(), "scripts", "reports");
const REPORT_PATH = path.join(REPORT_DIR, "product-image-audit.csv");
const MAX_HEADER_BYTES = 64 * 1024;
const MAX_IMAGE_CHECKS = Number(process.env.IMAGE_AUDIT_MAX_URLS ?? "500");
const REQUEST_TIMEOUT_MS = 8000;

const GROUPABLE_JOTA_SUFFIXES = new Set([
  "C",
  "F",
  "G",
  "M",
  "SG",
  "SF",
  "UF",
  "XC",
]);

main().catch((error) => {
  console.error("[image-audit] failed", error);
  process.exitCode = 1;
});

async function main() {
  const env = readEnvFile(".env.local");
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const products = await fetchCatalogRows(supabase);
  const activeProducts = products.filter((product) => product.is_active);
  const activeVariants = activeProducts.flatMap((product) =>
    (product.variants ?? [])
      .filter((variant) => variant.is_active)
      .map((variant) => ({ ...variant, product }))
  );
  const productImageRows = activeProducts
    .filter((product) => hasValue(product.image_url))
    .map((product) => ({
      entityId: product.id,
      entityType: "product",
      product,
      url: normalizeUrl(product.image_url),
      variant: null,
    }));
  const variantImageRows = activeVariants
    .filter((variant) => hasValue(variant.image_url))
    .map((variant) => ({
      entityId: variant.id,
      entityType: "variant",
      product: variant.product,
      url: normalizeUrl(variant.image_url),
      variant,
    }));
  const imageRows = [...productImageRows, ...variantImageRows];
  const uniqueUrls = [...new Set(imageRows.map((row) => row.url))];
  const duplicateUrlCounts = getDuplicateUrlCounts(imageRows);
  const imageMetadata = await inspectImageUrls(uniqueUrls.slice(0, MAX_IMAGE_CHECKS));
  const reportRows = buildReportRows({
    activeProducts,
    activeVariants,
    duplicateUrlCounts,
    imageMetadata,
    productImageRows,
    variantImageRows,
  });

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, toCsv(reportRows), "utf8");

  const groupedCoverage = getGroupedFamilyCoverage(activeProducts);
  const missingProductImages = activeProducts.filter(
    (product) => !hasValue(product.image_url)
  );
  const missingVariantImages = activeVariants.filter(
    (variant) => !hasValue(variant.image_url)
  );
  const duplicateImageUrls = [...duplicateUrlCounts.values()].filter(
    (count) => count > 1
  ).length;
  const knownDimensionRows = imageRows.filter((row) =>
    imageMetadata.get(row.url)?.width
  );
  const nonSquareImages = imageRows.filter((row) => {
    const metadata = imageMetadata.get(row.url);
    return Boolean(metadata?.width && metadata?.height && !isSquareEnough(metadata));
  });
  const likelyWhiteBackgroundImages = imageRows.filter((row) => {
    const metadata = imageMetadata.get(row.url);
    return metadata ? isLikelyOpaqueOrWhiteCanvas(metadata) : false;
  });
  const skippedChecks = Math.max(0, uniqueUrls.length - MAX_IMAGE_CHECKS);

  console.log("\nDentech Pro product image audit");
  console.log("--------------------------------");
  console.log(`Products checked: ${activeProducts.length}`);
  console.log(`Variants checked: ${activeVariants.length}`);
  console.log(`Total product images: ${productImageRows.length}`);
  console.log(`Missing product images: ${missingProductImages.length}`);
  console.log(`Missing variant images: ${missingVariantImages.length}`);
  console.log(`Unique image URLs: ${uniqueUrls.length}`);
  console.log(`Duplicate image URLs: ${duplicateImageUrls}`);
  console.log(`Dimension checks completed: ${knownDimensionRows.length}`);
  console.log(`Likely non-square images: ${nonSquareImages.length}`);
  console.log(
    `Likely non-transparent/white-canvas images: ${likelyWhiteBackgroundImages.length}`
  );
  console.log(`Grouped families checked: ${groupedCoverage.familyCount}`);
  console.log(
    `Grouped families missing family image: ${groupedCoverage.missingFamilyImageCount}`
  );
  console.log(`Skipped URL checks due limit: ${skippedChecks}`);
  console.log(`CSV report: ${REPORT_PATH}`);
  console.log("\nRecommended replacement asset format:");
  console.log("- Transparent PNG or WebP");
  console.log("- Square 1:1 canvas");
  console.log("- Product centered with consistent padding");
  console.log("- Minimum 1000x1000 px where possible");
  console.log("- No text, watermark, or background");
}

async function fetchCatalogRows(supabase) {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,product_name,product_group_code,brand,image_url,is_active,category:categories(id,name,slug),variants:product_variants(id,variant_code,manufacturer_ref,image_url,is_active)"
    )
    .order("product_name", { ascending: true })
    .limit(5000);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

function buildReportRows({
  activeProducts,
  activeVariants,
  duplicateUrlCounts,
  imageMetadata,
  productImageRows,
  variantImageRows,
}) {
  const rows = [];

  for (const product of activeProducts) {
    if (!hasValue(product.image_url)) {
      rows.push(toReportRow({ issueType: "missing_product_image", product }));
    }
  }

  for (const variant of activeVariants) {
    if (!hasValue(variant.image_url)) {
      rows.push(
        toReportRow({
          issueType: "missing_variant_image",
          product: variant.product,
          recommendedAction:
            "Optional: add variant image when the variant has visually distinct shape/color.",
          variant,
        })
      );
    }
  }

  for (const imageRow of [...productImageRows, ...variantImageRows]) {
    const metadata = imageMetadata.get(imageRow.url);
    const duplicateCount = duplicateUrlCounts.get(imageRow.url) ?? 0;

    if (duplicateCount > 1) {
      rows.push(
        toReportRow({
          ...imageRow,
          issueType: "duplicate_image_url",
          metadata,
          recommendedAction:
            "Review whether this shared image is intentional for a grouped family.",
        })
      );
    }

    if (metadata?.error) {
      rows.push(
        toReportRow({
          ...imageRow,
          issueType: "image_header_check_failed",
          metadata,
          recommendedAction: "Manually verify image URL and replacement asset.",
        })
      );
      continue;
    }

    if (metadata?.width && metadata?.height && !isSquareEnough(metadata)) {
      rows.push(
        toReportRow({
          ...imageRow,
          issueType: "likely_non_square_image",
          metadata,
          recommendedAction: "Replace with centered 1:1 transparent PNG/WebP.",
        })
      );
    }

    if (metadata && isLikelyOpaqueOrWhiteCanvas(metadata)) {
      rows.push(
        toReportRow({
          ...imageRow,
          issueType: "likely_non_transparent_or_white_canvas",
          metadata,
          recommendedAction:
            "Prioritize for transparent-background replacement if the card looks boxed.",
        })
      );
    }
  }

  for (const family of getGroupedFamilies(activeProducts).values()) {
    const familyImageCount = family.products.filter((product) =>
      hasValue(product.image_url)
    ).length;
    const variantImageCount = family.products
      .flatMap((product) => product.variants ?? [])
      .filter((variant) => variant.is_active && hasValue(variant.image_url)).length;

    if (family.products.length > 1 && familyImageCount === 0 && variantImageCount === 0) {
      rows.push(
        toReportRow({
          issueType: "grouped_family_missing_image",
          product: family.products[0],
          recommendedAction:
            "Create one canonical transparent family image for this grouped card.",
        })
      );
    }
  }

  return rows.sort((left, right) =>
    `${left.issue_type}-${left.product_name}`.localeCompare(
      `${right.issue_type}-${right.product_name}`,
      "tr-TR"
    )
  );
}

function toReportRow({
  entityType = "product",
  issueType,
  metadata,
  product,
  recommendedAction,
  url,
  variant = null,
}) {
  return {
    product_id: product.id,
    product_name: product.product_name,
    product_group_code: product.product_group_code,
    category: product.category?.slug ?? "",
    variant_id: variant?.id ?? "",
    variant_code: variant?.variant_code ?? "",
    manufacturer_ref: variant?.manufacturer_ref ?? "",
    entity_type: entityType,
    image_url: url ?? product.image_url ?? variant?.image_url ?? "",
    issue_type: issueType,
    width: metadata?.width ?? "",
    height: metadata?.height ?? "",
    content_type: metadata?.contentType ?? "",
    has_alpha: metadata?.hasAlpha ?? "",
    recommended_action:
      recommendedAction ?? "Replace with standardized transparent 1:1 asset.",
  };
}

async function inspectImageUrls(urls) {
  const results = new Map();

  for (const url of urls) {
    results.set(url, await inspectImageUrl(url));
  }

  return results;
}

async function inspectImageUrl(url) {
  try {
    const head = await fetchWithTimeout(url, {
      method: "HEAD",
      redirect: "follow",
    });
    const contentType = head.headers.get("content-type") ?? "";
    const contentLength = Number(head.headers.get("content-length") ?? "0");
    const range = await fetchWithTimeout(url, {
      headers: { Range: `bytes=0-${MAX_HEADER_BYTES - 1}` },
      redirect: "follow",
    });
    const buffer = Buffer.from(await range.arrayBuffer());
    const parsed = parseImageDimensions(buffer, contentType || url);

    return {
      contentLength: Number.isFinite(contentLength) ? contentLength : null,
      contentType,
      ...parsed,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function parseImageDimensions(buffer, contentTypeOrUrl) {
  if (isPng(buffer)) {
    const colorType = buffer[25];
    return {
      format: "png",
      hasAlpha: colorType === 4 || colorType === 6,
      height: buffer.readUInt32BE(20),
      width: buffer.readUInt32BE(16),
    };
  }

  if (isJpeg(buffer)) {
    return parseJpegDimensions(buffer);
  }

  if (isWebp(buffer)) {
    return parseWebpDimensions(buffer);
  }

  return {
    format: getFormatHint(contentTypeOrUrl),
    hasAlpha: false,
    height: null,
    width: null,
  };
}

function isPng(buffer) {
  return (
    buffer.length > 25 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  );
}

function isJpeg(buffer) {
  return buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

function isWebp(buffer) {
  return (
    buffer.length > 16 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
}

function parseJpegDimensions(buffer) {
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    if (
      [
        0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
        0xce, 0xcf,
      ].includes(marker)
    ) {
      return {
        format: "jpeg",
        hasAlpha: false,
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return { format: "jpeg", hasAlpha: false, height: null, width: null };
}

function parseWebpDimensions(buffer) {
  const chunk = buffer.toString("ascii", 12, 16);

  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      format: "webp",
      hasAlpha: Boolean(buffer[20] & 0x10),
      height: 1 + buffer.readUIntLE(27, 3),
      width: 1 + buffer.readUIntLE(24, 3),
    };
  }

  if (chunk === "VP8 " && buffer.length >= 30) {
    return {
      format: "webp",
      hasAlpha: false,
      height: buffer.readUInt16LE(28) & 0x3fff,
      width: buffer.readUInt16LE(26) & 0x3fff,
    };
  }

  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      format: "webp",
      hasAlpha: true,
      height: 1 + ((bits >> 14) & 0x3fff),
      width: 1 + (bits & 0x3fff),
    };
  }

  return { format: "webp", hasAlpha: false, height: null, width: null };
}

function getDuplicateUrlCounts(rows) {
  return rows.reduce((counts, row) => {
    counts.set(row.url, (counts.get(row.url) ?? 0) + 1);
    return counts;
  }, new Map());
}

function getGroupedFamilyCoverage(products) {
  const families = getGroupedFamilies(products);
  let missingFamilyImageCount = 0;

  for (const family of families.values()) {
    const hasFamilyImage = family.products.some((product) => hasValue(product.image_url));
    const hasVariantImage = family.products
      .flatMap((product) => product.variants ?? [])
      .some((variant) => variant.is_active && hasValue(variant.image_url));

    if (family.products.length > 1 && !hasFamilyImage && !hasVariantImage) {
      missingFamilyImageCount += 1;
    }
  }

  return {
    familyCount: [...families.values()].filter((family) => family.products.length > 1)
      .length,
    missingFamilyImageCount,
  };
}

function getGroupedFamilies(products) {
  return products.reduce((families, product) => {
    const key = getProductFamilyKey(product);
    const family = families.get(key) ?? { products: [] };
    family.products.push(product);
    families.set(key, family);
    return families;
  }, new Map());
}

function getProductFamilyKey(product) {
  const family = getProductFamilyParts(product.product_name);
  const token = family.baseCode ?? normalizeText(product.product_name);

  return [
    normalizeText(product.brand),
    product.category?.id ?? "",
    token,
    normalizeFamilyDescriptor(family.remainder ?? ""),
  ].join("|");
}

function getProductFamilyParts(productName) {
  const normalizedName = productName
    .replace(/\s+/g, " ")
    .replace(/^JOTA\s+/i, "")
    .trim();
  const [firstToken, ...restTokens] = normalizedName.split(" ");
  const parsedToken = parseGroupableJotaToken(firstToken ?? "");
  const baseCode = parsedToken?.baseCode ?? firstToken ?? null;
  const remainder = restTokens.join(" ").trim();

  return { baseCode, remainder };
}

function parseGroupableJotaToken(token) {
  const normalized = token.toLocaleUpperCase("tr-TR").trim();
  const match = normalized.match(/^(\d{3,5})([A-Z]{1,2})$/);

  if (!match || !GROUPABLE_JOTA_SUFFIXES.has(match[2])) {
    return null;
  }

  return { baseCode: match[1], suffix: match[2] };
}

function normalizeFamilyDescriptor(value) {
  return normalizeText(value)
    .split(" - ")[0]
    .replace(/\b(kirmizi|siyah|yesil|mavi|sari|red|black|green|blue|yellow)\b/g, "")
    .replace(/\b(kusak|kuşak|ince|kalin|orta|super|extra|coarse|fine|medium)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSquareEnough(metadata) {
  if (!metadata.width || !metadata.height) {
    return true;
  }

  return Math.abs(metadata.width - metadata.height) / Math.max(metadata.width, metadata.height) <= 0.02;
}

function isLikelyOpaqueOrWhiteCanvas(metadata) {
  if (metadata.hasAlpha) {
    return false;
  }

  const format = metadata.format || getFormatHint(metadata.contentType ?? "");

  return format === "jpeg" || format === "png" || format === "webp";
}

function getFormatHint(value) {
  const normalized = value.toLowerCase();

  if (normalized.includes("png")) return "png";
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpeg";
  if (normalized.includes("webp")) return "webp";

  return "unknown";
}

function toCsv(rows) {
  const columns = [
    "product_id",
    "product_name",
    "product_group_code",
    "category",
    "variant_id",
    "variant_code",
    "manufacturer_ref",
    "entity_type",
    "image_url",
    "issue_type",
    "width",
    "height",
    "content_type",
    "has_alpha",
    "recommended_action",
  ];
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ];

  return `${lines.join("\n")}\n`;
}

function csvCell(value) {
  const stringValue = String(value ?? "");

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      })
  );
}

function hasValue(value) {
  return Boolean(String(value ?? "").trim());
}

function normalizeUrl(value) {
  return String(value ?? "").trim();
}

function normalizeText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ")
    .trim();
}
