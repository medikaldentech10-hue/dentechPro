import "server-only";

import {
  buildLocalSearchInterpretation,
  interpretCatalogQueryLocal,
} from "@/lib/search-interpretation";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import type { Profile, PublicRole } from "@/lib/types/auth";

export type SearchLogTokenPayload = {
  category: string[];
  chips: Array<{
    label: string;
    type: string;
    value: string;
  }>;
  color: string[];
  confidence: number;
  diameter: string[];
  holder: string[];
  normalizedQuery: string;
  role: PublicRole;
  usage: string[];
};

export type SearchLogEntry = {
  createdAt: string;
  id: string;
  normalizedQuery: string;
  query: string;
  resultCount: number;
  role: PublicRole;
  source: string;
  tokens: SearchLogTokenPayload;
  usedAi: boolean;
};

export type SearchTermSummary = {
  averageResultCount: number;
  count: number;
  query: string;
};

export type SearchTokenSummary = {
  count: number;
  label: string;
  type: string;
  value: string;
};

export type SearchLogAnalytics = {
  averageResultCount: number;
  latestSearches: SearchLogEntry[];
  mostCommonNoResultQuery: SearchTermSummary | null;
  mostSearchedToken: SearchTokenSummary | null;
  noResultSearches: SearchLogEntry[];
  searchesToday: number;
  topTokens: SearchTokenSummary[];
  topSearches: SearchTermSummary[];
  totalLoggedSearches: number;
};

type SearchLogRow = {
  created_at?: unknown;
  id?: unknown;
  interpreted_tokens?: unknown;
  normalized_query?: unknown;
  query?: unknown;
  result_count?: unknown;
  source?: unknown;
  user_role?: unknown;
  used_ai?: unknown;
};

const MAX_LOGGED_QUERY_LENGTH = 240;
const SEARCH_LOG_ANALYTICS_LIMIT = 250;

export async function recordCatalogSearch({
  profile,
  query,
  resultCount,
}: {
  profile: Profile | null;
  query: string | null | undefined;
  resultCount: number;
}) {
  const trimmedQuery = query?.trim();

  if (!trimmedQuery) {
    return;
  }

  const tokens = buildSearchLogTokens(trimmedQuery, getProfileRole(profile));

  try {
    const supabase = getSupabaseAdminClient();
    const basePayload = {
      query: trimmedQuery.slice(0, MAX_LOGGED_QUERY_LENGTH),
      result_count: Math.max(0, Math.trunc(resultCount)),
      used_ai: false,
      user_id: null,
    };
    const { error } = await supabase.from("search_logs").insert({
      interpreted_tokens: tokens as unknown as Json,
      normalized_query: tokens.normalizedQuery,
      source: "catalog",
      user_role: tokens.role,
      ...basePayload,
    });

    if (error) {
      if (isMissingSearchLogAnalyticsColumn(error.message)) {
        const { error: fallbackError } = await supabase
          .from("search_logs")
          .insert(basePayload);

        if (fallbackError && process.env.NODE_ENV !== "production") {
          console.warn("[search_logs] Catalog search log fallback insert failed", {
            message: fallbackError.message,
          });
        }

        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.warn("[search_logs] Catalog search log insert failed", {
          message: error.message,
        });
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[search_logs] Catalog search logging skipped", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export async function getAdminSearchLogAnalytics(): Promise<SearchLogAnalytics> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("search_logs")
    .select(
      "id, query, normalized_query, interpreted_tokens, user_role, source, result_count, used_ai, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(SEARCH_LOG_ANALYTICS_LIMIT);

  if (error && isMissingSearchLogAnalyticsColumn(error.message)) {
    const fallbackResult = await supabase
      .from("search_logs")
      .select("id, query, result_count, used_ai, created_at")
      .order("created_at", { ascending: false })
      .limit(SEARCH_LOG_ANALYTICS_LIMIT);

    if (fallbackResult.error) {
      throw new Error(
        `Search logs could not be loaded: ${fallbackResult.error.message}`
      );
    }

    return mapSearchLogAnalytics((fallbackResult.data ?? []) as SearchLogRow[]);
  }

  if (error) {
    throw new Error(`Search logs could not be loaded: ${error.message}`);
  }

  return mapSearchLogAnalytics((data ?? []) as SearchLogRow[]);
}

function mapSearchLogAnalytics(rows: SearchLogRow[]): SearchLogAnalytics {
  const latestSearches = rows.map(mapSearchLogRow);
  const noResultSearches = latestSearches
    .filter((entry) => entry.resultCount === 0)
    .slice(0, 12);
  const topTokens = getTopTokens(latestSearches);
  const noResultQuerySummaries = getTopSearches(
    latestSearches.filter((entry) => entry.resultCount === 0)
  );
  const totalResultCount = latestSearches.reduce(
    (sum, entry) => sum + entry.resultCount,
    0
  );

  return {
    averageResultCount: latestSearches.length
      ? totalResultCount / latestSearches.length
      : 0,
    latestSearches: latestSearches.slice(0, 40),
    mostCommonNoResultQuery: noResultQuerySummaries[0] ?? null,
    mostSearchedToken: topTokens[0] ?? null,
    noResultSearches,
    searchesToday: latestSearches.filter((entry) => isToday(entry.createdAt)).length,
    topTokens,
    topSearches: getTopSearches(latestSearches),
    totalLoggedSearches: latestSearches.length,
  };
}

function isMissingSearchLogAnalyticsColumn(message: string) {
  return (
    message.includes("search_logs.interpreted_tokens does not exist") ||
    message.includes("interpreted_tokens") ||
    message.includes("normalized_query") ||
    message.includes("user_role") ||
    message.includes("source") ||
    message.includes("schema cache")
  );
}

function buildSearchLogTokens(
  query: string,
  role: PublicRole
): SearchLogTokenPayload {
  const interpretation = buildLocalSearchInterpretation(query);
  const chips = interpretCatalogQueryLocal(query).map((criterion) => ({
    label: criterion.label,
    type: criterion.type,
    value: criterion.value,
  }));

  return {
    category: interpretation.category,
    chips,
    color: interpretation.color,
    confidence: interpretation.confidence,
    diameter: interpretation.diameter,
    holder: interpretation.holder,
    normalizedQuery: interpretation.normalizedQuery,
    role,
    usage: interpretation.usage,
  };
}

function getProfileRole(profile: Profile | null): PublicRole {
  return profile?.role ?? "public";
}

function mapSearchLogRow(row: SearchLogRow): SearchLogEntry {
  const fallbackRole = getPublicRole(row.user_role) ?? "public";
  const tokens = parseTokenPayload(
    row.interpreted_tokens,
    getStringValue(row.normalized_query),
    fallbackRole
  );
  const role = getPublicRole(row.user_role) ?? tokens.role;

  return {
    createdAt: getStringValue(row.created_at) ?? new Date(0).toISOString(),
    id: getStringValue(row.id) ?? "",
    normalizedQuery: getStringValue(row.normalized_query) ?? tokens.normalizedQuery,
    query: getStringValue(row.query) ?? "",
    resultCount: getNumberValue(row.result_count),
    role,
    source: getStringValue(row.source) ?? "catalog",
    tokens,
    usedAi: row.used_ai === true,
  };
}

function parseTokenPayload(
  value: unknown,
  normalizedQuery: string | null,
  fallbackRole: PublicRole
): SearchLogTokenPayload {
  if (!isRecord(value)) {
    return {
      ...getEmptyTokenPayload(fallbackRole),
      normalizedQuery: normalizedQuery ?? "",
    };
  }

  const role = getPublicRole(value.role) ?? fallbackRole;

  return {
    category: getStringArray(value.category),
    chips: getChipArray(value.chips),
    color: getStringArray(value.color),
    confidence: getNumberValue(value.confidence),
    diameter: getStringArray(value.diameter),
    holder: getStringArray(value.holder),
    normalizedQuery:
      getStringValue(value.normalizedQuery) ?? normalizedQuery ?? "",
    role,
    usage: getStringArray(value.usage),
  };
}

function getEmptyTokenPayload(role: PublicRole): SearchLogTokenPayload {
  return {
    category: [],
    chips: [],
    color: [],
    confidence: 0,
    diameter: [],
    holder: [],
    normalizedQuery: "",
    role,
    usage: [],
  };
}

function getTopSearches(entries: SearchLogEntry[]) {
  const summaries = new Map<
    string,
    { count: number; displayQuery: string; resultCount: number }
  >();

  for (const entry of entries) {
    const key = normalizeSearchLogTerm(entry.query);

    if (!key) {
      continue;
    }

    const current = summaries.get(key);

    if (current) {
      current.count += 1;
      current.resultCount += entry.resultCount;
    } else {
      summaries.set(key, {
        count: 1,
        displayQuery: entry.query,
        resultCount: entry.resultCount,
      });
    }
  }

  return [...summaries.values()]
    .map((summary) => ({
      averageResultCount: summary.resultCount / summary.count,
      count: summary.count,
      query: summary.displayQuery,
    }))
    .sort((a, b) => b.count - a.count || a.query.localeCompare(b.query, "tr"))
    .slice(0, 12);
}

function getTopTokens(entries: SearchLogEntry[]) {
  const summaries = new Map<
    string,
    { count: number; label: string; type: string; value: string }
  >();

  for (const entry of entries) {
    const chips = entry.tokens.chips.length
      ? entry.tokens.chips
      : getFallbackChips(entry.tokens);

    for (const chip of chips) {
      const key = `${chip.type}:${normalizeSearchLogTerm(chip.value || chip.label)}`;

      if (!chip.label || !chip.type || !key) {
        continue;
      }

      const current = summaries.get(key);

      if (current) {
        current.count += 1;
      } else {
        summaries.set(key, {
          count: 1,
          label: chip.label,
          type: chip.type,
          value: chip.value,
        });
      }
    }
  }

  return [...summaries.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "tr"))
    .slice(0, 12);
}

function getFallbackChips(tokens: SearchLogTokenPayload) {
  return [
    ...tokens.holder.map((value) => ({ label: value, type: "holder", value })),
    ...tokens.color.map((value) => ({ label: value, type: "color", value })),
    ...tokens.diameter.map((value) => ({
      label: value,
      type: "diameter",
      value,
    })),
    ...tokens.usage.map((value) => ({ label: value, type: "usage", value })),
    ...tokens.category.map((value) => ({
      label: value,
      type: "category",
      value,
    })),
  ];
}

function isToday(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Istanbul",
    year: "numeric",
  });

  return formatter.format(date) === formatter.format(new Date());
}

function normalizeSearchLogTerm(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ")
    .trim();
}

function getChipArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => ({
      label: getStringValue(item.label) ?? "",
      type: getStringValue(item.type) ?? "",
      value: getStringValue(item.value) ?? "",
    }))
    .filter((item) => item.label && item.type && item.value);
}

function getStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getPublicRole(value: unknown): PublicRole | null {
  if (
    value === "admin" ||
    value === "sales_rep" ||
    value === "pending_user" ||
    value === "approved_doctor" ||
    value === "approved_lab" ||
    value === "approved_vet" ||
    value === "suspended_user" ||
    value === "public"
  ) {
    return value;
  }

  return null;
}

function getStringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function getNumberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
