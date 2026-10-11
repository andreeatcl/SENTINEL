import { useSyncExternalStore } from "react";
import { getNote, subscribeNotes } from "../utils/storage";

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
