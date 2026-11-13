import { apiFetch } from "./apiFetch";
import { loadCountriesGeoJson, toCountryList } from "./countries";

const REQUEST_TIMEOUT_MS = 20000;

const sessionCache = new Map();
let codesPromise = null;

export function getCountryCodeByName(countryName) {
  codesPromise ??= loadCountriesGeoJson().then(
    (data) => new Map(toCountryList(data).map((c) => [c.name, c.code])),
  );
  return codesPromise.then((codes) => codes.get(countryName) ?? null);
}

export async function fetchOfficeholders(code, { refresh = false } = {}) {
  if (!refresh && sessionCache.has(code)) return sessionCache.get(code);
  const params = new URLSearchParams({ code });
  if (refresh) params.set("refresh", "1");
  const res = await apiFetch(`/api/officeholders?${params}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error("Couldn't load live officeholders.");
  const result = await res.json();
  sessionCache.set(code, result);
  return result;
}
