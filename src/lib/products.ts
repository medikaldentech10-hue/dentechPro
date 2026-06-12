import "server-only";

import { canViewPrices } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Profile } from "@/lib/types/auth";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];

export type ProductFilters = {
  brand?: string;
  category?: string;
  page?: number | string;
  pageSize?: number | string;
  query?: string;
};

type ProductQueryOptions = {
  includeSensitiveVariantFields?: boolean;
};

export type CatalogCategory = Pick<
  CategoryRow,
  "id" | "name" | "slug" | "sort_order"
>;

export type PublicCatalogVariant = {
  code: string;
  connectionType: string | null;
  grit: string | null;
  id: string;
  imageUrl: string | null;
  isActive: boolean;
  manufacturerRef: string | null;
  name: string;
  packageQuantity: number;
};

export type PricedCatalogVariant = PublicCatalogVariant & {
  currency: string;
  price: number | null;
  stockQuantity: number;
  stockStatus: VariantRow["stock_status"];
};

export type PublicCatalogProduct = {
  brand: string;
  category: CatalogCategory | null;
  code: string;
  description: string | null;
  id: string;
  imageUrl: string | null;
  name: string;
  status: string;
  usageArea: string | null;
  variantCount: number;
  variants: PublicCatalogVariant[];
};

export type PricedCatalogProduct = Omit<PublicCatalogProduct, "variants"> & {
  variants: PricedCatalogVariant[];
};

export type ProductListResult<TProduct> = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  pageSize: number;
  products: TProduct[];
  totalCount: number;
  totalPages: number;
};

type CatalogVariantRow = Pick<
  VariantRow,
  | "connection_type"
  | "currency"
  | "diameter"
  | "grit"
  | "id"
  | "image_url"
  | "is_active"
  | "manufacturer_ref"
  | "package_quantity"
  | "price"
  | "product_id"
  | "stock_quantity"
  | "stock_status"
  | "variant_code"
>;

type ProductQueryRow = Pick<
  ProductRow,
  | "brand"
  | "category_id"
  | "description"
  | "id"
  | "image_url"
  | "is_active"
  | "product_group_code"
  | "product_name"
  | "usage_area"
> & {
  category: CategoryRow | null;
  variants: CatalogVariantRow[];
};

type ProductRowsResult = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  pageSize: number;
  rows: ProductQueryRow[];
  totalCount: number;
  totalPages: number;
};

export function getCanViewPrices(profile: Profile | null) {
  return canViewPrices(profile);
}

export async function getCatalogCategories() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,sort_order")
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data satisfies CatalogCategory[];
}

export async function getPublicProducts(filters: ProductFilters = {}) {
  const result = await getProductRows(filters);
  return mapProductListResult(result, toPublicProduct);
}

export async function getPublicProductById(productId: string) {
  const row = await getProductRowById(productId);
  return row ? toPublicProduct(row) : null;
}

export async function getPricedProductsForProfile(
  profile: Profile | null,
  filters: ProductFilters = {}
) {
  if (!getCanViewPrices(profile)) {
    const result = await getProductRows(filters);
    return mapProductListResult(result, toPublicProduct);
  }

  const result = await getProductRows(filters, {
    includeSensitiveVariantFields: true,
  });
  return mapProductListResult(result, toPricedProduct);
}

export async function getPricedProductByIdForProfile(
  profile: Profile | null,
  productId: string
) {
  const row = await getProductRowById(productId);

  if (!row) {
    return null;
  }

  return getCanViewPrices(profile) ? toPricedProduct(row) : toPublicProduct(row);
}

async function getProductRows(
  filters: ProductFilters,
  options: ProductQueryOptions = {}
): Promise<ProductRowsResult> {
  const startedAt = performance.now();
  const supabase = getSupabaseAdminClient();
  const normalizedBrand = filters.brand?.trim() || "JOTA";
  const normalizedCategory = filters.category?.trim();
  const normalizedQuery = filters.query?.trim().toLocaleLowerCase("tr-TR");
  const pageSize = clampInteger(filters.pageSize, 24, 1, 60);
  const page = clampInteger(filters.page, 1, 1, 10_000);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const categoryId = normalizedCategory
    ? await getCategoryIdBySlug(normalizedCategory)
    : null;
  const matchingProductIds = normalizedQuery
    ? await getMatchingVariantProductIds(normalizedQuery)
    : [];

  let query = supabase
    .from("products")
    .select(
      "id,brand,category_id,product_group_code,product_name,description,usage_area,image_url,is_active,category:categories(id,name,slug,sort_order)",
      { count: "exact" }
    )
    .eq("is_active", true)
    .eq("brand", normalizedBrand)
    .order("product_name", { ascending: true })
    .range(from, to);

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (normalizedQuery) {
    const escapedQuery = escapeLikePattern(normalizedQuery);
    const productSearch = [
      `product_name.ilike.%${escapedQuery}%`,
      `product_group_code.ilike.%${escapedQuery}%`,
      `description.ilike.%${escapedQuery}%`,
      `usage_area.ilike.%${escapedQuery}%`,
      ...matchingProductIds.map((id) => `id.eq.${id}`),
    ].join(",");
    query = query.or(productSearch);
  }

  const { count, data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const productRows = normalizeListProductRows(data ?? []);
  const variantSummaries = productRows.length
    ? await getListVariantsForProducts(
        productRows.map((row) => row.id),
        Boolean(options.includeSensitiveVariantFields)
      )
    : new Map<string, CatalogVariantRow[]>();
  const rows = productRows.map((product) => ({
    ...product,
    variants: variantSummaries.get(product.id) ?? [],
  }));
  const totalCount = count ?? 0;
  const variantCount = rows.reduce(
    (sum, product) => sum + product.variants.length,
    0
  );

  logProductQuery("products.list", {
    durationMs: Math.round(performance.now() - startedAt),
    includeSensitiveVariantFields: Boolean(options.includeSensitiveVariantFields),
    page,
    pageSize,
    productCount: rows.length,
    totalCount,
    variantCount,
  });

  return {
    hasNextPage: to + 1 < totalCount,
    hasPreviousPage: page > 1,
    page,
    pageSize,
    rows,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

async function getProductRowById(productId: string) {
  const supabase = getSupabaseAdminClient();
  const startedAt = performance.now();

  let query = supabase
    .from("products")
    .select("*,category:categories(*),variants:product_variants(*)")
    .eq("is_active", true);

  query = isUuid(productId)
    ? query.eq("id", productId)
    : query.eq("product_group_code", productId);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const row = data ? normalizeProductRows([data])[0] : null;

  logProductQuery("products.detail", {
    durationMs: Math.round(performance.now() - startedAt),
    found: Boolean(row),
    productId,
    variantCount: row?.variants.length ?? 0,
  });

  return row;
}

function normalizeListProductRows(rows: unknown[]): Omit<ProductQueryRow, "variants">[] {
  return rows.map((row) => {
    const product = row as ProductRow & {
      category: CategoryRow | null;
    };

    return {
      brand: product.brand,
      category: product.category,
      category_id: product.category_id,
      description: product.description,
      id: product.id,
      image_url: product.image_url,
      is_active: product.is_active,
      product_group_code: product.product_group_code,
      product_name: product.product_name,
      usage_area: product.usage_area,
    };
  });
}

function normalizeProductRows(rows: unknown[]): ProductQueryRow[] {
  return rows.map((row) => {
    const product = row as ProductRow & {
      category: CategoryRow | null;
      variants: CatalogVariantRow[] | null;
    };

    return {
      ...product,
      variants: (product.variants ?? []).filter((variant) => variant.is_active),
    };
  });
}

async function getListVariantsForProducts(
  productIds: string[],
  includeSensitiveVariantFields: boolean
) {
  const supabase = getSupabaseAdminClient();
  const select = includeSensitiveVariantFields
    ? "id,product_id,variant_code,manufacturer_ref,connection_type,diameter,grit,package_quantity,price,currency,stock_quantity,stock_status,image_url,is_active"
    : "id,product_id,variant_code,manufacturer_ref,connection_type,diameter,grit,package_quantity,image_url,is_active";
  const { data, error } = await supabase
    .from("product_variants")
    .select(select)
    .in("product_id", productIds)
    .eq("is_active", true)
    .order("variant_code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as Array<
    Partial<CatalogVariantRow> &
      Pick<
        CatalogVariantRow,
        | "connection_type"
        | "diameter"
        | "grit"
        | "id"
        | "image_url"
        | "is_active"
        | "manufacturer_ref"
        | "package_quantity"
        | "product_id"
        | "variant_code"
      >
  >;

  return rows.reduce((variantsByProduct, row) => {
    const normalizedVariant = {
      connection_type: row.connection_type,
      currency: row.currency ?? "TRY",
      diameter: row.diameter,
      grit: row.grit,
      id: row.id,
      image_url: row.image_url,
      is_active: row.is_active,
      manufacturer_ref: row.manufacturer_ref,
      package_quantity: row.package_quantity,
      price: row.price ?? null,
      product_id: row.product_id,
      stock_quantity: row.stock_quantity ?? 0,
      stock_status: row.stock_status ?? "ask_for_stock",
      variant_code: row.variant_code,
    } satisfies CatalogVariantRow;
    const current = variantsByProduct.get(normalizedVariant.product_id) ?? [];
    current.push(normalizedVariant);
    variantsByProduct.set(normalizedVariant.product_id, current);
    return variantsByProduct;
  }, new Map<string, CatalogVariantRow[]>());
}

function toPublicProduct(row: ProductQueryRow): PublicCatalogProduct {
  return {
    brand: row.brand,
    category: row.category
      ? {
          id: row.category.id,
          name: row.category.name,
          slug: row.category.slug,
          sort_order: row.category.sort_order,
        }
      : null,
    code: row.product_group_code,
    description: row.description,
    id: row.id,
    imageUrl: row.image_url,
    name: row.product_name,
    status: row.usage_area ?? "JOTA ürün kataloğu",
    usageArea: row.usage_area,
    variantCount: row.variants.length,
    variants: row.variants.map(toPublicVariant),
  };
}

function toPricedProduct(row: ProductQueryRow): PricedCatalogProduct {
  return {
    ...toPublicProduct(row),
    variants: row.variants.map(toPricedVariant),
  };
}

function toPublicVariant(row: CatalogVariantRow): PublicCatalogVariant {
  return {
    code: row.variant_code,
    connectionType: row.connection_type,
    grit: row.grit,
    id: row.id,
    imageUrl: row.image_url,
    isActive: row.is_active,
    manufacturerRef: row.manufacturer_ref,
    name: getVariantName(row),
    packageQuantity: row.package_quantity,
  };
}

function toPricedVariant(row: CatalogVariantRow): PricedCatalogVariant {
  return {
    ...toPublicVariant(row),
    currency: row.currency,
    price: row.price,
    stockQuantity: row.stock_quantity,
    stockStatus: row.stock_status,
  };
}

function mapProductListResult<TProduct>(
  result: ProductRowsResult,
  mapRow: (row: ProductQueryRow) => TProduct
): ProductListResult<TProduct> {
  return {
    hasNextPage: result.hasNextPage,
    hasPreviousPage: result.hasPreviousPage,
    page: result.page,
    pageSize: result.pageSize,
    products: result.rows.map(mapRow),
    totalCount: result.totalCount,
    totalPages: result.totalPages,
  };
}

async function getCategoryIdBySlug(slug: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}

async function getMatchingVariantProductIds(searchQuery: string) {
  const supabase = getSupabaseAdminClient();
  const escapedQuery = escapeLikePattern(searchQuery);
  const { data, error } = await supabase
    .from("product_variants")
    .select("product_id")
    .or(
      `variant_code.ilike.%${escapedQuery}%,manufacturer_ref.ilike.%${escapedQuery}%`
    )
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.product_id))];
}

function getVariantName(row: CatalogVariantRow) {
  return (
    [row.connection_type, row.diameter ? `Ø ${row.diameter}` : null, row.grit]
      .filter(Boolean)
      .join(" · ") || row.variant_code
  );
}

function clampInteger(
  value: number | string | undefined,
  fallback: number,
  min: number,
  max: number
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function escapeLikePattern(value: string) {
  return value.replace(/[%_,]/g, "");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function logProductQuery(event: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info(`[${event}]`, payload);
}
