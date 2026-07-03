export type SearchSuggestion = {
  helper?: string;
  label: string;
  query: string;
  synonyms: string[];
};

export const COMMAND_SEARCH_SUGGESTIONS: SearchSuggestion[] = [
  {
    helper: "Total protez ölçü süreci için ürünleri inceleyin.",
    label: "JB Tray",
    query: "JB Tray",
    synonyms: ["total kaşık", "ölçü kaşığı"],
  },
  {
    helper: "Pedodonti paslanmaz çelik kron ürünlerini inceleyin.",
    label: "iCrown",
    query: "iCrown",
    synonyms: ["çocuk kronu", "süt dişi kron"],
  },
  {
    helper: "Dijital görüntüleme ürünlerini inceleyin.",
    label: "Xpect Vision RVG",
    query: "Xpect Vision RVG",
    synonyms: ["rvg", "sensör"],
  },
  {
    label: "JOTA zirkonya polisaj",
    query: "zirkonya polisaj",
    synonyms: ["zirkonya polisaj"],
  },
  {
    label: "Arkansas ürünleri",
    query: "arkansas",
    synonyms: ["arkansas"],
  },
  {
    label: "JOTA frezler",
    query: "JOTA frez",
    synonyms: ["frez"],
  },
  {
    label: "Mavi kuşak frezler",
    query: "mavi frez",
    synonyms: ["mavi frez"],
  },
  {
    label: "Karbit frezler",
    query: "karbit",
    synonyms: ["karbit"],
  },
  {
    label: "Elmas frezler",
    query: "elmas frez",
    synonyms: ["elmas frez"],
  },
];

export function getCommandSearchSuggestions(rawQuery: string, limit = 6) {
  const normalizedQuery = normalizeSearchText(rawQuery);

  if (!normalizedQuery) {
    return [];
  }

  const seenQueries = new Set<string>();

  return COMMAND_SEARCH_SUGGESTIONS.filter((suggestion) => {
    if (seenQueries.has(suggestion.query)) {
      return false;
    }

    const matches = suggestion.synonyms.some((synonym) => {
      const normalizedSynonym = normalizeSearchText(synonym);

      return (
        normalizedSynonym.includes(normalizedQuery) ||
        normalizedQuery.includes(normalizedSynonym)
      );
    });

    if (matches) {
      seenQueries.add(suggestion.query);
      return true;
    }

    return false;
  }).slice(0, limit);
}

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}
