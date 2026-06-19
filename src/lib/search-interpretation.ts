import "server-only";

export type SearchInterpretation = {
  normalizedQuery: string;
  holder: string[];
  color: string[];
  diameter: string[];
  usage: string[];
  category: string[];
  confidence: number;
};

type LocalCriterion = {
  label: string;
  searchTerms: string[];
  type: "holder" | "color" | "diameter" | "usage";
  value: string;
};

const ALLOWED_HOLDERS = ["FG", "RA", "HP"] as const;
const ALLOWED_COLORS = ["mavi", "kırmızı", "yeşil", "sarı", "siyah"] as const;
const ALLOWED_DIAMETERS = ["010", "012", "014", "016", "018"] as const;
const ALLOWED_USAGE = [
  "zirkonya",
  "polisaj",
  "kompozit",
  "karbit",
  "elmas",
  "set",
] as const;
const ALLOWED_CATEGORIES = [
  "elmas frezler",
  "karbit frezler",
  "cilalama frezleri",
  "aşındırıcı taşlar",
  "setler paketler",
] as const;

const OPENAI_MODEL = "gpt-4o-mini";
const OPENAI_TIMEOUT_MS = 3500;

export function interpretCatalogQueryLocal(
  query: string | undefined
): LocalCriterion[] {
  if (!query?.trim()) {
    return [];
  }

  const normalizedQuery = normalizeSearchText(query);
  const terms = splitSearchTerms(normalizedQuery);
  const criteria: LocalCriterion[] = [];

  addUniqueCriteria(criteria, getHolderCriteria(terms));
  addUniqueCriteria(criteria, getColorCriteria(terms));
  addUniqueCriteria(criteria, getDiameterCriteria(terms));
  addUniqueCriteria(criteria, getUsageCriteria(terms, normalizedQuery));

  return criteria;
}

export function buildLocalSearchInterpretation(rawQuery: string) {
  const criteria = interpretCatalogQueryLocal(rawQuery);
  const usage = uniqueStrings(
    criteria
      .filter((criterion) => criterion.type === "usage")
      .map((criterion) => criterion.value)
  );

  return sanitizeSearchInterpretation({
    category: usageToCategories(usage),
    color: criteria
      .filter((criterion) => criterion.type === "color")
      .map((criterion) => criterion.value),
    confidence: criteria.length ? 0.72 : 0.35,
    diameter: criteria
      .filter((criterion) => criterion.type === "diameter")
      .map((criterion) => criterion.value),
    holder: criteria
      .filter((criterion) => criterion.type === "holder")
      .map((criterion) => criterion.value),
    normalizedQuery: normalizeSearchText(rawQuery),
    usage,
  });
}

export async function interpretCatalogQueryWithAi(rawQuery: string) {
  const localFallback = buildLocalSearchInterpretation(rawQuery);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return localFallback;
  }

  try {
    const response = await fetchOpenAiInterpretation(rawQuery, apiKey);
    return sanitizeSearchInterpretation(response, localFallback);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[search.interpret] Falling back to local parser", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return localFallback;
  }
}

async function fetchOpenAiInterpretation(rawQuery: string, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      body: JSON.stringify({
        max_tokens: 220,
        messages: [
          {
            content:
              "You interpret Turkish dental catalog search text into controlled search tokens. Do not recommend products. Do not invent products, prices, stock, medical claims, or unavailable fields. Return only values that are explicitly implied by the query.",
            role: "system",
          },
          {
            content: `Raw search query: ${rawQuery}`,
            role: "user",
          },
        ],
        model: OPENAI_MODEL,
        response_format: {
          json_schema: {
            name: "dentech_catalog_search_interpretation",
            schema: {
              additionalProperties: false,
              properties: {
                category: {
                  items: { enum: ALLOWED_CATEGORIES, type: "string" },
                  type: "array",
                },
                color: {
                  items: { enum: ALLOWED_COLORS, type: "string" },
                  type: "array",
                },
                confidence: {
                  maximum: 1,
                  minimum: 0,
                  type: "number",
                },
                diameter: {
                  items: { enum: ALLOWED_DIAMETERS, type: "string" },
                  type: "array",
                },
                holder: {
                  items: { enum: ALLOWED_HOLDERS, type: "string" },
                  type: "array",
                },
                normalizedQuery: {
                  type: "string",
                },
                usage: {
                  items: { enum: ALLOWED_USAGE, type: "string" },
                  type: "array",
                },
              },
              required: [
                "normalizedQuery",
                "holder",
                "color",
                "diameter",
                "usage",
                "category",
                "confidence",
              ],
              type: "object",
            },
            strict: true,
          },
          type: "json_schema",
        },
        temperature: 0,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("OpenAI response did not include JSON content.");
    }

    return JSON.parse(content) as Partial<SearchInterpretation>;
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizeSearchInterpretation(
  interpretation: Partial<SearchInterpretation>,
  fallback?: SearchInterpretation
): SearchInterpretation {
  const normalizedQuery =
    typeof interpretation.normalizedQuery === "string" &&
    interpretation.normalizedQuery.trim()
      ? normalizeSearchText(interpretation.normalizedQuery)
      : fallback?.normalizedQuery ?? "";
  const holder = filterAllowed(
    interpretation.holder,
    ALLOWED_HOLDERS,
    (value) => value.toLocaleUpperCase("tr-TR")
  );
  const color = filterAllowed(interpretation.color, ALLOWED_COLORS, canonicalColor);
  const diameter = filterAllowed(
    interpretation.diameter,
    ALLOWED_DIAMETERS,
    normalizeDiameter
  );
  const usage = filterAllowed(interpretation.usage, ALLOWED_USAGE, normalizeSearchText);
  const category = filterAllowed(
    interpretation.category,
    ALLOWED_CATEGORIES,
    canonicalCategory
  );
  const confidence =
    typeof interpretation.confidence === "number" &&
    Number.isFinite(interpretation.confidence)
      ? Math.min(1, Math.max(0, interpretation.confidence))
      : fallback?.confidence ?? 0;

  return {
    category,
    color,
    confidence,
    diameter,
    holder,
    normalizedQuery,
    usage,
  };
}

function filterAllowed<const TAllowed extends readonly string[]>(
  values: unknown,
  allowed: TAllowed,
  normalize: (value: string) => string
) {
  if (!Array.isArray(values)) {
    return [];
  }

  const allowedValues = new Set<string>(allowed);

  return uniqueStrings(
    values
      .filter((value): value is string => typeof value === "string")
      .map(normalize)
      .filter((value) => allowedValues.has(value))
  );
}

function usageToCategories(usage: string[]) {
  const categories = usage.flatMap((term) => {
    if (term === "elmas") return ["elmas frezler"];
    if (term === "karbit") return ["karbit frezler"];
    if (term === "polisaj" || term === "kompozit") return ["cilalama frezleri"];
    if (term === "set") return ["setler paketler"];
    return [];
  });

  return uniqueStrings(categories);
}

function addUniqueCriteria(
  currentCriteria: LocalCriterion[],
  nextCriteria: LocalCriterion[]
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

function getHolderCriteria(terms: string[]): LocalCriterion[] {
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

function getColorCriteria(terms: string[]): LocalCriterion[] {
  const colorMap: Record<string, Omit<LocalCriterion, "type">> = {
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
      value: "yeşil",
    },
    kirmizi: {
      label: "Kırmızı",
      searchTerms: ["kırmızı", "kirmizi", "red"],
      value: "kırmızı",
    },
    mavi: {
      label: "Mavi",
      searchTerms: ["mavi", "blue"],
      value: "mavi",
    },
    red: {
      label: "Kırmızı",
      searchTerms: ["kırmızı", "kirmizi", "red"],
      value: "kırmızı",
    },
    sari: {
      label: "Sarı",
      searchTerms: ["sarı", "sari", "yellow"],
      value: "sarı",
    },
    siyah: {
      label: "Siyah",
      searchTerms: ["siyah", "black"],
      value: "siyah",
    },
    yellow: {
      label: "Sarı",
      searchTerms: ["sarı", "sari", "yellow"],
      value: "sarı",
    },
    yesil: {
      label: "Yeşil",
      searchTerms: ["yeşil", "yesil", "green"],
      value: "yeşil",
    },
  };

  return terms
    .map((term) => colorMap[normalizeSearchText(term)])
    .filter((criterion): criterion is Omit<LocalCriterion, "type"> =>
      Boolean(criterion)
    )
    .map((criterion) => ({ ...criterion, type: "color" as const }));
}

function getDiameterCriteria(terms: string[]): LocalCriterion[] {
  return uniqueStrings(
    terms
      .map((term) => term.replace(/[^\d]/g, ""))
      .filter((term) => /^0\d{2}$/.test(term))
  )
    .filter((term) => ALLOWED_DIAMETERS.includes(term as (typeof ALLOWED_DIAMETERS)[number]))
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
): LocalCriterion[] {
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

function splitSearchTerms(value: string) {
  return value
    .split(/[\s,/.-]+/)
    .map((term) => term.trim())
    .filter(Boolean);
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

function normalizeDiameter(value: string) {
  const numeric = value.replace(/[^\d]/g, "");

  return numeric.length === 2 ? `0${numeric}` : numeric;
}

function canonicalColor(value: string) {
  const normalized = normalizeSearchText(value);
  const aliases: Record<string, (typeof ALLOWED_COLORS)[number]> = {
    black: "siyah",
    blue: "mavi",
    green: "yeşil",
    kirmizi: "kırmızı",
    mavi: "mavi",
    red: "kırmızı",
    sari: "sarı",
    siyah: "siyah",
    yellow: "sarı",
    yesil: "yeşil",
  };

  return aliases[normalized] ?? normalized;
}

function canonicalCategory(value: string) {
  const normalized = normalizeSearchText(value);
  const aliases: Record<string, (typeof ALLOWED_CATEGORIES)[number]> = {
    "asindirici taslar": "aşındırıcı taşlar",
    "cilalama frezleri": "cilalama frezleri",
    "elmas frezler": "elmas frezler",
    "karbit frezler": "karbit frezler",
    "setler paketler": "setler paketler",
  };

  return aliases[normalized] ?? normalized;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
