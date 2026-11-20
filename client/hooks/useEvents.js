import { useState, useCallback, useRef } from "react";
import { fetchEvents } from "../utils/eventsApi";
import { CAMEO_ROOT_CATEGORIES } from "../utils/cameoCategories";
import { TONE_LABELS } from "../utils/eventTone";

const DEFAULT_FILTERS = {
  timeRange: "7d",
  category: CAMEO_ROOT_CATEGORIES.map((c) => c.code),
  tone: Object.keys(TONE_LABELS),
  sortBy: "significance",
  sortDir: "desc",
  sourcePriority: null,
  customFrom: null,
  customTo: null,
};

const PAGES_PER_FETCH = 1;

// the ranking can shift between requests, so a later page may repeat an event -> we dedupe
function appendNew(existing, incoming) {
  const seen = new Set(existing.flatMap((e) => [e.id, e.sourceUrl]));
  const out = [...existing];
  for (const event of incoming) {
    if (seen.has(event.id) || seen.has(event.sourceUrl)) continue;
    seen.add(event.id);
    seen.add(event.sourceUrl);
    out.push(event);
  }
  return out;
}

async function fetchPages(params, offset) {
  const first = await fetchEvents({ ...params, offset });
  let events = first.events || [];
  let meta = first.meta || {};
  for (let i = 1; i < PAGES_PER_FETCH && meta.hasMore; i++) {
    try {
      const next = await fetchEvents({ ...params, offset: meta.nextOffset });
      events = appendNew(events, next.events || []);
      meta = { ...meta, ...next.meta };
    } catch {
      break;
    }
  }
  return { events, meta };
}

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [note, setNote] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const countryRef = useRef(null);
  const nextOffsetRef = useRef(0);

  const search = useCallback(
    async (country, patch = {}) => {
      const merged = { ...filters, ...patch };
      setFilters(merged);
      countryRef.current = country;
      setLoading(true);
      setError(null);
      setNote(null);
      try {
        const data = await fetchPages({ country, ...merged }, 0);
        if (countryRef.current !== country) return;
        setEvents(data.events || []);
        nextOffsetRef.current = data.meta?.nextOffset ?? 0;
        setNote(data.meta?.note || null);
        setHasMore(!!data.meta?.hasMore);
      } catch (err) {
        if (countryRef.current !== country) return;
        setError(err.message);
        setEvents([]);
        setHasMore(false);
      } finally {
        if (countryRef.current === country) setLoading(false);
      }
    },
    [filters],
  );

  const loadMore = useCallback(async () => {
    const country = countryRef.current;
    if (!country || loading || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchPages(
        { country, ...filters },
        nextOffsetRef.current,
      );
      if (countryRef.current !== country) return;
      setEvents((prev) => appendNew(prev, data.events));
      nextOffsetRef.current = data.meta?.nextOffset ?? nextOffsetRef.current;
      setHasMore(!!data.meta?.hasMore);
    } catch (err) {
      if (countryRef.current !== country) return;
      setError(err.message);
    } finally {
      if (countryRef.current === country) setLoadingMore(false);
    }
  }, [loading, loadingMore, filters]);

  const clear = useCallback(() => {
    countryRef.current = null;
    setEvents([]);
    setError(null);
    setNote(null);
    setLoading(false);
    setLoadingMore(false);
    setHasMore(false);
  }, []);

  return {
    events,
    loading,
    loadingMore,
    error,
    hasMore,
    note,
    filters,
    search,
    loadMore,
    clear,
  };
}
