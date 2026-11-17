import { Hono } from "hono";
import {
  fetchEverything,
  fetchTopHeadlines,
} from "../services/newsApiService.js";
import { getCacheKey, getCached, setCached } from "../lib/cache.js";
import {
  extractKeys,
  getActiveKeyUsage,
  hashKey,
  trackUsage,
} from "../lib/keys.js";
import { withKeyFailover } from "../lib/withKeyFailover.js";
import { mergeArticles } from "../lib/mergeArticles.js";
import { rankArticles } from "../lib/rankArticles.js";

// NewsAPI offers news with a 24h delay so refetching more than a few times a day will just be useless & burn our daily quota
// testing 1h cache - consider caching for longer if necessary
const CACHE_TTL_SECONDS = 60 * 60;

const news = new Hono();

// fixed a timing issue that resulted in cached data never being accessed
// without rounding, a ms-difference to "from" makes every key unique
function floorToHour(iso) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms - (ms % 3600000)).toISOString();
}

news.get("/news", async (c) => {
  const {
    q,
    sortBy = "relevancy",
    from: rawFrom,
    language,
    pageSize = "100",
    page = "1",
    searchIn = "title,description,content",
  } = c.req.query();

  if (!q) {
    return c.json({ error: "Query parameter q is required" }, 400);
  }

  const keys = extractKeys(c.req.raw);
  if (!keys.primary && !keys.backup) {
    return c.json(
      { error: "No API key configured. Add one in Settings." },
      400,
    );
  }

  const from = rawFrom && floorToHour(rawFrom);
  const params = {
    q,
    sortBy,
    from,
    language,
    pageSize,
    page,
    searchIn,
  };
  const cacheKey = await getCacheKey(params);

  const cached = await getCached(c.env, cacheKey);
  if (cached) {
    const usage = await getActiveKeyUsage(c.env, keys);
    return c.json({
      ...cached.data,
      _cached: true,
      _cacheAge: Math.round((Date.now() - cached.timestamp) / 1000),
      ...(usage && {
        _apiCallsToday: usage.used,
        _apiCallsRemaining: usage.remaining,
      }),
    });
  }

  const result = await withKeyFailover(c.env, keys, (apiKey) =>
    fetchEverything({
      apiKey,
      q,
      sortBy,
      from,
      language,
      pageSize,
      page,
      searchIn,
    }),
  );

  if (result.error) {
    return c.json({ error: result.error.message }, result.error.status);
  }

  const articles = rankArticles(mergeArticles(result.data.articles || []), {
    sortBy,
  });
  const finalData = {
    ...result.data,
    articles,
    totalResults: articles.length,
  };

  await setCached(c.env, cacheKey, finalData, CACHE_TTL_SECONDS);

  return c.json({
    ...finalData,
    _cached: false,
    _keyUsed: result.keyUsedSlot,
    _apiCallsToday: result.apiCallsToday,
    _apiCallsRemaining: result.apiCallsRemaining,
  });
});

news.get("/keys/usage", async (c) => {
  const usage = await getActiveKeyUsage(c.env, extractKeys(c.req.raw));
  if (!usage) return c.json({ configured: false });
  return c.json({
    configured: true,
    keyUsed: usage.slot,
    apiCallsToday: usage.used,
    apiCallsRemaining: usage.remaining,
  });
});

// test submitted API key
news.get("/keys/test", async (c) => {
  const key = c.req.header("X-Newsapi-Key");
  if (!key) {
    return c.json({ valid: false, message: "No key provided." }, 400);
  }

  try {
    const { response, data } = await fetchTopHeadlines({
      apiKey: key,
      country: "us",
      pageSize: 1,
    });
    if (response.ok && data.status !== "error") {
      await trackUsage(c.env, await hashKey(key));
      return c.json({ valid: true });
    }
    return c.json({ valid: false, message: data.message || "Key rejected." });
  } catch {
    return c.json({ valid: false, message: "Could not reach NewsAPI." }, 502);
  }
});

export default news;
