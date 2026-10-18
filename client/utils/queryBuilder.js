import countryKeywords from "../../temporary/countryKeywords.json";
import { getKeywordOverrides, setKeywordOverride } from "./storage";

export const MAX_COUNTRY_KEYWORDS = 25;

// normalize country names to avoid mismatch caused by special characters
export function normalizeCountryKey(value = "") {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

// check for & resolve country key misalignments
function resolveCountryKey(countryOrTopic = "") {
  const normalizedCountry = normalizeCountryKey(countryOrTopic);
  const aliases = countryKeywords.aliases || {};
  const resolvedKey = aliases[normalizedCountry] || normalizedCountry;
  return { normalizedCountry, resolvedKey };
}

// News API query syntax treats bare space as an AND
// therefore multi-word searches must be searcahed as a phrase
export function quoteKeyword(term) {
  const clean = term.trim();
  if (!clean) return "";
  if (
    clean.includes(" OR ") ||
    clean.includes(" AND ") ||
    clean.includes(" NOT ")
  ) {
    return clean;
  }
  if (clean.includes(" ") && !(clean.startsWith('"') && clean.endsWith('"'))) {
    return `"${clean}"`;
  }
  return clean;
}

function buildKeywordExpression(keywords) {
  const unique = [];
  const seen = new Set();
  for (const keyword of keywords || []) {
    const normalized = normalizeCountryKey(keyword);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(quoteKeyword(keyword));
  }
  return unique.join(" OR ");
}

// "denormalize" the cleaned version of country names to ensure correct search results
// ex: "u s a" => "USA"
function toDisplayVariant(normalizedValue) {
  const normalized = normalizeCountryKey(normalizedValue);
  if (!normalized) return "";

  const tokens = normalized.split(" ").filter(Boolean);
  const isSpacedAcronym =
    tokens.length > 1 && tokens.every((token) => token.length === 1);
  if (isSpacedAcronym) {
    return tokens.join("").toUpperCase();
  }

  if (tokens.length === 1 && tokens[0].length <= 3) {
    return tokens[0].toUpperCase();
  }

  return tokens
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function getDataKey(normalizedCountry, resolvedKey) {
  return Array.isArray(countryKeywords[normalizedCountry])
    ? normalizedCountry
    : resolvedKey;
}

function getDefaultKeywords(dataKey) {
  return Array.isArray(countryKeywords[dataKey])
    ? countryKeywords[dataKey]
    : [];
}

function applyOverride(defaults, override) {
  if (!override) return defaults;
  const removed = new Set(override.remove.map(normalizeCountryKey));
  return [
    ...defaults.filter((k) => !removed.has(normalizeCountryKey(k))),
    ...override.add,
  ];
}

function getCountrySpecificKeywords(normalizedCountry, resolvedKey) {
  const dataKey = getDataKey(normalizedCountry, resolvedKey);
  return applyOverride(
    getDefaultKeywords(dataKey),
    getKeywordOverrides()[dataKey],
  );
}

function resolveActiveKeywords(normalizedCountry, resolvedKey) {
  const dataKey = getDataKey(normalizedCountry, resolvedKey);
  const countrySpecific = getCountrySpecificKeywords(
    normalizedCountry,
    resolvedKey,
  );
  // an emptied custom list means no keywords, not the default fallback
  if (countrySpecific.length > 0 || getKeywordOverrides()[dataKey]) {
    return countrySpecific;
  }
  return Array.isArray(countryKeywords.default) ? countryKeywords.default : [];
}

function countryDataKey(country) {
  const { normalizedCountry, resolvedKey } = resolveCountryKey(country);
  return getDataKey(normalizedCountry, resolvedKey);
}

export function getDefaultCountryKeywords(country) {
  return getDefaultKeywords(countryDataKey(country));
}

export function hasCustomKeywords(country) {
  return Boolean(getKeywordOverrides()[countryDataKey(country)]);
}

export function getCustomizedCountries() {
  return Object.values(getKeywordOverrides())
    .map((override) => override.name)
    .filter(Boolean);
}

// stores only the difference from the defaults so curated updates still arrive
export function saveCountryKeywords(country, keywords) {
  const dataKey = countryDataKey(country);
  const defaults = getDefaultKeywords(dataKey);
  const defaultSet = new Set(defaults.map(normalizeCountryKey));
  const keptSet = new Set(keywords.map(normalizeCountryKey));
  const add = keywords.filter((k) => !defaultSet.has(normalizeCountryKey(k)));
  const remove = defaults.filter((k) => !keptSet.has(normalizeCountryKey(k)));
  setKeywordOverride(
    dataKey,
    add.length || remove.length ? { name: country, add, remove } : null,
  );
}

export function resetCountryKeywords(country) {
  setKeywordOverride(countryDataKey(country), null);
}

// keywords for the GDELT query
export function getGdeltKeywordsParam(
  country,
  includePoliticalKeywords = true,
  queryOptions = {},
) {
  const toParam = (list) =>
    list.map((k) => k.replace(/,/g, " ").replace(/\s+/g, " ").trim()).join(",");
  if (Array.isArray(queryOptions.gdeltTerms)) {
    return toParam(queryOptions.gdeltTerms);
  }
  if (!includePoliticalKeywords || queryOptions.overrideCountryKeywords) {
    return "";
  }
  const override = getKeywordOverrides()[countryDataKey(country)];
  if (!override) return undefined;
  // added keywords first so they fall within GDELT's keyword cap
  const added = new Set(override.add.map(normalizeCountryKey));
  const keywords = getCountryKeywordOptions(country);
  return toParam([
    ...keywords.filter((k) => added.has(normalizeCountryKey(k))),
    ...keywords.filter((k) => !added.has(normalizeCountryKey(k))),
  ]);
}

function hasBooleanOperator(text) {
  return text.includes("OR") || text.includes("AND") || text.includes("NOT");
}

// check if custom, extra keywords are submitted as a comma-separated list or with boolean logic
// if boolean logic is already applied, no formatting is needed
function buildScopedExtraExpression(extraKeywords) {
  const trimmed = extraKeywords.trim();
  if (!trimmed) return "";
  if (hasBooleanOperator(trimmed)) return trimmed;
  return trimmed
    .split(",")
    .map((item) => quoteKeyword(item))
    .filter(Boolean)
    .join(" OR ");
}

// ensure that search results are not affected by country aliases
function buildCountryExpression(
  countryOrTopic,
  normalizedCountry,
  resolvedKey,
) {
  const aliases = countryKeywords.aliases || {};
  const seen = new Set();
  const variants = [];

  const addVariant = (value) => {
    const normalized = normalizeCountryKey(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    variants.push(toDisplayVariant(value));
  };

  addVariant(countryOrTopic);
  addVariant(resolvedKey);
  addVariant(normalizedCountry);

  for (const [aliasKey, targetKey] of Object.entries(aliases)) {
    if (targetKey === resolvedKey) {
      addVariant(aliasKey);
    }
  }

  const cleanVariants = variants
    .filter(Boolean)
    .map((variant) => quoteKeyword(variant));
  if (cleanVariants.length <= 1) {
    return quoteKeyword(countryOrTopic);
  }

  return `(${cleanVariants.join(" OR ")})`;
}

// build the entire query string for a country
// country name AND default keywords (if enabled) AND extra keywords
export function buildTopicQuery(
  countryOrTopic,
  extraKeywords = "",
  includePoliticalKeywords = true,
  options = {},
) {
  const { includeCountry = true, overrideCountryKeywords = false } = options;
  const { normalizedCountry, resolvedKey } = resolveCountryKey(countryOrTopic);
  const countryExpression = buildCountryExpression(
    countryOrTopic,
    normalizedCountry,
    resolvedKey,
  );
  const keywordExpr = buildKeywordExpression(
    resolveActiveKeywords(normalizedCountry, resolvedKey),
  );
  const scopedExtra = buildScopedExtraExpression(extraKeywords);

  const parts = [];
  if (includeCountry) {
    parts.push(countryExpression);
  }
  if (includePoliticalKeywords && !overrideCountryKeywords && keywordExpr) {
    parts.push(`(${keywordExpr})`);
  }
  if (scopedExtra) {
    parts.push(`(${scopedExtra})`);
  }

  return parts.length > 0 ? parts.join(" AND ") : countryExpression;
}

export function getCountryKeywordOptions(countryOrTopic) {
  const { normalizedCountry, resolvedKey } = resolveCountryKey(countryOrTopic);
  const countrySpecific = getCountrySpecificKeywords(
    normalizedCountry,
    resolvedKey,
  );

  const unique = [];
  const seen = new Set();
  for (const keyword of countrySpecific) {
    const normalized = normalizeCountryKey(keyword);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(keyword);
  }

  return unique;
}
