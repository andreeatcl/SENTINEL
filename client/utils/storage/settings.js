import { STORAGE_KEYS, read, write } from "./core";
import { getFavorites, getFavoriteGroups } from "./favorites";
import { getSavedSearches } from "./searches";
import {
  getNotes,
  replaceNotes,
  getCountryNotes,
  replaceCountryNotes,
} from "./notes";
import { getKeywordOverrides, replaceKeywordOverrides } from "./keywords";
import { getMutedDomains, replaceMutedDomains } from "./mutedDomains";

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

// worker passcode stuff
const passcodeListeners = new Set();

export function subscribePasscode(listener) {
  passcodeListeners.add(listener);
  return () => passcodeListeners.delete(listener);
}

export function getPasscode() {
  return read(STORAGE_KEYS.passcode, "");
}

export function setPasscode(passcode) {
  write(STORAGE_KEYS.passcode, passcode);
  passcodeListeners.forEach((listener) => listener());
}

// last time the app was unlocked or in use
export function getLastActive() {
  return read(STORAGE_KEYS.lastActive, 0);
}

export function touchLastActive() {
  write(STORAGE_KEYS.lastActive, Date.now());
}

const backupListeners = new Set();

export function subscribeBackupReminder(listener) {
  backupListeners.add(listener);
  return () => backupListeners.delete(listener);
}

export function getLastBackup() {
  return read(STORAGE_KEYS.lastBackup, null);
}

// snooze backup reminder for 5 days
export function snoozeBackupReminder() {
  write(STORAGE_KEYS.backupSnoozed, new Date().toISOString());
  backupListeners.forEach((listener) => listener());
}

export function getBackupReminder() {
  const times = [getLastBackup(), read(STORAGE_KEYS.backupSnoozed, null)]
    .filter(Boolean)
    .map((t) => new Date(t).getTime());
  if (!times.length) return "overdue";
  const days = Math.floor((Date.now() - Math.max(...times)) / 86_400_000);
  if (days >= 7) return "overdue";
  if (days >= 5) return "warn";
  return null;
}

// export/import used to counter Safari's data wipeout
export function exportData() {
  write(STORAGE_KEYS.lastBackup, new Date().toISOString());
  backupListeners.forEach((listener) => listener());
  return {
    exportedAt: new Date().toISOString(),
    apiKeys: getApiKeys(),
    favorites: getFavorites(),
    favoriteGroups: getFavoriteGroups(),
    savedSearches: getSavedSearches(),
    notes: getNotes(),
    countryNotes: getCountryNotes(),
    keywordOverrides: getKeywordOverrides(),
    mutedDomains: getMutedDomains(),
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
  if (
    data.keywordOverrides &&
    typeof data.keywordOverrides === "object" &&
    !Array.isArray(data.keywordOverrides)
  )
    replaceKeywordOverrides(data.keywordOverrides);
  if (Array.isArray(data.mutedDomains)) replaceMutedDomains(data.mutedDomains);
}
