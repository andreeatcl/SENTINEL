import { useEffect, useMemo, useRef, useState } from "react";
import {
  addCountryEntry,
  updateCountryEntry,
  markCountryViewed,
} from "../../utils/storage";
import { formatDate } from "../../utils/newsApi";
import { useCountryEntries, useNotes } from "../../hooks/useNotes";
import FavoriteDetail from "../favorites/FavoriteDetail";
import { IconButton } from "../ui/Button";
import { Eyebrow } from "../ui/Field";
import { PlusIcon } from "../ui/icons";
import NoteEditor from "./NoteEditor";
import { NoteItemCard } from "./NoteItemRow";
import ShowMore, { usePaged, useGridColumns } from "./ShowMore";

function entryDate(value) {
  const date = new Date(value);
  const time = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${formatDate(value, { withYear: true })}, ${time}`;
}

// an attempt at fixing a double saving issue
function EntryEditor({ country, entry, id, onDone }) {
  const [draft, setDraft] = useState(entry?.text ?? "");
  const [title, setTitle] = useState(entry?.title ?? "");
  const savedRef = useRef(Boolean(entry));

  function save(text, title) {
    if (!text.trim() && !title.trim() && !savedRef.current) return true;
    if (savedRef.current) {
      return updateCountryEntry(country, id, { title, text });
    }
    if (!addCountryEntry(country, { title, text }, id)) return false;
    savedRef.current = true;
    return true;
  }

  function handleDone() {
    if (!draft.trim() && !title.trim() && savedRef.current) {
      updateCountryEntry(country, id, { title: "", text: "" });
    }
    onDone();
  }

  return (
    <NoteEditor
      value={draft}
      onChange={setDraft}
      title={title}
      onTitleChange={setTitle}
      save={save}
      onDone={handleDone}
      placeholder={`What's happening in ${country}, what to watch…`}
    />
  );
}

function EntryCard({ entry, onEdit }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`Edit entry from ${entryDate(entry.createdAt)}`}
      className="group flex flex-col w-full min-w-0 text-left p-3 rounded-md border border-carbon-800 bg-carbon-850 hover:border-carbon-600 hover:bg-carbon-800 transition-colors"
    >
      {entry.title && (
        <p className="text-sm font-semibold text-carbon-100 group-hover:text-white leading-snug line-clamp-2 break-words transition-colors">
          {entry.title}
        </p>
      )}
      {entry.text && (
        <p
          className={`text-sm text-carbon-200 leading-relaxed line-clamp-6 whitespace-pre-wrap break-words ${
            entry.title ? "mt-1" : ""
          }`}
        >
          {entry.text}
        </p>
      )}
      <p className="mt-auto pt-2.5 text-xs text-carbon-400">
        {entryDate(entry.createdAt)}
      </p>
    </button>
  );
}

const CARD_GRID =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 px-4 py-3 border-b border-carbon-800";
const WIDE_EDITOR =
  "col-span-full p-3 rounded-md border border-carbon-700 bg-carbon-850";

function SectionHeader({ label, count, action }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-5 pb-1.5 border-b border-carbon-800">
      <Eyebrow>{label}</Eyebrow>
      <div className="flex items-center gap-1.5">
        <span className="text-2xs text-carbon-500">{count}</span>
        {action}
      </div>
    </div>
  );
}

export default function CountryNotesTab({ country }) {
  const entries = useCountryEntries(country);
  const notes = useNotes();
  const [editingId, setEditingId] = useState(null);
  const [newEntryId, setNewEntryId] = useState(null);
  const [openItem, setOpenItem] = useState(null);

  useEffect(() => markCountryViewed(country), [country]);

  const countryNotes = useMemo(
    () => notes.filter((note) => note.context?.country === country),
    [notes, country],
  );

  function startNew() {
    setEditingId(null);
    setNewEntryId(`${Date.now()}`);
  }

  function stopEditing() {
    setEditingId(null);
    setNewEntryId(null);
  }

  const listedEntries = newEntryId
    ? entries.filter((entry) => entry.id !== newEntryId)
    : entries;
  const columns = useGridColumns();
  const pagedEntries = usePaged(listedEntries, undefined, columns * 2);
  const pagedNotes = usePaged(countryNotes, undefined, columns * 2);

  return (
    <div className="flex-1 overflow-y-auto">
      <SectionHeader
        label="Your entries"
        count={entries.length}
        action={
          <IconButton
            size="sm"
            label="New entry"
            onClick={startNew}
            disabled={newEntryId !== null}
            className="-my-1.5 -mr-1.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            <PlusIcon className="w-4 h-4" />
          </IconButton>
        }
      />

      {(newEntryId || listedEntries.length > 0) && (
        <div className={CARD_GRID}>
          {newEntryId && (
            <div className={WIDE_EDITOR}>
              <EntryEditor
                key={newEntryId}
                country={country}
                entry={null}
                id={newEntryId}
                onDone={stopEditing}
              />
            </div>
          )}

          {pagedEntries.visible.map((entry) =>
            editingId === entry.id ? (
              <div key={entry.id} className={WIDE_EDITOR}>
                <EntryEditor
                  country={country}
                  entry={entry}
                  id={entry.id}
                  onDone={stopEditing}
                />
              </div>
            ) : (
              <EntryCard
                key={entry.id}
                entry={entry}
                onEdit={() => {
                  setNewEntryId(null);
                  setEditingId(entry.id);
                }}
              />
            ),
          )}
        </div>
      )}
      <ShowMore paged={pagedEntries} />

      {entries.length === 0 && !newEntryId && (
        <p className="px-4 py-4 text-xs text-carbon-500 leading-relaxed">
          Dated notes about {country}, newest first. Items you note or favorite
          while browsing {country} are listed below them.
        </p>
      )}

      {countryNotes.length > 0 && (
        <>
          <SectionHeader label="Annotations" count={countryNotes.length} />
          <div className={CARD_GRID}>
            {pagedNotes.visible.map((note) => (
              <NoteItemCard
                key={note.url}
                item={note}
                excerpt={note.text}
                onOpen={setOpenItem}
              />
            ))}
          </div>
          <ShowMore paged={pagedNotes} />
        </>
      )}

      {openItem && (
        <FavoriteDetail item={openItem} onClose={() => setOpenItem(null)} />
      )}
    </div>
  );
}
