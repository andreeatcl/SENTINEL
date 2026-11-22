import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WorldMap from "./components/WorldMap";
import CountryPicker from "./components/CountryPicker";
import TopBar from "./components/topbar/TopBar";
import MonitorPanel from "./components/monitor/MonitorPanel";
import KeywordsModal from "./components/topbar/KeywordsModal";
import SettingsModal from "./components/topbar/SettingsModal";
import HowItWorksModal from "./components/help/HowItWorksModal";
import FavoritesPanel from "./components/favorites/FavoritesPanel";
import SavedSearchesPanel from "./components/topbar/SavedSearchesPanel";
import NotesOverview from "./components/notes/NotesOverview";
import EventDetail from "./components/events/EventDetail";
import ArticleDetail from "./components/articles/ArticleDetail";
import { FavoriteContext } from "./components/favorites/FavoriteButton";
import { InfoIcon } from "./components/ui/icons";
import { useAppControls } from "./hooks/useAppControls";
import { useViewHistory } from "./hooks/useViewHistory";
import { buildTopicQuery } from "./utils/queryBuilder";
import SaveSearchModal from "./components/monitor/SaveSearchModal";
import { useApiCredits } from "./hooks/useApiCredits";
import {
  hasAnyApiKey,
  getBackupReminder,
  addSavedSearch,
  markRead,
  articleReadKey,
  eventReadKey,
} from "./utils/storage";

const MAP_EVENT_COUNTRIES = 5;

export default function App() {
  const [keywordsCountry, setKeywordsCountry] = useState(undefined);
  const [settingsTab, setSettingsTab] = useState(() =>
    hasAnyApiKey() ? null : "keys",
  );
  const [showHelp, setShowHelp] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [panelTab, setPanelTab] = useState("notes");
  // snapshot waiting in the Save dialog, null when closed
  const [pendingSave, setPendingSave] = useState(null);
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
    sourcePriority,
    savedQueryActive,
    activeBuilder,
    searchId,
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
    eventsNote,
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
    handleSourcePriorityToggle,
    handleRunSavedSearch,
    getCurrentSearch,
  } = useAppControls();

  const { credits, refreshCredits } = useApiCredits(meta);
  const viewHistory = useViewHistory();
  const currentViewRef = useRef(null);

  const panelOpen =
    !!selectedCountry || loading || articles.length > 0 || !!error || !!meta;

  // events of the last few countries stay on the map
  const [mapEventsByCountry, setMapEventsByCountry] = useState([]);
  useEffect(() => {
    if (!selectedCountry || eventsLoading || events.length === 0) return;
    setMapEventsByCountry((prev) =>
      [
        { country: selectedCountry, events },
        ...prev.filter((entry) => entry.country !== selectedCountry),
      ].slice(0, MAP_EVENT_COUNTRIES),
    );
  }, [selectedCountry, eventsLoading, events]);
  const mapEvents = useMemo(() => {
    const seen = new Set();
    return mapEventsByCountry
      .flatMap((entry) => entry.events)
      .filter((event) => !seen.has(event.id) && seen.add(event.id));
  }, [mapEventsByCountry]);

  useEffect(() => {
    if (panelTab === "articles" && selectedCountry) handleOpenArticlesTab();
  }, [panelTab, selectedCountry, searchId, handleOpenArticlesTab]);

  function pushCurrentView() {
    const view = currentViewRef.current;
    if (!panelOpen || !view) return;
    viewHistory.push(
      view.type === "country" ? { ...view, tab: panelTab } : view,
    );
  }

  const selectCountry = useCallback(
    (countryName) => {
      currentViewRef.current = { type: "country", country: countryName };
      setPanelTab("notes");
      handleCountryClick(countryName);
    },
    [handleCountryClick],
  );

  function openCountryNotes(countryName) {
    pushCurrentView();
    setShowNotes(false);
    selectCountry(countryName);
  }

  // Top bar sits above modals, so a nav click or search replaces the open one
  function closeMenuModals() {
    setKeywordsCountry(undefined);
    if (settingsTab) refreshCredits();
    setSettingsTab(null);
    setShowFavorites(false);
    setShowSavedSearches(false);
    setShowNotes(false);
  }

  function runGlobalSearch({ topic, raw }) {
    closeMenuModals();
    pushCurrentView();
    currentViewRef.current = { type: "search", topic, raw };
    handleGlobalSearch({ topic, raw });
  }

  function goBack() {
    const view = viewHistory.pop();
    if (!view) return;
    currentViewRef.current = view;
    if (view.type === "country") {
      setPanelTab(view.tab);
      handleCountryClick(view.country);
    } else if (view.type === "search") {
      handleGlobalSearch(view);
    } else {
      handleRunSavedSearch(view.saved);
      setPanelTab("articles");
    }
  }

  function closePanel() {
    viewHistory.clear();
    handleClose();
  }

  // recorded on each new favorite so the Favorites panel can group by it
  const favoriteContext = useMemo(
    () => ({
      country: selectedCountry || null,
      query: selectedCountry ? null : activeQuery || null,
    }),
    [selectedCountry, activeQuery],
  );

  function handleSaveSearch() {
    const current = getCurrentSearch();
    if (!current.topic) return;
    const fresh = current.topic !== current.lastTopic;
    const q = fresh
      ? current.raw
        ? current.topic
        : buildTopicQuery(
            current.topic,
            current.extraKeywords,
            current.includePoliticalKeywords,
            current.queryOptions,
          )
      : current.q;
    setPendingSave({ ...current, q });
  }

  function handleConfirmSave(label) {
    if (pendingSave) addSavedSearch({ ...pendingSave, label });
  }

  function handleRunSaved(saved) {
    pushCurrentView();
    currentViewRef.current = { type: "saved", saved };
    handleRunSavedSearch(saved);
    setPanelTab("articles");
  }

  return (
    <FavoriteContext.Provider value={favoriteContext}>
      <div className="relative w-full h-full overflow-hidden bg-carbon-950">
        {/* Modals */}
        <KeywordsModal
          isOpen={keywordsCountry !== undefined}
          initialCountry={keywordsCountry}
          onClose={() => setKeywordsCountry(undefined)}
        />
        <SettingsModal
          tab={settingsTab}
          onTabChange={setSettingsTab}
          onClose={() => {
            setSettingsTab(null);
            refreshCredits();
          }}
        />
        <HowItWorksModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
        <FavoritesPanel
          isOpen={showFavorites}
          onClose={() => setShowFavorites(false)}
        />
        <SavedSearchesPanel
          isOpen={showSavedSearches}
          onClose={() => setShowSavedSearches(false)}
          onRun={handleRunSaved}
        />
        <SaveSearchModal
          isOpen={!!pendingSave}
          defaultLabel={selectedCountry || pendingSave?.topic}
          query={pendingSave?.q}
          onSave={handleConfirmSave}
          onClose={() => setPendingSave(null)}
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
            events={mapEvents}
            onEventClick={openEvent}
          />
        </div>

        {/* HUD: top search bar */}
        <TopBar
          onSearch={runGlobalSearch}
          loading={loading}
          meta={meta}
          credits={credits}
          onKeywordsClick={() => {
            closeMenuModals();
            setKeywordsCountry(null);
          }}
          onSettingsClick={() => {
            closeMenuModals();
            setSettingsTab(getBackupReminder() ? "backup" : "keys");
          }}
          onFavoritesClick={() => {
            closeMenuModals();
            setShowFavorites(true);
          }}
          onNotesClick={() => {
            closeMenuModals();
            setShowNotes(true);
          }}
          onSavedSearchesClick={() => {
            closeMenuModals();
            setShowSavedSearches(true);
          }}
        />

        {/* Events/Articles panel — near-fullscreen overlay, not a docked sidebar */}
        {panelOpen && (
          <MonitorPanel
            articles={articles}
            loading={loading}
            error={error}
            meta={meta}
            selectedCountry={selectedCountry}
            onClose={closePanel}
            onBack={viewHistory.canGoBack ? goBack : null}
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
            sourcePriority={sourcePriority}
            onSourcePriorityToggle={handleSourcePriorityToggle}
            onSaveSearch={handleSaveSearch}
            canSaveSearch={!!selectedCountry || !!activeQuery}
            activeBuilder={activeBuilder}
            searchId={searchId}
            onEditKeywords={setKeywordsCountry}
            savedQueryActive={savedQueryActive}
            events={events}
            eventsLoading={eventsLoading}
            eventsLoadingMore={eventsLoadingMore}
            eventsError={eventsError}
            eventsHasMore={eventsHasMore}
            eventsNote={eventsNote}
            eventsFilters={eventsFilters}
            onEventsFilterChange={handleEventsFilterChange}
            onLoadMoreEvents={handleLoadMoreEvents}
            onSelectEvent={openEvent}
            onSelectArticle={openArticle}
            activeTab={panelTab}
            onTabChange={setPanelTab}
            onGlobalSearch={runGlobalSearch}
          />
        )}

        {/* Bottom HUD bar — hidden once the panel covers the screen */}
        {!panelOpen && (
          <div className="absolute bottom-3 left-3 z-[998] flex items-center gap-1.5 pointer-events-none">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              aria-label="How it works"
              title="How it works"
              className="pointer-events-auto w-9 h-9 flex items-center justify-center bg-carbon-900/90 border border-carbon-800 rounded-lg backdrop-blur-md text-carbon-300 hover:text-white transition-colors"
            >
              <InfoIcon className="w-5 h-5" />
            </button>
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
