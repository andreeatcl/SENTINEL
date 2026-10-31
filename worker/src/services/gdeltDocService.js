import countryKeywords from "../../../temporary/countryKeywords.json";

const GDELT_DOC_BASE = "https://api.gdeltproject.org/api/v2/doc/doc";
const MAX_KEYWORDS = 12; // keeps the query under GDELT's length limit
const MAX_RECORDS = 75;
const MIN_VARIANT_LENGTH = 3;
const FETCH_TIMEOUT_MS = 6000;
const MIN_REQUEST_INTERVAL_MS = 5200;

let lastRequestAt = 0;

function normalizeCountryKey(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function quotePhrase(term) {
  const clean = term.trim();
  if (!clean) return "";
  return clean.includes(" ") ? `"${clean}"` : clean;
}

// "u s a" => "USA"
// "republic of serbia" => "Republic Of Serbia"
function toDisplayVariant(key) {
  const tokens = key.split(" ");
  if (tokens.every((token) => token.length === 1)) {
    return tokens.join("").toUpperCase();
  }
  if (tokens.length === 1 && tokens[0].length <= 3) {
    return tokens[0].toUpperCase();
  }
  return tokens
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function containsPhrase(longer, shorter) {
  return longer !== shorter && ` ${longer} `.includes(` ${shorter} `);
}

function buildCountryExpression(
  countryOrTopic,
  normalized,
  resolvedKey,
  aliases,
) {
  const aliasKeys = Object.keys(aliases).filter(
    (key) => aliases[key] === resolvedKey && normalizeCountryKey(key) === key,
  );
  const keys = [
    ...new Set([normalized, normalizeCountryKey(resolvedKey), ...aliasKeys]),
  ];
  if (keys.length === 1) return quotePhrase(countryOrTopic);

  const variants = keys
    .filter((key) => !keys.some((other) => containsPhrase(key, other)))
    .map(toDisplayVariant)
    .filter(
      (variant) => variant.replace(/\s/g, "").length >= MIN_VARIANT_LENGTH,
    );
  const unique = [...new Set(variants)].map(quotePhrase);
  if (unique.length === 0) return quotePhrase(countryOrTopic);
  return unique.length === 1 ? unique[0] : `(${unique.join(" OR ")})`;
}

// keywordsParam: comma-separated list chosen by the client, overrides the JSON when present
export function buildGdeltDocQuery(countryOrTopic, keywordsParam) {
  const normalized = normalizeCountryKey(countryOrTopic);
  const aliases = countryKeywords.aliases || {};
  const resolvedKey = aliases[normalized] || normalized;
  const countryPhrase = buildCountryExpression(
    countryOrTopic,
    normalized,
    resolvedKey,
    aliases,
  );

  const keywords =
    keywordsParam !== undefined
      ? keywordsParam.split(",").filter((k) => k.trim())
      : Array.isArray(countryKeywords[normalized])
        ? countryKeywords[normalized]
        : Array.isArray(countryKeywords[resolvedKey])
          ? countryKeywords[resolvedKey]
          : [];

  const keywordGroup = keywords
    .slice(0, MAX_KEYWORDS)
    .map(quotePhrase)
    .filter(Boolean)
    .join(" OR ");

  const parts = [countryPhrase];
  if (keywordGroup) parts.push(`(${keywordGroup})`);
  return parts.join(" ");
}

// GDELT wants a "YYYYMMDDHHMMSS" format
function isoToGdeltDateTime(iso) {
  const digits = iso.replace(/[-:TZ]/g, "").replace(/\.\d+$/, "");
  return digits.slice(0, 14).padEnd(14, "0");
}

export async function fetchGdeltDoc({ query, from }) {
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    console.warn(
      `GDELT DOC call skipped — only ${elapsed}ms since the last one, under GDELT's own 5s-per-request limit. Falling back to NewsAPI-only for this search.`,
    );
    return { articles: [], error: "skipped: under GDELT's 5s rate limit" };
  }
  lastRequestAt = now;

  const url = new URL(GDELT_DOC_BASE);
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("maxrecords", String(MAX_RECORDS));
  url.searchParams.set("sort", "datedesc");
  if (from) {
    url.searchParams.set("startdatetime", isoToGdeltDateTime(from));
    url.searchParams.set(
      "enddatetime",
      isoToGdeltDateTime(new Date().toISOString()),
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url.toString(), { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    const message = `GDELT DOC returned ${response.status} ${response.statusText}${bodyText ? ` — ${bodyText.slice(0, 200)}` : ""}`;
    console.error(message);
    return { articles: [], error: message };
  }

  let data;
  try {
    data = await response.json();
  } catch (err) {
    const message = `GDELT DOC response was not valid JSON: ${err.message}`;
    console.error(message);
    return { articles: [], error: message };
  }
  return { articles: data.articles || [] };
}

// reformat GDELT format to standard ISO
function seendateToIso(seendate) {
  if (!seendate || seendate.length < 15) return null;
  const y = seendate.slice(0, 4);
  const mo = seendate.slice(4, 6);
  const d = seendate.slice(6, 8);
  const h = seendate.slice(9, 11);
  const mi = seendate.slice(11, 13);
  const s = seendate.slice(13, 15);
  return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
}

export function normalizeGdeltArticle(article) {
  return {
    source: { id: null, name: article.domain || "" },
    author: null,
    title: article.title || "",
    description: null,
    url: article.url,
    urlToImage: article.socialimage || null,
    publishedAt: seendateToIso(article.seendate),
    language: article.language || null,
    sourceCountry: article.sourcecountry || null,
    _provider: "gdelt",
  };
}
