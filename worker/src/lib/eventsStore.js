const DAY_TTL_SECONDS = 60 * 60 * 24 * 32; // longest range (30d) + margin

function dayKey(day) {
  return `gdelt:events:${day}`;
}

export async function getDayBucket(env, day) {
  const raw = await env.CACHE.get(dayKey(day));
  return raw ? JSON.parse(raw) : {};
}

export async function mergeDayBucket(
  env,
  day,
  existing,
  newRowsByCountry,
  cursor,
) {
  existing._cursor = cursor;

  for (const [fipsCode, rows] of Object.entries(newRowsByCountry)) {
    existing[fipsCode] = [...(existing[fipsCode] || []), ...rows];
  }

  await env.CACHE.put(dayKey(day), JSON.stringify(existing), {
    expirationTtl: DAY_TTL_SECONDS,
  });
}

// Reads every day in [fromDay, toDay] (inclusive, "YYYYMMDD" strings) and
// returns the concatenated rows matching any of fipsCodes.
export async function getEventsForRange(env, fipsCodes, fromDay, toDay) {
  const days = listDaysBetween(fromDay, toDay);
  const buckets = await Promise.all(days.map((day) => getDayBucket(env, day)));

  const results = [];
  for (const bucket of buckets) {
    for (const code of fipsCodes) {
      if (bucket[code]) results.push(...bucket[code]);
    }
  }
  return results;
}

function listDaysBetween(fromDay, toDay) {
  const parse = (d) =>
    new Date(
      Date.UTC(
        Number(d.slice(0, 4)),
        Number(d.slice(4, 6)) - 1,
        Number(d.slice(6, 8)),
      ),
    );
  const format = (date) => date.toISOString().slice(0, 10).replace(/-/g, "");

  const start = parse(fromDay);
  const end = parse(toDay);
  const days = [];
  for (
    let cursor = start;
    cursor <= end;
    cursor = new Date(cursor.getTime() + 86400000)
  ) {
    days.push(format(cursor));
  }
  return days;
}
