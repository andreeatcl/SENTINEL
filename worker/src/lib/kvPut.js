// an attempt at optimizing kv writes
export async function kvPut(env, key, value, options) {
  try {
    await env.CACHE.put(key, value, options);
    return true;
  } catch (err) {
    console.warn(`KV write skipped for ${key}: ${err.message}`);
    return false;
  }
}
