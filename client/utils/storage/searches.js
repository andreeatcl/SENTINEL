import { STORAGE_KEYS, read, write } from "./core";

// saved searches remember what params to re-run
export function getSavedSearches() {
  return read(STORAGE_KEYS.savedSearches, []);
}

export function addSavedSearch({
  label,
  topic,
  extraKeywords,
  queryOptions,
  includePoliticalKeywords,
}) {
  if (!topic) return;
  const savedSearch = {
    id: `${Date.now()}`,
    label: label || topic,
    topic,
    extraKeywords: extraKeywords || "",
    queryOptions: queryOptions || {},
    includePoliticalKeywords: includePoliticalKeywords !== false,
    createdAt: new Date().toISOString(),
  };
  write(STORAGE_KEYS.savedSearches, [savedSearch, ...getSavedSearches()]);
  return savedSearch;
}

export function removeSavedSearch(id) {
  const next = getSavedSearches().filter((item) => item.id !== id);
  write(STORAGE_KEYS.savedSearches, next);
}
