import { STORAGE_KEYS, read, write } from "./core";

/// favorites are saved article/event links
export function getFavorites() {
  return read(STORAGE_KEYS.favorites, []);
}

export function isFavorite(url) {
  return getFavorites().some((item) => item.url === url);
}

export function addFavorite(favorite) {
  if (!favorite?.url) return;
  const current = getFavorites();
  if (current.some((item) => item.url === favorite.url)) return;

  const entry = {
    ...favorite,
    id: favorite.url,
    type: favorite.type === "event" ? "event" : "article",
    savedAt: new Date().toISOString(),
  };
  write(STORAGE_KEYS.favorites, [entry, ...current]);
}

// undo for a removal — puts the item back where it was
export function restoreFavorite(favorite, index) {
  const current = getFavorites();
  if (current.some((item) => item.url === favorite.url)) return;
  const next = [...current];
  next.splice(Math.min(index, next.length), 0, favorite);
  write(STORAGE_KEYS.favorites, next);
}

export function removeFavorite(url) {
  const next = getFavorites().filter((item) => item.url !== url);
  write(STORAGE_KEYS.favorites, next);
}

// user-made groups of favorites ({ id, name, urls, createdAt })
// membership is by url and survives un-favoriting, so undo and re-saving keep it
export function getFavoriteGroups() {
  return read(STORAGE_KEYS.favoriteGroups, []);
}

function updateFavoriteGroups(update) {
  const next = update(getFavoriteGroups());
  write(STORAGE_KEYS.favoriteGroups, next);
  return next;
}

export function createFavoriteGroup(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const group = {
    id: `${Date.now()}`,
    name: trimmed,
    urls: [],
    createdAt: new Date().toISOString(),
  };
  updateFavoriteGroups((groups) => [...groups, group]);
  return group;
}

export function renameFavoriteGroup(id, name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  updateFavoriteGroups((groups) =>
    groups.map((g) => (g.id === id ? { ...g, name: trimmed } : g)),
  );
}

export function deleteFavoriteGroup(id) {
  updateFavoriteGroups((groups) => groups.filter((g) => g.id !== id));
}

export function setFavoriteGroupMembership(id, url, isMember) {
  updateFavoriteGroups((groups) =>
    groups.map((g) => {
      if (g.id !== id) return g;
      const urls = g.urls.filter((u) => u !== url);
      return { ...g, urls: isMember ? [...urls, url] : urls };
    }),
  );
}
