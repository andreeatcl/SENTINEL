import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNews } from "./useNews";
import { useEvents } from "./useEvents";

const MOBILE_BREAKPOINT = 768;

export function useAppControls() {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [sortBy, setSortBy] = useState("relevancy");
  const [articlesSortDir, setArticlesSortDir] = useState("desc");
  const [timeRange, setTimeRange] = useState("7d");
  const [includePoliticalKeywords, setIncludePoliticalKeywords] =
    useState(true);
  const [useTopSourcesOnly, setUseTopSourcesOnly] = useState(false);
  const [englishOnly, setEnglishOnlyState] = useState(false);
  const [sourcePriority, setSourcePriorityState] = useState(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.innerWidth < MOBILE_BREAKPOINT
      : false,
  );

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // avoid redundant double search when loading more news
  const searchContextRef = useRef({
    topic: null,
    extraKeywords: "",
    queryOptions: {},
    raw: false,
  });
  // tracks whether the NewsAPI search has actually fired for the current country yet
  const articlesFetchedRef = useRef(false);

  const {
    articles: rawArticles,
    loading,
    loadingMore,
    canLoadMore,
    error,
    meta,
    activeQuery,
    search,
    loadMore,
    setTopSourcesOnly: applyTopSourcesFilter,
    setEnglishOnly: applyEnglishOnlyFilter,
    setSourcePriority: applySourcePriorityFilter,
    clear,
  } = useNews();

  const {
    events,
    loading: eventsLoading,
    loadingMore: eventsLoadingMore,
    error: eventsError,
    hasMore: eventsHasMore,
    filters: eventsFilters,
    search: searchEvents,
    loadMore: loadMoreEvents,
    clear: clearEvents,
  } = useEvents();

  const articles = useMemo(
    () =>
      articlesSortDir === "asc" ? [...rawArticles].reverse() : rawArticles,
    [rawArticles, articlesSortDir],
  );

  const handleArticlesSortDirToggle = useCallback(() => {
    setArticlesSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }, []);

  const runSearch = useCallback(
    ({
      topic,
      extraKeywords = "",
      queryOptions = {},
      raw = false,
      includePoliticalKeywords: political = includePoliticalKeywords,
      sortBy: sortByOverride = sortBy,
      timeRange: timeRangeOverride = timeRange,
    }) => {
      searchContextRef.current = { topic, extraKeywords, queryOptions, raw };
      search({
        topic,
        extraKeywords,
        queryOptions,
        raw,
        sortBy: sortByOverride,
        timeRange: timeRangeOverride,
        includePoliticalKeywords: political,
        useTopSourcesOnly,
        englishOnly,
        sourcePriority,
        page: 1,
        append: false,
      });
    },
    [
      search,
      sortBy,
      timeRange,
      includePoliticalKeywords,
      useTopSourcesOnly,
      englishOnly,
      sourcePriority,
    ],
  );

  const handleCountryClick = useCallback(
    (countryName) => {
      setSelectedCountry(countryName);
      searchContextRef.current = {
        topic: countryName,
        extraKeywords: "",
        queryOptions: {},
        raw: false,
      };
      articlesFetchedRef.current = false;
      searchEvents(countryName);
    },
    [searchEvents],
  );

  const handleOpenArticlesTab = useCallback(() => {
    if (articlesFetchedRef.current || !selectedCountry) return;
    articlesFetchedRef.current = true;
    runSearch({ topic: selectedCountry });
  }, [runSearch, selectedCountry]);

  // country-less global search
  const handleGlobalSearch = useCallback(
    ({ topic, raw }) => {
      setSelectedCountry(null);
      articlesFetchedRef.current = true;
      runSearch({ topic, raw: raw ?? true, includePoliticalKeywords: true });
      clearEvents();
    },
    [runSearch, clearEvents],
  );

  const handleEventsFilterChange = useCallback(
    (patch) => {
      if (selectedCountry) searchEvents(selectedCountry, patch);
    },
    [searchEvents, selectedCountry],
  );

  const handleApplyArticleFilters = useCallback(
    ({
      sortBy: newSortBy,
      timeRange: newTimeRange,
      includePoliticalKeywords: newPolitical,
    }) => {
      setSortBy(newSortBy);
      setTimeRange(newTimeRange);
      setIncludePoliticalKeywords(newPolitical);
      const { topic, extraKeywords, queryOptions, raw } =
        searchContextRef.current;
      if (!topic) return;
      runSearch({
        topic,
        extraKeywords,
        queryOptions,
        raw,
        sortBy: newSortBy,
        timeRange: newTimeRange,
        includePoliticalKeywords: newPolitical,
      });
    },
    [runSearch],
  );

  const handleExtraSearch = useCallback(
    ({ topic, extraKeywords, queryOptions = {} }) => {
      runSearch({ topic, extraKeywords, queryOptions });
    },
    [runSearch],
  );

  const handleClose = useCallback(() => {
    setSelectedCountry(null);
    articlesFetchedRef.current = false;
    clear();
    clearEvents();
  }, [clear, clearEvents]);

  const handleLoadMore = useCallback(() => {
    loadMore(sortBy, timeRange);
  }, [loadMore, sortBy, timeRange]);

  const handleTopSourcesToggle = useCallback(() => {
    const newState = !useTopSourcesOnly;
    setUseTopSourcesOnly(newState);
    applyTopSourcesFilter(newState);
  }, [useTopSourcesOnly, applyTopSourcesFilter]);

  const handleEnglishOnlyToggle = useCallback(() => {
    const newState = !englishOnly;
    setEnglishOnlyState(newState);
    applyEnglishOnlyFilter(newState);
  }, [englishOnly, applyEnglishOnlyFilter]);

  const handleSourcePriorityToggle = useCallback(
    (tier) => {
      const newState = sourcePriority === tier ? null : tier;
      setSourcePriorityState(newState);
      applySourcePriorityFilter(newState);
    },
    [sourcePriority, applySourcePriorityFilter],
  );

  // re-run a search saved earlier (see SavedSearchesPanel.jsx)
  const handleRunSavedSearch = useCallback(
    ({ topic, extraKeywords, queryOptions, includePoliticalKeywords }) => {
      const political = includePoliticalKeywords !== false;
      setSelectedCountry(topic);
      setIncludePoliticalKeywords(political);
      articlesFetchedRef.current = true;
      runSearch({
        topic,
        extraKeywords,
        queryOptions,
        includePoliticalKeywords: political,
      });
      searchEvents(topic);
    },
    [runSearch, searchEvents],
  );

  const getCurrentSearch = useCallback(
    () => ({ ...searchContextRef.current, includePoliticalKeywords }),
    [includePoliticalKeywords],
  );

  return {
    selectedCountry,
    sortBy,
    articlesSortDir,
    timeRange,
    includePoliticalKeywords,
    useTopSourcesOnly,
    englishOnly,
    sourcePriority,
    isMobile,
    articles,
    loading,
    loadingMore,
    canLoadMore,
    error,
    meta,
    activeQuery,
    events,
    eventsLoading,
    eventsLoadingMore,
    eventsError,
    eventsHasMore,
    eventsFilters,
    handleCountryClick,
    handleGlobalSearch,
    handleOpenArticlesTab,
    handleApplyArticleFilters,
    handleArticlesSortDirToggle,
    handleEventsFilterChange,
    handleLoadMoreEvents: loadMoreEvents,
    handleExtraSearch,
    handleClose,
    handleLoadMore,
    handleTopSourcesToggle,
    handleEnglishOnlyToggle,
    handleSourcePriorityToggle,
    handleRunSavedSearch,
    getCurrentSearch,
  };
}
