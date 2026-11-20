import { apiFetch } from "./apiFetch";

const BASE = "/api";
const REQUEST_TIMEOUT_MS = 15000;

const EVENTS_RANGE_HOURS = {
  "6h": 6,
  "24h": 24,
  "48h": 48,
  "7d": 168,
};

export const EVENTS_MAX_DAYS_BACK = 7;

export function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(days) {
  return toDateOnly(new Date(Date.now() - days * 86400000));
}

function customRangeParams(customFrom, customTo) {
  const [from, to] = [customFrom, customTo].sort();
  return { from, to };
}

function relativeRangeParams(timeRange) {
  const hours = EVENTS_RANGE_HOURS[timeRange] ?? 168;
  const since = new Date(Date.now() - hours * 3600000);
  return {
    from: toDateOnly(new Date(since.getTime() - 86400000)),
    to: toDateOnly(new Date()),
    since: since.toISOString(),
  };
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await apiFetch(url, { signal: controller.signal });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchEvents({
  country,
  timeRange = "7d",
  offset = 0,
  category = [],
  tone = [],
  sortBy = "significance",
  sortDir = "desc",
  sourcePriority = null,
  customFrom = null,
  customTo = null,
}) {
  const range =
    timeRange === "custom" && customFrom && customTo
      ? customRangeParams(customFrom, customTo)
      : relativeRangeParams(timeRange);

  const params = new URLSearchParams({
    country,
    ...range,
    offset,
    sortBy,
    sortDir,
  });
  if (category.length) params.set("category", category.join(","));
  if (tone.length) params.set("tone", tone.join(","));
  if (sourcePriority) params.set("sourcePriority", sourcePriority);
  const res = await fetchWithTimeout(
    `${BASE}/events?${params}`,
    REQUEST_TIMEOUT_MS,
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}
