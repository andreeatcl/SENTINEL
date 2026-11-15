import { Hono } from "hono";
import { getFipsCodes } from "../lib/countryCodes.js";
import { decodeActor } from "../lib/gdeltActorCodes.js";
import { decodeEventCode } from "../lib/cameoEventCodes.js";
import { getEventsForRange } from "../lib/eventsStore.js";
import { fetchPageMetadata } from "../lib/pageMetadata.js";
import { isLowQualityDomain } from "../lib/lowQualitySources.js";
import { getSourceTrustLabel } from "../lib/sourceTrust.js";
import { clusterEvents, EXCLUDED_ROOT_CODES } from "../lib/eventClusters.js";

const MAX_RANGE_DAYS = 31; // 30d range + one day back for late-dated rows
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 25;
const MAX_SCAN = 25; // page-title lookups per request; each new URL is a KV write
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INTEGER_PATTERN = /^\d+$/;

const events = new Hono();

function toDayString(isoDate) {
  return isoDate.replaceAll("-", "");
}

function dedupeBySourceUrl(rows) {
  const bestByUrl = new Map();
  const noUrl = [];

  for (const row of rows) {
    if (!row.sourceUrl) {
      noUrl.push(row);
      continue;
    }
    const existing = bestByUrl.get(row.sourceUrl);
    if (!existing || row.numMentions > existing.numMentions) {
      bestByUrl.set(row.sourceUrl, row);
    }
  }

  return [...bestByUrl.values(), ...noUrl];
}

function toneCategoryForRow(goldstein) {
  if (goldstein > 1) return "positive";
  if (goldstein < -1) return "negative";
  return "neutral";
}

function hasStateActor(row) {
  return !!(
    decodeActor(row.actor1Code)?.country || decodeActor(row.actor2Code)?.country
  );
}

function dateAddedTimestamp(row) {
  if (row.dateAdded) return Date.parse(row.dateAdded);
  const day = row.day || "";
  return Date.parse(
    `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}T00:00:00Z`,
  );
}

function reportedDay(row) {
  return row.dateAdded
    ? row.dateAdded.slice(0, 10).replaceAll("-", "")
    : row.day;
}

function coverageScore(row) {
  return row.numSources * 1000 + row.numMentions;
}

const SORTERS = {
  significance: (dir) => (a, b) => dir * (b._score - a._score),
  date: (dir) => (a, b) =>
    dir * reportedDay(b).localeCompare(reportedDay(a)) || b._score - a._score,
  coverage: (dir) => (a, b) => dir * (coverageScore(b) - coverageScore(a)),
};

events.get("/events", async (c) => {
  const {
    country,
    from,
    to,
    limit = String(DEFAULT_LIMIT),
    offset = "0",
    category = "",
    tone = "",
    sortBy = "date",
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

  const rawRows = await getEventsForRange(c.env, fipsCodes, fromDay, toDay);
  const sinceMs = since ? Date.parse(since) : NaN;
  let rows = dedupeBySourceUrl(rawRows);

  rows = rows
    .filter(
      (row) =>
        row.sourceUrl &&
        hasStateActor(row) &&
        !EXCLUDED_ROOT_CODES.has(row.eventRootCode) &&
        !isLowQualityDomain(row.sourceUrl) &&
        (Number.isNaN(sinceMs) || dateAddedTimestamp(row) >= sinceMs),
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

  const clusters = clusterEvents(rows);
  const sorter = SORTERS[sortBy] || SORTERS.date;
  let rankedAll = clusters.sort(sorter(sortDir === "asc" ? -1 : 1));

  if (sourcePriority) {
    const matching = rankedAll.filter(
      (row) => row._trustLabel?.tier === sourcePriority,
    );
    const rest = rankedAll.filter(
      (row) => row._trustLabel?.tier !== sourcePriority,
    );
    rankedAll = [...matching, ...rest];
  }

  // skip events whose page gives no title
  const decorated = [];
  let cursor = offsetNum;
  const scanEnd = Math.min(rankedAll.length, offsetNum + MAX_SCAN);
  while (decorated.length < limitNum && cursor < scanEnd) {
    const batch = rankedAll.slice(
      cursor,
      Math.min(scanEnd, cursor + limitNum - decorated.length),
    );
    cursor += batch.length;
    const results = await Promise.all(
      batch.map(async (row) => {
        const pageMeta = await fetchPageMetadata(c.env, row.sourceUrl);
        if (!pageMeta?.title) return null;
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
