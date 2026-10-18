import { useState, useCallback, useRef } from "react";
import { fetchNews } from "../utils/newsApi";
import { buildTopicQuery, getGdeltKeywordsParam } from "../utils/queryBuilder";
import {
  sanitizeArticles,
  filterTopSources as filterToTopSources,
  filterEnglishOnly as filterToEnglishOnly,
  prioritizeTier,
} from "../utils/articleFilters";

export function useNews() {
  const [allArticles, setAllArticles] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);
  const [activeQuery, setActiveQuery] = useState("");
  const rawTopicRef = useRef("");
  const extraKeywordsRef = useRef("");
  const isRawRef = useRef(false);
  const includePoliticalKeywordsRef = useRef(true);
  const queryOptionsRef = useRef({});
  const useTopSourcesOnlyRef = useRef(false);
  const englishOnlyRef = useRef(false);
  const sourcePriorityRef = useRef(null);
  const pageRef = useRef(1);
  const lastRequestRef = useRef({});

  // avoids a new API call when any toggle changes
  function applyClientFilters(inputArticles) {
    let result = inputArticles;
    if (useTopSourcesOnlyRef.current) result = filterToTopSources(result);
    if (englishOnlyRef.current) result = filterToEnglishOnly(result);
    if (sourcePriorityRef.current)
      result = prioritizeTier(result, sourcePriorityRef.current);
    return result;
  }

  const search = useCallback(
    async ({
      topic,
      extraKeywords = "",
      sortBy = "relevancy",
      timeRange = "7d",
      raw = false,
      includePoliticalKeywords = true,
      queryOptions = {},
      useTopSourcesOnly = false,
      englishOnly = false,
      sourcePriority = null,
      page = 1,
      append = false,
    }) => {
      // Persist for re-searches triggered by filter changes
      rawTopicRef.current = topic;
      extraKeywordsRef.current = extraKeywords;
      isRawRef.current = raw;
      includePoliticalKeywordsRef.current = includePoliticalKeywords;
      queryOptionsRef.current = queryOptions;
      useTopSourcesOnlyRef.current = useTopSourcesOnly;
      englishOnlyRef.current = englishOnly;
      sourcePriorityRef.current = sourcePriority;

      pageRef.current = page;

      const fixed = queryOptions.fixed;
      const q = fixed
        ? fixed.q
        : raw
          ? topic
          : buildTopicQuery(
              topic,
              extraKeywords,
              includePoliticalKeywords,
              queryOptions,
            );
      const gdeltKeywords = raw
        ? undefined
        : fixed
          ? fixed.gdeltKeywords
          : getGdeltKeywordsParam(
              topic,
              includePoliticalKeywords,
              queryOptions,
            );
      lastRequestRef.current = { q, gdeltKeywords, lastTopic: topic };
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }
      setActiveQuery(q);
      try {
        const data = await fetchNews({
          q,
          topic: raw ? undefined : topic,
          gdeltKeywords,
          sortBy,
          timeRange,
          page,
        });
        const nextArticles = sanitizeArticles(data.articles || []);
        setAllArticles((prev) => {
          const nextAll = append
            ? sanitizeArticles([...prev, ...nextArticles])
            : nextArticles;
          setArticles(applyClientFilters(nextAll));
          return nextAll;
        });
        setMeta({
          totalResults: data.totalResults,
          cached: data._cached,
          cacheAge: data._cacheAge,
          apiCallsToday: data._apiCallsToday,
          apiCallsRemaining: data._apiCallsRemaining,
          keyUsed: data._keyUsed,
          page,
          pageSize: 100,
        });
      } catch (err) {
        setError(err.message);
        if (!append) {
          setAllArticles([]);
          setArticles([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  // Re-search with new sortBy, preserving current topic & raw flag
  const resort = useCallback(
    (sortBy, timeRange) => {
      if (!rawTopicRef.current) return;
      search({
        topic: rawTopicRef.current,
        extraKeywords: extraKeywordsRef.current,
        sortBy,
        timeRange,
        raw: isRawRef.current,
        includePoliticalKeywords: includePoliticalKeywordsRef.current,
        queryOptions: queryOptionsRef.current,
        useTopSourcesOnly: useTopSourcesOnlyRef.current,
        englishOnly: englishOnlyRef.current,
        sourcePriority: sourcePriorityRef.current,
        page: 1,
        append: false,
      });
    },
    [search],
  );

  const loadMore = useCallback(
    (sortBy, timeRange) => {
      if (!rawTopicRef.current || loading || loadingMore) return;
      const nextPage = pageRef.current + 1;
      search({
        topic: rawTopicRef.current,
        extraKeywords: extraKeywordsRef.current,
        sortBy,
        timeRange,
        raw: isRawRef.current,
        includePoliticalKeywords: includePoliticalKeywordsRef.current,
        queryOptions: queryOptionsRef.current,
        useTopSourcesOnly: useTopSourcesOnlyRef.current,
        englishOnly: englishOnlyRef.current,
        sourcePriority: sourcePriorityRef.current,
        page: nextPage,
        append: true,
      });
    },
    [search, loading, loadingMore],
  );

  const clear = useCallback(() => {
    setAllArticles([]);
    setArticles([]);
    setMeta(null);
    setActiveQuery("");
    setError(null);
    rawTopicRef.current = "";
    extraKeywordsRef.current = "";
    isRawRef.current = false;
    includePoliticalKeywordsRef.current = true;
    queryOptionsRef.current = {};
    useTopSourcesOnlyRef.current = false;
    englishOnlyRef.current = false;
    sourcePriorityRef.current = null;
    pageRef.current = 1;
    lastRequestRef.current = {};
  }, []);

  const setTopSourcesOnly = useCallback(
    (enabled) => {
      useTopSourcesOnlyRef.current = enabled;
      setArticles(applyClientFilters(allArticles));
    },
    [allArticles],
  );

  const setEnglishOnly = useCallback(
    (enabled) => {
      englishOnlyRef.current = enabled;
      setArticles(applyClientFilters(allArticles));
    },
    [allArticles],
  );

  const setSourcePriority = useCallback(
    (tier) => {
      sourcePriorityRef.current = tier;
      setArticles(applyClientFilters(allArticles));
    },
    [allArticles],
  );

  const getLastRequest = useCallback(() => ({ ...lastRequestRef.current }), []);

  const totalForApi = Math.min(meta?.totalResults ?? 0, 100);
  const canLoadMore =
    allArticles.length > 0 && allArticles.length < totalForApi;

  return {
    articles,
    loading,
    loadingMore,
    canLoadMore,
    error,
    meta,
    activeQuery,
    search,
    getLastRequest,
    resort,
    loadMore,
    setTopSourcesOnly,
    setEnglishOnly,
    setSourcePriority,
    clear,
  };
}
