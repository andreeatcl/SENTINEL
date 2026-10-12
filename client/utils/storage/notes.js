import { STORAGE_KEYS, read, write, forget } from "./core";

const notesListeners = new Set();

function notesChanged() {
  notesListeners.forEach((listener) => listener());
}

export function getNotes() {
  return read(STORAGE_KEYS.notes, []);
}

export function getNote(url) {
  return getNotes().find((note) => note.url === url) || null;
}

const NOTE_KEYS = [STORAGE_KEYS.notes, STORAGE_KEYS.countryNotes];

function onNotesStorage(e) {
  if (e.key !== null && !NOTE_KEYS.includes(e.key)) return;
  NOTE_KEYS.forEach(forget);
  notesChanged();
}

export function subscribeNotes(listener) {
  if (notesListeners.size === 0) {
    window.addEventListener("storage", onNotesStorage);
  }
  notesListeners.add(listener);
  return () => {
    notesListeners.delete(listener);
    if (notesListeners.size === 0) {
      window.removeEventListener("storage", onNotesStorage);
    }
  };
}

export function saveNote(item, text, context = null) {
  if (!item?.url) return false;
  const current = getNotes();
  const existing = current.find((note) => note.url === item.url);
  const others = current.filter((note) => note.url !== item.url);
  const now = new Date().toISOString();

  let next;
  if (!text.trim()) {
    next = others;
  } else if (existing) {
    next = current.map((note) =>
      note.url === item.url ? { ...note, text, updatedAt: now } : note,
    );
  } else {
    const note = {
      ...item,
      id: item.url,
      type: item.type === "event" ? "event" : "article",
      context,
      text,
      createdAt: now,
      updatedAt: now,
    };
    next = [note, ...others];
  }

  const ok = write(STORAGE_KEYS.notes, next);
  notesChanged();
  return ok;
}

export function replaceNotes(notes) {
  const ok = write(STORAGE_KEYS.notes, notes);
  notesChanged();
  return ok;
}

// { [country]: [ { id, text, createdAt, updatedAt } ] }
const NO_ENTRIES = [];

export function getCountryNotes() {
  return read(STORAGE_KEYS.countryNotes, {});
}

export function getCountryEntries(country) {
  return getCountryNotes()[country] || NO_ENTRIES;
}

function writeCountryEntries(country, entries) {
  const { [country]: _, ...others } = getCountryNotes();
  const next = entries.length ? { ...others, [country]: entries } : others;
  const ok = write(STORAGE_KEYS.countryNotes, next);
  notesChanged();
  return ok;
}

export function addCountryEntry(country, text) {
  if (!country || !text.trim()) return null;
  const now = new Date().toISOString();
  const entry = { id: `${Date.now()}`, text, createdAt: now, updatedAt: now };
  const ok = writeCountryEntries(country, [
    entry,
    ...getCountryEntries(country),
  ]);
  return ok ? entry : null;
}

export function updateCountryEntry(country, id, text) {
  const entries = getCountryEntries(country);
  const next = text.trim()
    ? entries.map((entry) =>
        entry.id === id
          ? { ...entry, text, updatedAt: new Date().toISOString() }
          : entry,
      )
    : entries.filter((entry) => entry.id !== id);
  return writeCountryEntries(country, next);
}

export function replaceCountryNotes(countryNotes) {
  const ok = write(STORAGE_KEYS.countryNotes, countryNotes);
  notesChanged();
  return ok;
}
