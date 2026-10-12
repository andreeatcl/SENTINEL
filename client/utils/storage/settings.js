import { STORAGE_KEYS, read, write } from "./core";
import { getFavorites, getFavoriteGroups } from "./favorites";
import { getSavedSearches } from "./searches";
import {
  getNotes,
  replaceNotes,
  getCountryNotes,
  replaceCountryNotes,
} from "./notes";

const DEFAULT_API_KEYS = { primary: "", backup: "", lastGood: "primary" };

export function getApiKeys() {
  return { ...DEFAULT_API_KEYS, ...read(STORAGE_KEYS.apiKeys, {}) };
}

export function setApiKeys(keys) {
  write(STORAGE_KEYS.apiKeys, keys);
}

export function hasAnyApiKey() {
  const { primary, backup } = getApiKeys();
  return Boolean(primary || backup);
}

// export/import used to counter Safari's data wipeout
export function exportData() {
  return {
    exportedAt: new Date().toISOString(),
    apiKeys: getApiKeys(),
    favorites: getFavorites(),
    favoriteGroups: getFavoriteGroups(),
    savedSearches: getSavedSearches(),
    notes: getNotes(),
    countryNotes: getCountryNotes(),
  };
}

// overwrites current data with data from the imported file
export function importData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("That file doesn't look like a Sentinel backup.");
  }
  if (data.apiKeys) setApiKeys({ ...DEFAULT_API_KEYS, ...data.apiKeys });
  if (Array.isArray(data.favorites))
    write(STORAGE_KEYS.favorites, data.favorites);
  if (Array.isArray(data.favoriteGroups))
    write(STORAGE_KEYS.favoriteGroups, data.favoriteGroups);
  if (Array.isArray(data.savedSearches))
    write(STORAGE_KEYS.savedSearches, data.savedSearches);
  if (Array.isArray(data.notes)) replaceNotes(data.notes);
  if (
    data.countryNotes &&
    typeof data.countryNotes === "object" &&
    !Array.isArray(data.countryNotes)
  )
    replaceCountryNotes(data.countryNotes);
}
