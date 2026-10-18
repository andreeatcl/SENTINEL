import { useEffect, useMemo, useState } from "react";
import { CAMEO_ROOT_CATEGORIES } from "../../utils/cameoCategories";
import { TONE_LABELS } from "../../utils/eventTone";
import {
  FilterCheckbox,
  FilterSection,
  FilterGroup,
  Pill,
} from "../ui/FilterAccordion";
import SortControl from "../ui/SortControl";
import SearchBar from "../ui/SearchBar";
import EventsList from "./EventsList";
import { SOURCE_PRIORITY_OPTIONS } from "../articles/ArticlesTab";
import Button from "../ui/Button";
import { Input } from "../ui/Field";
import { useReadItems } from "../../hooks/useReadItems";
import { isRead, eventReadKey } from "../../utils/storage";

const TIME_RANGES = ["48h", "7d", "30d"];

const EVENT_SORT_OPTIONS = [
  { value: "significance", label: "Significance" },
  { value: "date", label: "Date" },
  { value: "coverage", label: "Coverage" },
];

const LOAD_MORE_COOLDOWN_MS = 4000;

function toggleInList(list, value) {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((v) => setB.has(v));
}

function filtersEqual(a, b) {
  return (
    a.timeRange === b.timeRange &&
    a.sortBy === b.sortBy &&
    a.sortDir === b.sortDir &&
    a.sourcePriority === b.sourcePriority &&
    sameSet(a.category, b.category) &&
    sameSet(a.tone, b.tone)
  );
}

function matchesKeyword(event, keyword) {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    event.headline,
    event.location,
    event.actor1?.label,
    event.actor2?.label,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export default function EventsTab({
  selectedCountry,
  events,
  eventsLoading,
  eventsLoadingMore,
  eventsError,
  eventsHasMore,
  eventsFilters,
  onEventsFilterChange,
  onLoadMoreEvents,
  onSelectEvent,
}) {
  const [keyword, setKeyword] = useState("");
  const [loadMoreCooldown, setLoadMoreCooldown] = useState(false);
  const [draftFilters, setDraftFilters] = useState(eventsFilters);
  const [hideRead, setHideRead] = useState(false);
  const readItems = useReadItems();

  // reset keyword filter + draft when switching countries
  useEffect(() => {
    setKeyword("");
    setDraftFilters(eventsFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]);

  const visibleEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          matchesKeyword(event, keyword) &&
          !(hideRead && isRead(readItems, eventReadKey(event))),
      ),
    [events, keyword, hideRead, readItems],
  );

  const isDirty = !filtersEqual(draftFilters, eventsFilters);

  const activeFilterCount =
    (draftFilters.category.length < CAMEO_ROOT_CATEGORIES.length ? 1 : 0) +
    (draftFilters.tone.length < Object.keys(TONE_LABELS).length ? 1 : 0) +
    (draftFilters.sourcePriority ? 1 : 0) +
    (keyword ? 1 : 0);

  function handleLoadMoreClick() {
    onLoadMoreEvents();
    setLoadMoreCooldown(true);
    setTimeout(() => setLoadMoreCooldown(false), LOAD_MORE_COOLDOWN_MS);
  }

  return (
    <>
      <SortControl
        value={draftFilters.sortBy}
        direction={draftFilters.sortDir}
        options={EVENT_SORT_OPTIONS}
        onChange={(sortBy) => setDraftFilters((f) => ({ ...f, sortBy }))}
        onToggleDirection={() =>
          setDraftFilters((f) => ({
            ...f,
            sortDir: f.sortDir === "asc" ? "desc" : "asc",
          }))
        }
      >
        <FilterCheckbox checked={hideRead} onChange={setHideRead}>
          Hide read
        </FilterCheckbox>
      </SortControl>

      <FilterGroup activeCount={activeFilterCount}>
        <FilterSection title="Time range">
          {TIME_RANGES.map((t) => (
            <Pill
              key={t}
              active={draftFilters.timeRange === t}
              onClick={() => setDraftFilters((f) => ({ ...f, timeRange: t }))}
            >
              {t}
            </Pill>
          ))}
        </FilterSection>

        <FilterSection
          title="Category"
          scrollX
          activeCount={draftFilters.category.length}
          totalCount={CAMEO_ROOT_CATEGORIES.length}
          onSelectAll={() =>
            setDraftFilters((f) => ({
              ...f,
              category: CAMEO_ROOT_CATEGORIES.map((c) => c.code),
            }))
          }
          onDeselectAll={() => setDraftFilters((f) => ({ ...f, category: [] }))}
        >
          {CAMEO_ROOT_CATEGORIES.map(({ code, label }) => (
            <Pill
              key={code}
              active={draftFilters.category.includes(code)}
              onClick={() =>
                setDraftFilters((f) => ({
                  ...f,
                  category: toggleInList(f.category, code),
                }))
              }
            >
              {label}
            </Pill>
          ))}
        </FilterSection>

        <FilterSection
          title="Tone"
          activeCount={draftFilters.tone.length}
          totalCount={Object.keys(TONE_LABELS).length}
          onSelectAll={() =>
            setDraftFilters((f) => ({ ...f, tone: Object.keys(TONE_LABELS) }))
          }
          onDeselectAll={() => setDraftFilters((f) => ({ ...f, tone: [] }))}
        >
          {Object.entries(TONE_LABELS).map(([value, label]) => (
            <Pill
              key={value}
              tone={value}
              active={draftFilters.tone.includes(value)}
              onClick={() =>
                setDraftFilters((f) => ({
                  ...f,
                  tone: toggleInList(f.tone, value),
                }))
              }
            >
              {label}
            </Pill>
          ))}
        </FilterSection>

        <FilterSection
          title="Source"
          activeCount={draftFilters.sourcePriority ? 1 : 0}
        >
          {SOURCE_PRIORITY_OPTIONS.map(({ tier, label }) => (
            <Pill
              key={tier}
              active={draftFilters.sourcePriority === tier}
              onClick={() =>
                setDraftFilters((f) => ({
                  ...f,
                  sourcePriority: f.sourcePriority === tier ? null : tier,
                }))
              }
            >
              {label}
            </Pill>
          ))}
        </FilterSection>

        {/* Client-side only (filters what's already loaded) — instant,
            no request, so it's live rather than gated behind Search */}
        <FilterSection title="Keyword" activeCount={keyword ? 1 : 0}>
          <Input
            size="sm"
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Filter loaded events…"
            className="w-full"
          />
        </FilterSection>
      </FilterGroup>

      {isDirty && (
        <SearchBar onSearch={() => onEventsFilterChange(draftFilters)} />
      )}

      <div className="flex-1 overflow-y-auto">
        <EventsList
          events={visibleEvents}
          loading={eventsLoading}
          error={eventsError}
          readItems={readItems}
          onSelectEvent={onSelectEvent}
        />
      </div>

      {events.length > 0 && (
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-t border-carbon-800">
          <p className="text-xs text-carbon-500">
            {visibleEvents.length} of {events.length} events · GDELT
          </p>
          {eventsHasMore && (
            <Button
              size="sm"
              onClick={handleLoadMoreClick}
              disabled={eventsLoadingMore || loadMoreCooldown}
            >
              {eventsLoadingMore
                ? "Loading…"
                : loadMoreCooldown
                  ? "Wait a moment…"
                  : "Load more"}
            </Button>
          )}
        </div>
      )}
    </>
  );
}
