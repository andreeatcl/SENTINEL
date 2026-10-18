import { STORAGE_KEYS, read, write } from "./core";

// { "<country key>": { add: [...], remove: [...] } } layered over countryKeywords.json
const keywordListeners = new Set();

export function subscribeKeywordOverrides(listener) {
  keywordListeners.add(listener);
  return () => keywordListeners.delete(listener);
}

export function getKeywordOverrides() {
  return read(STORAGE_KEYS.keywordOverrides, {});
}

export function replaceKeywordOverrides(overrides) {
  write(STORAGE_KEYS.keywordOverrides, overrides);
  keywordListeners.forEach((listener) => listener());
}

export function setKeywordOverride(key, override) {
  const next = { ...getKeywordOverrides() };
  if (override) next[key] = override;
  else delete next[key];
  replaceKeywordOverrides(next);
}
