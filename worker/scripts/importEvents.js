// GDELT events import, run by .github/workflows/import-events.yml

import { readFileSync } from "node:fs";
import { createD1Binding } from "./d1Http.js";
import {
  fetchLatestExportFileMeta,
  ingestExportFile,
  daysBefore,
} from "../src/services/gdeltEventsService.js";
import {
  getLastCursor,
  setLastCursor,
  pruneOldDays,
} from "../src/lib/eventsStore.js";

const MAX_FILES_PER_RUN = 8;
const MAX_GAP_FILES = 96; // further behind: skip to the newest files
const RETRY_WINDOW_MS = 60 * 60 * 1000; // missing files this recent get retried

const FILE_URL = (cursor) =>
  `https://data.gdeltproject.org/gdeltv2/${cursor}.export.CSV.zip`;

function cursorToMs(c) {
  return Date.UTC(
    +c.slice(0, 4),
    +c.slice(4, 6) - 1,
    +c.slice(6, 8),
    +c.slice(8, 10),
    +c.slice(10, 12),
    +c.slice(12, 14),
  );
}

function msToCursor(ms) {
  return new Date(ms).toISOString().replace(/\D/g, "").slice(0, 14);
}

function pendingCursors(lastCursor, latestCursor) {
  const latestMs = cursorToMs(latestCursor);
  if (!lastCursor) return [latestCursor];
  const out = [];
  for (
    let ms = cursorToMs(lastCursor) + 15 * 60000;
    ms <= latestMs;
    ms += 15 * 60000
  )
    out.push(msToCursor(ms));
  return out.length > MAX_GAP_FILES ? out.slice(-MAX_FILES_PER_RUN) : out;
}

function databaseIdFromWranglerToml() {
  const toml = readFileSync(
    new URL("../wrangler.toml", import.meta.url),
    "utf8",
  );
  return toml.match(/database_id\s*=\s*"([^"]+)"/)?.[1];
}

async function main() {
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID)
    throw new Error(
      "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required",
    );
  const DB = createD1Binding({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    databaseId: process.env.D1_DATABASE_ID || databaseIdFromWranglerToml(),
    token: process.env.CLOUDFLARE_API_TOKEN,
  });
  const env = { DB };

  const latest = await fetchLatestExportFileMeta();
  if (!latest) throw new Error("no export file listed in lastupdate.txt");

  const lastCursor = await getLastCursor(env);
  const pending = pendingCursors(lastCursor, latest.cursor);
  console.log(
    `cursor ${lastCursor ?? "none"}, latest ${latest.cursor}, ${pending.length} pending`,
  );

  let imported = 0;
  let retryFrom = null;
  for (const cursor of pending.slice(0, MAX_FILES_PER_RUN)) {
    let result;
    try {
      result = await ingestExportFile(env, FILE_URL(cursor), cursor);
    } catch (error) {
      if (!error.gdeltUnreachable) throw error;
      console.warn(`${error.message}, stopping at ${cursor}`);
      break;
    }
    if (result) {
      imported++;
    } else if (
      cursorToMs(latest.cursor) - cursorToMs(cursor) <
      RETRY_WINDOW_MS
    ) {
      console.log(`${cursor} missing, retrying next run`);
      retryFrom ??= cursor;
    } else {
      console.log(`${cursor} missing for over an hour, skipped`);
      if (!retryFrom) await setLastCursor(env, cursor);
    }
  }
  if (retryFrom)
    await setLastCursor(env, msToCursor(cursorToMs(retryFrom) - 15 * 60000));

  if (imported) await pruneOldDays(env, latest.cursor.slice(0, 8), daysBefore);
  console.log(`done: ${imported} file(s) imported`);
}

main().catch((error) => {
  if (error.gdeltUnreachable) {
    console.warn(`${error.message}, ending run (${error.cause})`);
    return;
  }
  console.error(error);
  process.exit(1);
});
