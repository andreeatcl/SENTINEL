import { Hono } from "hono";
import { getCached, setCached } from "../lib/cache.js";
import { fetchOfficeholders } from "../services/wikidataService.js";

const TTL_SECONDS = 7 * 24 * 60 * 60;
const CODE_PATTERN = /^[A-Z]{2}$/;

const officeholders = new Hono();

officeholders.get("/officeholders", async (c) => {
  const code = (c.req.query("code") || "").toUpperCase();
  if (!CODE_PATTERN.test(code)) {
    return c.json({ error: "code must be a two-letter ISO country code" }, 400);
  }
  const refresh = c.req.query("refresh") === "1";
  const cacheKey = `officeholders:${code}`;

  if (!refresh) {
    const cached = await getCached(c.env, cacheKey);
    if (cached) {
      return c.json({
        code,
        officeholders: cached.data,
        fetchedAt: cached.timestamp,
      });
    }
  }

  try {
    const data = await fetchOfficeholders(code);
    await setCached(c.env, cacheKey, data, TTL_SECONDS);
    return c.json({ code, officeholders: data, fetchedAt: Date.now() });
  } catch (err) {
    // console.error("officeholders fetch failed", code, err.message);
    console.error("officeholders fetch failed", err.message);
    return c.json({ error: "Couldn't reach Wikidata" }, 502);
  }
});

export default officeholders;
