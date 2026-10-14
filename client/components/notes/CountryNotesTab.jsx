import { useMemo, useRef, useState } from "react";
import {
  addCountryEntry,
  updateCountryEntry,
  getFavorites,
} from "../../utils/storage";
import { formatDate } from "../../utils/newsApi";
import { useCountryEntries, useNotes } from "../../hooks/useNotes";
import FavoriteDetail from "../favorites/FavoriteDetail";
import Button, { IconButton } from "../ui/Button";
import { Eyebrow } from "../ui/Field";
import { PlusIcon } from "../ui/icons";
import NoteEditor from "./NoteEditor";
import NoteItemRow from "./NoteItemRow";
import ShowMore, { usePaged } from "./ShowMore";

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

function Entry({ entry, onEdit }) {
  return (
    <div className="px-4 py-3.5 border-b border-carbon-800">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <p className="text-xs text-carbon-400">{entryDate(entry.createdAt)}</p>
        <Button size="sm" variant="ghost" onClick={onEdit} className="-mr-2">
          Edit
        </Button>
      </div>
      {entry.title && (
        <p className="text-sm font-semibold text-carbon-100 leading-snug mb-1 break-words">
          {entry.title}
        </p>
      )}
      {entry.text && (
        <p className="text-sm text-carbon-200 leading-relaxed whitespace-pre-wrap break-words">
          {entry.text}
        </p>
      )}
    </div>
  );
}

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
  const [favorites, setFavorites] = useState(getFavorites);
  const [editingId, setEditingId] = useState(null);
  const [newEntryId, setNewEntryId] = useState(null);
  const [openItem, setOpenItem] = useState(null);

  const countryNotes = useMemo(
    () => notes.filter((note) => note.context?.country === country),
    [notes, country],
  );
  const countryFavorites = useMemo(
    () => favorites.filter((fav) => fav.context?.country === country),
    [favorites, country],
  );

  function startNew() {
    setEditingId(null);
    setNewEntryId(`${Date.now()}`);
  }

  function stopEditing() {
    setEditingId(null);
    setNewEntryId(null);
  }

  function closeDetail() {
    setOpenItem(null);
    setFavorites(getFavorites());
  }

  const listedEntries = newEntryId
    ? entries.filter((entry) => entry.id !== newEntryId)
    : entries;
  const pagedEntries = usePaged(listedEntries);
  const pagedNotes = usePaged(countryNotes);
  const pagedFavorites = usePaged(countryFavorites);

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

      {newEntryId && (
        <div className="px-4 py-3.5 border-b border-carbon-800">
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
          <div
            key={entry.id}
            className="px-4 py-3.5 border-b border-carbon-800"
          >
            <EntryEditor
              country={country}
              entry={entry}
              id={entry.id}
              onDone={stopEditing}
            />
          </div>
        ) : (
          <Entry
            key={entry.id}
            entry={entry}
            onEdit={() => {
              setNewEntryId(null);
              setEditingId(entry.id);
            }}
          />
        ),
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
          <SectionHeader label="Has notes" count={countryNotes.length} />
          {pagedNotes.visible.map((note) => (
            <NoteItemRow
              key={note.url}
              item={note}
              excerpt={note.text}
              onOpen={setOpenItem}
            />
          ))}
          <ShowMore paged={pagedNotes} />
        </>
      )}

      {countryFavorites.length > 0 && (
        <>
          <SectionHeader label="Favorited" count={countryFavorites.length} />
          {pagedFavorites.visible.map((fav) => (
            <NoteItemRow key={fav.url} item={fav} onOpen={setOpenItem} />
          ))}
          <ShowMore paged={pagedFavorites} />
        </>
      )}

      {openItem && <FavoriteDetail item={openItem} onClose={closeDetail} />}
    </div>
  );
}
