import { unzipSync } from "fflate";
import { getAllTrackedFipsCodes } from "../lib/countryCodes.js";
import { getCursor, setCursor, mergeDayBucket } from "../lib/eventsStore.js";

const LAST_UPDATE_URL = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";

// GDELT 2.0 Event export schema, 0-indexed column positions.
// Confirmed against GDELT's own codebook
const COL = {
  GLOBAL_EVENT_ID: 0,
  DAY: 1,
  ACTOR1_CODE: 5,
  ACTOR2_CODE: 15,
  EVENT_CODE: 26,
  EVENT_ROOT_CODE: 28,
  QUAD_CLASS: 29,
  GOLDSTEIN: 30,
  NUM_MENTIONS: 31,
  NUM_SOURCES: 32,
  NUM_ARTICLES: 33,
  AVG_TONE: 34,
  ACTION_GEO_FULLNAME: 52,
  ACTION_GEO_COUNTRY_CODE: 53,
  ACTION_GEO_LAT: 56,
  ACTION_GEO_LONG: 57,
  DATE_ADDED: 59,
  SOURCE_URL: 60,
};
const EXPECTED_COLUMN_COUNT = 61;

function dateAddedToIso(raw) {
  if (!raw || raw.length < 14) return null;
  const y = raw.slice(0, 4);
  const mo = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  const h = raw.slice(8, 10);
  const mi = raw.slice(10, 12);
  const s = raw.slice(12, 14);
  return `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
}

// Reads lastupdate.txt and returns the events file's URL + a cursor value
// (the file's embedded timestamp) used to detect "is this new since last ingestion tick".
export async function fetchLatestExportFileMeta() {
  const response = await fetch(LAST_UPDATE_URL);
  const text = await response.text();

  const line = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.endsWith(".export.CSV.zip"));

  if (!line) return null;

  const url = line.split(" ").pop();
  const match = url.match(/(\d{14})\.export\.CSV\.zip$/);
  if (!match) return null;

  return { url, cursor: match[1] };
}

async function fetchAndUnzipCsv(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  const buffer = new Uint8Array(await response.arrayBuffer());
  const files = unzipSync(buffer);
  const [csvBytes] = Object.values(files);
  return new TextDecoder("utf-8").decode(csvBytes);
}

function normalizeRow(cols) {
  return {
    id: cols[COL.GLOBAL_EVENT_ID],
    day: cols[COL.DAY],
    dateAdded: dateAddedToIso(cols[COL.DATE_ADDED]),
    actor1Code: cols[COL.ACTOR1_CODE] || null,
    actor2Code: cols[COL.ACTOR2_CODE] || null,
    eventCode: cols[COL.EVENT_CODE],
    eventRootCode: cols[COL.EVENT_ROOT_CODE],
    quadClass: Number(cols[COL.QUAD_CLASS]),
    goldstein: Number(cols[COL.GOLDSTEIN]),
    numMentions: Number(cols[COL.NUM_MENTIONS]),
    numSources: Number(cols[COL.NUM_SOURCES]),
    numArticles: Number(cols[COL.NUM_ARTICLES]),
    avgTone: Number(cols[COL.AVG_TONE]),
    location: cols[COL.ACTION_GEO_FULLNAME] || null,
    lat: Number(cols[COL.ACTION_GEO_LAT]) || null,
    lon: Number(cols[COL.ACTION_GEO_LONG]) || null,
    sourceUrl: cols[COL.SOURCE_URL] || null,
  };
}

// parses the raw file, filters to countries we track, and buckets by day/country
// so that eventsStore can merge it straight into KV

function filterAndBucketByCountry(csvText) {
  const trackedCodes = getAllTrackedFipsCodes();
  const byDay = {};

  for (const line of csvText.split("\n")) {
    if (!line) continue;
    const cols = line.split("\t");
    if (cols.length < EXPECTED_COLUMN_COUNT) continue;

    const fipsCode = cols[COL.ACTION_GEO_COUNTRY_CODE];
    if (!fipsCode || !trackedCodes.has(fipsCode)) continue;

    const day = cols[COL.DAY];
    if (!byDay[day]) byDay[day] = {};
    if (!byDay[day][fipsCode]) byDay[day][fipsCode] = [];
    byDay[day][fipsCode].push(normalizeRow(cols));
  }

  return byDay;
}

export async function ingestLatestEventsFile(env) {
  const latest = await fetchLatestExportFileMeta();
  if (!latest) return { ingested: false, reason: "no export file found" };

  const lastCursor = await getCursor(env);
  if (lastCursor === latest.cursor) {
    return {
      ingested: false,
      reason: "already up to date",
      cursor: lastCursor,
    };
  }

  const csvText = await fetchAndUnzipCsv(latest.url);
  if (csvText === null) {
    return {
      ingested: false,
      reason: "export file missing",
      fileUrl: latest.url,
    };
  }
  const byDay = filterAndBucketByCountry(csvText);

  for (const [day, rowsByCountry] of Object.entries(byDay)) {
    await mergeDayBucket(env, day, rowsByCountry);
  }

  await setCursor(env, latest.cursor);

  return {
    ingested: true,
    cursor: latest.cursor,
    fileUrl: latest.url,
    daysTouched: Object.keys(byDay),
  };
}
