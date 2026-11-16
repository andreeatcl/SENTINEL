import { kvPut } from "./kvPut.js";
import { fetchPageMetadata } from "./pageMetadata.js";

const KEY_PREFIX = "titles:v1:";
const TTL_SECONDS = 60 * 60 * 24 * 32;
const SUCCESS_MAX_AGE_MS = 31 * 86400000;
const FAILURE_MAX_AGE_MS = 6 * 3600000;
const MAX_ENTRIES = 600;

async function keyFor(scope) {
  const bytes = new TextEncoder().encode(scope);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return KEY_PREFIX + hex.slice(0, 24);
}

function isFresh(entry, now) {
  const maxAge = entry.title ? SUCCESS_MAX_AGE_MS : FAILURE_MAX_AGE_MS;
  return now - entry.at < maxAge;
}

export async function openTitleStore(env, scope) {
  const key = await keyFor(scope);
  const raw = await env.CACHE.get(key);
  const titles = raw ? JSON.parse(raw) : {};
  let changed = false;

  return {
    async get(url) {
      const cached = titles[url];
      if (cached && isFresh(cached, Date.now())) return cached;
      const fetched = await fetchPageMetadata(url);
      const entry = { ...(fetched || {}), at: Date.now() };
      titles[url] = entry;
      changed = true;
      return entry;
    },
    async save() {
      if (!changed) return;
      const now = Date.now();
      const kept = Object.entries(titles)
        .filter(([, entry]) => isFresh(entry, now))
        .sort((a, b) => b[1].at - a[1].at)
        .slice(0, MAX_ENTRIES);
      await kvPut(env, key, JSON.stringify(Object.fromEntries(kept)), {
        expirationTtl: TTL_SECONDS,
      });
    },
  };
}
