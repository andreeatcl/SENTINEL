// country borders + names

// local copy with github dataset as fallback
const GEOJSON_SOURCES = [
  "/data/countries.geojson",
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
];

const GEOJSON_TIMEOUT_MS = 10000;

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

let geoDataPromise = null;

export function loadCountriesGeoJson() {
  if (!geoDataPromise) {
    geoDataPromise = (async () => {
      for (const source of GEOJSON_SOURCES) {
        try {
          return await fetchJsonWithTimeout(source, GEOJSON_TIMEOUT_MS);
        } catch {
          continue;
        }
      }
      geoDataPromise = null;
      throw new Error("Couldn't load country borders");
    })();
  }
  return geoDataPromise;
}

// check for country name mismatch
export function getCountryName(feature) {
  const properties = feature?.properties ?? {};
  const candidates = [
    properties.ADMIN,
    properties.NAME,
    properties.NAME_EN,
    properties.FORMAL_EN,
    properties.GEONUNIT,
    properties.BRK_NAME,
    properties.SOVEREIGNT,
    properties.COUNTRY,
    properties.country,
    properties.name,
    properties.NAME_LONG,
  ];

  const resolved = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

  return resolved?.trim() ?? "Unknown";
}

const ISO2_OVERRIDES = {
  France: "FR",
  Norway: "NO",
  Kosovo: "XK",
  Somaliland: "XS",
  Taiwan: "TW",
};

export function getCountryCode(feature) {
  const name = getCountryName(feature);
  if (ISO2_OVERRIDES[name]) return ISO2_OVERRIDES[name];
  const code =
    feature?.properties?.["ISO3166-1-Alpha-2"] ?? feature?.properties?.ISO_A2;
  return /^[A-Z]{2}$/.test(code || "") ? code : null;
}

export function toCountryList(geoData) {
  return (geoData?.features ?? [])
    .map((feature) => ({
      name: getCountryName(feature),
      code: getCountryCode(feature),
    }))
    .filter((country) => country.code)
    .sort((a, b) => a.name.localeCompare(b.name));
}
