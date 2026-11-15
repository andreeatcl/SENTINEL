import { kvPut } from "./kvPut.js";

export const DAILY_LIMIT = 100; // NewsAPI free-tier daily cap

export async function hashKey(key) {
  const bytes = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export function extractKeys(request) {
  return {
    primary: request.headers.get("X-Newsapi-Key") || "",
    backup: request.headers.get("X-Newsapi-Key-Backup") || "",
    lastGood: request.headers.get("X-Newsapi-Last-Good") || "primary",
  };
}

export function buildTryOrder({ primary, backup, lastGood }) {
  const slots = [
    { slot: "primary", key: primary },
    { slot: "backup", key: backup },
  ].filter((s) => s.key);
  if (lastGood === "backup") slots.reverse();
  return slots;
}

function usageKvKey(keyHash) {
  const day = new Date().toISOString().slice(0, 10);
  return `usage:${keyHash}:${day}`;
}

export async function getUsage(env, keyHash) {
  const raw = await env.CACHE.get(usageKvKey(keyHash));
  return raw ? parseInt(raw, 10) : 0;
}

export async function trackUsage(env, keyHash) {
  const kvKey = usageKvKey(keyHash);
  const next = (await getUsage(env, keyHash)) + 1;
  // expires after 2 days so old counters clean themselves up
  await kvPut(env, kvKey, String(next), { expirationTtl: 60 * 60 * 48 });
  return next;
}

export async function getActiveKeyUsage(env, keys) {
  let last = null;
  for (const { slot, key } of buildTryOrder(keys)) {
    const used = await getUsage(env, await hashKey(key));
    last = { slot, used, remaining: Math.max(0, DAILY_LIMIT - used) };
    if (used < DAILY_LIMIT) return last;
  }
  return last; // every key exhausted — report the last one tried (0 left)
}
