import { getDomain } from "./url";
import { fallbackHeadline } from "./eventDisplay";

// fields kept from the original object so the favorite can be reopened in
// ArticleDetail / EventDetail later without a network request
const ARTICLE_SNAPSHOT_KEYS = [
  "url",
  "title",
  "description",
  "urlToImage",
  "publishedAt",
  "source",
  "language",
  "_trustLabel",
  "_duplicateCount",
  "_provider",
];

const EVENT_SNAPSHOT_KEYS = [
  "id",
  "sourceUrl",
  "headline",
  "preview",
  "image",
  "dateAdded",
  "day",
  "location",
  "actor1",
  "actor2",
  "eventTypeLabel",
  "goldstein",
  "numSources",
  "numMentions",
  "_trustLabel",
];

function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) out[key] = obj[key];
  }
  return out;
}

function dayToIso(day = "") {
  if (day.length !== 8) return null;
  return `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;
}

export function favoriteFromArticle(article) {
  const title = article.title?.replace(
    " - " + (article.source?.name || ""),
    "",
  );
  return {
    url: article.url,
    type: "article",
    title: title || "",
    sourceName: article.source?.name || getDomain(article.url) || "",
    description: article.description || "",
    image: article.urlToImage || null,
    publishedAt: article.publishedAt || null,
    trust: article._trustLabel || null,
    snapshot: pick(article, ARTICLE_SNAPSHOT_KEYS),
  };
}

// external user-added links
export function favoriteFromLink(url, title) {
  const domain = getDomain(url);
  return favoriteFromArticle({
    url,
    title: title.trim() || domain,
    source: { name: domain },
    _provider: "manual",
  });
}

export function isExternal(item) {
  return item.snapshot?._provider === "manual";
}

export function favoriteFromEvent(event) {
  if (!event.sourceUrl) return null;
  return {
    url: event.sourceUrl,
    type: "event",
    title: event.headline || fallbackHeadline(event),
    sourceName: getDomain(event.sourceUrl) || "",
    description: event.preview || "",
    image: event.image || null,
    publishedAt: event.dateAdded || dayToIso(event.day),
    trust: event._trustLabel || null,
    snapshot: pick(event, EVENT_SNAPSHOT_KEYS),
  };
}

// --- filtering / sorting / grouping for FavoritesPanel ---

export function topicLabel(item) {
  if (item.context?.country) return item.context.country;
  if (item.context?.query) return `“${item.context.query}”`;
  return NOT_RECORDED;
}

// `urls` limits to a custom group's members (null = all favorites)
export function filterFavorites(
  items,
  { query = "", type = "all", tier = null, urls = null },
) {
  const needle = query.trim().toLowerCase();
  const members = urls ? new Set(urls) : null;
  return items.filter((item) => {
    if (members && !members.has(item.url)) return false;
    if (type !== "all" && item.type !== type) return false;
    if (tier && item.trust?.tier !== tier) return false;
    if (!needle) return true;
    const haystack = [
      item.title,
      item.sourceName,
      item.description,
      item.context?.country,
      item.context?.query,
      item.snapshot?.location,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

function time(value) {
  const t = value ? Date.parse(value) : NaN;
  return Number.isNaN(t) ? 0 : t;
}

const SORT_VALUE = {
  saved: (item) => time(item.savedAt),
  published: (item) => time(item.publishedAt),
};

export function sortFavorites(items, field = "saved", dir = "desc") {
  const sign = dir === "asc" ? 1 : -1;
  if (field === "title") {
    return [...items].sort(
      (a, b) => sign * (a.title || "").localeCompare(b.title || ""),
    );
  }
  const valueOf = SORT_VALUE[field] || SORT_VALUE.saved;
  return [...items].sort((a, b) => {
    const va = valueOf(a);
    const vb = valueOf(b);
    if (!va || !vb) return (vb ? 1 : 0) - (va ? 1 : 0);
    return sign * (va - vb);
  });
}

const DATE_BUCKETS = ["Today", "Yesterday", "This week", "This month", "Older"];
const UNKNOWN_DATE = "Date unknown";

function dateBucket(value) {
  const t = time(value);
  if (!t) return UNKNOWN_DATE;
  const date = new Date(t);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const days = Math.round((today - date) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This week";
  if (days < 30) return "This month";
  return "Older";
}

const UNKNOWN_SOURCE = "Unknown source";
const NOT_RECORDED = "Not recorded";

const GROUP_KEY = {
  saved: (item) => dateBucket(item.savedAt),
  published: (item) => dateBucket(item.publishedAt),
  topic: topicLabel,
  source: (item) => item.sourceName || UNKNOWN_SOURCE,
  type: (item) => (item.type === "event" ? "Events" : "Articles"),
};

const LAST = new Set([UNKNOWN_DATE, UNKNOWN_SOURCE, NOT_RECORDED]);

export function groupFavorites(items, groupBy, dir = "desc") {
  const keyOf = GROUP_KEY[groupBy];
  if (!keyOf) return [{ key: "all", label: null, items }];
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, { key, label: key, items: [] });
    groups.get(key).items.push(item);
  }

  const isDateGrouping = groupBy === "saved" || groupBy === "published";
  const buckets = dir === "asc" ? [...DATE_BUCKETS].reverse() : DATE_BUCKETS;
  const rank = (key) => (isDateGrouping ? buckets.indexOf(key) : 0);

  return [...groups.values()].sort((a, b) => {
    if (LAST.has(a.key) !== LAST.has(b.key)) return LAST.has(a.key) ? 1 : -1;
    return rank(a.key) - rank(b.key) || a.key.localeCompare(b.key);
  });
}
