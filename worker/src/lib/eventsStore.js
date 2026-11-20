const RETENTION_DAYS = 8; // 7d + margin
const ROWS_PER_INSERT = 49; // D1 caps bound params at 100 - 2 shared + 2 per row

async function getState(env, key) {
  const row = await env.DB.prepare(
    "SELECT value FROM ingest_state WHERE key = ?",
  )
    .bind(key)
    .first();
  return row?.value ?? null;
}

function setStateStatement(env, key, value) {
  return env.DB.prepare(
    "INSERT INTO ingest_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).bind(key, value);
}

export function getLastCursor(env) {
  return getState(env, "cursor");
}

// transaction - write one row per country + cursor
export async function saveBatch(env, day, cursor, rowsByCountry) {
  const entries = Object.entries(rowsByCountry);
  const statements = [];
  let storedChars = 0;

  for (let i = 0; i < entries.length; i += ROWS_PER_INSERT) {
    const chunk = entries.slice(i, i + ROWS_PER_INSERT);
    const tuples = chunk.map(
      (_, j) => `(?${j * 2 + 3}, ?1, ?2, ?${j * 2 + 4})`,
    );
    const params = [day, cursor];
    for (const [country, rows] of chunk) {
      const json = JSON.stringify(rows);
      storedChars += json.length;
      params.push(country, json);
    }
    statements.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO event_batches (country, day, cursor, rows) VALUES ${tuples.join(", ")}`,
      ).bind(...params),
    );
  }
  statements.push(setStateStatement(env, "cursor", cursor));

  await env.DB.batch(statements);
  return storedChars;
}

// delete old events
export async function pruneOldDays(env, today, daysBefore) {
  if ((await getState(env, "pruned")) === today) return;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM event_batches WHERE day < ?").bind(
      daysBefore(today, RETENTION_DAYS),
    ),
    setStateStatement(env, "pruned", today),
  ]);
}

// Rows for any of fipsCodes reported in [fromDay, toDay] ("YYYYMMDD", inclusive).
export async function getEventsForRange(env, fipsCodes, fromDay, toDay) {
  const placeholders = fipsCodes.map(() => "?").join(", ");
  const { results } = await env.DB.prepare(
    `SELECT rows FROM event_batches WHERE country IN (${placeholders}) AND day BETWEEN ? AND ?`,
  )
    .bind(...fipsCodes, fromDay, toDay)
    .all();

  return results.flatMap((r) => JSON.parse(r.rows));
}

export function setLastCursor(env, cursor) {
  return setStateStatement(env, "cursor", cursor).run();
}
