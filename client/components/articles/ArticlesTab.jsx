import { useEffect, useMemo, useRef, useState } from "react";
import { getCountryKeywordOptions } from "../../utils/queryBuilder";
import KeywordQueryModal from "./KeywordQueryModal";
import ArticleCard, { SkeletonCard } from "./ArticleCard";
import { AccordionSection, Pill } from "../ui/FilterAccordion";
import SortControl from "../ui/SortControl";
import SearchBar from "../ui/SearchBar";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import Pager, { usePaged } from "../ui/Pager";

const TIME_RANGES = ["48h", "7d", "30d"];
const PAGE_SIZE = 36;

// mutually exclusive
export const SOURCE_PRIORITY_OPTIONS = [
  { tier: "trusted", label: "Prioritize trusted media" },
  { tier: "state-affiliated", label: "Prioritize state media" },
];

const ARTICLE_SORT_OPTIONS = [
  { value: "relevancy", label: "Relevance" },
  { value: "publishedAt", label: "Date" },
  { value: "popularity", label: "Popularity" },
];

export default function ArticlesTab({
  articles,
  loading,
  loadingMore,
  canLoadMore,
  error,
  selectedCountry,
  sortBy,
  timeRange,
  includePoliticalKeywords,
  articlesSortDir,
  onToggleArticlesSortDir,
  onApplyArticleFilters,
  useTopSourcesOnly,
  onTopSourcesToggle,
  englishOnly,
  onEnglishOnlyToggle,
  sourcePriority,
  onSourcePriorityToggle,
  onExtraSearch,
  onLoadMore,
  onSelectArticle,
}) {
  const [queryPreview, setQueryPreview] = useState("");
  const listRef = useRef(null);
  const paged = usePaged(articles, `${loading}:${articlesSortDir}`, PAGE_SIZE);
  const [jumpFrom, setJumpFrom] = useState(null);
  if (jumpFrom !== null && !loadingMore) {
    setJumpFrom(null);
    if (articles.length > jumpFrom) {
      paged.setPage(Math.floor(jumpFrom / PAGE_SIZE) + 1);
      listRef.current?.scrollTo({ top: 0 });
    }
  }
  const [showKeywordModal, setShowKeywordModal] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    sortBy,
    timeRange,
    includePoliticalKeywords,
  });

  const availableKeywords = useMemo(
    () => (selectedCountry ? getCountryKeywordOptions(selectedCountry) : []),
    [selectedCountry],
  );

  // reset keyword query + draft when switching countries
  useEffect(() => {
    setQueryPreview("");
    setShowKeywordModal(false);
    setDraftFilters({ sortBy, timeRange, includePoliticalKeywords });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]);

  const isDirty =
    draftFilters.sortBy !== sortBy ||
    draftFilters.timeRange !== timeRange ||
    draftFilters.includePoliticalKeywords !== includePoliticalKeywords;

  function handleApplyKeywordQuery({ expression, queryOptions }) {
    const nextExpression = expression || "";
    setQueryPreview(nextExpression);
    if (selectedCountry) {
      onExtraSearch({
        topic: selectedCountry,
        extraKeywords: nextExpression,
        queryOptions,
      });
    }
  }

  function clearKeywordQuery() {
    setQueryPreview("");
    if (selectedCountry) {
      onExtraSearch({
        topic: selectedCountry,
        extraKeywords: "",
        queryOptions: {},
      });
    }
  }

  return (
    <>
      <SortControl
        value={draftFilters.sortBy}
        direction={articlesSortDir}
        options={ARTICLE_SORT_OPTIONS}
        onChange={(value) => setDraftFilters((f) => ({ ...f, sortBy: value }))}
        onToggleDirection={onToggleArticlesSortDir}
      />

      <div className="shrink-0">
        <AccordionSection title="Time range" defaultOpen>
          {TIME_RANGES.map((t) => (
            <Pill
              key={t}
              active={draftFilters.timeRange === t}
              onClick={() => setDraftFilters((f) => ({ ...f, timeRange: t }))}
            >
              {t}
            </Pill>
          ))}
        </AccordionSection>

        {/* client-side only, no request — stays live */}
        <AccordionSection
          title="Sources"
          activeCount={
            (useTopSourcesOnly ? 1 : 0) +
            (englishOnly ? 1 : 0) +
            (sourcePriority ? 1 : 0)
          }
        >
          <Pill active={useTopSourcesOnly} onClick={onTopSourcesToggle}>
            Top sources only
          </Pill>
          <Pill active={englishOnly} onClick={onEnglishOnlyToggle}>
            English only
          </Pill>
          {SOURCE_PRIORITY_OPTIONS.map(({ tier, label }) => (
            <Pill
              key={tier}
              active={sourcePriority === tier}
              onClick={() => onSourcePriorityToggle(tier)}
            >
              {label}
            </Pill>
          ))}
        </AccordionSection>

        {selectedCountry && (
          <AccordionSection title="Keywords" activeCount={queryPreview ? 1 : 0}>
            <div className="w-full space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill
                  active={draftFilters.includePoliticalKeywords}
                  onClick={() =>
                    setDraftFilters((f) => ({
                      ...f,
                      includePoliticalKeywords: !f.includePoliticalKeywords,
                    }))
                  }
                >
                  Political
                </Pill>
                <Button
                  size="sm"
                  onClick={() => setShowKeywordModal(true)}
                  className="rounded-full"
                >
                  Keyword builder
                </Button>
                {!!queryPreview && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearKeywordQuery}
                    className="rounded-full"
                  >
                    Clear
                  </Button>
                )}
              </div>
              {!!queryPreview && (
                <p className="text-xs text-carbon-500 break-words max-h-12 overflow-y-auto">
                  Active:{" "}
                  <span className="font-mono text-carbon-300">
                    {queryPreview}
                  </span>
                </p>
              )}
            </div>
          </AccordionSection>
        )}
      </div>

      {isDirty && (
        <SearchBar onSearch={() => onApplyArticleFilters(draftFilters)} />
      )}

      {/* Content */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {loading && (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <EmptyState
            error
            title="Couldn't load articles"
            description={error}
          />
        )}

        {!loading && !error && articles.length === 0 && (
          <EmptyState
            title="No articles found"
            description="Try adjusting the time range or keywords."
          />
        )}

        {!loading && <Pager paged={paged} scrollRef={listRef} />}
        {!loading &&
          paged.visible.map((article, i) => (
            <ArticleCard
              key={article.url || i}
              article={article}
              onClick={() => onSelectArticle(article)}
            />
          ))}
        {!loading && <Pager paged={paged} scrollRef={listRef} />}
      </div>

      {/* Footer */}
      {articles.length > 0 && (
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-t border-carbon-800">
          <p className="text-xs text-carbon-500">
            {articles.length} loaded · NewsAPI
          </p>
          {canLoadMore && (
            <Button
              size="sm"
              onClick={() => {
                setJumpFrom(articles.length);
                onLoadMore();
              }}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </Button>
          )}
        </div>
      )}

      <KeywordQueryModal
        isOpen={showKeywordModal && !!selectedCountry}
        countryName={selectedCountry}
        availableKeywords={availableKeywords}
        onApply={handleApplyKeywordQuery}
        onClose={() => setShowKeywordModal(false)}
      />
    </>
  );
}
