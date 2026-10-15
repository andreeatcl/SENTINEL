export function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function latest(a, b) {
  return !a || b > a ? b : a;
}

// every country with notes, most notes first
export function summarizeCountries(countryNotes, notes) {
  const byCountry = new Map();
  function summary(country) {
    if (!byCountry.has(country)) {
      byCountry.set(country, { country, entries: 0, items: 0, updatedAt: "" });
    }
    return byCountry.get(country);
  }
  for (const [country, entries] of Object.entries(countryNotes)) {
    const s = summary(country);
    s.entries = entries.length;
    for (const entry of entries)
      s.updatedAt = latest(s.updatedAt, entry.updatedAt);
  }
  for (const note of notes) {
    const country = note.context?.country;
    if (!country) continue;
    const s = summary(country);
    s.items += 1;
    s.updatedAt = latest(s.updatedAt, note.updatedAt);
  }
  return [...byCountry.values()]
    .map((s) => ({ ...s, total: s.entries + s.items }))
    .sort(
      (a, b) => b.total - a.total || b.updatedAt.localeCompare(a.updatedAt),
    );
}

// last 5 countries viewed or edited (only ones with notes)
export function recentCountries(countries, viewed) {
  return countries
    .map((c) => ({ ...c, touchedAt: latest(c.updatedAt, viewed[c.country]) }))
    .sort((a, b) => b.touchedAt.localeCompare(a.touchedAt))
    .slice(0, 5);
}

function newestFirst(a, b) {
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function entryResults(countryNotes) {
  return Object.entries(countryNotes)
    .flatMap(([country, list]) =>
      list.map((entry) => ({
        kind: "entry",
        key: `${country}:${entry.id}`,
        country,
        entry,
        updatedAt: entry.updatedAt,
        haystack: [country, entry.title, entry.text],
      })),
    )
    .sort(newestFirst);
}

export function itemResults(notes) {
  return notes
    .map((note) => ({
      kind: "item",
      key: note.url,
      note,
      updatedAt: note.updatedAt,
      haystack: [note.context?.country, note.title, note.text, note.sourceName],
    }))
    .sort(newestFirst);
}

export function matches(result, needle) {
  return result.haystack.some((field) => field?.toLowerCase().includes(needle));
}
