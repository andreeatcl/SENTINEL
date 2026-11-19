import keyPeople from "../../data/keyPeople.json";
import { normalizeCountryKey } from "./queryBuilder";
import {
  getKeyPeopleHidden,
  setKeyPeopleHidden,
  setKeyPeopleOverride,
} from "./storage";

export const KEY_PEOPLE_CATEGORIES = [
  { id: "government", label: "Government" },
  { id: "opposition", label: "Opposition & parties" },
  { id: "military", label: "Military & security" },
  { id: "economy", label: "Economy & energy" },
];

// names used as ids since they are unique per country
const DEFAULTS = new Map(
  Object.values(keyPeople).map((country) => [
    normalizeCountryKey(country.name),
    country.entries.map((entry) => ({ ...entry, id: entry.name })),
  ]),
);

const EMPTY = [];

export function hasDefaultKeyPeople(countryName) {
  return DEFAULTS.has(normalizeCountryKey(countryName));
}

export function getKeyPeople(countryName, overrides) {
  const key = normalizeCountryKey(countryName);
  return overrides[key] ?? DEFAULTS.get(key) ?? EMPTY;
}

export function isKeyPeopleCustomized(countryName, overrides) {
  return Object.hasOwn(overrides, normalizeCountryKey(countryName));
}

export function saveKeyPeople(countryName, entries) {
  return setKeyPeopleOverride(normalizeCountryKey(countryName), entries);
}

export function resetKeyPeople(countryName) {
  const key = normalizeCountryKey(countryName);
  setKeyPeopleHidden(key, null);
  return setKeyPeopleOverride(key, null);
}

export function getHiddenLiveIds(countryName, hidden) {
  return hidden[normalizeCountryKey(countryName)] ?? EMPTY;
}

export function hideLiveKeyPerson(countryName, wikidataId) {
  const key = normalizeCountryKey(countryName);
  const ids = getKeyPeopleHidden()[key] ?? [];
  return setKeyPeopleHidden(key, [...new Set([...ids, wikidataId])]);
}

const nameKey = (entry) => normalizeCountryKey(entry.name);

export function mergeLiveKeyPeople({
  list,
  customized,
  officeholders,
  hiddenIds,
}) {
  let live = officeholders
    .filter((p) => !hiddenIds.includes(p.id))
    .map((p) => ({
      id: `wd:${p.id}`,
      wikidataId: p.id,
      name: p.name,
      role: p.role,
      category: "government",
      live: true,
    }));
  if (customized) {
    const own = new Set(list.map(nameKey));
    live = live.filter((e) => !own.has(nameKey(e)));
  } else {
    const fresh = new Set(live.map(nameKey));
    list = list.filter((e) => !fresh.has(nameKey(e)));
  }
  return { live, list };
}

export function keyPersonQuery(entry) {
  return entry.query || entry.name;
}

export function newKeyPersonId() {
  return `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function keyPeopleCategoryLabel(id) {
  return KEY_PEOPLE_CATEGORIES.find((c) => c.id === id)?.label ?? "";
}

export function moveKeyPerson(entries, id, direction) {
  const from = entries.findIndex((e) => e.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= entries.length) return entries;
  const next = [...entries];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
