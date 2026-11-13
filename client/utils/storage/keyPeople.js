import { STORAGE_KEYS, read, write } from "./core";

// overrides: { "<country key>": [entries] }, each list replaces that country's keyPeople.json list
// hidden: { "<country key>": [Wikidata ids] }, live officeholders the user removed
const keyPeopleListeners = new Set();

function notify() {
  keyPeopleListeners.forEach((listener) => listener());
}

export function subscribeKeyPeopleOverrides(listener) {
  keyPeopleListeners.add(listener);
  return () => keyPeopleListeners.delete(listener);
}

export function getKeyPeopleOverrides() {
  return read(STORAGE_KEYS.keyPeople, {});
}

export function getKeyPeopleHidden() {
  return read(STORAGE_KEYS.keyPeopleHidden, {});
}

export function replaceKeyPeopleOverrides(overrides) {
  const ok = write(STORAGE_KEYS.keyPeople, overrides);
  notify();
  return ok;
}

export function replaceKeyPeopleHidden(hidden) {
  const ok = write(STORAGE_KEYS.keyPeopleHidden, hidden);
  notify();
  return ok;
}

function setEntry(map, key, value) {
  const next = { ...map };
  if (value) next[key] = value;
  else delete next[key];
  return next;
}

export function setKeyPeopleOverride(key, entries) {
  return replaceKeyPeopleOverrides(
    setEntry(getKeyPeopleOverrides(), key, entries),
  );
}

export function setKeyPeopleHidden(key, ids) {
  return replaceKeyPeopleHidden(
    setEntry(getKeyPeopleHidden(), key, ids?.length ? ids : null),
  );
}
