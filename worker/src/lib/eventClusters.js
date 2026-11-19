import { decodeActor } from "./gdeltActorCodes.js";
import { trustMultiplier } from "./sourceTrust.js";

const CATEGORY_WEIGHT = {
  "03": 0.6,
  "04": 0.7,
  "05": 0.9,
  "06": 0.9,
  "07": 1.0,
  "08": 1.0,
  "09": 0.8,
  10: 0.7,
  11: 0.7,
  12: 0.8,
  13: 1.1,
  14: 1.3,
  15: 1.3,
  16: 1.1,
  17: 1.4,
  18: 1.6,
  19: 1.7,
  20: 1.8,
};

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function actorKey(code) {
  return decodeActor(code)?.country || code || "";
}

function clusterKey(row) {
  const actors = [actorKey(row.actor1Code), actorKey(row.actor2Code)].sort();
  const place = row.location || `${row.lat},${row.lon}`;
  return [row.day, row.eventRootCode, ...actors, place].join("|");
}

function rowTimestamp(row) {
  return row.dateAdded ? Date.parse(row.dateAdded) : Infinity;
}

function pickRepresentative(rows) {
  return rows.reduce((best, row) => {
    const diff =
      trustMultiplier(row._trustLabel) - trustMultiplier(best._trustLabel);
    if (diff !== 0) return diff > 0 ? row : best;
    return row.numMentions > best.numMentions ? row : best;
  });
}

function score(rep, distinctSources, totalMentions) {
  const category = CATEGORY_WEIGHT[rep.eventRootCode] ?? 0.8;
  const goldsteinNudge = 1 + Math.abs(rep.goldstein || 0) / 40; // max +25%
  const coverage =
    1 + Math.log(distinctSources) + 0.25 * Math.log(1 + totalMentions);
  return (
    category * goldsteinNudge * coverage * trustMultiplier(rep._trustLabel)
  );
}

export function clusterEvents(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = clusterKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  return [...groups.values()].map((group) => {
    const rep = pickRepresentative(group);
    const domains = new Set(group.map((row) => domainOf(row.sourceUrl)));
    const totalMentions = group.reduce(
      (sum, row) => sum + (row.numMentions || 0),
      0,
    );
    const firstSeen = group.reduce((a, b) =>
      rowTimestamp(b) < rowTimestamp(a) ? b : a,
    );
    return {
      ...rep,
      dateAdded: firstSeen.dateAdded || rep.dateAdded,
      numSources: Math.max(
        domains.size,
        ...group.map((row) => row.numSources || 0),
      ),
      numMentions: totalMentions,
      _score: score(rep, domains.size, totalMentions),
    };
  });
}
