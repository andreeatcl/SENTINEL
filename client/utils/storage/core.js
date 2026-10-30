// the main purpose of this app rebuild is to prioritize good UX for a mobile user
// since we will not be using a server or a DB but we do want user data persistance...
// their app data will be stored locally in their browser's localStorage

export const STORAGE_KEYS = {
  apiKeys: "sentinel.apiKeys",
  favorites: "sentinel.favorites",
  favoriteGroups: "sentinel.favoriteGroups",
  savedSearches: "sentinel.savedSearches",
  notes: "sentinel.notes",
  countryNotes: "sentinel.countryNotes",
  lastBackup: "sentinel.lastBackup",
  backupSnoozed: "sentinel.backupSnoozed",
  notesViewed: "sentinel.notesViewed",
  readItems: "sentinel.readItems",
  keywordOverrides: "sentinel.keywordOverrides",
  mutedDomains: "sentinel.mutedDomains",
  passcode: "sentinel.passcode",
  lastActive: "sentinel.lastActive",
};

const cache = new Map();

export function read(key, fallback) {
  if (cache.has(key)) return cache.get(key);
  try {
    const raw = localStorage.getItem(key);
    const value = raw ? JSON.parse(raw) : fallback;
    cache.set(key, value);
    return value;
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    cache.set(key, value);
    return true;
  } catch {
    cache.delete(key);
    return false;
  }
}

export function forget(key) {
  cache.delete(key);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === null) cache.clear();
    else cache.delete(e.key);
  });
}

export function wipeAllData() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("sentinel.")) keys.push(key);
  }
  keys.forEach((key) => localStorage.removeItem(key));
  cache.clear();
}

export const STORAGE_LIMIT_CHARS = 5_000_000;

export function getStorageUsage() {
  let used = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      used += key.length + (localStorage.getItem(key)?.length || 0);
    }
  } catch {
    return null;
  }
  return {
    used,
    limit: STORAGE_LIMIT_CHARS,
    ratio: used / STORAGE_LIMIT_CHARS,
  };
}
