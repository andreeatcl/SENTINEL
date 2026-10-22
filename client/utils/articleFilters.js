import sources from "./sources.json";

function normalizeSourceValue(value = "") {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const topSourceNameSet = new Set(
  sources.sources.map((source) => normalizeSourceValue(source.name)),
);
const topSourceIdSet = new Set(
  sources.sources
    .map((source) => normalizeSourceValue(source.id))
    .filter(Boolean),
);
const topSourceDomainSet = new Set(
  sources.sources.map((source) => hostnameOf(source.url)).filter(Boolean),
);

// filter out retracted/duplicated articles
export function sanitizeArticles(inputArticles) {
  const seen = new Set();
  return (inputArticles || []).filter((article) => {
    const title = article?.title || "";
    const description = article?.description || "";
    const url = article?.url || "";

    if (!url) return false;
    if (seen.has(url)) return false;
    seen.add(url);

    const badTitle = title.trim() === "[Removed]" || title.trim() === "";
    const badDescription = description.trim() === "[Removed]";
    if (badTitle || badDescription) return false;

    return true;
  });
}

export function filterTopSources(inputArticles) {
  return (inputArticles || []).filter((article) => {
    const sourceId = normalizeSourceValue(article?.source?.id || "");
    const sourceName = normalizeSourceValue(article?.source?.name || "");
    const hostname = hostnameOf(article?.url || "");
    return (
      (sourceId && topSourceIdSet.has(sourceId)) ||
      (sourceName && topSourceNameSet.has(sourceName)) ||
      (hostname && topSourceDomainSet.has(hostname))
    );
  });
}

// only GDELT articles carry a language
export function filterEnglishOnly(inputArticles) {
  return (inputArticles || []).filter((article) => {
    const language = article?.language;
    return !language || language.toLowerCase().includes("english");
  });
}

// also mute subdomains
export function isMutedDomain(url, mutedDomains) {
  const hostname = hostnameOf(url || "");
  if (!hostname) return false;
  return mutedDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

export function filterMutedDomains(inputArticles, mutedDomains) {
  const list = inputArticles || [];
  if (!mutedDomains?.length) return list;
  return list.filter((article) => !isMutedDomain(article?.url, mutedDomains));
}

export function prioritizeTier(inputArticles, tier) {
  const list = inputArticles || [];
  const matching = list.filter((a) => a?._trustLabel?.tier === tier);
  const rest = list.filter((a) => a?._trustLabel?.tier !== tier);
  return [...matching, ...rest];
}
