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

function onNotesStorage(e) {
  if (e.key !== STORAGE_KEYS.notes && e.key !== null) return;
  forget(STORAGE_KEYS.notes);
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
