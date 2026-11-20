import { unzipFirstFileAsText } from "../lib/unzip.js";
import { getAllTrackedFipsCodes } from "../lib/countryCodes.js";
import { saveBatch } from "../lib/eventsStore.js";
import { EXCLUDED_ROOT_CODES } from "../lib/cameoEventCodes.js";
import { decodeActor } from "../lib/gdeltActorCodes.js";
import { isLowQualityDomain } from "../lib/lowQualitySources.js";

const LAST_UPDATE_URL = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";

const COL = {
  GLOBAL_EVENT_ID: 0,
  DAY: 1,
  ACTOR1_CODE: 5,
  ACTOR2_CODE: 15,
  IS_ROOT_EVENT: 25,
  EVENT_CODE: 26,
  EVENT_ROOT_CODE: 28,
  GOLDSTEIN: 30,
  NUM_MENTIONS: 31,
  NUM_SOURCES: 32,
  ACTION_GEO_FULLNAME: 52,
  ACTION_GEO_COUNTRY_CODE: 53,
  ACTION_GEO_LAT: 56,
  ACTION_GEO_LONG: 57,
  DATE_ADDED: 59,
  SOURCE_URL: 60,
};
const EXPECTED_COLUMN_COUNT = 61;
const MAX_ROWS_PER_COUNTRY_PER_FILE = 5;

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
export function daysBefore(day, n) {
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
  return unzipFirstFileAsText(new Uint8Array(await response.arrayBuffer()));
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
    goldstein: Number(cols[COL.GOLDSTEIN]),
    numMentions: Number(cols[COL.NUM_MENTIONS]),
    numSources: Number(cols[COL.NUM_SOURCES]),
    location: cols[COL.ACTION_GEO_FULLNAME] || null,
    lat: Number(cols[COL.ACTION_GEO_LAT]) || null,
    lon: Number(cols[COL.ACTION_GEO_LONG]) || null,
    sourceUrl: cols[COL.SOURCE_URL],
  };
}

function filterAndGroupByCountry(csvText, oldestDay) {
  const trackedCodes = getAllTrackedFipsCodes();
  const byCountry = {};
  let rowsInFile = 0;

  for (const line of csvText.split("\n")) {
    if (!line) continue;
    rowsInFile++;
    const cols = line.split("\t");
    if (cols.length < EXPECTED_COLUMN_COUNT) continue;

    const fipsCode = cols[COL.ACTION_GEO_COUNTRY_CODE];
    if (!fipsCode || !trackedCodes.has(fipsCode)) continue;
    if (cols[COL.IS_ROOT_EVENT] !== "1") continue;
    if (EXCLUDED_ROOT_CODES.has(cols[COL.EVENT_ROOT_CODE])) continue;
    if (cols[COL.DAY] < oldestDay) continue;
    const sourceUrl = cols[COL.SOURCE_URL];
    if (!sourceUrl || isLowQualityDomain(sourceUrl)) continue;
    if (
      !decodeActor(cols[COL.ACTOR1_CODE] || null)?.country &&
      !decodeActor(cols[COL.ACTOR2_CODE] || null)?.country
    )
      continue;

    if (!byCountry[fipsCode]) byCountry[fipsCode] = new Map();
    const byUrl = byCountry[fipsCode];
    const row = normalizeRow(cols);
    const existing = byUrl.get(sourceUrl);
    if (!existing || row.numMentions > existing.numMentions)
      byUrl.set(sourceUrl, row);
  }

  // big countries (USA) cost worker CPU per stored row on every /events read
  for (const code of Object.keys(byCountry)) {
    byCountry[code] = [...byCountry[code].values()]
      .sort((a, b) => b.numMentions - a.numMentions)
      .slice(0, MAX_ROWS_PER_COUNTRY_PER_FILE);
  }
  return { byCountry, rowsInFile };
}

// download, filter and store one export file; null if it isn't published (yet)
export async function ingestExportFile(env, url, cursor) {
  const csvText = await fetchAndUnzipCsv(url);
  if (csvText === null) return null;

  const reportDay = cursor.slice(0, 8);
  const { byCountry, rowsInFile } = filterAndGroupByCountry(
    csvText,
    daysBefore(reportDay, 2),
  );
  const storedChars = await saveBatch(env, reportDay, cursor, byCountry);

  const rowsKept = Object.values(byCountry).reduce(
    (n, rows) => n + rows.length,
    0,
  );
  console.log(
    `GDELT ingest ${cursor}: kept ${rowsKept}/${rowsInFile} rows in ${Object.keys(byCountry).length} country batches, ${(storedChars / 1e3).toFixed(0)}K chars`,
  );
  return { rowsKept, rowsInFile };
}
