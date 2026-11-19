import sources from "../../../client/utils/sources.json" with { type: "json" };

const NON_POLITICAL_CATEGORIES = new Set([
  "entertainment",
  "sports",
  "health",
  "science",
]);

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const LOW_QUALITY_DOMAINS = new Set(
  sources.sources
    .filter((s) => NON_POLITICAL_CATEGORIES.has(s.category))
    .map((s) => hostnameOf(s.url))
    .filter(Boolean),
);

export function isLowQualityDomain(url) {
  const hostname = hostnameOf(url);
  return !!hostname && LOW_QUALITY_DOMAINS.has(hostname);
}
