import "server-only";

import { unstable_cache } from "next/cache";

import { canViewPrices } from "@/lib/auth";
import { interpretCatalogQueryLocal } from "@/lib/search-interpretation";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Profile } from "@/lib/types/auth";

type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type VariantRow = Database["public"]["Tables"]["product_variants"]["Row"];

export type ProductFilters = {
  brand?: string;
  category?: string;
  maxPrice?: number | string;
  minPrice?: number | string;
  page?: number | string;
  pageSize?: number | string;
  query?: string;
  usage?: string;
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
  color: string | null;
  diameter: number | null;
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
  totalCount: number | null;
  totalPages: number | null;
};

type CatalogVariantRow = Pick<
  VariantRow,
  | "connection_type"
  | "color"
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
  totalCount: number | null;
  totalPages: number | null;
};

const PRODUCT_DETAIL_SELECT =
  "id,brand,category_id,description,image_url,is_active,product_group_code,product_name,usage_area,category:categories(id,name,slug,sort_order),variants:product_variants(id,product_id,variant_code,manufacturer_ref,connection_type,color,currency,diameter,grit,image_url,is_active,package_quantity,price,stock_quantity,stock_status)";
const PRODUCT_CARD_SELECT =
  "id,brand,category_id,product_group_code,product_name,image_url,is_active,category:categories(id,name,slug,sort_order)";

type CatalogSearch = {
  diameterValues: number[];
  exactSku: string | null;
  normalizedTerms: string[];
  productTerms: string[];
  raw: string;
  variantTerms: string[];
};

export function getCanViewPrices(profile: Profile | null) {
  return canViewPrices(profile);
}

export function interpretCatalogQuery(query: string | undefined) {
  return interpretCatalogQueryLocal(query);
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

export async function getCatalogUsageAreas() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("usage_area")
    .eq("is_active", true)
    .not("usage_area", "is", null)
    .order("usage_area", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return [
    ...new Set(
      (data ?? [])
        .map((row) => row.usage_area?.trim())
        .filter((value): value is string => Boolean(value))
    ),
  ];
}

export async function getPublicProducts(filters: ProductFilters = {}) {
  const result = await getProductRows(filters);
  return mapProductListResult(result, toPublicProduct);
}

export const getCachedPublicFirstPageProducts = unstable_cache(
  async (filters: ProductFilters = {}) => getPublicProducts(filters),
  ["public-products-first-page"],
  {
    revalidate: 60,
    tags: ["public-products"],
  }
);

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
  const checkpoints: Record<string, number> = {};
  const measureCheckpoint = async <T>(label: string, work: () => Promise<T>) => {
    const checkpointStartedAt = performance.now();
    const result = await work();
    checkpoints[label] = Math.round(performance.now() - checkpointStartedAt);
    return result;
  };
  const supabase = getSupabaseAdminClient();
  const normalizedBrand = filters.brand?.trim() || "JOTA";
  const normalizedCategory = filters.category?.trim();
  const normalizedQuery = filters.query?.trim();
  const search = normalizedQuery ? buildCatalogSearch(normalizedQuery) : null;
  const normalizedUsage = filters.usage?.trim();
  const pageSize = clampInteger(filters.pageSize, 24, 1, 60);
  const page = clampInteger(filters.page, 1, 1, 10_000);
  const exactSku = search?.exactSku ?? null;
  const [categoryId, [matchingVariantProductIds, matchingCategoryIds, matchingProductIds], priceFilteredProductIds] =
    await Promise.all([
      measureCheckpoint("categoryLookupMs", async () =>
        normalizedCategory ? getCategoryIdBySlug(normalizedCategory) : null
      ),
      measureCheckpoint<[string[], string[], string[]]>("searchCandidateMs", async () => {
        if (!search) {
          return [[], [], []];
        }

        if (exactSku) {
          return [await getExactSkuVariantProductIds(exactSku), [], []];
        }

        return Promise.all([
          getMatchingVariantProductIds(search),
          getMatchingCategoryIds(search),
          getMatchingProductIds(search, normalizedBrand),
        ]);
      }),
      measureCheckpoint("priceFilterMs", async () =>
        options.includeSensitiveVariantFields
          ? getPriceFilteredProductIds(filters.minPrice, filters.maxPrice)
          : null
      ),
    ]);
  const searchCandidateProductIds = search
    ? uniqueStrings([
        ...matchingVariantProductIds,
        ...matchingProductIds,
      ])
    : null;

  if (priceFilteredProductIds && priceFilteredProductIds.length === 0) {
    return getEmptyRowsResult(page, pageSize);
  }

  if (search && searchCandidateProductIds?.length === 0 && matchingCategoryIds.length === 0) {
    return getEmptyRowsResult(page, pageSize);
  }

  let query = supabase
    .from("products")
    .select(PRODUCT_CARD_SELECT)
    .eq("is_active", true)
    .eq("brand", normalizedBrand)
    .order("product_name", { ascending: true });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (normalizedUsage) {
    query = query.eq("usage_area", normalizedUsage);
  }

  if (priceFilteredProductIds) {
    query = query.in("id", priceFilteredProductIds);
  }

  if (search) {
    const productIds = uniqueStrings([
      ...(searchCandidateProductIds ?? []),
      ...(matchingCategoryIds.length
        ? await getProductIdsByCategoryIds(matchingCategoryIds, normalizedBrand)
        : []),
    ]);

    if (!productIds.length) {
      return getEmptyRowsResult(page, pageSize);
    }

    query = query.in("id", productIds).limit(500);
  } else {
    const rawFrom = 0;
    const rawTo = Math.max(pageSize * 2, page * pageSize * 2) - 1;
    query = query.range(rawFrom, rawTo);
  }

  const productResult = await measureCheckpoint("productQueryMs", async () => query);
  const { data, error } = productResult;

  if (error) {
    throw new Error(error.message);
  }

  const productRows = normalizeListProductRows(data ?? []);
  let paginatedRows: ProductQueryRow[];
  let totalCount: number | null;
  let hasNextPage: boolean;

  if (search) {
    const variantSummaries = await measureCheckpoint("variantQueryMs", async () =>
      productRows.length
        ? getListVariantsForProducts(
            productRows.map((row) => row.id),
            Boolean(options.includeSensitiveVariantFields),
            search
          )
        : new Map<string, CatalogVariantRow[]>()
    );
    const mappingStartedAt = performance.now();
    const rows = productRows.map((product) => ({
      ...product,
      variants: variantSummaries.get(product.id) ?? [],
    }));
    const searchedRows = rows.filter((row) =>
      rowMatchesCatalogSearch(row, search, {
        matchingCategoryIds,
        matchingVariantProductIds,
      })
    );
    const groupedRows = groupCatalogProductRows(rows, searchedRows);
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const nextRow = groupedRows[to];
    paginatedRows = groupedRows.slice(from, to);
    totalCount = groupedRows.length;
    hasNextPage = Boolean(nextRow);
    checkpoints.mappingMs = Math.round(performance.now() - mappingStartedAt);
  } else {
    const groupedRows = getVisibleProductGroups(productRows);
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const currentGroups = groupedRows.slice(from, to);
    const nextGroup = groupedRows[to];
    const visibleProductIds = uniqueStrings(
      currentGroups.flatMap((group) => group.map((row) => row.id))
    );
    const variantSummaries = await measureCheckpoint("variantQueryMs", async () =>
      visibleProductIds.length
        ? getListVariantsForProducts(
            visibleProductIds,
            Boolean(options.includeSensitiveVariantFields)
          )
        : new Map<string, CatalogVariantRow[]>()
    );
    const mappingStartedAt = performance.now();
    paginatedRows = currentGroups.map((group) =>
      mergeProductFamilyRows(
        group.map((product) => ({
          ...product,
          variants: variantSummaries.get(product.id) ?? [],
        }))
      )
    );
    totalCount = null;
    hasNextPage = Boolean(nextGroup);
    checkpoints.mappingMs = Math.round(performance.now() - mappingStartedAt);
  }
  const variantCount = paginatedRows.reduce(
    (sum, product) => sum + product.variants.length,
    0
  );

  logProductQuery("products.list", {
    checkpoints,
    durationMs: Math.round(performance.now() - startedAt),
    includeSensitiveVariantFields: Boolean(options.includeSensitiveVariantFields),
    page,
    pageSize,
    fetchedRowCount: productRows.length,
    productCount: paginatedRows.length,
    rawProductCount: productRows.length,
    countSkipped: !search,
    hasNext: hasNextPage,
    hasPrevious: page > 1,
    totalCount,
    variantCount,
  });

  return {
    hasNextPage,
    hasPreviousPage: page > 1,
    page,
    pageSize,
    rows: paginatedRows,
    totalCount,
    totalPages: totalCount === null ? null : Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

async function getPriceFilteredProductIds(
  minPrice: number | string | undefined,
  maxPrice: number | string | undefined
) {
  const min = getPriceFilterValue(minPrice);
  const max = getPriceFilterValue(maxPrice);

  if (min === null && max === null) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("product_variants")
    .select("product_id")
    .eq("is_active", true)
    .limit(5000);

  if (min !== null) {
    query = query.gte("price", min);
  }

  if (max !== null) {
    query = query.lte("price", max);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.product_id))];
}

function getEmptyRowsResult(page: number, pageSize: number): ProductRowsResult {
  return {
    hasNextPage: false,
    hasPreviousPage: page > 1,
    page,
    pageSize,
    rows: [],
    totalCount: 0,
    totalPages: 1,
  };
}

async function getProductRowById(productId: string) {
  const supabase = getSupabaseAdminClient();
  const startedAt = performance.now();

  let query = supabase
    .from("products")
    .select(PRODUCT_DETAIL_SELECT)
    .eq("is_active", true);

  query = isUuid(productId)
    ? query.eq("id", productId)
    : query.eq("product_group_code", productId);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const row = data ? normalizeProductRows([data])[0] : null;
  const groupedRow = row ? await getGroupedProductDetailRow(row) : null;

  logProductQuery("products.detail", {
    durationMs: Math.round(performance.now() - startedAt),
    found: Boolean(groupedRow),
    productId,
    variantCount: groupedRow?.variants.length ?? 0,
  });

  return groupedRow;
}

async function getGroupedProductDetailRow(row: ProductQueryRow) {
  const family = getProductFamilyParts(row.product_name);

  if (!family.baseCode || !family.remainder || !row.category_id) {
    return row;
  }

  const supabase = getSupabaseAdminClient();
  const familyRows = await getProductDetailFamilyRows({
    baseCode: family.baseCode,
    brand: row.brand,
    categoryId: row.category_id,
    remainder: family.remainder,
    supabase,
  });

  if (familyRows.length <= 1) {
    return row;
  }

  return mergeProductFamilyRows(familyRows);
}

async function getProductDetailFamilyRows({
  baseCode,
  brand,
  categoryId,
  remainder,
  supabase,
}: {
  baseCode: string;
  brand: string;
  categoryId: string;
  remainder: string;
  supabase: ReturnType<typeof getSupabaseAdminClient>;
}) {
  const familyKey = [
    normalizeSearchText(brand),
    categoryId,
    baseCode,
    normalizeSearchText(remainder),
  ].join("|");
  const codeMatchedRows = await getFamilyRowsByQuery(
    supabase
      .from("products")
      .select(PRODUCT_DETAIL_SELECT)
      .eq("is_active", true)
      .eq("brand", brand)
      .eq("category_id", categoryId)
      .ilike("product_group_code", `${escapeLikePattern(baseCode)}%`)
      .limit(24),
    familyKey
  );

  if (codeMatchedRows.length > 1) {
    return codeMatchedRows;
  }

  return getFamilyRowsByQuery(
    supabase
      .from("products")
      .select(PRODUCT_DETAIL_SELECT)
      .eq("is_active", true)
      .eq("brand", brand)
      .eq("category_id", categoryId)
      .ilike("product_name", `%${escapeLikePattern(remainder)}%`)
      .limit(40),
    familyKey
  );
}

async function getFamilyRowsByQuery(
  query: PromiseLike<{
    data: unknown[] | null;
    error: { message: string } | null;
  }>,
  familyKey: string
) {
  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return normalizeProductRows(data ?? []).filter(
    (candidate) => getProductFamilyKey(candidate) === familyKey
  );
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
      description: product.description ?? null,
      id: product.id,
      image_url: product.image_url,
      is_active: product.is_active,
      product_group_code: product.product_group_code,
      product_name: product.product_name,
      usage_area: product.usage_area ?? null,
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
  includeSensitiveVariantFields: boolean,
  search: CatalogSearch | null = null
) {
  const supabase = getSupabaseAdminClient();
  const select = includeSensitiveVariantFields
    ? "id,product_id,variant_code,manufacturer_ref,connection_type,color,diameter,grit,package_quantity,price,currency,stock_quantity,stock_status,image_url,is_active"
    : "id,product_id,variant_code,manufacturer_ref,connection_type,color,diameter,grit,package_quantity,image_url,is_active";
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
        | "color"
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

  const variantsByProduct = rows.reduce((currentVariantsByProduct, row) => {
    const normalizedVariant = {
      connection_type: row.connection_type,
      color: row.color,
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
    const current = currentVariantsByProduct.get(normalizedVariant.product_id) ?? [];
    current.push(normalizedVariant);
    currentVariantsByProduct.set(normalizedVariant.product_id, current);
    return currentVariantsByProduct;
  }, new Map<string, CatalogVariantRow[]>());

  if (search) {
    for (const [productId, variants] of variantsByProduct) {
      variantsByProduct.set(productId, sortVariantsBySearchMatch(variants, search));
    }
  }

  return variantsByProduct;
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
    color: row.color,
    diameter: row.diameter,
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

function groupCatalogProductRows(
  allRows: ProductQueryRow[],
  visibleRows: ProductQueryRow[]
) {
  const visibleFamilyKeys = new Set(visibleRows.map(getProductFamilyKey));
  const groups = allRows.reduce((currentGroups, row) => {
    const key = getProductFamilyKey(row);

    if (!visibleFamilyKeys.has(key)) {
      return currentGroups;
    }

    const current = currentGroups.get(key) ?? [];
    current.push(row);
    currentGroups.set(key, current);
    return currentGroups;
  }, new Map<string, ProductQueryRow[]>());

  return Array.from(groups.values())
    .map(mergeProductFamilyRows)
    .sort((left, right) => left.product_name.localeCompare(right.product_name, "tr-TR"));
}

function getVisibleProductGroups(rows: Array<Omit<ProductQueryRow, "variants">>) {
  const groups = rows.reduce((currentGroups, row) => {
    const key = getProductFamilyKey(row);
    const current = currentGroups.get(key) ?? [];
    current.push(row);
    currentGroups.set(key, current);
    return currentGroups;
  }, new Map<string, Array<Omit<ProductQueryRow, "variants">>>());

  return Array.from(groups.values())
    .sort((left, right) => {
      const leftCanonical = getCanonicalGroupRow(left);
      const rightCanonical = getCanonicalGroupRow(right);
      return leftCanonical.product_name.localeCompare(rightCanonical.product_name, "tr-TR");
    });
}

function getCanonicalGroupRow<T extends Pick<ProductQueryRow, "product_name">>(rows: T[]) {
  return rows.find((row) => isBaseFamilyProductName(row.product_name)) ?? rows[0];
}

function mergeProductFamilyRows(rows: ProductQueryRow[]): ProductQueryRow {
  const sortedRows = [...rows].sort((left, right) =>
    left.product_name.localeCompare(right.product_name, "tr-TR")
  );
  const canonical =
    sortedRows.find((row) => isBaseFamilyProductName(row.product_name)) ?? sortedRows[0];
  const family = getProductFamilyParts(canonical.product_name);
  const mergedVariants = uniqueVariants(
    sortedRows.flatMap((row) => row.variants)
  ).sort((left, right) =>
    getVariantSortLabel(left).localeCompare(getVariantSortLabel(right), "tr-TR", {
      numeric: true,
    })
  );

  return {
    ...canonical,
    description: canonical.description ?? sortedRows.find((row) => row.description)?.description ?? null,
    image_url: canonical.image_url ?? sortedRows.find((row) => row.image_url)?.image_url ?? null,
    product_group_code: family.baseCode ?? canonical.product_group_code,
    product_name: family.displayName ?? canonical.product_name,
    variants: mergedVariants,
  };
}

function uniqueVariants(variants: CatalogVariantRow[]) {
  const seen = new Set<string>();
  const unique: CatalogVariantRow[] = [];

  for (const variant of variants) {
    if (seen.has(variant.id)) {
      continue;
    }

    seen.add(variant.id);
    unique.push(variant);
  }

  return unique;
}

function getVariantSortLabel(variant: CatalogVariantRow) {
  return [
    variant.connection_type,
    formatDiameterCode(variant.diameter ?? 0),
    variant.grit,
    variant.color,
    variant.variant_code,
  ]
    .filter(Boolean)
    .join(" ");
}

function rowMatchesCatalogSearch(
  row: ProductQueryRow,
  search: CatalogSearch,
  matches: {
    matchingCategoryIds: string[];
    matchingVariantProductIds: string[];
  }
) {
  if (
    (row.category_id && matches.matchingCategoryIds.includes(row.category_id)) ||
    matches.matchingVariantProductIds.includes(row.id)
  ) {
    return true;
  }

  const productHaystack = normalizeSearchText(
    [
      row.product_name,
      row.product_group_code,
      row.description,
      row.usage_area,
      row.brand,
      row.category?.name,
      row.category?.slug,
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (search.productTerms.some((term) => productHaystack.includes(term))) {
    return true;
  }

  return row.variants.some((variant) => getVariantSearchScore(variant, search) > 0);
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

async function getMatchingVariantProductIds(search: CatalogSearch) {
  const supabase = getSupabaseAdminClient();
  const variantSearch = [
    ...search.variantTerms.flatMap((term) => {
      const escapedTerm = escapeLikePattern(term);
      const upperTerm = term.toLocaleUpperCase("tr-TR");
      return [
        `variant_code.ilike.%${escapedTerm}%`,
        `manufacturer_ref.ilike.%${escapedTerm}%`,
        `connection_type.eq.${upperTerm}`,
        `color.ilike.%${escapedTerm}%`,
        `grit.eq.${upperTerm}`,
      ];
    }),
    ...search.diameterValues.map((diameter) => `diameter.eq.${diameter}`),
  ].join(",");

  if (!variantSearch) {
    return [];
  }

  const { data, error } = await supabase
    .from("product_variants")
    .select("product_id")
    .eq("is_active", true)
    .or(variantSearch)
    .limit(5000);

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.product_id))];
}

async function getExactSkuVariantProductIds(exactSku: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("product_id")
    .eq("is_active", true)
    .or(`variant_code.eq.${exactSku},manufacturer_ref.eq.${exactSku}`)
    .limit(25);

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.product_id))];
}

async function getMatchingProductIds(search: CatalogSearch, brand: string) {
  const supabase = getSupabaseAdminClient();
  const productSearch = search.productTerms
    .flatMap((term) => {
      const escapedTerm = escapeLikePattern(term);
      return [
        `product_name.ilike.%${escapedTerm}%`,
        `product_group_code.ilike.%${escapedTerm}%`,
        `description.ilike.%${escapedTerm}%`,
        `usage_area.ilike.%${escapedTerm}%`,
      ];
    })
    .join(",");

  if (!productSearch) {
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("is_active", true)
    .eq("brand", brand)
    .or(productSearch)
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.id))];
}

async function getProductIdsByCategoryIds(categoryIds: string[], brand: string) {
  if (!categoryIds.length) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("is_active", true)
    .eq("brand", brand)
    .in("category_id", categoryIds)
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.id))];
}

async function getMatchingCategoryIds(search: CatalogSearch) {
  const supabase = getSupabaseAdminClient();
  const categorySearch = search.productTerms
    .flatMap((term) => {
      const escapedTerm = escapeLikePattern(term);
      return [`name.ilike.%${escapedTerm}%`, `slug.ilike.%${escapedTerm}%`];
    })
    .join(",");

  if (!categorySearch) {
    return [];
  }

  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("status", "active")
    .or(categorySearch)
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.id))];
}

function getVariantName(row: CatalogVariantRow) {
  const label = [
    row.connection_type,
    row.color,
    formatDisplayDiameter(row.diameter),
    row.grit,
  ]
    .filter(Boolean)
    .join(" · ");

  if (label) {
    return label;
  }

  if (row.manufacturer_ref && !isUuid(row.manufacturer_ref)) {
    return row.manufacturer_ref;
  }

  return isUuid(row.variant_code) ? "Varyant seçeneği" : row.variant_code;
}

function buildCatalogSearch(rawQuery: string): CatalogSearch {
  const raw = rawQuery.trim();
  const normalizedRaw = normalizeSearchText(raw);
  const exactSku = getExactSkuSearch(raw);
  const baseTerms = splitSearchTerms(normalizedRaw);
  const interpretedTerms = interpretCatalogQueryLocal(raw).flatMap(
    (criterion) => criterion.searchTerms
  );
  const expandedTerms = uniqueStrings([
    normalizedRaw,
    ...baseTerms,
    ...interpretedTerms,
    ...baseTerms.flatMap(getSearchSynonyms),
    ...getSearchSynonyms(normalizedRaw),
    ...interpretedTerms.flatMap(getSearchSynonyms),
  ]);
  const holderTerms = expandedTerms
    .map((term) => term.toLocaleUpperCase("tr-TR"))
    .filter((term) => term === "FG" || term === "RA" || term === "HP");
  const diameterValues = getDiameterSearchValues(expandedTerms);

  return {
    diameterValues,
    exactSku,
    normalizedTerms: expandedTerms.map(normalizeSearchText),
    productTerms: uniqueStrings(expandedTerms.filter((term) => !isHolderTerm(term))),
    raw,
    variantTerms: uniqueStrings([...expandedTerms, ...holderTerms]),
  };
}

function isHolderTerm(term: string) {
  const normalized = term.toLocaleUpperCase("tr-TR");

  return normalized === "FG" || normalized === "RA" || normalized === "HP";
}

function getExactSkuSearch(value: string) {
  const normalized = value.trim().toLocaleUpperCase("tr-TR");

  if (!/^(JOT|JOTA)-[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(normalized)) {
    return null;
  }

  return normalized;
}

function getSearchSynonyms(term: string) {
  const normalized = normalizeSearchText(term);
  const synonyms: Record<string, string[]> = {
    black: ["siyah"],
    blue: ["mavi"],
    carbide: ["karbit"],
    cilalama: ["polisaj", "polish", "polisher"],
    composite: ["kompozit"],
    diamond: ["elmas"],
    green: ["yesil", "yeÅŸil"],
    karbit: ["carbide"],
    kirmizi: ["kÄ±rmÄ±zÄ±", "red"],
    "kÄ±rmÄ±zÄ±": ["kirmizi", "red"],
    mavi: ["blue"],
    polisaj: ["cilalama", "polish", "polisher"],
    red: ["kirmizi", "kÄ±rmÄ±zÄ±"],
    sari: ["sarÄ±", "yellow"],
    "sarÄ±": ["sari", "yellow"],
    set: ["paket", "kit"],
    siyah: ["black"],
    yesil: ["yeÅŸil", "green"],
    "yeÅŸil": ["yesil", "green"],
    yellow: ["sari", "sarÄ±"],
    zirconia: ["zirkonya", "zirkon"],
    zirkon: ["zirkonya", "zirconia"],
    zirkonya: ["zirkon", "zirconia"],
  };

  return synonyms[normalized] ?? [];
}

function splitSearchTerms(value: string) {
  return value
    .split(/[\s,/.-]+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function getDiameterSearchValues(terms: string[]) {
  return uniqueNumbers(
    terms.flatMap((term) => {
      const normalized = term.replace(/[^\d]/g, "");

      if (!/^\d{2}$/.test(normalized) && !/^0\d{2}$/.test(normalized)) {
        return [];
      }

      const numeric = Number(normalized);

      if (!Number.isFinite(numeric) || numeric <= 0) {
        return [];
      }

      return [numeric / 10];
    })
  );
}

function sortVariantsBySearchMatch(
  variants: CatalogVariantRow[],
  search: CatalogSearch
) {
  return [...variants].sort((a, b) => {
    const scoreDifference =
      getVariantSearchScore(b, search) - getVariantSearchScore(a, search);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return a.variant_code.localeCompare(b.variant_code, "tr-TR");
  });
}

function getVariantSearchScore(variant: CatalogVariantRow, search: CatalogSearch) {
  const variantCode = variant.variant_code.toLocaleUpperCase("tr-TR");
  const manufacturerRef = variant.manufacturer_ref?.toLocaleUpperCase("tr-TR");
  const exactSkuScore =
    search.exactSku &&
    (variantCode === search.exactSku || manufacturerRef === search.exactSku)
      ? 1000
      : 0;
  const haystack = normalizeSearchText(
    [
      variant.variant_code,
      variant.manufacturer_ref,
      variant.connection_type,
      variant.color,
      variant.grit,
      variant.diameter ? formatDiameterCode(variant.diameter) : null,
      variant.diameter ? String(variant.diameter) : null,
    ]
      .filter(Boolean)
      .join(" ")
  );
  const termScore = search.normalizedTerms.reduce(
    (score, term) => score + (haystack.includes(term) ? 1 : 0),
    0
  );
  const diameterScore = search.diameterValues.some(
    (diameter) => variant.diameter === diameter
  )
    ? 2
    : 0;

  return exactSkuScore + termScore + diameterScore;
}

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

function getProductFamilyKey(row: Pick<ProductQueryRow, "brand" | "category_id" | "product_name">) {
  const family = getProductFamilyParts(row.product_name);
  const token = family.baseCode ?? normalizeSearchText(row.product_name);

  return [
    normalizeSearchText(row.brand),
    row.category_id,
    token,
    normalizeSearchText(family.remainder ?? ""),
  ].join("|");
}

function getProductFamilyParts(productName: string) {
  const normalizedName = productName
    .replace(/\s+/g, " ")
    .replace(/^JOTA\s+/i, "")
    .trim();
  const [firstToken, ...restTokens] = normalizedName.split(" ");
  const parsedToken = parseGroupableJotaToken(firstToken ?? "");
  const baseCode = parsedToken?.baseCode ?? firstToken ?? null;
  const remainder = restTokens.join(" ").trim();

  return {
    baseCode,
    displayName: baseCode ? [baseCode, remainder].filter(Boolean).join(" ") : null,
    remainder,
  };
}

function isBaseFamilyProductName(productName: string) {
  const [firstToken] = productName.replace(/\s+/g, " ").trim().split(" ");

  return Boolean(firstToken && /^\d{3,5}$/.test(firstToken));
}

function parseGroupableJotaToken(token: string) {
  const normalized = token.toLocaleUpperCase("tr-TR").trim();
  const match = normalized.match(/^(\d{3,5})([A-Z]{1,2})$/);

  if (!match || !GROUPABLE_JOTA_SUFFIXES.has(match[2])) {
    return null;
  }

  return {
    baseCode: match[1],
    suffix: match[2],
  };
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

function getPriceFilterValue(value: number | string | undefined) {
  if (value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function escapeLikePattern(value: string) {
  return value.replace(/[%_,]/g, "");
}

function normalizeSearchText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Ä±/g, "i")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values.filter((value) => Number.isFinite(value)))];
}

function formatDiameterCode(value: number) {
  return String(Math.round(value * 10)).padStart(3, "0");
}

function formatDisplayDiameter(value: number | null) {
  if (value === null || !Number.isFinite(value) || value <= 0 || value > 6) {
    return null;
  }

  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);

  return `Ø ${formatted}`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function logProductQuery(event: string, payload: Record<string, unknown>) {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.DENTECH_PERF_LOGS !== "true"
  ) {
    return;
  }

  console.info(`[${event}]`, payload);
}
