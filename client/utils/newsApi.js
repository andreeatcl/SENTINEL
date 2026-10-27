import { getApiKeys, setApiKeys } from "./storage";
import { apiFetch } from "./apiFetch";

const BASE = "/api";
const REQUEST_TIMEOUT_MS = 30000;

const TIME_RANGE_HOURS = { "48h": 48, "30d": 30 * 24 };

function buildTimeRangeFilter(timeRange) {
  const hours = TIME_RANGE_HOURS[timeRange] ?? 7 * 24;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function buildAuthHeaders({ primary, backup, lastGood }) {
  const headers = { "X-Newsapi-Last-Good": lastGood };
  if (primary) headers["X-Newsapi-Key"] = primary;
  if (backup) headers["X-Newsapi-Key-Backup"] = backup;
  return headers;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await apiFetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// fetch /api/news, add params and headers
export async function fetchNews({
  q,
  topic,
  gdeltKeywords,
  sortBy = "relevancy",
  timeRange = "7d",
  language,
  pageSize = 100,
  page = 1,
  searchIn = "title,description,content",
}) {
  const params = new URLSearchParams({ q, sortBy, pageSize, page, searchIn });
  if (language) {
    params.set("language", language);
  }
  // server uses the plain topic (not the NewsAPI-specific `q` string) to
  // build a separate GDELT DOC query and merge results
  if (topic) {
    params.set("topic", topic);
  }
  if (topic && gdeltKeywords !== undefined) {
    params.set("keywords", gdeltKeywords);
  }
  params.set("from", buildTimeRangeFilter(timeRange));

  const { primary, backup, lastGood } = getApiKeys();
  if (!primary && !backup) {
    throw new Error(
      "No API key configured. Add one under API keys in the top bar.",
    );
  }

  const res = await fetchWithTimeout(
    `${BASE}/news?${params}`,
    { headers: buildAuthHeaders({ primary, backup, lastGood }) },
    REQUEST_TIMEOUT_MS,
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  // remember the API key that last returned a result
  const data = await res.json();
  if (data._keyUsed && data._keyUsed !== lastGood) {
    setApiKeys({ primary, backup, lastGood: data._keyUsed });
  }
  return data;
}

export async function fetchKeyUsage() {
  const keys = getApiKeys();
  if (!keys.primary && !keys.backup) return null;
  try {
    const res = await apiFetch(`${BASE}/keys/usage`, {
      headers: buildAuthHeaders(keys),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.configured ? data : null;
  } catch {
    return null;
  }
}

export async function fetchHealth() {
  const res = await apiFetch(`${BASE}/health`);
  return res.json();
}

// check for valid key in the settings screen
export async function testApiKey(key) {
  if (!key) return { valid: false, message: "Enter a key first." };
  try {
    const res = await apiFetch(`${BASE}/keys/test`, {
      headers: { "X-Newsapi-Key": key },
    });
    const data = await res.json();
    return res.status === 429 ? { valid: false, message: data.error } : data;
  } catch {
    return { valid: false, message: "Could not reach the server." };
  }
}

export function formatDate(dateStr, { withYear = false } = {}) {
  if (!dateStr) return "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? new Date(`${dateStr}T00:00:00`)
    : new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const showYear = withYear || date.getFullYear() !== new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(showYear && { year: "numeric" }),
  });
}

export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
