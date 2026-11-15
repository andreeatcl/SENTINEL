import { unzipSync } from "fflate";
import { getAllTrackedFipsCodes } from "../lib/countryCodes.js";
import { getDayBucket, mergeDayBucket } from "../lib/eventsStore.js";
import { EXCLUDED_ROOT_CODES } from "../lib/eventClusters.js";

const LAST_UPDATE_URL = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";

// GDELT 2.0 Event export schema, 0-indexed column positions.
// Confirmed against GDELT's own codebook
const COL = {
  GLOBAL_EVENT_ID: 0,
  DAY: 1,
  ACTOR1_CODE: 5,
  ACTOR2_CODE: 15,
  IS_ROOT_EVENT: 25,
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

// "YYYYMMDD" minus n days
function daysBefore(day, n) {
  const date = Date.UTC(
    +day.slice(0, 4),
    +day.slice(4, 6) - 1,
    +day.slice(6, 8),
  );
  return new Date(date - n * 86400000)
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
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

function filterAndGroupByCountry(csvText, oldestDay) {
  const trackedCodes = getAllTrackedFipsCodes();
  const byCountry = {};

  for (const line of csvText.split("\n")) {
    if (!line) continue;
    const cols = line.split("\t");
    if (cols.length < EXPECTED_COLUMN_COUNT) continue;

    const fipsCode = cols[COL.ACTION_GEO_COUNTRY_CODE];
    if (!fipsCode || !trackedCodes.has(fipsCode)) continue;
    if (cols[COL.IS_ROOT_EVENT] !== "1") continue;
    if (EXCLUDED_ROOT_CODES.has(cols[COL.EVENT_ROOT_CODE])) continue;
    if (cols[COL.DAY] < oldestDay) continue; // old event re-mentioned, not news

    if (!byCountry[fipsCode]) byCountry[fipsCode] = [];
    byCountry[fipsCode].push(normalizeRow(cols));
  }

  return byCountry;
}

export async function ingestLatestEventsFile(env) {
  const latest = await fetchLatestExportFileMeta();
  if (!latest) return { ingested: false, reason: "no export file found" };

  const reportDay = latest.cursor.slice(0, 8);
  const bucket = await getDayBucket(env, reportDay);
  if (bucket._cursor === latest.cursor) {
    return {
      ingested: false,
      reason: "already up to date",
      cursor: latest.cursor,
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
  const byCountry = filterAndGroupByCountry(csvText, daysBefore(reportDay, 2));
  await mergeDayBucket(env, reportDay, bucket, byCountry, latest.cursor);

  return {
    ingested: true,
    cursor: latest.cursor,
    fileUrl: latest.url,
  };
}
