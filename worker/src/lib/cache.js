import { kvPut } from "./kvPut.js";

export function getCacheKey(params) {
  const sorted = Object.keys(params)
    .filter(
      (k) => params[k] !== undefined && params[k] !== null && params[k] !== "",
    )
    .sort()
    .reduce((acc, k) => {
      acc[k] = params[k];
      return acc;
    }, {});
  return `cache:${JSON.stringify(sorted)}`;
}

export async function getCached(env, cacheKey) {
  const raw = await env.CACHE.get(cacheKey);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function setCached(env, cacheKey, data, ttlSeconds) {
  await kvPut(env, cacheKey, JSON.stringify({ data, timestamp: Date.now() }), {
    expirationTtl: ttlSeconds,
  });
}
