import { useCallback, useMemo, useState } from "react";
import WorldMap from "./components/WorldMap";
import CountryPicker from "./components/CountryPicker";
import TopBar from "./components/topbar/TopBar";
import MonitorPanel from "./components/monitor/MonitorPanel";
import SourcesModal from "./components/topbar/SourcesModal";
import ApiKeysModal from "./components/topbar/ApiKeysModal";
import FavoritesPanel from "./components/favorites/FavoritesPanel";
import SavedSearchesPanel from "./components/topbar/SavedSearchesPanel";
import DataBackupModal from "./components/topbar/DataBackupModal";
import NotesOverview from "./components/notes/NotesOverview";
import EventDetail from "./components/events/EventDetail";
import ArticleDetail from "./components/articles/ArticleDetail";
import { FavoriteContext } from "./components/favorites/FavoriteButton";
import { useAppControls } from "./hooks/useAppControls";
import { useApiCredits } from "./hooks/useApiCredits";
import {
  hasAnyApiKey,
  addSavedSearch,
  markRead,
  articleReadKey,
  eventReadKey,
} from "./utils/storage";

export default function App() {
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [showKeysModal, setShowKeysModal] = useState(() => !hasAnyApiKey());
  const [showFavorites, setShowFavorites] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [panelTab, setPanelTab] = useState("notes");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  const openEvent = useCallback((event) => {
    markRead(eventReadKey(event));
    setSelectedEvent(event);
  }, []);
  const openArticle = useCallback((article) => {
    markRead(articleReadKey(article));
    setSelectedArticle(article);
  }, []);

  const {
    selectedCountry,
    sortBy,
    articlesSortDir,
    timeRange,
    includePoliticalKeywords,
    useTopSourcesOnly,
    englishOnly,
    sourcePriority,
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
    handleLoadMoreEvents,
    handleExtraSearch,
    handleClose,
    handleLoadMore,
    handleTopSourcesToggle,
    handleEnglishOnlyToggle,
    handleSourcePriorityToggle,
    handleRunSavedSearch,
    getCurrentSearch,
  } = useAppControls();

  const { credits, refreshCredits } = useApiCredits(meta);

  const selectCountry = useCallback(
    (countryName) => {
      setPanelTab("notes");
      handleCountryClick(countryName);
    },
    [handleCountryClick],
  );

  function openCountryNotes(countryName) {
    setShowNotes(false);
    selectCountry(countryName);
  }

  // a country selection opens the panel
  // Events tab loads immediately
  // Articles tab only fetches once it is opened
  const panelOpen =
    !!selectedCountry || loading || articles.length > 0 || !!error || !!meta;

  // recorded on each new favorite so the Favorites panel can group by it
  const favoriteContext = useMemo(
    () => ({
      country: selectedCountry || null,
      query: selectedCountry ? null : activeQuery || null,
    }),
    [selectedCountry, activeQuery],
  );

  function handleSaveSearch() {
    const { topic, extraKeywords, queryOptions } = getCurrentSearch();
    if (!topic) return;
    addSavedSearch({
      label: selectedCountry,
      topic,
      extraKeywords,
      queryOptions,
    });
  }

  return (
    <FavoriteContext.Provider value={favoriteContext}>
      <div className="relative w-full h-full overflow-hidden bg-carbon-950">
        {/* Modals */}
        <SourcesModal
          isOpen={showSourcesModal}
          onClose={() => setShowSourcesModal(false)}
        />
        <ApiKeysModal
          isOpen={showKeysModal}
          onClose={() => {
            setShowKeysModal(false);
            refreshCredits();
          }}
        />
        <FavoritesPanel
          isOpen={showFavorites}
          onClose={() => setShowFavorites(false)}
        />
        <SavedSearchesPanel
          isOpen={showSavedSearches}
          onClose={() => setShowSavedSearches(false)}
          onRun={handleRunSavedSearch}
        />
        <DataBackupModal
          isOpen={showBackup}
          onClose={() => setShowBackup(false)}
        />
        <NotesOverview
          isOpen={showNotes}
          onClose={() => setShowNotes(false)}
          onOpenCountry={openCountryNotes}
        />
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
        <ArticleDetail
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />

        {/* Map layer — stays full-size; blurred/dimmed behind the panel
            instead of resized, now that the panel is a near-fullscreen
            overlay rather than a docked sidebar */}
        <div
          className={`absolute inset-0 transition-all duration-300 ${
            panelOpen ? "blur-sm brightness-75" : ""
          }`}
        >
          <WorldMap
            selectedCountry={selectedCountry}
            onCountryClick={selectCountry}
            events={events}
            onEventClick={openEvent}
          />
        </div>

        {/* HUD: top search bar */}
        <TopBar
          onSearch={handleGlobalSearch}
          loading={loading}
          meta={meta}
          credits={credits}
          activeQuery={activeQuery}
          onSourcesClick={() => setShowSourcesModal(true)}
          onKeysClick={() => setShowKeysModal(true)}
          onFavoritesClick={() => setShowFavorites(true)}
          onNotesClick={() => setShowNotes(true)}
          onSavedSearchesClick={() => setShowSavedSearches(true)}
          onBackupClick={() => setShowBackup(true)}
        />

        {/* Events/Articles panel — near-fullscreen overlay, not a docked sidebar */}
        {panelOpen && (
          <MonitorPanel
            articles={articles}
            loading={loading}
            error={error}
            meta={meta}
            selectedCountry={selectedCountry}
            onClose={handleClose}
            onApplyArticleFilters={handleApplyArticleFilters}
            articlesSortDir={articlesSortDir}
            onToggleArticlesSortDir={handleArticlesSortDirToggle}
            onExtraSearch={handleExtraSearch}
            onLoadMore={handleLoadMore}
            loadingMore={loadingMore}
            canLoadMore={canLoadMore}
            includePoliticalKeywords={includePoliticalKeywords}
            sortBy={sortBy}
            timeRange={timeRange}
            useTopSourcesOnly={useTopSourcesOnly}
            onTopSourcesToggle={handleTopSourcesToggle}
            englishOnly={englishOnly}
            onEnglishOnlyToggle={handleEnglishOnlyToggle}
            sourcePriority={sourcePriority}
            onSourcePriorityToggle={handleSourcePriorityToggle}
            onSaveSearch={handleSaveSearch}
            events={events}
            eventsLoading={eventsLoading}
            eventsLoadingMore={eventsLoadingMore}
            eventsError={eventsError}
            eventsHasMore={eventsHasMore}
            eventsFilters={eventsFilters}
            onEventsFilterChange={handleEventsFilterChange}
            onLoadMoreEvents={handleLoadMoreEvents}
            onSelectEvent={openEvent}
            onSelectArticle={openArticle}
            onOpenArticlesTab={handleOpenArticlesTab}
            activeTab={panelTab}
            onTabChange={setPanelTab}
          />
        )}

        {/* Bottom HUD bar — hidden once the panel covers the screen */}
        {!panelOpen && (
          <div className="absolute bottom-3 left-3 z-[998] flex items-center gap-3 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2.5 bg-carbon-900/90 border border-carbon-800 rounded-full py-1 pl-2 pr-2.5 sm:pl-3.5 backdrop-blur-md">
              <span className="hidden sm:inline text-2xs text-carbon-300">
                Select a country to start monitoring
              </span>
              <span
                aria-hidden
                className="hidden sm:block w-px h-3.5 bg-carbon-700"
              />
              <CountryPicker value={selectedCountry} onSelect={selectCountry} />
            </div>
          </div>
        )}
      </div>
    </FavoriteContext.Provider>
  );
}
