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
import {
  buildGdeltDocQuery,
  fetchGdeltDoc,
  normalizeGdeltArticle,
} from "../services/gdeltDocService.js";
import { mergeArticles } from "../lib/mergeArticles.js";
import { rankArticles } from "../lib/rankArticles.js";
import { fetchPageMetadata } from "../lib/pageMetadata.js";
import { isLowQualityDomain } from "../lib/lowQualitySources.js";

// NewsAPI offers news with a 24h delay so refetching more than a few times a day will just be useless & burn our daily quota
// testing 1h cache - consider caching for longer if necessary
const CACHE_TTL_SECONDS = 60 * 60;

// const GDELT_FAILURE_CACHE_TTL_SECONDS = 60 * 5;

const GDELT_BACKFILL_LIMIT = 12;

const news = new Hono();

// fixed a timing issue that resulted in cached data never being accessed
// without rounding, a ms-difference to "from" makes every key unique
function floorToHour(iso) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms - (ms % 3600000)).toISOString();
}

async function backfillGdeltDescriptions(env, articles) {
  const targets = [];
  for (const article of articles) {
    if (targets.length >= GDELT_BACKFILL_LIMIT) break;
    if (article._provider === "gdelt" && !article.description) {
      targets.push(article);
    }
  }
  if (targets.length === 0) return articles;

  const metaByUrl = new Map();
  await Promise.all(
    targets.map(async (article) => {
      const meta = await fetchPageMetadata(env, article.url);
      if (meta) metaByUrl.set(article.url, meta);
    }),
  );
  if (metaByUrl.size === 0) return articles;

  return articles.map((article) => {
    const meta = metaByUrl.get(article.url);
    if (!meta) return article;
    return {
      ...article,
      title: article.title || meta.title,
      description: meta.description || article.description,
      urlToImage: article.urlToImage || meta.image || null,
    };
  });
}

async function fetchGdeltForMerge({ topic, gdeltKeywords, from, page }) {
  if (!topic) return { articles: null };
  if (page !== "1") return { articles: null, skipped: "pagination" };

  try {
    const query = buildGdeltDocQuery(topic, gdeltKeywords);
    const { articles: gdeltRaw, error } = await fetchGdeltDoc({ query, from });
    if (error?.startsWith("skipped:")) {
      return { articles: null, skipped: "rate-limited" };
    }
    if (error) {
      console.error(
        `GDELT fetch failed for topic "${topic}" (query: ${query}): ${error}`,
      );
      return { articles: null, error };
    }
    const filtered = gdeltRaw.filter((a) => !isLowQualityDomain(a.url));
    return { articles: filtered.map(normalizeGdeltArticle) };
  } catch (err) {
    console.error(
      `GDELT fetch threw for topic "${topic}":`,
      err?.message || err,
    );
    return { articles: null, error: err?.message || "unknown error" };
  }
}

news.get("/news", async (c) => {
  const {
    q,
    topic,
    keywords: gdeltKeywords,
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
    topic,
    gdeltKeywords,
    sortBy,
    from,
    language,
    pageSize,
    page,
    searchIn,
  };
  const cacheKey = getCacheKey(params);

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

  const gdeltPromise = fetchGdeltForMerge({
    topic,
    gdeltKeywords,
    from,
    page,
  });

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

  const gdeltResult = await gdeltPromise;
  const articles = mergeArticles(
    result.data.articles || [],
    gdeltResult.articles ?? [],
  );
  const gdeltMeta = {};
  if (gdeltResult.error) {
    gdeltMeta._gdeltError = gdeltResult.error;
  } else if (gdeltResult.skipped) {
    gdeltMeta._gdeltSkipped = gdeltResult.skipped;
  }

  const ranked = rankArticles(articles, { sortBy });
  const backfilled = await backfillGdeltDescriptions(c.env, ranked);

  const finalData = {
    ...result.data,
    articles: backfilled,
    totalResults: backfilled.length,
    ...gdeltMeta,
  };

  // i am having issues with this damn api
  // this piece of code is technically meant to help cache newsapi results for only 5 mins
  // in case gdelt failed. but gdelt always fails.......
  // maybe we will fix this. maybe not. who knows

  // const gdeltFailedOrThrottled =
  //   Boolean(gdeltMeta._gdeltError) ||
  //   gdeltMeta._gdeltSkipped === "rate-limited";
  // const cacheTtl = gdeltFailedOrThrottled
  //   /? GDELT_FAILURE_CACHE_TTL_SECONDS
  //   : CACHE_TTL_SECONDS;

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
