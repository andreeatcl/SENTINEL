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
};

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [note, setNote] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const countryRef = useRef(null);

  const search = useCallback(
    async (country, patch = {}) => {
      const merged = { ...filters, ...patch };
      setFilters(merged);
      countryRef.current = country;
      setLoading(true);
      setError(null);
      setNote(null);
      try {
        const data = await fetchEvents({ country, ...merged, offset: 0 });
        if (countryRef.current !== country) return;
        setEvents(data.events || []);
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
      const data = await fetchEvents({
        country,
        ...filters,
        offset: events.length,
      });
      if (countryRef.current !== country) return;
      setEvents((prev) => [...prev, ...(data.events || [])]);
      setHasMore(!!data.meta?.hasMore);
    } catch (err) {
      if (countryRef.current !== country) return;
      setError(err.message);
    } finally {
      if (countryRef.current === country) setLoadingMore(false);
    }
  }, [events.length, loading, loadingMore, filters]);

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
