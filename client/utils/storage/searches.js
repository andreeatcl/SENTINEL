import { STORAGE_KEYS, read, write } from "./core";

// saved searches remember what params to re-run
export function getSavedSearches() {
  return read(STORAGE_KEYS.savedSearches, []);
}

function toSavedFields({
  label,
  topic,
  raw,
  extraKeywords,
  queryOptions,
  includePoliticalKeywords,
  q,
  gdeltKeywords,
  sortBy,
  timeRange,
  useTopSourcesOnly,
  englishOnly,
  sourcePriority,
}) {
  // eslint-disable-next-line no-unused-vars
  const { fixed, ...builderOptions } = queryOptions || {};
  return {
    label: label?.trim() || topic,
    topic,
    raw: !!raw,
    extraKeywords: extraKeywords || "",
    queryOptions: builderOptions,
    includePoliticalKeywords: includePoliticalKeywords !== false,
    q,
    gdeltKeywords,
    sortBy,
    timeRange,
    useTopSourcesOnly: !!useTopSourcesOnly,
    englishOnly: !!englishOnly,
    sourcePriority: sourcePriority || null,
  };
}

export function addSavedSearch(search) {
  if (!search?.topic) return;
  const savedSearch = {
    id: `${Date.now()}`,
    ...toSavedFields(search),
    createdAt: new Date().toISOString(),
  };
  write(STORAGE_KEYS.savedSearches, [savedSearch, ...getSavedSearches()]);
  return savedSearch;
}

export function renameSavedSearch(id, label) {
  const clean = label.trim();
  if (!clean) return;
  write(
    STORAGE_KEYS.savedSearches,
    getSavedSearches().map((item) =>
      item.id === id ? { ...item, label: clean } : item,
    ),
  );
}

export function removeSavedSearch(id) {
  const next = getSavedSearches().filter((item) => item.id !== id);
  write(STORAGE_KEYS.savedSearches, next);
}
