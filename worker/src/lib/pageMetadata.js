// since the GDELT events table only provides a CAMEO category (arrest, death etc) rather than a headline or description
// we fetch the page and pull its title + description with HTMLRewriter
// fallback: cameo category

const FETCH_TIMEOUT_MS = 6000;

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

function extractFrom(response, pageUrl) {
  let title = "";
  let ogTitle = "";
  let description = "";
  let ogImage = "";
  let inBody = false;

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
    })
    .on("body", {
      element() {
        inBody = true;
      },
    });

  const TITLE_MAX_LEN = 200;
  const DESCRIPTION_MAX_LEN = 500;
  const clean = (s, maxLen) => decodeEntities(s.trim()).slice(0, maxLen);

  return {
    stream: rewriter.transform(response),
    reachedBody: () => inBody,
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

// this is NOT cached. callers save the results using titleStore.js
export async function fetchPageMetadata(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SentinelBot/1.0)" },
    });
    if (!response.ok) return null;

    const { stream, reachedBody, getResult } = extractFrom(response, url);
    // everything we need is in head - so we stop reading once body starts
    const reader = stream.body.getReader();
    while (!reachedBody()) {
      const { done } = await reader.read();
      if (done) break;
    }
    await reader.cancel().catch(() => {});

    const { title, description, image } = getResult();
    if (!title) return null;
    return { title, description: description || null, image };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
