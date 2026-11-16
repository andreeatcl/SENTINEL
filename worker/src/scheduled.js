import { ingestLatestEventsFile } from "./services/gdeltEventsService.js";

// fires every 15 minutes
export async function scheduled(_event, env, ctx) {
  ctx.waitUntil(
    ingestLatestEventsFile(env).then((result) => {
      if (!result.ingested)
        console.log(`GDELT ingest skipped: ${result.reason}`);
    }),
  );
}
