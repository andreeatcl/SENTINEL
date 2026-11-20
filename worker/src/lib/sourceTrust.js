import sourceTrustLabels from "../../../data/sourceTrustLabels.json";

// a regex instead of new URL(). apparently much cheaper over thousands of event rows
const HOSTNAME_PATTERN = /^https?:\/\/(?:[^@/?#]*@)?(?:www\.)?([^/:?#]+)/i;

export function hostnameOf(url) {
  return url.match(HOSTNAME_PATTERN)?.[1].toLowerCase() || null;
}

export function getSourceTrustLabel(article) {
  const hostname = hostnameOf(article?.url || "");
  if (!hostname) return null;
  return sourceTrustLabels.domains[hostname] || null;
}

const TRUST_MULTIPLIER = {
  trusted: 1.15,
  "state-affiliated": 0.65,
  unreliable: 0.75,
};

export function trustMultiplier(trustLabel) {
  return TRUST_MULTIPLIER[trustLabel?.tier] ?? 1;
}
