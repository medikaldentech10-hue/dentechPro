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
  query: string;
  resultCount: number;
  role: PublicRole;
  tokens: SearchLogTokenPayload;
  usedAi: boolean;
};

export type SearchTermSummary = {
  averageResultCount: number;
  count: number;
  query: string;
};

export type SearchLogAnalytics = {
  averageResultCount: number;
  latestSearches: SearchLogEntry[];
  noResultSearches: SearchLogEntry[];
  topSearches: SearchTermSummary[];
  totalLoggedSearches: number;
};

type SearchLogRow = {
  created_at?: unknown;
  id?: unknown;
  interpreted_tokens?: unknown;
  query?: unknown;
  result_count?: unknown;
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
      ...basePayload,
    });

    if (error) {
      if (isMissingInterpretedTokensColumn(error.message)) {
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
    .select("id, query, interpreted_tokens, result_count, used_ai, created_at")
    .order("created_at", { ascending: false })
    .limit(SEARCH_LOG_ANALYTICS_LIMIT);

  if (error && isMissingInterpretedTokensColumn(error.message)) {
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
  const totalResultCount = latestSearches.reduce(
    (sum, entry) => sum + entry.resultCount,
    0
  );

  return {
    averageResultCount: latestSearches.length
      ? totalResultCount / latestSearches.length
      : 0,
    latestSearches: latestSearches.slice(0, 40),
    noResultSearches: latestSearches
      .filter((entry) => entry.resultCount === 0)
      .slice(0, 12),
    topSearches: getTopSearches(latestSearches),
    totalLoggedSearches: latestSearches.length,
  };
}

function isMissingInterpretedTokensColumn(message: string) {
  return (
    message.includes("search_logs.interpreted_tokens does not exist") ||
    message.includes("interpreted_tokens") ||
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
  const tokens = parseTokenPayload(row.interpreted_tokens);

  return {
    createdAt: getStringValue(row.created_at) ?? new Date(0).toISOString(),
    id: getStringValue(row.id) ?? "",
    query: getStringValue(row.query) ?? "",
    resultCount: getNumberValue(row.result_count),
    role: tokens.role,
    tokens,
    usedAi: row.used_ai === true,
  };
}

function parseTokenPayload(value: unknown): SearchLogTokenPayload {
  if (!isRecord(value)) {
    return getEmptyTokenPayload("public");
  }

  const role = getPublicRole(value.role);

  return {
    category: getStringArray(value.category),
    chips: getChipArray(value.chips),
    color: getStringArray(value.color),
    confidence: getNumberValue(value.confidence),
    diameter: getStringArray(value.diameter),
    holder: getStringArray(value.holder),
    normalizedQuery: getStringValue(value.normalizedQuery) ?? "",
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

function getPublicRole(value: unknown): PublicRole {
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

  return "public";
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
