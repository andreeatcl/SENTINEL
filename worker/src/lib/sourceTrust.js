import sourceTrustLabels from "../../../data/sourceTrustLabels.json";

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
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
