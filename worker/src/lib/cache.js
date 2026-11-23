import { kvPut } from "./kvPut.js";

// ensure that long queries dont go past KV 512b limit
export async function getCacheKey(params) {
  const sorted = Object.keys(params)
    .filter(
      (k) => params[k] !== undefined && params[k] !== null && params[k] !== "",
    )
    .sort()
    .reduce((acc, k) => {
      acc[k] = params[k];
      return acc;
    }, {});
  const bytes = new TextEncoder().encode(JSON.stringify(sorted));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `cache:v2:${hex}`;
}

export async function getCached(env, cacheKey) {
  try {
    const raw = await env.CACHE.get(cacheKey);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    // console.warn(`KV read skipped for ${cacheKey}: ${err.message}`);
    console.warn(`KV read skipped: ${err.message}`);
    return null;
  }
}

export async function setCached(env, cacheKey, data, ttlSeconds) {
  await kvPut(env, cacheKey, JSON.stringify({ data, timestamp: Date.now() }), {
    expirationTtl: ttlSeconds,
  });
}
