import { STORAGE_KEYS, read, write } from "./core";

// global list of hostnames, without "www."
const mutedListeners = new Set();

export function subscribeMutedDomains(listener) {
  mutedListeners.add(listener);
  return () => mutedListeners.delete(listener);
}

export function getMutedDomains() {
  return read(STORAGE_KEYS.mutedDomains, []);
}

// accepts "example.com", "www.example.com" or a full URL
export function normalizeDomain(value = "") {
  const trimmed = value.toString().trim().toLowerCase();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function replaceMutedDomains(domains) {
  const clean = [...new Set(domains.map(normalizeDomain).filter(Boolean))];
  write(STORAGE_KEYS.mutedDomains, clean);
  mutedListeners.forEach((listener) => listener());
}

export function muteDomain(value) {
  replaceMutedDomains([...getMutedDomains(), value]);
}

export function unmuteDomain(value) {
  const domain = normalizeDomain(value);
  replaceMutedDomains(getMutedDomains().filter((d) => d !== domain));
}
