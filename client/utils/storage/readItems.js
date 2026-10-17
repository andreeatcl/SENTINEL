import { STORAGE_KEYS, read, write } from "./core";

// remember what articles a user has viewed (opened modal)
// { "a:<url>" | "e:<event id>": openedAt }
//  not part of the backup
const READ_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const readListeners = new Set();

export function subscribeReadItems(listener) {
  readListeners.add(listener);
  return () => readListeners.delete(listener);
}

export const articleReadKey = (article) => article?.url && `a:${article.url}`;
export const eventReadKey = (event) => event?.id != null && `e:${event.id}`;

export function getReadItems() {
  return read(STORAGE_KEYS.readItems, {});
}

export function isRead(readItems, key) {
  const openedAt = key && readItems[key];
  return !!openedAt && Date.now() - Date.parse(openedAt) < READ_MAX_AGE_MS;
}

export function markRead(key) {
  if (!key) return;
  const cutoff = Date.now() - READ_MAX_AGE_MS;
  const kept = Object.entries(getReadItems()).filter(
    ([k, openedAt]) => k !== key && Date.parse(openedAt) >= cutoff,
  );
  write(
    STORAGE_KEYS.readItems,
    Object.fromEntries([...kept, [key, new Date().toISOString()]]),
  );
  readListeners.forEach((listener) => listener());
}
