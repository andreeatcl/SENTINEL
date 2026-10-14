import { useEffect, useMemo, useState } from "react";
import { loadCountriesGeoJson, toCountryList } from "../../utils/countries";
import { topicLabel } from "../../utils/favorites";
import { timeAgo } from "../../utils/newsApi";
import { useCountryNotes, useNotes } from "../../hooks/useNotes";
import { CountryMark } from "../CountryPicker";
import FavoriteDetail from "../favorites/FavoriteDetail";
import Modal from "../ui/Modal";
import EmptyState from "../ui/EmptyState";
import { Eyebrow } from "../ui/Field";
import NoteItemRow from "./NoteItemRow";
import ShowMore, { usePaged } from "./ShowMore";

function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function latest(a, b) {
  return !a || b > a ? b : a;
}

// every country with notes, ordered by updatedDate
function summarizeCountries(countryNotes, notes) {
  const byCountry = new Map();
  function summary(country) {
    if (!byCountry.has(country)) {
      byCountry.set(country, { country, entries: 0, items: 0, updatedAt: "" });
    }
    return byCountry.get(country);
  }
  for (const [country, entries] of Object.entries(countryNotes)) {
    const s = summary(country);
    s.entries = entries.length;
    for (const entry of entries)
      s.updatedAt = latest(s.updatedAt, entry.updatedAt);
  }
  for (const note of notes) {
    const country = note.context?.country;
    if (!country) continue;
    const s = summary(country);
    s.items += 1;
    s.updatedAt = latest(s.updatedAt, note.updatedAt);
  }
  return [...byCountry.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

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

function SectionHeader({ label, count }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-1.5 border-b border-carbon-800">
      <Eyebrow>{label}</Eyebrow>
      <span className="text-2xs text-carbon-500">{count}</span>
    </div>
  );
}

export default function NotesOverview({ isOpen, onClose, onOpenCountry }) {
  const countryNotes = useCountryNotes();
  const notes = useNotes();
  const codes = useCountryCodes(isOpen);
  const [openItem, setOpenItem] = useState(null);

  const countries = useMemo(
    () => summarizeCountries(countryNotes, notes),
    [countryNotes, notes],
  );
  const items = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes],
  );
  const pagedCountries = usePaged(countries, isOpen);
  const pagedItems = usePaged(items, isOpen);

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
            {countries.length > 0 && (
              <section>
                <SectionHeader label="Countries" count={countries.length} />
                {pagedCountries.visible.map((c) => (
                  <button
                    key={c.country}
                    type="button"
                    onClick={() => onOpenCountry(c.country)}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left border-b border-carbon-800 hover:bg-carbon-850 transition-colors"
                  >
                    <CountryMark code={codes?.get(c.country)} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-carbon-100 truncate">
                        {c.country}
                      </span>
                      <span className="block text-2xs text-carbon-500 mt-0.5">
                        {[
                          c.entries && plural(c.entries, "entry", "entries"),
                          c.items && plural(c.items, "item note"),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span
                      className="text-2xs text-carbon-500 shrink-0"
                      title={c.updatedAt}
                    >
                      {timeAgo(c.updatedAt)}
                    </span>
                  </button>
                ))}
                <ShowMore paged={pagedCountries} className="px-5" />
              </section>
            )}

            {items.length > 0 && (
              <section>
                <SectionHeader label="Item notes" count={items.length} />
                {pagedItems.visible.map((note) => (
                  <NoteItemRow
                    key={note.url}
                    item={note}
                    excerpt={note.text}
                    label={topicLabel(note)}
                    onOpen={setOpenItem}
                  />
                ))}
                <ShowMore paged={pagedItems} className="px-5" />
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
