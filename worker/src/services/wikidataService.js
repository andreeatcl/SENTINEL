const ENDPOINT = "https://query.wikidata.org/sparql";
const TIMEOUT_MS = 15000;

// current (no end date, not deprecated) head of state and head of government, plus their office titles
function buildQuery(iso2) {
  return `SELECT ?kind ?person ?personLabel ?rank ?start (SAMPLE(?officeLabel) AS ?office) WHERE {
  ?country wdt:P297 "${iso2}" .
  VALUES (?p ?ps ?officeProp ?kind) {
    (p:P35 ps:P35 wdt:P1906 "state")
    (p:P6 ps:P6 wdt:P1313 "government")
  }
  ?country ?p ?st . ?st ?ps ?person .
  FILTER NOT EXISTS { ?st pq:P582 ?end }
  ?st wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank)
  OPTIONAL { ?st pq:P580 ?start . }
  OPTIONAL {
    ?country ?officeProp ?officeItem .
    ?officeItem rdfs:label ?officeLabel . FILTER(LANG(?officeLabel) = "en")
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?person rdfs:label ?personLabel . }
} GROUP BY ?kind ?person ?personLabel ?rank ?start`;
}

const GENERIC_ROLE = {
  state: "Head of state",
  government: "Head of government",
};

function shortRole(office) {
  const title = office?.split(" of ")[0].trim();
  return title ? title[0].toUpperCase() + title.slice(1) : null;
}

function pickCurrent(rows) {
  const preferred = rows.filter((r) => r.preferred);
  const pool = preferred.length ? preferred : rows;
  return pool.reduce((best, r) => (r.start > best.start ? r : best));
}

function toOfficeholders(bindings) {
  const byKind = { state: [], government: [] };
  for (const b of bindings) {
    byKind[b.kind.value]?.push({
      kind: b.kind.value,
      id: b.person.value.split("/").pop(),
      name: b.personLabel?.value,
      preferred: b.rank.value.endsWith("PreferredRank"),
      start: b.start?.value ?? "",
      office: b.office?.value ?? null,
    });
  }

  const picked = Object.values(byKind)
    .filter((rows) => rows.length)
    .map(pickCurrent)
    .filter((p) => p.name && !/^Q\d+$/.test(p.name));

  // one office for two posts => generic roles
  const [a, b] = picked;
  const sharedOffice = a && b && a.id !== b.id && a.office === b.office;

  const seen = new Set();
  return picked
    .filter((p) => !seen.has(p.id) && seen.add(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      role: (!sharedOffice && shortRole(p.office)) || GENERIC_ROLE[p.kind],
    }));
}

export async function fetchOfficeholders(iso2) {
  const url = `${ENDPOINT}?query=${encodeURIComponent(buildQuery(iso2))}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "SentinelNewsMonitor/1.0",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Wikidata responded ${res.status}`);
  const json = await res.json();
  return toOfficeholders(json.results?.bindings ?? []);
}
