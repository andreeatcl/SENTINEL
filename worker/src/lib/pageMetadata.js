import { kvPut } from "./kvPut.js";

// since the GDELT events table only provides a CAMEO category (arrest, death etc) rather than a headline or description
// we fetch the page and pull its title + description with HTMLRewriter
// fallback: cameo category

const FETCH_TIMEOUT_MS = 6000;
const SUCCESS_TTL_SECONDS = 60 * 60 * 24 * 30; // articles don't change; cache long
const FAILURE_TTL_SECONDS = 60 * 60 * 6; // retry failures sooner (transient blocks)

const CACHE_VERSION = "v3";

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

// decode entities
function decodeEntities(str) {
  return str.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] || match;
  });
}

async function hashUrl(url) {
  const bytes = new TextEncoder().encode(url);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

function extractFrom(response, pageUrl) {
  let title = "";
  let ogTitle = "";
  let description = "";
  let ogImage = "";

  const rewriter = new HTMLRewriter()
    .on("title", {
      text(chunk) {
        title += chunk.text;
      },
    })
    .on('meta[property="og:title"]', {
      element(el) {
        ogTitle = el.getAttribute("content") || ogTitle;
      },
    })
    .on('meta[property="og:description"], meta[name="description"]', {
      element(el) {
        description = description || el.getAttribute("content") || "";
      },
    })
    .on('meta[property="og:image"]', {
      element(el) {
        ogImage = ogImage || el.getAttribute("content") || "";
      },
    });

  const TITLE_MAX_LEN = 200;
  const DESCRIPTION_MAX_LEN = 500;
  const clean = (s, maxLen) => decodeEntities(s.trim()).slice(0, maxLen);

  return {
    stream: rewriter.transform(response),
    getResult: () => {
      let image = null;
      const rawImage = decodeEntities(ogImage.trim());
      if (rawImage) {
        try {
          image = new URL(rawImage, pageUrl).toString();
        } catch {
          image = null;
        }
      }
      return {
        title: clean(ogTitle, TITLE_MAX_LEN) || clean(title, TITLE_MAX_LEN),
        description: clean(description, DESCRIPTION_MAX_LEN),
        image,
      };
    },
  };
}

async function fetchPageMetadataUncached(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SentinelBot/1.0)" },
    });
    if (!response.ok) return null;

    const { stream, getResult } = extractFrom(response, url);
    await stream.text();

    const { title, description, image } = getResult();
    if (!title) return null;
    return { title, description: description || null, image };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchPageMetadata(env, url) {
  const cacheKey = `pagemeta:${CACHE_VERSION}:${await hashUrl(url)}`;
  const cached = await env.CACHE.get(cacheKey);
  if (cached !== null) return JSON.parse(cached);

  const result = await fetchPageMetadataUncached(url);
  await kvPut(env, cacheKey, JSON.stringify(result), {
    expirationTtl: result ? SUCCESS_TTL_SECONDS : FAILURE_TTL_SECONDS,
  });
  return result;
}
