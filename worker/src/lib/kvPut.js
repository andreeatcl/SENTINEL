// an attempt at optimizing kv writes
export async function kvPut(env, key, value, options) {
  try {
    await env.CACHE.put(key, value, options);
  } catch (err) {
    // console.warn(`KV write skipped for ${key}: ${err.message}`);
    console.warn(`KV write skipped: ${err.message}`);
  }
}
