import PanelHeader from "./PanelHeader";
import EventsTab from "../events/EventsTab";
import ArticlesTab from "../articles/ArticlesTab";
import CountryNotesTab from "../notes/CountryNotesTab";

export default function MonitorPanel({
  articles,
  loading,
  loadingMore,
  canLoadMore,
  error,
  meta,
  selectedCountry,
  onClose,
  onApplyArticleFilters,
  articlesSortDir,
  onToggleArticlesSortDir,
  onExtraSearch,
  onLoadMore,
  includePoliticalKeywords,
  sortBy,
  timeRange,
  useTopSourcesOnly,
  onTopSourcesToggle,
  englishOnly,
  onEnglishOnlyToggle,
  sourcePriority,
  onSourcePriorityToggle,
  onSaveSearch,
  events,
  eventsLoading,
  eventsLoadingMore,
  eventsError,
  eventsHasMore,
  eventsFilters,
  onEventsFilterChange,
  onLoadMoreEvents,
  onSelectEvent,
  onSelectArticle,
  onOpenArticlesTab,
  activeTab,
  onTabChange,
}) {
  function handleTabClick(tabId) {
    onTabChange(tabId);
    if (tabId === "articles") onOpenArticlesTab();
  }

  const showEventsTab = activeTab === "events" && !!selectedCountry;
  const showNotesTab = activeTab === "notes" && !!selectedCountry;

  return (
    <div className="panel-enter absolute z-[1100] inset-x-3 md:inset-x-[10%] top-16 bottom-3 flex flex-col bg-carbon-900 border border-carbon-800 rounded-xl shadow-panel overflow-hidden">
      <PanelHeader
        selectedCountry={selectedCountry}
        meta={meta}
        activeTab={activeTab}
        onTabClick={handleTabClick}
        onSaveSearch={onSaveSearch}
        onClose={onClose}
      />

      {showNotesTab ? (
        <CountryNotesTab key={selectedCountry} country={selectedCountry} />
      ) : showEventsTab ? (
        <EventsTab
          selectedCountry={selectedCountry}
          events={events}
          eventsLoading={eventsLoading}
          eventsLoadingMore={eventsLoadingMore}
          eventsError={eventsError}
          eventsHasMore={eventsHasMore}
          eventsFilters={eventsFilters}
          onEventsFilterChange={onEventsFilterChange}
          onLoadMoreEvents={onLoadMoreEvents}
          onSelectEvent={onSelectEvent}
        />
      ) : (
        <ArticlesTab
          articles={articles}
          loading={loading}
          loadingMore={loadingMore}
          canLoadMore={canLoadMore}
          error={error}
          selectedCountry={selectedCountry}
          sortBy={sortBy}
          timeRange={timeRange}
          includePoliticalKeywords={includePoliticalKeywords}
          articlesSortDir={articlesSortDir}
          onToggleArticlesSortDir={onToggleArticlesSortDir}
          onApplyArticleFilters={onApplyArticleFilters}
          useTopSourcesOnly={useTopSourcesOnly}
          onTopSourcesToggle={onTopSourcesToggle}
          englishOnly={englishOnly}
          onEnglishOnlyToggle={onEnglishOnlyToggle}
          sourcePriority={sourcePriority}
          onSourcePriorityToggle={onSourcePriorityToggle}
          onExtraSearch={onExtraSearch}
          onLoadMore={onLoadMore}
          onSelectArticle={onSelectArticle}
        />
      )}
    </div>
  );
}
