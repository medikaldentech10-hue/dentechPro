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
  totalCount: number;
  totalPages: number;
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
  totalCount: number;
  totalPages: number;
};

type CatalogSearch = {
  diameterValues: number[];
  normalizedTerms: string[];
  productTerms: string[];
  raw: string;
  variantTerms: string[];
};

export type CatalogQueryCriterion = {
  label: string;
  searchTerms: string[];
  type: "holder" | "color" | "diameter" | "usage";
  value: string;
};

export function getCanViewPrices(profile: Profile | null) {
  return canViewPrices(profile);
}

export function interpretCatalogQuery(query: string | undefined) {
  if (!query?.trim()) {
    return [];
  }

  const normalizedQuery = normalizeSearchText(query);
  const terms = splitSearchTerms(normalizedQuery);
  const criteria: CatalogQueryCriterion[] = [];

  addUniqueCriteria(criteria, getHolderCriteria(terms));
  addUniqueCriteria(criteria, getColorCriteria(terms));
  addUniqueCriteria(criteria, getDiameterCriteria(terms));
  addUniqueCriteria(criteria, getUsageCriteria(terms, normalizedQuery));

  return criteria;
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
  const normalizedQuery = filters.query?.trim();
  const search = normalizedQuery ? buildCatalogSearch(normalizedQuery) : null;
  const normalizedUsage = filters.usage?.trim();
  const pageSize = clampInteger(filters.pageSize, 24, 1, 60);
  const page = clampInteger(filters.page, 1, 1, 10_000);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const categoryId = normalizedCategory
    ? await getCategoryIdBySlug(normalizedCategory)
    : null;
  const [matchingVariantProductIds, matchingCategoryIds] = search
    ? await Promise.all([
        getMatchingVariantProductIds(search),
        getMatchingCategoryIds(search),
      ])
    : [[], []];
  const priceFilteredProductIds = options.includeSensitiveVariantFields
    ? await getPriceFilteredProductIds(filters.minPrice, filters.maxPrice)
    : null;

  if (priceFilteredProductIds && priceFilteredProductIds.length === 0) {
    return getEmptyRowsResult(page, pageSize);
  }

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

  if (normalizedUsage) {
    query = query.eq("usage_area", normalizedUsage);
  }

  if (priceFilteredProductIds) {
    query = query.in("id", priceFilteredProductIds);
  }

  if (search) {
    const productSearch = [
      ...search.productTerms.flatMap((term) => {
        const escapedTerm = escapeLikePattern(term);
        return [
          `product_name.ilike.%${escapedTerm}%`,
          `product_group_code.ilike.%${escapedTerm}%`,
          `description.ilike.%${escapedTerm}%`,
          `usage_area.ilike.%${escapedTerm}%`,
          `brand.ilike.%${escapedTerm}%`,
        ];
      }),
      ...matchingCategoryIds.map((id) => `category_id.eq.${id}`),
      ...matchingVariantProductIds.map((id) => `id.eq.${id}`),
    ].join(",");

    if (productSearch) {
      query = query.or(productSearch);
    }
  }

  const { count, data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const productRows = normalizeListProductRows(data ?? []);
  const variantSummaries = productRows.length
    ? await getListVariantsForProducts(
        productRows.map((row) => row.id),
        Boolean(options.includeSensitiveVariantFields),
        search
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
    row.diameter ? `Ø ${row.diameter}` : null,
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
  const baseTerms = splitSearchTerms(normalizedRaw);
  const interpretedTerms = interpretCatalogQuery(raw).flatMap(
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

function addUniqueCriteria(
  currentCriteria: CatalogQueryCriterion[],
  nextCriteria: CatalogQueryCriterion[]
) {
  const existingKeys = new Set(
    currentCriteria.map((criterion) => `${criterion.type}:${criterion.value}`)
  );

  for (const criterion of nextCriteria) {
    const key = `${criterion.type}:${criterion.value}`;

    if (existingKeys.has(key)) {
      continue;
    }

    currentCriteria.push(criterion);
    existingKeys.add(key);
  }
}

function getHolderCriteria(terms: string[]): CatalogQueryCriterion[] {
  return terms
    .map((term) => term.toLocaleUpperCase("tr-TR"))
    .filter((term) => term === "FG" || term === "RA" || term === "HP")
    .map((holder) => ({
      label: holder,
      searchTerms: [holder],
      type: "holder" as const,
      value: holder,
    }));
}

function getColorCriteria(terms: string[]): CatalogQueryCriterion[] {
  const colorMap: Record<string, Omit<CatalogQueryCriterion, "type">> = {
    black: {
      label: "Siyah",
      searchTerms: ["siyah", "black"],
      value: "siyah",
    },
    blue: {
      label: "Mavi",
      searchTerms: ["mavi", "blue"],
      value: "mavi",
    },
    green: {
      label: "Yeşil",
      searchTerms: ["yeşil", "yesil", "green"],
      value: "yesil",
    },
    kirmizi: {
      label: "Kırmızı",
      searchTerms: ["kırmızı", "kirmizi", "red"],
      value: "kirmizi",
    },
    mavi: {
      label: "Mavi",
      searchTerms: ["mavi", "blue"],
      value: "mavi",
    },
    red: {
      label: "Kırmızı",
      searchTerms: ["kırmızı", "kirmizi", "red"],
      value: "kirmizi",
    },
    sari: {
      label: "Sarı",
      searchTerms: ["sarı", "sari", "yellow"],
      value: "sari",
    },
    siyah: {
      label: "Siyah",
      searchTerms: ["siyah", "black"],
      value: "siyah",
    },
    yellow: {
      label: "Sarı",
      searchTerms: ["sarı", "sari", "yellow"],
      value: "sari",
    },
    yesil: {
      label: "Yeşil",
      searchTerms: ["yeşil", "yesil", "green"],
      value: "yesil",
    },
  };

  return terms
    .map((term) => colorMap[normalizeSearchText(term)])
    .filter((criterion): criterion is Omit<CatalogQueryCriterion, "type"> =>
      Boolean(criterion)
    )
    .map((criterion) => ({ ...criterion, type: "color" as const }));
}

function getDiameterCriteria(terms: string[]): CatalogQueryCriterion[] {
  return uniqueStrings(
    terms
      .map((term) => term.replace(/[^\d]/g, ""))
      .filter((term) => /^0\d{2}$/.test(term))
  )
    .filter((term) => {
      const numeric = Number(term);

      return numeric >= 10 && numeric <= 18;
    })
    .map((diameter) => ({
      label: diameter,
      searchTerms: [diameter, String(Number(diameter) / 10)],
      type: "diameter" as const,
      value: diameter,
    }));
}

function getUsageCriteria(
  terms: string[],
  normalizedQuery: string
): CatalogQueryCriterion[] {
  const joinedQuery = ` ${normalizedQuery} `;
  const usageRules: Array<{
    label: string;
    match: string[];
    searchTerms: string[];
    value: string;
  }> = [
    {
      label: "Zirkonya",
      match: ["zirkonya", "zirkon", "zirconia"],
      searchTerms: ["zirkonya", "zirkon", "zirconia"],
      value: "zirkonya",
    },
    {
      label: "Polisaj",
      match: ["polisaj", "cilalama", "polish", "polisher"],
      searchTerms: ["polisaj", "cilalama", "polish", "polisher"],
      value: "polisaj",
    },
    {
      label: "Kompozit",
      match: ["kompozit", "composite"],
      searchTerms: ["kompozit", "composite"],
      value: "kompozit",
    },
    {
      label: "Karbit",
      match: ["karbit", "carbide"],
      searchTerms: ["karbit", "carbide"],
      value: "karbit",
    },
    {
      label: "Elmas",
      match: ["elmas", "diamond"],
      searchTerms: ["elmas", "diamond"],
      value: "elmas",
    },
    {
      label: "Set",
      match: ["set", "paket", "kit"],
      searchTerms: ["set", "paket", "kit"],
      value: "set",
    },
  ];

  return usageRules
    .filter((rule) =>
      rule.match.some(
        (match) =>
          terms.includes(match) ||
          joinedQuery.includes(` ${match} `) ||
          normalizedQuery.includes(`${match} frez`)
      )
    )
    .map((rule) => ({
      label: rule.label,
      searchTerms: rule.searchTerms,
      type: "usage" as const,
      value: rule.value,
    }));
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
    green: ["yesil", "yeşil"],
    karbit: ["carbide"],
    kirmizi: ["kırmızı", "red"],
    kırmızı: ["kirmizi", "red"],
    mavi: ["blue"],
    polisaj: ["cilalama", "polish", "polisher"],
    red: ["kirmizi", "kırmızı"],
    sari: ["sarı", "yellow"],
    sarı: ["sari", "yellow"],
    set: ["paket", "kit"],
    siyah: ["black"],
    yesil: ["yeşil", "green"],
    yeşil: ["yesil", "green"],
    yellow: ["sari", "sarı"],
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

  return termScore + diameterScore;
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
    .replace(/ı/g, "i")
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
