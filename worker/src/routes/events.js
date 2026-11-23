import { Hono } from "hono";
import { getFipsCodes } from "../lib/countryCodes.js";
import { decodeActor } from "../lib/gdeltActorCodes.js";
import { decodeEventCode } from "../lib/cameoEventCodes.js";
import { getEventsForRange } from "../lib/eventsStore.js";
import { openTitleStore } from "../lib/titleStore.js";
import { getSourceTrustLabel } from "../lib/sourceTrust.js";
import { clusterEvents } from "../lib/eventClusters.js";

const MAX_RANGE_DAYS = 3; // 48h range + one day back for late-dated rows
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 30;
const MAX_SCAN = 40; // rows checked per request; free plan caps subrequests at 50
const MAX_NEW_PAGES = 8; // uncached headline reads per request (~2-6 ms CPU each)
const RANKED_TTL_MS = 5 * 60000; // imports land every 15 min
const RANKED_MAX_ENTRIES = 20;
const SINCE_ROUND_MS = 5 * 60000; // client's since has ms precision, would defeat the cache
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INTEGER_PATTERN = /^\d+$/;

const events = new Hono();

function toDayString(isoDate) {
  return isoDate.replaceAll("-", "");
}

function dedupeBySourceUrl(rows) {
  const bestByUrl = new Map();
  for (const row of rows) {
    const existing = bestByUrl.get(row.sourceUrl);
    if (!existing || row.numMentions > existing.numMentions) {
      bestByUrl.set(row.sourceUrl, row);
    }
  }
  return [...bestByUrl.values()];
}

function toneCategoryForRow(goldstein) {
  if (goldstein > 1) return "positive";
  if (goldstein < -1) return "negative";
  return "neutral";
}

function dateAddedTimestamp(row) {
  if (row.dateAdded) return Date.parse(row.dateAdded);
  const day = row.day || "";
  return Date.parse(
    `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`,
  );
}

function coverageScore(row) {
  return row.numSources * 1000 + row.numMentions;
}

const SORTERS = {
  significance: (dir) => (a, b) => dir * (b._score - a._score),
  date: (dir) => (a, b) =>
    dir * (dateAddedTimestamp(b) - dateAddedTimestamp(a)) ||
    b._score - a._score,
  coverage: (dir) => (a, b) => dir * (coverageScore(b) - coverageScore(a)),
};

async function rankEvents(env, fipsCodes, fromDay, toDay, opts) {
  const { sinceMs, category, tone, sortBy, sortDir, sourcePriority } = opts;
  const rawRows = await getEventsForRange(env, fipsCodes, fromDay, toDay);
  let rows = dedupeBySourceUrl(rawRows)
    .filter(
      (row) => Number.isNaN(sinceMs) || dateAddedTimestamp(row) >= sinceMs,
    )
    .map((row) => ({
      ...row,
      _trustLabel: getSourceTrustLabel({ url: row.sourceUrl }),
    }));

  const categories = category ? category.split(",").filter(Boolean) : [];
  const tones = tone ? tone.split(",").filter(Boolean) : [];
  if (categories.length > 0) {
    rows = rows.filter((row) => categories.includes(String(row.eventRootCode)));
  }
  if (tones.length > 0) {
    rows = rows.filter((row) =>
      tones.includes(toneCategoryForRow(row.goldstein)),
    );
  }

  const sorter = SORTERS[sortBy] || SORTERS.significance;
  let rankedAll = clusterEvents(rows).sort(sorter(sortDir === "asc" ? -1 : 1));

  if (sourcePriority) {
    const matching = rankedAll.filter(
      (row) => row._trustLabel?.tier === sourcePriority,
    );
    const rest = rankedAll.filter(
      (row) => row._trustLabel?.tier !== sourcePriority,
    );
    rankedAll = [...matching, ...rest];
  }
  return { rankedAll, rawCount: rawRows.length };
}

// helps load more & repeated opens
const rankedCache = new Map();

function getRanked(key) {
  const hit = rankedCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > RANKED_TTL_MS) {
    rankedCache.delete(key);
    return null;
  }
  return hit.value;
}

function setRanked(key, value) {
  rankedCache.delete(key);
  rankedCache.set(key, { value, at: Date.now() });
  if (rankedCache.size > RANKED_MAX_ENTRIES) {
    rankedCache.delete(rankedCache.keys().next().value);
  }
}

events.get("/events", async (c) => {
  const {
    country,
    from,
    to,
    limit = String(DEFAULT_LIMIT),
    offset = "0",
    category = "",
    tone = "",
    sortBy = "significance",
    sortDir = "desc",
    sourcePriority = "",
    since = "",
  } = c.req.query();

  if (!country) {
    return c.json({ error: "Query parameter country is required" }, 400);
  }
  if (!from || !to) {
    return c.json(
      { error: "Query parameters from and to are required (YYYY-MM-DD)" },
      400,
    );
  }

  if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) {
    return c.json({ error: "from and to must be dates (YYYY-MM-DD)" }, 400);
  }
  if (!INTEGER_PATTERN.test(limit) || !INTEGER_PATTERN.test(offset)) {
    return c.json({ error: "limit and offset must be whole numbers" }, 400);
  }
  const limitNum = Math.min(Math.max(Number(limit), 1), MAX_LIMIT);
  const offsetNum = Number(offset);

  const fipsCodes = getFipsCodes(country);
  if (fipsCodes.length === 0) {
    return c.json({
      events: [],
      meta: {
        country,
        matched: 0,
        note: "Sorry, GDELT doesn't track this country. Try looking up articles!",
      },
    });
  }

  const fromDay = toDayString(from);
  const toDay = toDayString(to);
  const spanDays = (Date.parse(to) - Date.parse(from)) / 86400000;
  if (Number.isNaN(spanDays) || spanDays < 0) {
    return c.json({ error: "Invalid date range" }, 400);
  }
  if (spanDays > MAX_RANGE_DAYS) {
    return c.json(
      { error: `Range too large — max ${MAX_RANGE_DAYS} days` },
      400,
    );
  }

  const parsedSince = since ? Date.parse(since) : NaN;
  const sinceMs = Number.isNaN(parsedSince)
    ? NaN
    : parsedSince - (parsedSince % SINCE_ROUND_MS);
  const rankKey = [
    fipsCodes.join(","),
    fromDay,
    toDay,
    sinceMs,
    category,
    tone,
    sortBy,
    sortDir,
    sourcePriority,
  ].join("|");

  let ranked = getRanked(rankKey);
  const cacheHit = Boolean(ranked);
  if (!ranked) {
    ranked = await rankEvents(c.env, fipsCodes, fromDay, toDay, {
      sinceMs,
      category,
      tone,
      sortBy,
      sortDir,
      sourcePriority,
    });
    setRanked(rankKey, ranked);
  }
  const { rankedAll, rawCount } = ranked;

  // skip events whose page gives no title
  const titles = await openTitleStore(c.env, `events:${[...fipsCodes].sort()}`);
  const decorated = [];
  let cursor = offsetNum;
  const scanEnd = Math.min(rankedAll.length, offsetNum + MAX_SCAN);
  let newPagesLeft = MAX_NEW_PAGES;
  while (decorated.length < limitNum && cursor < scanEnd) {
    const batch = [];
    while (batch.length < limitNum - decorated.length && cursor < scanEnd) {
      const row = rankedAll[cursor];
      if (!titles.has(row.sourceUrl)) {
        if (newPagesLeft === 0) break;
        newPagesLeft--;
      }
      batch.push(row);
      cursor++;
    }
    if (batch.length === 0) break;
    const results = await Promise.all(
      batch.map(async (row) => {
        const pageMeta = await titles.get(row.sourceUrl);
        if (!pageMeta.title) return null;
        return {
          ...row,
          actor1: decodeActor(row.actor1Code),
          actor2: decodeActor(row.actor2Code),
          eventTypeLabel: decodeEventCode(row.eventCode, row.eventRootCode),
          headline: pageMeta.title,
          preview: pageMeta.description || null,
          image: pageMeta.image || null,
        };
      }),
    );
    decorated.push(...results.filter(Boolean));
  }
  await titles.save();

  // off for privacy, uncomment to debug
  // const t = titles.stats();
  // console.log(
  //   `events ${country}: ${rawCount} rows, ${rankedAll.length} clusters, ranked ${cacheHit ? "from memory" : "fresh"}, ` +
  //     `${t.fetched} pages read, title cache ${t.cachedEntries} entries / ${(t.cachedChars / 1e3).toFixed(0)}K chars`,
  // );

  return c.json({
    events: decorated,
    meta: {
      country,
      matched: rankedAll.length,
      returned: decorated.length,
      offset: offsetNum,
      nextOffset: cursor,
      hasMore: cursor < rankedAll.length,
    },
  });
});

export default events;
