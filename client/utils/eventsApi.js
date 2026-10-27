import { apiFetch } from "./apiFetch";

const BASE = "/api";
const REQUEST_TIMEOUT_MS = 15000;

const EVENTS_RANGE_DAYS = { "48h": 2, "7d": 7, "30d": 30 };

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
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
}) {
  const days = EVENTS_RANGE_DAYS[timeRange] ?? 7;
  const to = toDateOnly(new Date());
  const from = toDateOnly(new Date(Date.now() - days * 86400000));

  const params = new URLSearchParams({
    country,
    from,
    to,
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
