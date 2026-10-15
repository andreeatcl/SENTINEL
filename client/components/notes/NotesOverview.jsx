import { useEffect, useMemo, useState } from "react";
import { loadCountriesGeoJson, toCountryList } from "../../utils/countries";
import { getViewedCountries } from "../../utils/storage";
import {
  plural,
  summarizeCountries,
  recentCountries,
  entryResults,
  itemResults,
  matches,
} from "../../utils/notesOverview";
import { useCountryNotes, useNotes } from "../../hooks/useNotes";
import FavoriteDetail from "../favorites/FavoriteDetail";
import Modal from "../ui/Modal";
import EmptyState from "../ui/EmptyState";
import { Input } from "../ui/Field";
import ShowMore, { usePaged } from "./ShowMore";
import {
  PAGES,
  SectionHeader,
  CountryChip,
  NoteResult,
  PageTabs,
  ResultList,
} from "./OverviewParts";

function useCountryCodes(enabled) {
  const [codes, setCodes] = useState(null);
  useEffect(() => {
    if (!enabled || codes) return;
    let canceled = false;
    loadCountriesGeoJson()
      .then((data) => {
        if (canceled) return;
        setCodes(new Map(toCountryList(data).map((c) => [c.name, c.code])));
      })
      .catch(() => {});
    return () => {
      canceled = true;
    };
  }, [enabled, codes]);
  return codes;
}

export default function NotesOverview({ isOpen, onClose, onOpenCountry }) {
  const countryNotes = useCountryNotes();
  const notes = useNotes();
  const codes = useCountryCodes(isOpen);
  const [openItem, setOpenItem] = useState(null);
  const [page, setPage] = useState("countries");
  const [query, setQuery] = useState("");
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setPage("countries");
      setQuery("");
    }
  }

  function changePage(next) {
    setPage(next);
    setQuery("");
  }

  const countries = useMemo(
    () => summarizeCountries(countryNotes, notes),
    [countryNotes, notes],
  );
  const pagedCountries = usePaged(countries, isOpen, 24);
  const recent = useMemo(
    () => (isOpen ? recentCountries(countries, getViewedCountries()) : []),
    [countries, isOpen],
  );
  const entries = useMemo(() => entryResults(countryNotes), [countryNotes]);
  const items = useMemo(() => itemResults(notes), [notes]);
  const pageList = page === "countries" ? entries : items;

  const needle = query.trim().toLowerCase();
  const results = useMemo(
    () => (needle ? pageList.filter((n) => matches(n, needle)) : pageList),
    [pageList, needle],
  );
  const pagedResults = usePaged(results, `${isOpen}:${page}:${needle}`);
  const placeholder = PAGES.find((p) => p.id === page).placeholder;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        width="md"
        title="Notes"
        subtitle={`${plural(countries.length, "country", "countries")} · ${plural(
          notes.length,
          "item note",
        )}`}
      >
        {countries.length === 0 && items.length === 0 ? (
          <EmptyState
            title="No notes yet"
            description="Write dated entries in a country's Notes tab, or add a note to any article or event."
          />
        ) : (
          <>
            <PageTabs
              page={page}
              onChange={changePage}
              counts={{ countries: countries.length, items: items.length }}
            />

            <div className="px-5 pt-4 pb-1">
              <Input
                size="sm"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className="w-full"
              />
            </div>

            {needle ? (
              <section>
                <SectionHeader label="Results" count={results.length} />
                {results.length === 0 && (
                  <p className="px-5 py-4 text-xs text-carbon-500">
                    Nothing matches “{query.trim()}”.
                  </p>
                )}
                <ResultList
                  paged={pagedResults}
                  codes={codes}
                  onOpenCountry={onOpenCountry}
                  onOpenItem={setOpenItem}
                />
              </section>
            ) : page === "countries" ? (
              <>
                {recent.length > 0 && (
                  <section>
                    <SectionHeader label="Recent" divider={false} />
                    <div className="grid grid-cols-5 gap-2 px-5 pb-2">
                      {recent.map((c) => (
                        <CountryChip
                          key={c.country}
                          summary={c}
                          code={codes?.get(c.country)}
                          onOpen={onOpenCountry}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {countries.length > 0 && (
                  <section>
                    <SectionHeader
                      label="Countries"
                      count={countries.length}
                      divider={false}
                    />
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 px-5 pb-3 border-b border-carbon-800">
                      {pagedCountries.visible.map((c) => (
                        <CountryChip
                          key={c.country}
                          summary={c}
                          code={codes?.get(c.country)}
                          onOpen={onOpenCountry}
                        />
                      ))}
                    </div>
                    <ShowMore paged={pagedCountries} className="px-5" />
                  </section>
                )}

                {entries.length > 0 && (
                  <section>
                    <SectionHeader label="Latest" />
                    {entries.slice(0, 5).map((result) => (
                      <NoteResult
                        key={result.key}
                        result={result}
                        codes={codes}
                        onOpenCountry={onOpenCountry}
                        onOpenItem={setOpenItem}
                      />
                    ))}
                  </section>
                )}
              </>
            ) : items.length === 0 ? (
              <p className="px-5 py-4 text-xs text-carbon-500 leading-relaxed">
                No item notes yet. Open any article or event and write a note on
                it.
              </p>
            ) : (
              <section>
                <SectionHeader label="All item notes" count={items.length} />
                <ResultList
                  paged={pagedResults}
                  codes={codes}
                  onOpenCountry={onOpenCountry}
                  onOpenItem={setOpenItem}
                />
              </section>
            )}
          </>
        )}
      </Modal>

      {openItem && (
        <FavoriteDetail item={openItem} onClose={() => setOpenItem(null)} />
      )}
    </>
  );
}
