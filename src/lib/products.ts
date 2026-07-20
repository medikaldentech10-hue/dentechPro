import "server-only";

import { unstable_cache } from "next/cache";

import { canViewPrices, type AccessProfile } from "@/lib/auth";
import { interpretCatalogQueryLocal } from "@/lib/search-interpretation";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

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
  clinicalNote?: string | null;
  code: string;
  connectionType: string | null;
  color: string | null;
  diameter: number | null;
  grit: string | null;
  groupImageUrl?: string | null;
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
  publicSlug: string;
  status: string;
  usageArea: string | null;
  variantCount: number;
  variants: PublicCatalogVariant[];
  relatedProducts?: RelatedCatalogProduct[];
};

export type PricedCatalogProduct = Omit<PublicCatalogProduct, "variants"> & {
  variants: PricedCatalogVariant[];
};

export type RelatedCatalogProduct = {
  brand: string;
  categoryName: string | null;
  href: string;
  id: string;
  imageUrl: string | null;
  name: string;
  variantCount: number;
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

type CatalogVariantRow = {
  connection_type: VariantRow["connection_type"];
  color: VariantRow["color"];
  currency: VariantRow["currency"];
  diameter: VariantRow["diameter"];
  grit: VariantRow["grit"];
  group_image_url?: string | null;
  id: VariantRow["id"];
  image_url: VariantRow["image_url"];
  is_active: VariantRow["is_active"];
  length: VariantRow["length"];
  manufacturer_ref: VariantRow["manufacturer_ref"];
  package_quantity: VariantRow["package_quantity"];
  price: VariantRow["price"];
  product_id: VariantRow["product_id"];
  product_description?: string | null;
  stock_quantity: VariantRow["stock_quantity"];
  stock_status: VariantRow["stock_status"];
  variant_code: VariantRow["variant_code"];
};

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

type MainCategoryMatchRow = {
  brand: string | null;
  category:
    | { name: string | null; slug: string | null }
    | Array<{ name: string | null; slug: string | null }>
    | null;
  id: string;
  product_group_code: string | null;
  product_name: string | null;
  usage_area: string | null;
};

const PRODUCT_DETAIL_SELECT =
  "id,brand,category_id,description,image_url,is_active,product_group_code,product_name,usage_area,category:categories(id,name,slug,sort_order),variants:product_variants(id,product_id,variant_code,manufacturer_ref,connection_type,color,currency,diameter,length,grit,image_url,is_active,package_quantity,price,stock_quantity,stock_status)";
const PRODUCT_CARD_SELECT =
  "id,brand,category_id,product_group_code,product_name,image_url,is_active,category:categories(id,name,slug,sort_order)";
const PUBLIC_PRODUCT_CARD_VARIANT_SELECT =
  "id,product_id,variant_code,manufacturer_ref,connection_type,color,diameter,length,grit,package_quantity,image_url,is_active";
const PRICED_PRODUCT_CARD_VARIANT_SELECT =
  `${PUBLIC_PRODUCT_CARD_VARIANT_SELECT},price,currency,stock_quantity,stock_status`;

type CatalogSearch = {
  diameterValues: number[];
  exactSku: string | null;
  normalizedTerms: string[];
  productTerms: string[];
  raw: string;
  variantTerms: string[];
};

const JOTA_BRAND_ALIASES = ["JOTA", "JOTA Switzerland"] as const;
const MAIN_CATEGORY_FILTERS: Record<string, string[]> = {
  cilalama: ["cilalama", "polisaj", "polish", "polisher", "zirkonya", "metal"],
  frezler: ["frez", "bur", "asindirici", "tas", "elmas", "karbit", "diamond", "carbide"],
  "klinik-cihazlar": ["klinik", "cihaz", "device", "laser", "rvg", "scanner", "tarayici", "kamera", "camera", "airjet"],
  "olcu-materyalleri": ["olcu", "impression", "measure", "materyal", "aljinat", "silikon", "seil"],
  pedodonti: ["pedodonti", "cocuk", "pediatric"],
  "setler-paketler": ["set", "paket", "package", "kit"],
};

export function getCanViewPrices(profile: AccessProfile | null) {
  return canViewPrices(profile);
}

export function interpretCatalogQuery(query: string | undefined) {
  return interpretCatalogQueryLocal(query);
}

export function getProductPublicPath(
  product: Pick<PublicCatalogProduct, "brand" | "code" | "id" | "name"> & { publicSlug?: string | null }
) {
  const explicitSlug =
    product.publicSlug && isUsableBusinessCode(product.publicSlug)
      ? slugifyPublicSegment(product.publicSlug)
      : null;

  return `/products/${encodeURIComponent(explicitSlug || getProductPublicSlug(product))}`;
}

export async function getCatalogCategories() {
  return getCachedCatalogCategories();
}

export async function getActiveCatalogCategories() {
  const [categories, productCategories] = await Promise.all([
    getCatalogCategories(),
    getActiveProductCategoryIds(),
  ]);
  const activeCategoryIds = new Set(productCategories);

  return categories.filter((category) => activeCategoryIds.has(category.id));
}

const getActiveProductCategoryIds = unstable_cache(
  async () => {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("category_id")
      .eq("is_active", true)
      .not("category_id", "is", null)
      .limit(5000);

    if (error) {
      throw new Error(error.message);
    }

    return [...new Set((data ?? []).map((row) => row.category_id).filter(Boolean))];
  },
  ["active-product-category-ids"],
  { revalidate: 60, tags: ["catalog-taxonomy", "public-products"] }
);

const getCachedCatalogCategories = unstable_cache(
  async () => {
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
  },
  ["catalog-categories"],
  {
    revalidate: 60,
    tags: ["catalog-taxonomy"],
  }
);

export async function getCatalogUsageAreas() {
  return getCachedCatalogUsageAreas();
}

const getCachedCatalogUsageAreas = unstable_cache(
  async () => {
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
  },
  ["catalog-usage-areas"],
  {
    revalidate: 60,
    tags: ["catalog-taxonomy"],
  }
);

const getCachedCollidingNonJotaNameSlugs = unstable_cache(
  async () => {
    const supabase = getSupabaseAdminClient();
    const products: Array<Pick<ProductQueryRow, "brand" | "product_group_code" | "product_name">> = [];
    const pageSize = 1000;

    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("products")
        .select("brand,product_group_code,product_name")
        .eq("is_active", true)
        .order("id", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(error.message);
      }

      products.push(...(data ?? []));

      if ((data?.length ?? 0) < pageSize) {
        break;
      }
    }

    return getCollidingNonJotaNameSlugs(products);
  },
  ["non-jota-public-slug-collisions"],
  {
    revalidate: 60,
    tags: ["public-products"],
  }
);

export async function getPublicProducts(filters: ProductFilters = {}) {
  const [result, collidingNameSlugs] = await Promise.all([
    getProductRows(filters),
    getCachedCollidingNonJotaNameSlugs(),
  ]);
  const collisions = new Set(collidingNameSlugs);
  return mapProductListResult(result, (row) => toPublicProduct(row, collisions));
}

export async function getPublicMainCategoryAvailability(slugs: readonly string[]) {
  const rows = await getCachedMainCategoryMatchRows();

  return Object.fromEntries(
    slugs.map((slug) => {
      const terms = getMainCategoryTerms(slug);
      return [slug, Boolean(terms && rows.some((row) => rowMatchesMainCategoryTerms(row, terms)))];
    })
  ) as Record<string, boolean>;
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
  const [row, collidingNameSlugs] = await Promise.all([
    getProductRowById(productId),
    getCachedCollidingNonJotaNameSlugs(),
  ]);
  return row ? toPublicProduct(row, new Set(collidingNameSlugs)) : null;
}

export async function getPricedProductsForProfile(
  profile: AccessProfile | null,
  filters: ProductFilters = {}
) {
  if (!getCanViewPrices(profile)) {
    return getPublicProducts(filters);
  }

  const [result, collidingNameSlugs] = await Promise.all([
    getProductRows(filters, { includeSensitiveVariantFields: true }),
    getCachedCollidingNonJotaNameSlugs(),
  ]);
  const collisions = new Set(collidingNameSlugs);
  return mapProductListResult(result, (row) => toPricedProduct(row, collisions));
}

export async function getPricedProductByIdForProfile(
  profile: AccessProfile | null,
  productId: string
) {
  const [row, collidingNameSlugs] = await Promise.all([
    getProductRowById(productId),
    getCachedCollidingNonJotaNameSlugs(),
  ]);

  if (!row) {
    return null;
  }

  const collisions = new Set(collidingNameSlugs);
  const relatedProducts = await getRelatedProductSummaries(row, collisions);
  const product = getCanViewPrices(profile)
    ? toPricedProduct(row, collisions)
    : toPublicProduct(row, collisions);

  return {
    ...product,
    relatedProducts,
  };
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
  const normalizedBrand = normalizeBrandFilter(filters.brand);
  const normalizedCategory = normalizeCategoryFilter(filters.category);
  const normalizedQuery = filters.query?.trim();
  const search = normalizedQuery ? buildCatalogSearch(normalizedQuery) : null;
  const normalizedUsage = filters.usage?.trim();
  const pageSize = clampInteger(filters.pageSize, 24, 1, 60);
  const page = clampInteger(filters.page, 1, 1, 10_000);
  const exactSku = search?.exactSku ?? null;
  const embedListVariants = !search && page === 1;
  const [categoryIds, categoryFilteredProductIds, [matchingVariantProductIds, matchingCategoryIds, matchingProductIds], priceFilteredProductIds] =
    await Promise.all([
      measureCheckpoint("categoryLookupMs", async () =>
        normalizedCategory ? getCategoryIdsBySlug(normalizedCategory) : []
      ),
      measureCheckpoint("mainCategoryFilterMs", async () =>
        normalizedCategory && getMainCategoryTerms(normalizedCategory)
          ? getProductIdsByMainCategoryTerms(normalizedCategory, normalizedBrand)
          : null
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

  if (categoryFilteredProductIds && categoryFilteredProductIds.length === 0) {
    return getEmptyRowsResult(page, pageSize);
  }

  if (search && searchCandidateProductIds?.length === 0 && matchingCategoryIds.length === 0) {
    return getEmptyRowsResult(page, pageSize);
  }

  let query = supabase
    .from("products")
    .select(
      embedListVariants
        ? `${PRODUCT_CARD_SELECT},variants:product_variants(${
            options.includeSensitiveVariantFields
              ? PRICED_PRODUCT_CARD_VARIANT_SELECT
              : PUBLIC_PRODUCT_CARD_VARIANT_SELECT
          })`
        : PRODUCT_CARD_SELECT
    )
    .eq("is_active", true)
    .order("product_name", { ascending: true });

  if (embedListVariants) {
    query = query.eq("variants.is_active", true);
  }

  if (normalizedBrand) {
    query = isJotaBrand(normalizedBrand)
      ? query.in("brand", JOTA_BRAND_ALIASES)
      : query.eq("brand", normalizedBrand);
  }

  if (categoryIds.length) {
    query = query.in("category_id", categoryIds);
  }

  if (categoryFilteredProductIds) {
    query = query.in("id", categoryFilteredProductIds);
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

  const productRows: ProductQueryRow[] = embedListVariants
    ? normalizeProductRows(data ?? [])
    : normalizeListProductRows(data ?? []).map((product) => ({ ...product, variants: [] }));
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
    const groupedRows = groupCatalogProductRows(rows, searchedRows).sort((left, right) =>
      compareRowsBySearchScore(left, right, search)
    );
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
    const variantSummaries = embedListVariants
      ? null
      : await measureCheckpoint("variantQueryMs", async () => {
          const visibleProductIds = uniqueStrings(
            currentGroups.flatMap((group) => group.map((row) => row.id))
          );
          return visibleProductIds.length
            ? getListVariantsForProducts(
                visibleProductIds,
                Boolean(options.includeSensitiveVariantFields)
              )
            : new Map<string, CatalogVariantRow[]>();
        });
    const mappingStartedAt = performance.now();
    paginatedRows = currentGroups.map((group) =>
      mergeProductFamilyRows(
        variantSummaries
          ? group.map((product) => ({
              ...product,
              variants: variantSummaries.get(product.id) ?? [],
            }))
          : group
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
    filters: {
      activeOnly: true,
      brand: normalizedBrand,
      category: normalizedCategory,
      categoryIds,
      hasPriceFilter: priceFilteredProductIds !== null,
      mainCategoryProductCount: categoryFilteredProductIds?.length ?? null,
      query: normalizedQuery ?? null,
      searchTerms: search?.normalizedTerms ?? [],
      usage: normalizedUsage ?? null,
    },
    includeSensitiveVariantFields: Boolean(options.includeSensitiveVariantFields),
    variantLoadMode: search
      ? "search-query"
      : embedListVariants
        ? "embedded"
        : "visible-query",
    page,
    pageSize,
    fetchedRowCount: productRows.length,
    productCount: paginatedRows.length,
    rawProductCount: productRows.length,
    productQueryMs: checkpoints.productQueryMs ?? 0,
    renderPrepMs: checkpoints.mappingMs ?? 0,
    countSkipped: !search,
    hasNext: hasNextPage,
    hasPrevious: page > 1,
    totalCount,
    totalMs: Math.round(performance.now() - startedAt),
    variantQueryMs: checkpoints.variantQueryMs ?? 0,
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
  const lookup = productId.trim();
  let data: unknown | null = null;
  let fallbackResolution: Awaited<ReturnType<typeof getProductRowByPublicSlug>> | null = null;

  if (isUuid(lookup)) {
    const result = await supabase
      .from("products")
      .select(PRODUCT_DETAIL_SELECT)
      .eq("is_active", true)
      .eq("id", lookup)
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message);
    }

    data = result.data;
  } else {
    const [exactCodeResult, targetedResolution] = await Promise.all([
      supabase
        .from("products")
        .select(PRODUCT_DETAIL_SELECT)
        .eq("is_active", true)
        .eq("product_group_code", lookup)
        .maybeSingle(),
      getTargetedProductRowByPublicSlug(lookup, supabase),
    ]);

    if (exactCodeResult.error) {
      throw new Error(exactCodeResult.error.message);
    }

    data = exactCodeResult.data;
    fallbackResolution = data ? null : targetedResolution;

    if (!data && !fallbackResolution) {
      const caseInsensitiveCodeResult = await supabase
        .from("products")
        .select(PRODUCT_DETAIL_SELECT)
        .eq("is_active", true)
        .ilike("product_group_code", lookup)
        .maybeSingle();

      if (caseInsensitiveCodeResult.error) {
        throw new Error(caseInsensitiveCodeResult.error.message);
      }

      data = caseInsensitiveCodeResult.data;
      fallbackResolution = data
        ? null
        : await getProductRowByPublicSlug(lookup, supabase);
    }
  }

  const row = data
    ? normalizeProductRows([data])[0]
    : fallbackResolution?.row ?? null;
  const resolutionStrategy = data
    ? isUuid(lookup)
      ? "legacy_uuid"
      : "exact_product_code"
    : fallbackResolution?.strategy ?? "not_found";
  const groupedRow = row
    ? fallbackResolution?.strategy === "grouped_jota_slug"
      ? row
      : await getGroupedProductDetailRow(row)
    : null;

  logProductQuery("products.detail", {
    durationMs: Math.round(performance.now() - startedAt),
    found: Boolean(groupedRow),
    inputSlug: lookup,
    resolutionStrategy,
    variantCount: groupedRow?.variants.length ?? 0,
  });

  return groupedRow;
}

async function getTargetedProductRowByPublicSlug(
  lookup: string,
  supabase: ReturnType<typeof getSupabaseAdminClient>
) {
  const normalizedLookup = slugifyPublicSegment(lookup);
  const terms = normalizedLookup.split("-").map(escapeLikePattern).filter(Boolean);

  if (!normalizedLookup || !terms.length) {
    return null;
  }

  let query = supabase
    .from("products")
    .select(PRODUCT_DETAIL_SELECT)
    .eq("is_active", true)
    .limit(80);

  if (/^[a-z]*\d+[a-z]*$/.test(normalizedLookup)) {
    query = query
      .in("brand", JOTA_BRAND_ALIASES)
      .ilike("product_name", `%${escapeLikePattern(normalizedLookup)}%`);
  } else {
    query = query.ilike("product_name", `%${terms.join("%")}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = normalizeProductRows(data ?? []);
  const collidingNameSlugs = new Set(getCollidingNonJotaNameSlugs(rows));
  const exactProduct = rows.find(
    (row) => getProductPublicSlug(row, collidingNameSlugs) === normalizedLookup
  );

  if (exactProduct) {
    return { row: exactProduct, strategy: "canonical_product_slug" as const };
  }

  const jotaRows = rows.filter((row) => isJotaBrand(row.brand));
  const groupedJotaProduct = groupCatalogProductRows(jotaRows, jotaRows)
    .filter((row) => row.variants.length > 0)
    .find((row) => getProductPublicSlug(row, collidingNameSlugs) === normalizedLookup);

  return groupedJotaProduct
    ? { row: groupedJotaProduct, strategy: "grouped_jota_slug" as const }
    : null;
}

async function getProductRowByPublicSlug(
  lookup: string,
  supabase: ReturnType<typeof getSupabaseAdminClient>
) {
  const normalizedLookup = slugifyPublicSegment(lookup);

  if (!normalizedLookup) {
    return { row: null, strategy: "invalid_slug" as const };
  }

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_DETAIL_SELECT)
    .eq("is_active", true)
    .limit(1000);

  if (error) {
    throw new Error(error.message);
  }

  const rows = normalizeProductRows(data ?? []);
  const collidingNameSlugs = new Set(getCollidingNonJotaNameSlugs(rows));
  const exactProduct = rows.find(
    (row) => getProductPublicSlug(row, collidingNameSlugs) === normalizedLookup
  );

  if (exactProduct) {
    return { row: exactProduct, strategy: "canonical_product_slug" as const };
  }

  const jotaRows = rows.filter((row) => isJotaBrand(row.brand));
  const groupedJotaProduct = groupCatalogProductRows(jotaRows, jotaRows)
    .filter((row) => row.variants.length > 0)
    .find((row) => getProductPublicSlug(row, collidingNameSlugs) === normalizedLookup);

  if (groupedJotaProduct) {
    return { row: groupedJotaProduct, strategy: "grouped_jota_slug" as const };
  }

  const variantMatches = rows.filter((row) =>
    row.variants.some((variant) =>
      getVariantPublicSlugs(variant).includes(normalizedLookup)
    )
  );

  if (variantMatches.length === 1) {
    return { row: variantMatches[0], strategy: "unique_variant_code" as const };
  }

  return {
    row: null,
    strategy: variantMatches.length > 1 ? "ambiguous_variant_code" as const : "not_found" as const,
  };
}

async function getGroupedProductDetailRow(row: ProductQueryRow) {
  if (!isJotaBrand(row.brand)) {
    return row;
  }

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

async function getRelatedProductSummaries(
  row: ProductQueryRow,
  collidingNameSlugs: ReadonlySet<string>
): Promise<RelatedCatalogProduct[]> {
  if (!row.category_id || !row.brand) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_DETAIL_SELECT)
    .eq("is_active", true)
    .eq("brand", row.brand)
    .eq("category_id", row.category_id)
    .limit(80);

  if (error) {
    throw new Error(error.message);
  }

  const currentSlug = getProductPublicSlug(row, collidingNameSlugs);
  const rows = normalizeProductRows(data ?? []);

  return groupCatalogProductRows(rows, rows)
    .filter((candidate) => getProductPublicSlug(candidate, collidingNameSlugs) !== currentSlug)
    .slice(0, 6)
    .map((candidate) => ({
      brand: candidate.brand,
      categoryName: candidate.category?.name ?? null,
      href: getProductPublicPath({
        code: candidate.product_group_code,
        brand: candidate.brand,
        id: candidate.id,
        name: candidate.product_name,
        publicSlug: getProductPublicSlug(candidate, collidingNameSlugs),
      }),
      id: candidate.id,
      imageUrl: candidate.image_url,
      name: candidate.product_name,
      variantCount: candidate.variants.length,
    }));
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
  const familyKey = getProductFamilyKey({
    brand,
    category_id: categoryId,
    product_name: [baseCode, remainder].filter(Boolean).join(" "),
  });
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
      .ilike("product_name", `%${escapeLikePattern(baseCode)}%`)
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
      variants: dedupeDisplayVariants(
        (product.variants ?? [])
          .filter((variant) => variant.is_active)
          .map((variant) => ({
            ...variant,
            product_description: product.description ?? null,
          }))
      ).sort(compareCatalogVariants),
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
    ? "id,product_id,variant_code,manufacturer_ref,connection_type,color,diameter,length,grit,package_quantity,price,currency,stock_quantity,stock_status,image_url,is_active"
    : "id,product_id,variant_code,manufacturer_ref,connection_type,color,diameter,length,grit,package_quantity,image_url,is_active";
  const { data, error } = await supabase
    .from("product_variants")
    .select(select)
    .in("product_id", productIds)
    .eq("is_active", true)
    .order("connection_type", { ascending: true })
    .order("grit", { ascending: true })
    .order("color", { ascending: true })
    .order("diameter", { ascending: true })
    .order("length", { ascending: true });

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
        | "length"
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
      length: row.length ?? null,
      manufacturer_ref: row.manufacturer_ref,
      package_quantity: row.package_quantity,
      price: row.price ?? null,
      product_id: row.product_id,
      product_description: row.product_description ?? null,
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

function toPublicProduct(
  row: ProductQueryRow,
  collidingNameSlugs: ReadonlySet<string> = new Set()
): PublicCatalogProduct {
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
    publicSlug: getProductPublicSlug(row, collidingNameSlugs),
    status: row.usage_area ?? "JOTA ürün kataloğu",
    usageArea: row.usage_area,
    variantCount: row.variants.length,
    variants: row.variants.map(toPublicVariant),
  };
}

function toPricedProduct(
  row: ProductQueryRow,
  collidingNameSlugs: ReadonlySet<string> = new Set()
): PricedCatalogProduct {
  return {
    ...toPublicProduct(row, collidingNameSlugs),
    variants: row.variants.map(toPricedVariant),
  };
}

function toPublicVariant(row: CatalogVariantRow): PublicCatalogVariant {
  return {
    clinicalNote: row.product_description ?? null,
    code: row.variant_code,
    connectionType: row.connection_type,
    color: row.color,
    diameter: row.diameter,
    grit: row.grit,
    groupImageUrl: row.group_image_url ?? null,
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

function getVisibleProductGroups<T extends Omit<ProductQueryRow, "variants">>(rows: T[]) {
  const groups = rows.reduce((currentGroups, row) => {
    const key = getProductFamilyKey(row);
    const current = currentGroups.get(key) ?? [];
    current.push(row);
    currentGroups.set(key, current);
    return currentGroups;
  }, new Map<string, T[]>());

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
  const usesGroupedFamilyIdentity = isJotaBrand(canonical.brand);
  const mergedVariants = dedupeDisplayVariants(
    sortedRows.flatMap((row) =>
      row.variants.map((variant) => ({
        ...variant,
        group_image_url: isJotaBrand(row.brand) ? null : row.image_url,
      }))
    )
  ).sort(compareCatalogVariants);

  return {
    ...canonical,
    description: canonical.description ?? sortedRows.find((row) => row.description)?.description ?? null,
    image_url: canonical.image_url ?? sortedRows.find((row) => row.image_url)?.image_url ?? null,
    product_group_code: usesGroupedFamilyIdentity
      ? family.baseCode ?? canonical.product_group_code
      : canonical.product_group_code,
    product_name: usesGroupedFamilyIdentity
      ? family.displayName ?? canonical.product_name
      : canonical.product_name,
    variants: mergedVariants,
  };
}

function dedupeDisplayVariants(variants: CatalogVariantRow[]) {
  const bestVariants = new Map<string, CatalogVariantRow>();

  for (const variant of variants) {
    const key = getVariantDisplayIdentityKey(variant);
    const current = bestVariants.get(key);

    if (current && compareVariantPreference(current, variant) <= 0) {
      continue;
    }

    bestVariants.set(key, variant);
  }

  return [...bestVariants.values()];
}

function getVariantDisplayIdentityKey(variant: CatalogVariantRow) {
  return [
    variant.product_id,
    normalizeSearchText(variant.connection_type ?? ""),
    normalizeSearchText(variant.color ?? ""),
    formatNullableNumber(variant.diameter),
    normalizeSearchText(variant.grit ?? ""),
    formatNullableNumber(variant.length),
  ].join("|");
}

function compareVariantPreference(left: CatalogVariantRow, right: CatalogVariantRow) {
  return (
    Number(hasUsableVariantCode(right)) - Number(hasUsableVariantCode(left)) ||
    Number(right.is_active) - Number(left.is_active) ||
    compareNullableText(left.variant_code, right.variant_code)
  );
}

function hasUsableVariantCode(
  variant: Pick<CatalogVariantRow, "manufacturer_ref" | "variant_code">
) {
  return Boolean(getUsableCode(variant.variant_code) ?? getUsableCode(variant.manufacturer_ref));
}

function compareCatalogVariants(left: CatalogVariantRow, right: CatalogVariantRow) {
  return (
    compareNullableText(left.connection_type, right.connection_type) ||
    compareNullableText(left.grit ?? left.color, right.grit ?? right.color) ||
    compareNullableNumber(left.diameter, right.diameter) ||
    compareNullableNumber(left.length, right.length) ||
    compareNullableText(left.variant_code, right.variant_code)
  );
}

function compareNullableText(left: string | null, right: string | null) {
  const normalizedLeft = normalizeSearchText(left ?? "");
  const normalizedRight = normalizeSearchText(right ?? "");

  if (!normalizedLeft && normalizedRight) {
    return 1;
  }

  if (normalizedLeft && !normalizedRight) {
    return -1;
  }

  return normalizedLeft.localeCompare(normalizedRight, "tr-TR", {
    numeric: true,
  });
}

function compareNullableNumber(left: number | null, right: number | null) {
  const hasLeft = typeof left === "number" && Number.isFinite(left);
  const hasRight = typeof right === "number" && Number.isFinite(right);

  if (!hasLeft && hasRight) {
    return 1;
  }

  if (hasLeft && !hasRight) {
    return -1;
  }

  if (!hasLeft && !hasRight) {
    return 0;
  }

  return Number(left) - Number(right);
}

function formatNullableNumber(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function getProductPublicSlug(
  product:
    | Pick<ProductQueryRow, "brand" | "id" | "product_group_code" | "product_name">
    | Pick<PublicCatalogProduct, "brand" | "code" | "id" | "name">,
  collidingNameSlugs: ReadonlySet<string> = new Set()
) {
  const brand = product.brand;
  const code = "product_group_code" in product ? product.product_group_code : product.code;
  const name = "product_name" in product ? product.product_name : product.name;
  const usableCode = getUsableCode(code);
  const codeSlug = usableCode ? slugifyPublicSegment(usableCode) : null;
  const nameSlug = slugifyPublicSegment(name);

  if (isJotaBrand(brand)) {
    return codeSlug || nameSlug || `urun-${getStablePublicSuffix(product.id, name)}`;
  }

  if (nameSlug) {
    if (!collidingNameSlugs.has(nameSlug)) {
      return nameSlug;
    }

    const codeSuffix = codeSlug?.startsWith(`${nameSlug}-`)
      ? codeSlug.slice(nameSlug.length + 1)
      : codeSlug;

    return `${nameSlug}-${codeSuffix || getStablePublicSuffix(product.id, name)}`;
  }

  return codeSlug || `urun-${getStablePublicSuffix(product.id, name)}`;
}

function getCollidingNonJotaNameSlugs(
  products: Array<Pick<ProductQueryRow, "brand" | "product_group_code" | "product_name">>
) {
  const counts = new Map<string, number>();

  for (const product of products) {
    const nameSlug = slugifyPublicSegment(product.product_name);

    if (!isJotaBrand(product.brand) && nameSlug) {
      counts.set(nameSlug, (counts.get(nameSlug) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([slug]) => slug);
}

function getVariantPublicSlugs(variant: Pick<CatalogVariantRow, "manufacturer_ref" | "variant_code">) {
  return [variant.variant_code, variant.manufacturer_ref]
    .map(getUsableCode)
    .map((value) => (value ? slugifyPublicSegment(value) : null))
    .filter((value): value is string => Boolean(value));
}

function slugifyPublicSegment(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function getStablePublicSuffix(id: string, name: string) {
  const source = `${id}:${name}`;
  let hash = 5381;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 33) ^ source.charCodeAt(index);
  }

  return (hash >>> 0).toString(36).slice(0, 6);
}

function getUsableCode(value: string | null) {
  const trimmed = value?.trim();

  if (!trimmed || !isUsableBusinessCode(trimmed)) {
    return null;
  }

  return trimmed;
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

async function getCategoryIdsBySlug(slug: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id,parent_id,slug")
    .eq("status", "active");

  if (error) {
    throw new Error(error.message);
  }

  const targetSlug = slug === "burs" ? "frezler" : slug;

  if (getMainCategoryTerms(targetSlug)) {
    return [];
  }

  const target = data?.find((category) => category.slug === targetSlug);

  if (!target) {
    return [];
  }

  const ids = new Set([target.id]);
  let foundChild = true;

  while (foundChild) {
    foundChild = false;
    for (const category of data ?? []) {
      if (category.parent_id && ids.has(category.parent_id) && !ids.has(category.id)) {
        ids.add(category.id);
        foundChild = true;
      }
    }
  }

  return [...ids];
}

async function getProductIdsByMainCategoryTerms(slug: string, brand: string | null) {
  const terms = getMainCategoryTerms(slug);

  if (!terms) {
    return null;
  }

  const rows = await getCachedMainCategoryMatchRows();

  return rows
    .filter(
      (row) =>
        (!brand ||
          (isJotaBrand(brand)
            ? Boolean(row.brand && isJotaBrand(row.brand))
            : row.brand === brand)) &&
        rowMatchesMainCategoryTerms(row, terms)
    )
    .map((row) => row.id);
}

const getCachedMainCategoryMatchRows = unstable_cache(
  async () => {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("id,brand,product_group_code,product_name,usage_area,category:categories(name,slug)")
      .eq("is_active", true)
      .limit(5000);

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as unknown as MainCategoryMatchRow[];
  },
  ["active-main-category-match-rows"],
  {
    revalidate: 60,
    tags: ["public-products"],
  }
);

function rowMatchesMainCategoryTerms(row: MainCategoryMatchRow, terms: string[]) {
  const category = Array.isArray(row.category) ? row.category[0] : row.category;
  const haystack = normalizeSearchText(
    [
      row.brand,
      row.product_group_code,
      row.product_name,
      row.usage_area,
      category?.name,
      category?.slug,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return terms.some((term) => haystack.includes(term));
}

function getMainCategoryTerms(slug: string) {
  return MAIN_CATEGORY_FILTERS[slug]?.map(normalizeSearchText) ?? null;
}

function normalizeCategoryFilter(value: string | undefined) {
  const normalized = value?.trim();

  if (!normalized || normalized === "tum-urunler") {
    return null;
  }

  return normalized;
}

function normalizeBrandFilter(value: string | undefined) {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return isJotaBrand(normalized) ? "JOTA" : normalized;
}

function isJotaBrand(value: string) {
  return JOTA_BRAND_ALIASES.some(
    (alias) => alias.toLocaleLowerCase("tr-TR") === value.toLocaleLowerCase("tr-TR")
  );
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

async function getMatchingProductIds(search: CatalogSearch, brand: string | null) {
  const supabase = getSupabaseAdminClient();
  const productSearch = search.productTerms
    .flatMap((term) => {
      const escapedTerm = escapeLikePattern(term);
      return [
        `product_name.ilike.%${escapedTerm}%`,
        `product_group_code.ilike.%${escapedTerm}%`,
        `brand.ilike.%${escapedTerm}%`,
        `description.ilike.%${escapedTerm}%`,
        `usage_area.ilike.%${escapedTerm}%`,
      ];
    })
    .join(",");

  if (!productSearch) {
    return [];
  }

  let query = supabase
    .from("products")
    .select("id")
    .eq("is_active", true)
    .or(productSearch)
    .limit(500);

  if (brand) {
    query = isJotaBrand(brand)
      ? query.in("brand", JOTA_BRAND_ALIASES)
      : query.eq("brand", brand);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.id))];
}

async function getProductIdsByCategoryIds(categoryIds: string[], brand: string | null) {
  if (!categoryIds.length) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("products")
    .select("id")
    .eq("is_active", true)
    .in("category_id", categoryIds)
    .limit(500);

  if (brand) {
    query = isJotaBrand(brand)
      ? query.in("brand", JOTA_BRAND_ALIASES)
      : query.eq("brand", brand);
  }

  const { data, error } = await query;

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

  const manufacturerRef = getUsableCode(row.manufacturer_ref);

  if (manufacturerRef) {
    return manufacturerRef;
  }

  return getUsableCode(row.variant_code) ?? "Varyant seçeneği";
}

function buildCatalogSearch(rawQuery: string): CatalogSearch {
  const raw = rawQuery.trim();
  const normalizedRaw = normalizeSearchText(raw);
  const exactSku = getExactSkuSearch(raw);
  const baseTerms = splitSearchTerms(normalizedRaw);
  const phraseSynonyms = getSearchSynonyms(normalizedRaw);
  const hasKnownPhrase = baseTerms.length > 1 && phraseSynonyms.length > 0;
  const interpretedTerms = interpretCatalogQueryLocal(raw).flatMap(
    (criterion) => criterion.searchTerms
  );
  const expandedTerms = uniqueStrings([
    normalizedRaw,
    ...(hasKnownPhrase ? [] : baseTerms),
    ...interpretedTerms,
    ...(hasKnownPhrase ? [] : baseTerms.flatMap(getSearchSynonyms)),
    ...phraseSynonyms,
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

const CATALOG_SEARCH_SYNONYMS: Record<string, string[]> = {
  "ayna emis": ["mirror suction"],
  "cene iliskisi": ["jb fork", "jb tray", "bite registration"],
  "cila lastigi": ["cilalama", "polisaj", "polisher"],
  "diode laser": ["hulaser k2", "lazer"],
  "diyot lazer": ["hulaser k2", "diode laser"],
  "karistirma ucu": ["mixing tip", "mix tip"],
  "kisisel kasik": ["jb tray", "jb fork", "olcu"],
  "kapanis kaydi": ["jb fork", "jb tray", "bite registration"],
  lazer: ["hulaser k2", "diode laser"],
  "lastik cila": ["cilalama", "polisaj", "polisher"],
  mirror: ["mirror suction"],
  "mix tip": ["mixing tip", "karistirma ucu"],
  "mixing tip": ["mix tip", "karistirma ucu"],
  "olcu kasigi": ["jb tray", "olcu", "tray"],
  okluzyon: ["jb fork", "jb tray", "bite registration"],
  polisher: ["cilalama", "polisaj"],
  rontgen: ["xpect vision", "rvg", "sensor"],
  rvg: ["xpect vision"],
  sensor: ["xpect vision", "rvg", "rontgen"],
  suction: ["mirror suction"],
  "total kasik": ["jb tray", "jb fork", "olcu", "tray", "fork"],
};

function getSearchSynonyms(term: string) {
  const normalized = normalizeSearchText(term);
  const catalogSynonyms = CATALOG_SEARCH_SYNONYMS[normalized];

  if (catalogSynonyms) {
    return catalogSynonyms;
  }

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

    return compareCatalogVariants(a, b);
  });
}

function compareRowsBySearchScore(left: ProductQueryRow, right: ProductQueryRow, search: CatalogSearch) {
  const difference = getProductSearchScore(right, search) - getProductSearchScore(left, search);

  if (difference !== 0) {
    return difference;
  }

  return left.product_name.localeCompare(right.product_name, "tr-TR", { numeric: true });
}

function getProductSearchScore(row: ProductQueryRow, search: CatalogSearch) {
  const codeValues = [row.product_group_code, row.product_name, ...row.variants.flatMap((variant) => [
    variant.variant_code,
    variant.manufacturer_ref ?? "",
  ])].map(normalizeSearchText);
  const haystack = normalizeSearchText(
    [
      row.product_name,
      row.product_group_code,
      row.brand,
      row.description,
      row.usage_area,
      row.category?.name,
      row.category?.slug,
      ...row.variants.flatMap((variant) => [
        variant.variant_code,
        variant.manufacturer_ref,
        variant.connection_type,
        variant.color,
        variant.grit,
      ]),
    ]
      .filter(Boolean)
      .join(" ")
  );

  const codeScore = search.normalizedTerms.reduce((score, term) => {
    if (!term) return score;
    if (codeValues.some((value) => value === term || value.split(/\s+/)[0] === term)) {
      return score + 1000;
    }
    if (codeValues.some((value) => value.startsWith(term))) {
      return score + 500;
    }
    return score;
  }, 0);
  const termScore = search.normalizedTerms.reduce(
    (score, term) => score + (haystack.includes(term) ? 10 : 0),
    0
  );
  const variantScore = row.variants.reduce(
    (score, variant) => Math.max(score, getVariantSearchScore(variant, search)),
    0
  );

  return codeScore + termScore + variantScore;
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

function getProductFamilyKey(
  row: Pick<ProductQueryRow, "brand" | "category_id" | "product_name"> &
    Partial<Pick<ProductQueryRow, "id">>
) {
  if (!isJotaBrand(row.brand)) {
    return `product|${row.id ?? normalizeSearchText(row.product_name)}`;
  }

  const family = getProductFamilyParts(row.product_name);
  const token = family.baseCode ?? normalizeSearchText(row.product_name);
  const remainderKey = family.baseCode ? "" : normalizeSearchText(family.remainder ?? "");

  return [
    normalizeSearchText(row.brand),
    row.category_id,
    token,
    remainderKey,
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
    .replace(/\u0131/g, "i")
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

function isUsableBusinessCode(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:$|[-_A-Z0-9].*)/i.test(
    trimmed
  );
}

function logProductQuery(event: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info(`[${event}]`, payload);
}
