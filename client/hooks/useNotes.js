import { useSyncExternalStore } from "react";
import {
  getNote,
  getNotes,
  getCountryNotes,
  getCountryEntries,
  subscribeNotes,
} from "../utils/storage";

export function useNote(url) {
  return useSyncExternalStore(subscribeNotes, () =>
    url ? getNote(url) : null,
  );
}

export function useHasNote(url) {
  return useSyncExternalStore(subscribeNotes, () =>
    url ? getNote(url) !== null : false,
  );
}

export function useNotes() {
  return useSyncExternalStore(subscribeNotes, getNotes);
}

export function useCountryNotes() {
  return useSyncExternalStore(subscribeNotes, getCountryNotes);
}

export function useCountryEntries(country) {
  return useSyncExternalStore(subscribeNotes, () => getCountryEntries(country));
}
